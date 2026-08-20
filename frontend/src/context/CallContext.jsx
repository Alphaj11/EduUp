import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export const CallProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'receiving', 'ongoing'
    const [activeCall, setActiveCall] = useState(null);
    const [jitsiRoom, setJitsiRoom] = useState(null);
    const [callTimer, setCallTimer] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false); // Minimize to banner
    const timerInterval = useRef(null);
    const ringtone = useRef(null);

    // Initialize ringtone
    useEffect(() => {
        ringtone.current = new Audio('/notif_alert.mp3');
        if (ringtone.current) ringtone.current.loop = true;
    }, []);

    const playRingtone = useCallback(() => {
        ringtone.current?.play().catch(() => { });
    }, []);

    const stopRingtone = useCallback(() => {
        if (ringtone.current) {
            ringtone.current.pause();
            ringtone.current.currentTime = 0;
        }
    }, []);

    // Called when user clicks "Répondre" from the chat bubble
    const setIncomingCall = useCallback((callMsg) => {
        setActiveCall(callMsg);
        setCallStatus('receiving');
        setIsMinimized(false);
        playRingtone();
    }, [playRingtone]);

    const initiateCall = async (partner, isGroup, type) => {
        try {
            const payload = { call_type: type };
            if (isGroup) payload.group_id = partner.id;
            else payload.receiver_id = partner.id;

            const res = await api.post('messages/initiate_call/', payload);
            setActiveCall(res.data);
            // Bypasses 'calling' screen: caller goes straight to the Jitsi room
            setCallStatus('ongoing');
            setJitsiRoom(res.data.call_room_id);
            setIsMinimized(false);
            return res.data;
        } catch (err) {
            console.error('Error initiating call', err);
            throw err;
        }
    };

    const respondToCall = useCallback(async (status) => {
        if (!activeCall?.id) return;
        try {
            const res = await api.patch(`messages/${activeCall.id}/respond_to_call/`, { status });
            if (status === 'ongoing') {
                setCallStatus('ongoing');
                setJitsiRoom(activeCall.call_room_id);
                setIsMinimized(false);
            } else {
                setCallStatus('idle');
                setActiveCall(null);
                setJitsiRoom(null);
            }
            stopRingtone();
            return res.data;
        } catch (err) {
            console.error('Error responding to call', err);
            stopRingtone();
        }
    }, [activeCall, stopRingtone]);

    const endCall = useCallback(async () => {
        const callId = activeCall?.id;
        setCallStatus('idle');
        setActiveCall(null);
        setJitsiRoom(null);
        setIsMinimized(false);
        stopRingtone();
        if (callId) {
            try {
                await api.patch(`messages/${callId}/respond_to_call/`, { status: 'ended' });
            } catch (err) {
                console.error('Error ending call', err);
            }
        }
    }, [activeCall?.id, stopRingtone]);

    const minimizeCall = () => setIsMinimized(true);
    const maximizeCall = () => setIsMinimized(false);

    // ----------------------------------------------------------------
    // Global Polling — runs every 4s regardless of current page
    // ----------------------------------------------------------------
    const callStatusRef = useRef(callStatus);
    const activeCallRef = useRef(activeCall);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const poll = async () => {
            const status = callStatusRef.current;
            const currentCall = activeCallRef.current;

            try {
                if (status === 'idle') {
                    // Always poll the conversations endpoint to detect new incoming calls
                    const res = await api.get(`messages/conversations/?t=${Date.now()}`);
                    const globalActiveCall = res.data.active_call; // status='started' calls only
                    const globalOngoingCall = res.data.ongoing_call; // call with status='ongoing' involving this user

                    // Detect a new incoming call from someone else
                    if (globalActiveCall && globalActiveCall.sender !== user.id) {
                        setActiveCall(globalActiveCall);
                        setCallStatus('receiving');
                        playRingtone();
                    }
                    // If we are idle but there's an ongoing call we're part of, rejoin it
                    else if (globalOngoingCall) {
                        setActiveCall(globalOngoingCall);
                        setCallStatus('ongoing');
                        setJitsiRoom(globalOngoingCall.call_room_id);
                    }

                } else if (status === 'receiving') {
                    // Only poll conversations endpoint to see if the call was cancelled
                    const res = await api.get(`messages/conversations/?t=${Date.now()}`);
                    const globalActiveCall = res.data.active_call;
                    if (!globalActiveCall || (currentCall && globalActiveCall.id !== currentCall.id)) {
                        setCallStatus('idle');
                        setActiveCall(null);
                        stopRingtone();
                    }

                } else if ((status === 'calling' || status === 'ongoing') && currentCall) {
                    // Fast path: directly poll the specific message to detect state changes instantly
                    try {
                        const msgRes = await api.get(`messages/${currentCall.id}/?t=${Date.now()}`);
                        const updatedCall = msgRes.data;
                        const s = updatedCall.call_status;

                        if (status === 'calling') {
                            if (s === 'ongoing') {
                                // Callee accepted!
                                setCallStatus('ongoing');
                                setJitsiRoom(updatedCall.call_room_id);
                                stopRingtone();
                            } else if (['declined', 'ended', 'missed'].includes(s)) {
                                // Callee declined or missed
                                setCallStatus('idle');
                                setActiveCall(null);
                                setJitsiRoom(null);
                                stopRingtone();
                            }
                        } else if (status === 'ongoing') {
                            if (['ended', 'declined', 'missed'].includes(s)) {
                                // The other party hung up or declined
                                setCallStatus('idle');
                                setActiveCall(null);
                                setJitsiRoom(null);
                            }
                        }
                    } catch (err) {
                        console.error("Error polling specific message:", err);
                    }
                }
            } catch (err) {
                console.error("Global polling error:", err);
            }
        };

        const interval = setInterval(poll, 4000);
        return () => clearInterval(interval);
    }, [isAuthenticated, user, playRingtone, stopRingtone]);

    // Timer Logic
    useEffect(() => {
        if (callStatus === 'ongoing') {
            timerInterval.current = setInterval(() => setCallTimer(t => t + 1), 1000);
        } else {
            clearInterval(timerInterval.current);
            setCallTimer(0);
        }
        return () => clearInterval(timerInterval.current);
    }, [callStatus]);

    return (
        <CallContext.Provider value={{
            callStatus, activeCall, jitsiRoom, callTimer,
            isMinimized,
            initiateCall, respondToCall, endCall,
            setIncomingCall, minimizeCall, maximizeCall
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => useContext(CallContext);
