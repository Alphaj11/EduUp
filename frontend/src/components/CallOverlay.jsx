import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, X, Minimize2, ChevronUp } from 'lucide-react';
import { useCall } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';

const CallOverlay = () => {
    const { callStatus, activeCall, jitsiRoom, callTimer, isMinimized,
        respondToCall, endCall, minimizeCall, maximizeCall } = useCall();
    const { user } = useAuth();

    if (callStatus === 'idle') return null;

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/').split('/api')[0];

    const getAvatarUrl = (u) => {
        if (!u) return `https://api.dicebear.com/7.x/avataaars/svg?seed=default`;
        if (u.avatar) return u.avatar.startsWith('http') ? u.avatar : `${API_BASE}${u.avatar}`;
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id || 'default'}`;
    };

    const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const partner = String(activeCall?.sender) === String(user?.id)
        ? activeCall?.receiver_details
        : activeCall?.sender_details;

    const displayName = activeCall?.group
        ? activeCall.group_details?.name
        : (partner ? `${partner.first_name} ${partner.last_name}` : 'Utilisateur');

    const avatarUrl = getAvatarUrl(partner);

    // ── Minimized floating banner ──────────────────────────────────────
    if (isMinimized) {
        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-full shadow-2xl border border-white/10 cursor-pointer"
                onClick={maximizeCall}
            >
                <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                <span className="font-bold text-sm">{displayName}</span>
                {callStatus === 'ongoing' && (
                    <span className="text-emerald-400 font-black text-xs tabular-nums">{formatDuration(callTimer)}</span>
                )}
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center ml-1 animate-pulse">
                    <Phone className="w-4 h-4" />
                </div>
                <ChevronUp className="w-4 h-4 text-slate-400" />
            </motion.div>
        );
    }

    // ── Full-screen overlay ────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden"
            >

                {callStatus === 'ongoing' ? (
                    // ── Active Call (Jitsi) ──
                    <div className="w-full h-full relative">
                        <iframe
                            src={`https://meet.jit.si/${jitsiRoom}#config.startWithAudioMuted=false&config.startWithVideoMuted=${activeCall?.call_type === 'audio' ? 'true' : 'false'}&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","fullscreen","chat","raisehand","tileview"]`}
                            allow="camera; microphone; fullscreen; display-capture; autoplay"
                            className="w-full h-full border-0"
                            title="EduUp Call"
                        />
                        {/* Floating controls overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
                            <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 text-sm font-black tracking-widest uppercase">
                                {formatDuration(callTimer)}
                            </div>
                            <button
                                onClick={minimizeCall}
                                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 backdrop-blur-md border border-white/20"
                                title="Réduire"
                            >
                                <Minimize2 className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={endCall}
                                    className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
                                >
                                    <Phone className="w-6 h-6 rotate-[135deg]" />
                                </button>
                                <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Raccrocher</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    // ── Calling / Receiving screen ──
                    <>
                        <div className="relative mb-12">
                            <div className="absolute inset-0 bg-sky-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                            <img
                                src={avatarUrl}
                                className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl relative z-10 object-cover"
                                alt=""
                                onError={e => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=fallback`; }}
                            />
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-sky-500 rounded-full border-4 border-slate-900 flex items-center justify-center z-20">
                                {activeCall?.call_type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                            </div>
                        </div>

                        <h2 className="text-2xl font-black mb-2 text-center">{displayName}</h2>
                        <p className="text-sky-400 font-bold uppercase tracking-[0.2em] text-xs mb-16 animate-pulse">
                            {callStatus === 'calling' ? 'Appel en cours...' : 'Appel entrant...'}
                        </p>

                        <div className="flex gap-8">
                            {callStatus === 'receiving' ? (
                                <>
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => respondToCall('declined')}
                                            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                                        >
                                            <X className="w-7 h-7" />
                                        </button>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Décliner</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => respondToCall('ongoing')}
                                            className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-all animate-bounce active:scale-95"
                                        >
                                            <Phone className="w-7 h-7" />
                                        </button>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Décrocher</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={endCall}
                                        className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                                    >
                                        <Phone className="w-7 h-7 rotate-[135deg]" />
                                    </button>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Raccrocher</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default CallOverlay;
