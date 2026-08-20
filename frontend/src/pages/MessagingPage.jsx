import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Send, ArrowLeft, MessageSquare, Search, CheckCheck,
    Check, Video, Loader2, Phone, MoreVertical, Smile, Sticker,
    Paperclip, Info, X, Plus, Users, UserPlus, Image as ImageIcon, FileText,
    Download, CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import api from '../api/axios';
import EmojiPicker from 'emoji-picker-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/').split('/api')[0];

const getAvatarUrl = (user) => {
    if (!user) return `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`;
    if (user.profile_picture) {
        if (user.profile_picture.startsWith('http')) return user.profile_picture;
        return `${API_BASE}${user.profile_picture}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.id}`;
};

const OnlineBadge = ({ isOnline, className = "" }) => {
    return (
        <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full sm:w-3.5 sm:h-3.5 shadow-sm transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-slate-300'} ${className}`}></span>
    );
};

const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Hors ligne";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Vu à l'instant";
    if (diff < 3600000) return `Vu il y a ${Math.floor(diff / 60000)} min`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return `Vu aujourd'hui à ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return `Vu le ${date.toLocaleDateString()} à ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const STICKERS = [
    { id: 's1', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=angel' },
    { id: 's2', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool' },
    { id: 's3', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=devil' },
    { id: 's4', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=love' },
    { id: 's5', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=party' },
    { id: 's6', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=smart' },
    { id: 's7', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=wink' },
    { id: 's8', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=cry' },
    { id: 's9', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=surprised' },
    { id: 's10', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=heart-eyes' },
];

const MessagingPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const withUserId = searchParams.get('with');
    const bookingId = searchParams.get('booking');

    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sending, setSending] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileList, setShowMobileList] = useState(true);

    // New States for WhatsApp-style features
    const [viewMode, setViewMode] = useState('conversations'); // 'conversations', 'contacts', 'new_group'
    const [contacts, setContacts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedContactsForGroup, setSelectedContactsForGroup] = useState([]);
    const [isDeletingConversation, setIsDeletingConversation] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isGroupAdmin, setIsGroupAdmin] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Global call state from context
    const { initiateCall: initiateCallGlobal, callStatus, setIncomingCall } = useCall();

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const sendSound = useRef(typeof Audio !== "undefined" ? new Audio('/notif_alert.mp3') : null);
    const initialLoadRef = useRef(false);

    const scrollToBottom = useCallback((force = false) => {
        if (force || isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isAtBottom]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(atBottom);
    };

    const loadConversations = useCallback(async (autoSelect = false) => {
        try {
            const res = await api.get('messages/conversations/');
            const convs = res.data.conversations || (Array.isArray(res.data) ? res.data : []);
            const globalActiveCall = res.data.active_call;

            setConversations(convs);

            // Global Call Detection: If an incoming call is detected anywhere, show the overlay
            if (globalActiveCall && callStatus === 'idle' && globalActiveCall.sender !== user?.id) {
                setActiveCall(globalActiveCall);
                setCallStatus('receiving');
            } else if (!globalActiveCall && (callStatus === 'receiving' || (callStatus === 'calling' && activeCall?.sender === user?.id))) {
                // Call was cancelled or declined elsewhere
                setCallStatus('idle');
                setActiveCall(null);
            }

            if (autoSelect && withUserId) {
                const isGroup = searchParams.get('is_group') === 'true';
                const match = convs.find(c => {
                    if (isGroup) {
                        return c.is_group && String(c.group?.id) === String(withUserId);
                    } else {
                        return !c.is_group && String(c.partner?.id) === String(withUserId);
                    }
                });

                if (match) {
                    setSelectedPartner(match.is_group ? { ...match.group, is_group: true } : match.partner);
                    setShowMobileList(false);
                } else {
                    if (isGroup) {
                        try {
                            const groupRes = await api.get(`groups/${withUserId}/`);
                            setSelectedPartner({ ...groupRes.data, is_group: true });
                            setShowMobileList(false);
                        } catch (err) {
                            if (err.response?.status === 404 || err.response?.status === 403) {
                                navigate('/404', { replace: true });
                            } else {
                                setSelectedPartner({ id: withUserId, is_group: true });
                                setShowMobileList(false);
                            }
                        }
                    } else {
                        try {
                            const userRes = await api.get(`users/${withUserId}/`);
                            setSelectedPartner(userRes.data);
                            setShowMobileList(false);
                        } catch (err) {
                            if (err.response?.status === 404 || err.response?.status === 403) {
                                navigate('/404', { replace: true });
                            } else {
                                setSelectedPartner({ id: withUserId });
                                setShowMobileList(false);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error loading conversations:", err);
        } finally {
            setLoadingConvs(false);
        }
    }, [withUserId, searchParams, navigate]);

    const loadMessages = useCallback(async () => {
        if (!selectedPartner?.id) return;
        try {
            const params = selectedPartner.is_group
                ? `group=${selectedPartner.id}`
                : `conversation_with=${selectedPartner.id}`;
            const res = await api.get(`messages/?${params}`);

            setMessages(res.data);

            if (!initialLoadRef.current) {
                initialLoadRef.current = true;
            }

            if (res.data.length > 0) {
                const hasUnread = res.data.some(m => !m.is_read && (m.receiver === user?.id || (m.group && m.sender !== user?.id)));
                if (hasUnread) {
                    const payload = selectedPartner.is_group
                        ? { group_id: selectedPartner.id }
                        : { partner_id: selectedPartner.id };
                    api.patch('messages/mark_conversation_read/', payload).then(() => {
                        loadConversations();
                    }).catch(() => { });
                }
            }
        } catch (err) {
            console.error("Error loading messages:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPartner?.id, user?.id, selectedPartner?.is_group]);


    const loadContactsAndGroups = useCallback(async () => {
        try {
            const [contactsRes, groupsRes] = await Promise.all([
                api.get('users/chat-contacts/'),
                api.get('groups/')
            ]);
            setContacts(contactsRes.data);
            setGroups(groupsRes.data);
        } catch (err) {
            console.error("Error loading contacts/groups", err);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await loadConversations(true);
            await loadContactsAndGroups();
        };
        init();
    }, [withUserId, loadConversations, loadContactsAndGroups]);

    useEffect(() => {
        if (selectedPartner?.id) {
            setLoadingMsgs(true);
            // Don't reset initialLoadRef here to avoid loops
            loadMessages().finally(() => setLoadingMsgs(false));

            if (selectedPartner.is_group) {
                const groupObj = groups.find(g => g.id === selectedPartner.id);
                setIsGroupAdmin(groupObj?.admin === user?.id || groupObj?.admin_details?.id === user?.id);
            } else {
                setIsGroupAdmin(false);
            }

            const interval = setInterval(() => {
                loadMessages(true);
                loadConversations();
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [selectedPartner?.id, selectedPartner?.is_group, groups, user?.id, loadMessages, loadConversations]);



    useEffect(() => {
        if (selectedPartner) {
            const match = conversations.find(c =>
                (c.is_group && c.group?.id === selectedPartner.id && selectedPartner.is_group) ||
                (!c.is_group && c.partner?.id === selectedPartner.id && !selectedPartner.is_group)
            );
            if (match) {
                const updatedData = match.is_group ? match.group : match.partner;
                // Update only if relevant status fields changed to avoid unnecessary re-renders
                if (updatedData.is_online !== selectedPartner.is_online || updatedData.last_seen !== selectedPartner.last_seen) {
                    setSelectedPartner(match.is_group ? { ...updatedData, is_group: true } : updatedData);
                }
            }
        }
    }, [conversations, selectedPartner]);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || !selectedPartner?.id) return;
        setSending(true);
        const msgContent = newMessage.trim();
        const replyId = replyingTo?.id;
        setNewMessage('');
        setReplyingTo(null);

        // Optimistic update
        const tempMsg = {
            id: `temp-${Date.now()}`,
            sender: user?.id,
            sender_details: user,
            receiver: !selectedPartner.is_group ? selectedPartner.id : null,
            group: selectedPartner.is_group ? selectedPartner.id : null,
            content: msgContent,
            reply_to: replyId,
            reply_to_details: replyingTo,
            timestamp: new Date().toISOString(),
            is_read: false,
        };

        if (!attachment) {
            setMessages(prev => [...prev, tempMsg]);
        }
        if (sendSound.current) {
            // sendSound removed as per user request
            // sendSound.current.play().catch(e => console.log("Audio play blocked", e));
        }
        scrollToBottom();

        try {
            const payload = new FormData();
            if (msgContent) payload.append('content', msgContent);
            if (selectedPartner.is_group) {
                payload.append('group', selectedPartner.id);
            } else {
                payload.append('receiver', selectedPartner.id);
            }
            if (bookingId) payload.append('booking', parseInt(bookingId));
            if (attachment) {
                payload.append('file_attachment', attachment);
            }
            if (replyId) {
                payload.append('reply_to', replyId);
            }

            await api.post('messages/', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            await loadMessages();
            await loadConversations();
        } catch (err) {
            console.error(err);
            if (!attachment) {
                setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            }
        } finally {
            setSending(false);
        }
    };

    const sendSticker = async (stickerUrl) => {
        if (!selectedPartner?.id) return;
        setSending(true);
        setShowStickers(false);

        // Optimistic update
        const tempMsg = {
            id: `temp-${Date.now()}`,
            sender: user?.id,
            sender_details: user,
            receiver: !selectedPartner.is_group ? selectedPartner.id : null,
            group: selectedPartner.is_group ? selectedPartner.id : null,
            content: '',
            sticker_url: stickerUrl,
            is_sticker: true,
            timestamp: new Date().toISOString(),
            is_read: false,
        };

        setMessages(prev => [...prev, tempMsg]);
        if (sendSound.current) {
            // sendSound removed as per user request
            // sendSound.current.play().catch(e => console.log("Audio play blocked", e));
        }
        scrollToBottom();

        try {
            await api.post('messages/', {
                group: selectedPartner.is_group ? selectedPartner.id : null,
                receiver: !selectedPartner.is_group ? selectedPartner.id : null,
                sticker_url: stickerUrl,
                is_sticker: true
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            await loadMessages();
            await loadConversations();
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } finally {
            setSending(false);
        }
    };

    const selectConversation = (partner, isGroup = false) => {
        setSelectedPartner(isGroup ? { ...partner, is_group: true } : partner);
        setShowMobileList(false);
        setViewMode('conversations');
        setShowContactInfo(false);
        inputRef.current?.focus();
    };

    const deleteConversation = async () => {
        if (!selectedPartner) return;
        setIsDeletingConversation(true);
        try {
            if (selectedPartner.is_group) {
                await api.delete(`groups/${selectedPartner.id}/`);
            } else {
                await api.delete(`messages/delete_conversation/?partner_id=${selectedPartner.id}`);
            }
            setSelectedPartner(null);
            setShowDeleteConfirm(false);
            loadConversations(true);
        } catch (err) {
            console.error("Error deleting conversation", err);
        } finally {
            setIsDeletingConversation(false);
        }
    };

    // --- Call Handlers (delegate to global context) ---
    const initiateCall = async (type) => {
        if (!selectedPartner?.id) return;
        try {
            const callMsg = await initiateCallGlobal(selectedPartner, selectedPartner.is_group, type);
            if (callMsg) {
                // Add to local messages for immediate visual feedback
                setMessages(prev => [...prev, callMsg]);
            }
        } catch (err) {
            alert("Erreur lors du lancement de l'appel. Veuillez réessayer.");
        }
    };


    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLeaveGroup = async () => {
        if (!selectedPartner?.is_group) return;
        try {
            await api.post(`groups/${selectedPartner.id}/leave_group/`);
            setSelectedPartner(null);
            loadConversations();
            loadContactsAndGroups();
        } catch (err) {
            console.error("Error leaving group", err);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!selectedPartner?.is_group || !isGroupAdmin) return;
        try {
            await api.post(`groups/${selectedPartner.id}/remove_members/`, { user_ids: [memberId] });
            // Refresh group data
            loadContactsAndGroups();
            // If the group is current selected partner, we might need to update local state too
            const res = await api.get('groups/');
            setGroups(res.data);
            const updatedGroup = res.data.find(g => g.id === selectedPartner.id);
            if (updatedGroup) setSelectedPartner({ ...updatedGroup, is_group: true });
        } catch (err) {
            console.error("Error removing member", err);
        }
    };

    const handleDeleteGroup = async () => {
        if (!selectedPartner?.is_group || !isGroupAdmin) return;
        try {
            await api.delete(`groups/${selectedPartner.id}/`);
            setSelectedPartner(null);
            loadConversations();
            loadContactsAndGroups();
        } catch (err) {
            console.error("Error deleting group", err);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatConvTime = (timestamp) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return formatTime(timestamp);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Hier';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const formatDateSeparator = (timestamp) => {
        const d = new Date(timestamp);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Hier';
        return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const shouldShowDateSep = (msg, idx) => {
        if (idx === 0) return true;
        return formatDateSeparator(messages[idx - 1]?.timestamp) !== formatDateSeparator(msg.timestamp);
    };

    const filteredConvs = conversations.filter(c => {
        const name = c.is_group
            ? (c.group?.name || '').toLowerCase()
            : `${c.partner?.first_name || ''} ${c.partner?.last_name || ''}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const currentUserId = user?.id;
    const partnerName = selectedPartner?.is_group
        ? selectedPartner.name
        : selectedPartner?.first_name
            ? `${selectedPartner.first_name} ${selectedPartner.last_name || ''}`
            : `Utilisateur #${selectedPartner?.id}`;

    return (
        <div className="h-screen flex flex-col bg-slate-100 font-sans overflow-hidden">
            <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '80px' }}>
                {/* Conversations Sidebar */}
                <div className={`
                    ${showMobileList ? 'flex' : 'hidden'} md:flex
                    w-full md:w-[340px] lg:w-[380px] xl:w-[420px]
                    flex-col bg-white border-r border-slate-200 shrink-0
                `}>
                    {/* Search Header */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-xl font-black text-slate-900">
                                {viewMode === 'conversations' ? 'Messages' : viewMode === 'contacts' ? 'Nouveau Message' : 'Nouveau Groupe'}
                            </h1>
                            <div className="flex items-center gap-2">
                                {viewMode !== 'conversations' && (
                                    <button onClick={() => setViewMode('conversations')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                                    </button>
                                )}
                                {viewMode === 'conversations' && (
                                    <button onClick={() => setViewMode('contacts')} className="p-2 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-200 transition-colors shadow-sm">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-full text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:bg-slate-200 transition-colors border-none"
                            />
                        </div>
                    </div>

                    {/* List Area */}
                    <div className="flex-1 overflow-y-auto">
                        {viewMode === 'conversations' ? (
                            loadingConvs ? (
                                <div className="flex items-center justify-center p-10">
                                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                                </div>
                            ) : filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-10 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <MessageSquare className="w-7 h-7 text-slate-400" />
                                    </div>
                                    <p className="font-bold text-slate-500 text-sm">Aucune conversation</p>
                                    <p className="text-xs text-slate-400 mt-1">Réservez une séance pour commencer</p>
                                </div>
                            ) : (
                                filteredConvs.map((conv) => {
                                    const isSelected = selectedPartner?.id === (conv.is_group ? conv.group?.id : conv.partner?.id) &&
                                        (!!selectedPartner?.is_group === !!conv.is_group);
                                    const displayPartner = conv.is_group ? conv.group : conv.partner;
                                    if (!displayPartner) return null;

                                    return (
                                        <button
                                            key={`${conv.is_group ? 'group' : 'user'}-${displayPartner.id}`}
                                            onClick={() => selectConversation(displayPartner, conv.is_group)}
                                            className={`
                                                w-full flex items-center gap-4 px-4 py-4 border-b border-slate-50 transition-all text-left relative
                                                ${isSelected ? 'bg-sky-50 border-l-4 border-l-sky-500' : 'hover:bg-slate-50'}
                                            `}
                                        >
                                            <div className="relative shrink-0">
                                                {conv.is_group ? (
                                                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                                        {displayPartner.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img
                                                            src={getAvatarUrl(displayPartner)}
                                                            className="w-12 h-12 rounded-full object-cover bg-slate-100"
                                                            alt=""
                                                            onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayPartner?.id}`; }}
                                                        />
                                                        <OnlineBadge isOnline={displayPartner.is_online} />
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`font-bold text-sm truncate ${conv.unread_count > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        {conv.is_group ? (displayPartner.name || 'Groupe') : `${displayPartner.first_name || ''} ${displayPartner.last_name || ''}`.trim() || 'Utilisateur'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatConvTime(conv.last_time)}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                                                        {conv.last_message || 'Démarrer la conversation'}
                                                    </p>
                                                    {conv.unread_count > 0 && (
                                                        <span className="ml-2 min-w-[18px] h-[18px] bg-sky-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shrink-0">
                                                            {conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )
                        ) : viewMode === 'contacts' ? (
                            <div className="py-2">
                                <button
                                    onClick={() => setViewMode('new_group')}
                                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-sky-200">
                                        <Users className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-900">Nouveau Groupe</span>
                                </button>

                                {groups.length > 0 && (
                                    <>
                                        <div className="px-4 py-2 mt-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mes Groupes</span></div>
                                        {groups.map(g => (
                                            <button
                                                key={`group-${g.id}`}
                                                onClick={() => selectConversation(g, true)}
                                                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm ring-2 ring-white">
                                                    {g.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-sm text-slate-900 truncate">{g.name}</span>
                                            </button>
                                        ))}
                                    </>
                                )}

                                <div className="px-4 py-2 mt-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contacts sur EduUp</span></div>
                                {contacts.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                                    <button
                                        key={`contact-${c.id}`}
                                        onClick={() => selectConversation(c, false)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div className="relative shrink-0">
                                            <img
                                                src={getAvatarUrl(c)}
                                                className="w-10 h-10 rounded-full object-cover bg-slate-100"
                                                alt=""
                                                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`; }}
                                            />
                                            <OnlineBadge isOnline={c.is_online} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate text-slate-900">
                                                {c.first_name} {c.last_name}
                                            </div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{c.role === 'teacher' ? 'Enseignant' : 'Étudiant'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-2">
                                <div className="px-4 mb-4 mt-2">
                                    <input
                                        type="text"
                                        placeholder="Nom du groupe"
                                        className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 transition-all border-none"
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                    />
                                </div>
                                <div className="px-4 py-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sélectionner les participants ({selectedContactsForGroup.length})</span></div>
                                {contacts.map(c => (
                                    <button
                                        key={`sel-${c.id}`}
                                        onClick={() => {
                                            if (selectedContactsForGroup.includes(c.id)) {
                                                setSelectedContactsForGroup(prev => prev.filter(id => id !== c.id));
                                            } else {
                                                setSelectedContactsForGroup(prev => [...prev, c.id]);
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        <div className="relative shrink-0 flex items-center">
                                            <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center transition-colors ${selectedContactsForGroup.includes(c.id) ? 'bg-sky-500 border-sky-500' : 'border-slate-300 bg-white'}`}>
                                                {selectedContactsForGroup.includes(c.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <img
                                                src={getAvatarUrl(c)}
                                                className="w-10 h-10 rounded-full object-cover bg-slate-100"
                                                alt=""
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate text-slate-900">
                                                {c.first_name} {c.last_name}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                <div className="px-4 py-6">
                                    <button
                                        disabled={creatingGroup || !groupName.trim() || selectedContactsForGroup.length === 0}
                                        onClick={async () => {
                                            setCreatingGroup(true);
                                            try {
                                                const res = await api.post('groups/', {
                                                    name: groupName,
                                                    members: selectedContactsForGroup
                                                });
                                                const newGroup = res.data;
                                                setGroupName('');
                                                setSelectedContactsForGroup([]);
                                                setViewMode('conversations');
                                                await loadContactsAndGroups();
                                                await loadConversations();
                                                // Automatically select the new group
                                                selectConversation(newGroup, true);
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setCreatingGroup(false);
                                            }
                                        }}
                                        className="w-full py-3.5 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Créer le groupe
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-100 relative overflow-hidden`}
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 5a25 25 0 100 50 25 25 0 000-50z' fill='none' stroke='%23e2e8f0' stroke-width='0.5'/%3E%3C/svg%3E\")" }}>

                    {!selectedPartner ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                                    <MessageSquare className="w-12 h-12 text-sky-400" />
                                </div>
                                <h3 className="text-xl font-black text-slate-700 mb-2">EduUp Messages</h3>
                                <p className="text-slate-400 text-sm max-w-xs">Sélectionnez une conversation pour commencer à discuter avec votre professeur ou élève.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                                <button
                                    onClick={() => setShowMobileList(true)}
                                    className="md:hidden p-2 -ml-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <div className="relative shrink-0">
                                    {selectedPartner.is_group ? (
                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {selectedPartner.name?.substring(0, 2).toUpperCase()}
                                        </div>
                                    ) : (
                                        <>
                                            <img
                                                src={getAvatarUrl(selectedPartner)}
                                                className="w-10 h-10 rounded-full object-cover bg-slate-100 ring-2 ring-white shadow-sm"
                                                alt=""
                                                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPartner?.id}`; }}
                                            />
                                            <OnlineBadge isOnline={selectedPartner?.is_online} className="border-2 border-white w-3.5 h-3.5" />
                                        </>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowContactInfo(true)}>
                                    <h2 className="text-sm sm:text-lg font-black text-slate-900 truncate leading-tight hover:underline">
                                        {selectedPartner.is_group ? selectedPartner.name : `${selectedPartner.first_name} ${selectedPartner.last_name}`}
                                    </h2>
                                    {!selectedPartner.is_group && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${selectedPartner.is_online ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                            <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${selectedPartner.is_online ? 'text-green-600' : 'text-slate-500'}`}>
                                                {selectedPartner.is_online ? 'En ligne' : formatLastSeen(selectedPartner.last_seen)}
                                            </p>
                                        </div>
                                    )}
                                    {selectedPartner.is_group && (
                                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {selectedPartner.members_details?.length || 0} Membres
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => initiateCall('audio')}
                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="Appel Audio"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => initiateCall('video')}
                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="Appel Vidéo"
                                    >
                                        <Video className="w-5 h-5" />
                                    </button>
                                    {bookingId && (
                                        <Link
                                            to={`/classroom/${bookingId}`}
                                            className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                                            title="Rejoindre la classe virtuelle"
                                        >
                                            <Video className="w-5 h-5 text-violet-600" />
                                        </Link>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors" onClick={() => setShowContactInfo(!showContactInfo)}>
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onScroll={handleScroll}>
                                {loadingMsgs ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="bg-white rounded-2xl px-6 py-4 shadow-sm max-w-xs">
                                            <p className="text-slate-500 text-sm font-medium">Aucun message pour l'instant</p>
                                            <p className="text-slate-400 text-xs mt-1">Commencez la conversation ! 👋</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg, idx) => {
                                            const isMine = msg.sender === currentUserId || msg.sender_details?.id === currentUserId;
                                            const showSep = shouldShowDateSep(msg, idx);
                                            const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                            const isSameSender = prevMsg && prevMsg.sender === msg.sender && !showSep;
                                            const isConsecutive = idx > 0 && isMine === (prevMsg?.sender === currentUserId || prevMsg?.sender_details?.id === currentUserId) && !showSep;

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {showSep && (
                                                        <div className="flex items-center justify-center my-3">
                                                            <span className="bg-white/80 text-slate-500 text-[10px] font-semibold px-3 py-1 rounded-full shadow-sm">
                                                                {formatDateSeparator(msg.timestamp)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <motion.div
                                                        id={`msg-${msg.id}`}
                                                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        transition={{ duration: 0.15 }}
                                                        className={`flex group/msg ${isMine ? 'justify-end text-right' : 'justify-start'} ${isConsecutive ? 'mt-0.5' : 'mt-2'}`}
                                                    >
                                                        {isMine && (
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                className="opacity-0 group-hover/msg:opacity-100 p-2 text-slate-400 hover:text-sky-500 transition-all self-center mr-1"
                                                                title="Répondre"
                                                            >
                                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                                            </button>
                                                        )}
                                                        {/* Avatar for partner messages - show in private chat or show sender if in group */}
                                                        {!isMine && !isSameSender && (
                                                            <img
                                                                src={getAvatarUrl(msg.sender_details || { id: msg.sender })}
                                                                className="w-8 h-8 rounded-full object-cover mr-2 self-end shrink-0 shadow-sm"
                                                                alt=""
                                                                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender}`; }}
                                                            />
                                                        )}
                                                        {!isMine && isSameSender && <div className="w-8 mr-2 shrink-0" />}

                                                        <div className={`max-w-[85%] sm:max-w-[70%]`}>
                                                            <div className={`px-1 py-1 text-sm shadow-sm ${msg.is_sticker
                                                                ? 'bg-transparent shadow-none'
                                                                : (isMine ? 'bg-sky-500 text-white rounded-2xl rounded-br-sm' : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm')
                                                                }`}>
                                                                {!isMine && selectedPartner.is_group && !isSameSender && !msg.is_sticker && (
                                                                    <div className="px-3 pt-2 pb-1 text-[11px] font-black text-sky-600 flex items-center justify-between">
                                                                        <span>{msg.sender_details?.first_name} {msg.sender_details?.last_name}</span>
                                                                        {msg.sender === selectedPartner.admin && (
                                                                            <span className="text-[9px] bg-sky-50 px-1.5 py-0.5 rounded ml-2 uppercase tracking-tighter">Admin</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {msg.reply_to_details && (
                                                                    <div
                                                                        className={`mb-2 p-2 rounded-lg border-l-4 bg-black/5 text-left cursor-pointer hover:bg-black/10 transition-colors ${isMine ? 'border-white/50' : 'border-sky-500'}`}
                                                                        onClick={() => {
                                                                            const target = document.getElementById(`msg-${msg.reply_to_details.id}`);
                                                                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        }}
                                                                    >
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isMine ? 'text-white/80' : 'text-sky-600'}`}>
                                                                            {msg.reply_to_details.sender === currentUserId ? 'Vous' : (selectedPartner.is_group ? 'Message' : partnerName)}
                                                                        </p>
                                                                        <p className={`text-[11px] line-clamp-2 ${isMine ? 'text-white/90' : 'text-slate-600'}`}>
                                                                            {msg.reply_to_details.is_sticker ? '🎨 Sticker' : (msg.reply_to_details.file_attachment ? '📎 Fichier' : msg.reply_to_details.content)}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {msg.is_call ? (
                                                                    <div className="p-3 flex items-center gap-3 min-w-[180px]">
                                                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${isMine ? 'bg-white/20' : 'bg-sky-100'}`}>
                                                                            {msg.call_type === 'video' ? <Video className={`w-5 h-5 ${isMine ? 'text-white' : 'text-sky-600'}`} /> : <Phone className={`w-5 h-5 ${isMine ? 'text-white' : 'text-sky-600'}`} />}
                                                                        </div>
                                                                        <div className="flex-1 text-left min-w-0">
                                                                            <p className={`text-xs font-black uppercase tracking-tight truncate ${isMine ? 'text-white' : 'text-slate-900'}`}>
                                                                                {msg.call_status === 'missed' ? 'Appel manqué' :
                                                                                    msg.call_status === 'declined' ? 'Appel refusé' :
                                                                                        msg.call_status === 'ongoing' ? 'Appel en cours' :
                                                                                            msg.call_status === 'ended' ? 'Appel terminé' : 'Appel entrant'}
                                                                            </p>
                                                                            <p className={`text-[10px] font-bold opacity-70 ${isMine ? 'text-white' : 'text-slate-500'}`}>Appel {msg.call_type === 'video' ? 'vidéo' : 'audio'}</p>
                                                                            {msg.call_status === 'started' && !isMine && (
                                                                                <button
                                                                                    onClick={() => setIncomingCall(msg)}
                                                                                    className="mt-2 text-[10px] font-black uppercase tracking-widest bg-white text-sky-600 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
                                                                                >
                                                                                    Répondre
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : msg.is_sticker ? (
                                                                    <div className="p-1">
                                                                        {!isMine && selectedPartner.is_group && !isSameSender && (
                                                                            <div className="px-2 pb-1 text-[10px] font-bold text-slate-400">
                                                                                {msg.sender_details?.first_name} {msg.sender_details?.last_name}
                                                                            </div>
                                                                        )}
                                                                        <img src={msg.sticker_url || msg.file_attachment} alt="sticker" className="w-32 h-32 sm:w-40 sm:h-40 object-contain hover:scale-110 transition-transform cursor-pointer" />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {msg.file_attachment && (
                                                                            <div className="mb-1 rounded-xl overflow-hidden bg-white/20">
                                                                                {msg.file_attachment.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                                                    <div className="relative group/img">
                                                                                        <img
                                                                                            src={msg.file_attachment}
                                                                                            alt={msg.file_name || "Pièce jointe"}
                                                                                            className="max-w-full h-auto max-h-60 object-contain rounded-xl"
                                                                                        />
                                                                                        <a
                                                                                            href={msg.file_attachment}
                                                                                            download={msg.file_name || "image.png"}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/70"
                                                                                            title="Télécharger"
                                                                                        >
                                                                                            <Download className="w-4 h-4" />
                                                                                        </a>
                                                                                        {msg.file_name && (
                                                                                            <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/50 to-transparent text-[10px] text-white opacity-0 group-hover/img:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis">
                                                                                                {msg.file_name}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2 pr-2">
                                                                                        <a
                                                                                            href={msg.file_attachment}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className={`flex-1 flex items-center gap-3 p-3 text-sm font-semibold rounded-xl ${isMine ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-50'}`}
                                                                                        >
                                                                                            <div className={`p-2 rounded-lg ${isMine ? 'bg-white/20' : 'bg-sky-100'}`}>
                                                                                                <FileText className={`w-5 h-5 ${isMine ? 'text-white' : 'text-sky-600'}`} />
                                                                                            </div>
                                                                                            <span className="truncate">{msg.file_name || "Document joint"}</span>
                                                                                        </a>
                                                                                        <a
                                                                                            href={msg.file_attachment}
                                                                                            download={msg.file_name || "document"}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className={`p-2 rounded-full transition-colors ${isMine ? 'text-white hover:bg-white/20' : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'}`}
                                                                                            title="Télécharger"
                                                                                        >
                                                                                            <Download className="w-4 h-4" />
                                                                                        </a>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {msg.content && (
                                                                            <div className="px-3 pb-1 pt-1.5 break-words">
                                                                                {msg.content}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'justify-end text-right' : 'justify-start'}`}>
                                                                <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                                                                {isMine && (
                                                                    msg.is_read
                                                                        ? <CheckCheck className="w-3 h-3 text-sky-500" />
                                                                        : <Check className="w-3 h-3 text-slate-400" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        {!isMine && (
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                className="opacity-0 group-hover/msg:opacity-100 p-2 text-slate-400 hover:text-sky-500 transition-all self-center ml-1"
                                                                title="Répondre"
                                                            >
                                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                </React.Fragment>
                                            );
                                        })}
                                        <div ref={messagesEndRef} className="h-2" />
                                    </>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="bg-white border-t border-slate-200 p-2 sm:p-3 relative z-10">
                                <AnimatePresence>
                                    {replyingTo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            className="absolute bottom-full left-0 w-full p-3 bg-slate-50 border-t border-slate-200 shadow-lg flex items-center justify-between z-20"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden border-l-4 border-sky-500 pl-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                                                        Répondre à {replyingTo.sender === currentUserId ? 'vous' : (replyingTo.sender_details?.first_name || 'Utilisateur')}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {replyingTo.is_sticker ? '🎨 Sticker' : (replyingTo.file_attachment ? '📎 Fichier' : replyingTo.content)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} className="p-2 text-slate-400 hover:text-red-500 bg-white rounded-full transition-colors shrink-0 shadow-sm">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {attachment && (
                                    <div className="absolute bottom-full left-0 w-full p-3 bg-white border-t border-slate-200 shadow-lg flex items-center justify-between z-20">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                                                {attachment.type?.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-sky-500" /> : <FileText className="w-5 h-5 text-sky-500" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate">{attachment.name}</p>
                                                <p className="text-xs text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setAttachment(null); fileInputRef.current.value = ''; }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition-colors shrink-0">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Picker Popovers */}
                                <div className="relative">
                                    <AnimatePresence>
                                        {showStickers && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute bottom-full left-0 mb-4 p-4 bg-white rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-4 gap-3 z-50 w-80"
                                            >
                                                <div className="col-span-4 flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stickers</span>
                                                    <button onClick={() => setShowStickers(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                                                        <X className="w-4 h-4 text-slate-400" />
                                                    </button>
                                                </div>
                                                {STICKERS.map(sticker => (
                                                    <button
                                                        key={sticker.id}
                                                        onClick={() => sendSticker(sticker.url)}
                                                        className="p-1 hover:bg-slate-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                                    >
                                                        <img src={sticker.url} alt="sticker" className="w-14 h-14 object-contain" />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}

                                        {showEmojiPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200"
                                            >
                                                <EmojiPicker
                                                    onEmojiClick={(emojiData) => {
                                                        setNewMessage(prev => prev + emojiData.emoji);
                                                        inputRef.current?.focus();
                                                    }}
                                                    autoFocusSearch={false}
                                                    theme="light"
                                                    searchPlaceholder="Rechercher un emoji..."
                                                    width={320}
                                                    height={400}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <form onSubmit={sendMessage} className="flex items-end gap-1.5 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEmojiPicker(!showEmojiPicker);
                                            setShowStickers(false);
                                        }}
                                        className={`p-1.5 sm:p-2.5 rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'}`}
                                        title="Emojis"
                                    >
                                        <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowStickers(!showStickers);
                                            setShowEmojiPicker(false);
                                        }}
                                        className={`p-1.5 sm:p-2.5 rounded-full transition-colors shrink-0 ${showStickers ? 'bg-sky-50 text-sky-600' : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'}`}
                                        title="Stickers"
                                    >
                                        <Sticker className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-1.5 sm:p-2.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                                        title="Joindre un fichier"
                                    >
                                        <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setAttachment(e.target.files[0]);
                                                inputRef.current?.focus();
                                            }
                                        }}
                                    />

                                    <div className="flex-1 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center px-3 py-2 sm:px-4 sm:py-2.5">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Écrire un message..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onFocus={() => {
                                                setShowEmojiPicker(false);
                                                setShowStickers(false);
                                            }}
                                            className="flex-1 bg-transparent text-[13px] sm:text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && !attachment) || sending}
                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${(newMessage.trim() || attachment)
                                            ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-100'
                                            : 'bg-slate-100 text-slate-400'
                                            } disabled:opacity-50 active:scale-95`}
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>

                {/* Right Contact Info Sidebar */}
                <AnimatePresence>
                    {showContactInfo && selectedPartner && (
                        <>
                            {/* Mobile overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowContactInfo(false)}
                                className="lg:hidden fixed inset-0 bg-slate-900/40 z-[100] backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-[340px] max-w-full flex-col bg-slate-50 shadow-2xl z-[110] overflow-y-auto lg:relative lg:flex lg:border-l lg:border-slate-200 lg:shadow-none lg:z-auto lg:transform-none"
                            >
                                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                                    <button onClick={() => setShowContactInfo(false)} className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <h2 className="font-bold text-slate-900">Infos {selectedPartner.is_group ? 'du groupe' : 'du contact'}</h2>
                                </div>

                                <div className="p-8 flex flex-col items-center border-b border-slate-200 bg-white">
                                    <img
                                        src={getAvatarUrl(selectedPartner)}
                                        className="w-40 h-40 rounded-full object-cover shadow-md bg-slate-100 mb-4 ring-4 ring-slate-50"
                                        alt=""
                                    />
                                    <h3 className="text-2xl font-black text-slate-900 text-center mb-1">{partnerName}</h3>
                                    {!selectedPartner.is_group && (
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                                            {selectedPartner.role === 'teacher' ? 'Enseignant' : 'Étudiant'}
                                        </span>
                                    )}
                                    <p className="text-slate-500 text-sm font-medium mt-2">
                                        {selectedPartner.is_group ? `${selectedPartner.members?.length || 0} participants` : (selectedPartner.city || 'Non renseignée')}
                                    </p>
                                </div>

                                {!selectedPartner.is_group && selectedPartner.bio && (
                                    <div className="p-6 bg-white mt-2 border-y border-slate-200">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">À propos</h4>
                                        <p className="text-slate-700 text-sm leading-relaxed">{selectedPartner.bio}</p>
                                    </div>
                                )}

                                <div className="p-6 bg-white mt-2 border-y border-slate-200">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Fichiers partagés</h4>

                                    {messages.filter(m => m.file_attachment).length > 0 ? (
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {messages.filter(m => m.file_attachment).reverse().map(m => {
                                                const isImg = m.file_attachment.match(/\.(jpeg|jpg|gif|png)$/i);
                                                return (
                                                    <div key={`gallery-${m.id}`} className="group/item flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                                        <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center border border-slate-200`}>
                                                            {isImg ? (
                                                                <img src={m.file_attachment} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <FileText className="w-5 h-5 text-sky-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-900 truncate pr-2">
                                                                {m.file_name || "Document"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                {formatTime(m.timestamp)}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={m.file_attachment}
                                                            download={m.file_name || (isImg ? "image.png" : "document")}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-all opacity-0 group-hover/item:opacity-100"
                                                            title="Télécharger"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <FileText className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500">Aucun fichier</p>
                                        </div>
                                    )}
                                </div>

                                {/* Group Members Section */}
                                {selectedPartner.is_group && (
                                    <div className="p-6 bg-white mt-2 border-y border-slate-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Participants</h4>
                                            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{selectedPartner.members?.length || 0}</span>
                                        </div>
                                        <div className="space-y-3">
                                            {selectedPartner.members_details?.map(m => (
                                                <div key={`mem-${m.id}`} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <img src={getAvatarUrl(m)} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{m.first_name} {m.last_name} {m.id === user?.id && <span className="text-sky-500 ml-1">(Vous)</span>}</p>
                                                            {(m.id === selectedPartner.admin || m.id === selectedPartner.admin_details?.id) && (
                                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Admin</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isGroupAdmin && m.id !== user?.id && m.id !== selectedPartner.admin && (
                                                        <button
                                                            onClick={() => handleRemoveMember(m.id)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Retirer du groupe"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Management Actions */}
                                <div className="p-6 bg-white mt-2 border-y border-slate-200 space-y-3 pb-20">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">Gestion</h4>

                                    {selectedPartner.is_group ? (
                                        <>
                                            <button
                                                onClick={handleLeaveGroup}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 bg-amber-50 rounded-2xl hover:bg-amber-100 transition-colors"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Quitter le groupe
                                            </button>
                                            {isGroupAdmin && (
                                                <button
                                                    onClick={handleDeleteGroup}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                                                >
                                                    <X className="w-4 h-4" /> Supprimer le groupe
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" /> Supprimer la conversation
                                        </button>
                                    )}
                                </div>

                                {/* Delete Confirmation Modal Overlay */}
                                <AnimatePresence>
                                    {showDeleteConfirm && (
                                        <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
                                            <motion.div
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                            />
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full relative z-10 shadow-2xl text-center"
                                            >
                                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                    <X className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 mb-3">Supprimer ?</h3>
                                                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                                                    Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.
                                                </p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        className="py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                                    >
                                                        Annuler
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteConversation}
                                                        disabled={isDeletingConversation}
                                                        className="py-4 bg-red-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                                                    >
                                                        {isDeletingConversation ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Supprimer"}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MessagingPage;
