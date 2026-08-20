import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, MessageSquare, Calendar, Clock, User,
    Video, Copy, CheckCheck, Wifi, WifiOff, BookOpen,
    PhoneOff, Circle, Timer, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// Formats seconds to HH:MM:SS
const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const VirtualClassroomPage = () => {
    const { bookingId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [jitsiReady, setJitsiReady] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [ending, setEnding] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const timerRef = useRef(null);
    const sessionStartedRef = useRef(false);
    const containerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const startTimer = useCallback((startedAt) => {
        const start = startedAt ? new Date(startedAt) : new Date();
        const tick = () => {
            const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
            setSessionSeconds(elapsed);
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await api.get(`bookings/${bookingId}/`);
                const b = res.data;
                const userId = user?.id;
                const isStudent = b.student === userId || b.student_details?.id === userId;
                const isTeacher = b.teacher_details?.user?.id === userId;
                if (!isStudent && !isTeacher) {
                    setError('Accès non autorisé à cette salle de classe.');
                    return;
                }
                if (b.course_type !== 'online') {
                    setError('Cette réservation est un cours en présentiel.');
                    return;
                }
                setBooking(b);

                // Start the session on the backend if not already started
                if (!sessionStartedRef.current && b.status === 'confirmed') {
                    sessionStartedRef.current = true;
                    try {
                        const startRes = await api.patch(`bookings/${bookingId}/start_session/`);
                        setBooking(startRes.data);
                        setIsSessionActive(true);
                        startTimer(startRes.data.session_started_at);
                    } catch {
                        // May already be started
                        if (b.session_started_at) {
                            setIsSessionActive(true);
                            startTimer(b.session_started_at);
                        }
                    }
                } else if (b.session_started_at && !b.session_ended_at) {
                    setIsSessionActive(true);
                    startTimer(b.session_started_at);
                }
            } catch (err) {
                if (err.response?.status === 404 || err.response?.status === 403) {
                    navigate('/404', { replace: true });
                } else {
                    setError('Erreur lors du chargement.');
                }
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchBooking();
        return () => clearInterval(timerRef.current);
    }, [bookingId, user, startTimer]);

    const handleEndSession = useCallback(async () => {
        setEnding(true);
        clearInterval(timerRef.current);
        try {
            const res = await api.patch(`bookings/${bookingId}/end_session/`);
            setBooking(res.data);
            setIsSessionActive(false);
        } catch (e) {
            console.error(e);
        } finally {
            setEnding(false);
            setShowEndConfirm(false);
            navigate(-1);
        }
    }, [bookingId, navigate]);

    useEffect(() => {
        if (!booking || hasInitializedRef.current) return;

        const scriptId = 'jitsi-external-api-script';
        let script = document.getElementById(scriptId);

        const initJitsi = () => {
            if (!containerRef.current || hasInitializedRef.current) return;
            hasInitializedRef.current = true;

            const domain = 'meet.jit.si';
            const options = {
                roomName: `eduup-${bookingId}`,
                width: '100%',
                height: '100%',
                parentNode: containerRef.current,
                userInfo: {
                    displayName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'Utilisateur'
                },
                configOverwrite: {
                    prejoinPageEnabled: false,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                },
                interfaceConfigOverwrite: {}
            };

            try {
                const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
                jitsiApiRef.current = apiInstance;

                apiInstance.addEventListener('videoConferenceJoined', () => {
                    setJitsiReady(true);
                });

                apiInstance.addEventListener('videoConferenceLeft', () => {
                    handleEndSession();
                });
            } catch (err) {
                console.error("Failed to initialize Jitsi", err);
            }
        };

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = () => {
                initJitsi();
            };
            document.body.appendChild(script);
        } else {
            if (window.JitsiMeetExternalAPI) {
                initJitsi();
            } else {
                const prevOnload = script.onload;
                script.onload = () => {
                    if (prevOnload) prevOnload();
                    initJitsi();
                };
            }
        }
    }, [booking, bookingId, user, handleEndSession]);

    useEffect(() => {
        return () => {
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(booking?.meeting_link || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (date, time) => {
        if (!date || !time) return '';
        return new Date(`${date}T${time}`).toLocaleString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Video className="w-10 h-10 text-violet-500" />
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <WifiOff className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">{error}</h2>
                    <button onClick={() => navigate(-1)} className="mt-6 px-8 py-3 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-500 transition-colors">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const teacherName = `${booking?.teacher_details?.user?.first_name || ''} ${booking?.teacher_details?.user?.last_name || ''}`.trim();
    const studentName = `${booking?.student_details?.first_name || ''} ${booking?.student_details?.last_name || ''}`.trim();
    const subjectName = booking?.subject_details?.name || 'Matière';
    const roomUrl = booking?.meeting_link || `https://meet.jit.si/eduup-${bookingId}`;

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-white flex flex-col">
            {/* ─── TOP HEADER ─── */}
            <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4 flex items-center gap-4 sticky top-0 z-50 shrink-0">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors shrink-0">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-black text-sm truncate">{subjectName}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">EduUp Classroom</p>
                    </div>
                </div>

                {/* Session Timer */}
                {isSessionActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl shrink-0"
                    >
                        <Circle className="w-2 h-2 text-red-400 fill-red-400 animate-pulse" />
                        <span className="font-black text-sm text-violet-300 tabular-nums">{formatDuration(sessionSeconds)}</span>
                    </motion.div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        to={`/messages?with=${booking?.teacher_details?.user?.id || booking?.student_details?.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 hidden sm:block">Chat</span>
                    </Link>

                    <button
                        onClick={() => setShowEndConfirm(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-colors"
                    >
                        <PhoneOff className="w-4 h-4" />
                        <span className="text-[10px] font-bold hidden sm:block">Terminer</span>
                    </button>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Jitsi iframe */}
                <div className="flex-1 relative bg-black min-h-[50vh] lg:min-h-0">
                    <div ref={containerRef} className="w-full h-full absolute inset-0" />
                    <AnimatePresence>
                        {!jitsiReady && (
                            <motion.div
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900 flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                    >
                                        <Video className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <p className="text-slate-400 font-bold text-sm">Connexion à la salle...</p>
                                    <p className="text-slate-600 text-xs mt-1">Veuillez autoriser l'accès caméra et micro</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ─── INFO SIDEBAR ─── */}
                <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col overflow-y-auto shrink-0">
                    {/* Session Status */}
                    <div className="p-5 border-b border-white/5">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isSessionActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800'}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${isSessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</p>
                                <p className={`text-sm font-bold ${isSessionActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {isSessionActive ? 'En cours · ' + formatDuration(sessionSeconds) : 'En attente'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Session Info */}
                    <div className="p-5 border-b border-white/5">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4">Détails</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />
                                <span className="text-sm font-bold text-white">{subjectName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-300">{formatDate(booking?.date, booking?.time)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-violet-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-300">Durée prévue : {booking?.duration_hours}h</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-sky-400 shrink-0" />
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Professeur</p>
                                    <p className="text-xs font-bold text-white">{teacherName}</p>
                                </div>
                            </div>
                            {studentName && (
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Élève</p>
                                        <p className="text-xs font-bold text-white">{studentName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meeting Link */}
                    <div className="p-5 border-b border-white/5">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-3">Lien de la salle</h3>
                        <div className="bg-white/5 rounded-xl p-3 break-all text-[10px] text-slate-400 font-mono mb-3 leading-relaxed">
                            {roomUrl}
                        </div>
                        <button
                            onClick={copyLink}
                            className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                            {copied ? <><CheckCheck className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier le lien</>}
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="p-5">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-3">Conseils</h3>
                        <div className="space-y-2 text-[11px] text-slate-500">
                            <p className="flex items-center gap-2"><Wifi className="w-3 h-3 text-sky-500 shrink-0" /> Connexion stable recommandée</p>
                            <p className="flex items-center gap-2"><Video className="w-3 h-3 text-violet-500 shrink-0" /> Testez votre caméra avant de commencer</p>
                            <p className="flex items-center gap-2"><Timer className="w-3 h-3 text-emerald-500 shrink-0" /> La durée est enregistrée automatiquement</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── END SESSION CONFIRMATION MODAL ─── */}
            <AnimatePresence>
                {showEndConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
                            onClick={() => setShowEndConfirm(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 w-full md:w-[400px] bg-slate-800 rounded-[2rem] p-8 z-[201] border border-white/10 shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <PhoneOff className="w-8 h-8 text-red-400" />
                            </div>
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-black text-white mb-2">Terminer la séance ?</h2>
                                <p className="text-slate-400 text-sm">La durée de session sera enregistrée et le cours marqué comme terminé.</p>
                                {isSessionActive && (
                                    <div className="mt-4 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl inline-block">
                                        <span className="text-violet-300 font-black text-lg tabular-nums">{formatDuration(sessionSeconds)}</span>
                                        <p className="text-violet-400/60 text-[10px] font-bold uppercase tracking-widest">Durée actuelle</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEndConfirm(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Continuer
                                </button>
                                <button
                                    onClick={handleEndSession}
                                    disabled={ending}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {ending ? 'Fermeture...' : 'Terminer'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VirtualClassroomPage;
