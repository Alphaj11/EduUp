import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, ChevronDown, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Chatbot = () => {
    const { user } = useAuth();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Bonjour ! Je suis EduBot, votre guide d'utilisation. Comment puis-je vous aider aujourd'hui ? (Si vous rencontrez un problème technique, vous pouvez à tout moment cliquer sur 'Signaler')", isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Ticket State
    const [mode, setMode] = useState('chat'); // 'chat' | 'ticket' | 'ticket_success'
    const [ticketMessage, setTicketMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    const messagesEndRef = useRef(null);

    // Scroll to bottom helper
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, mode, isOpen, isMinimized]);

    // Hide chatbot on messages page or if not logged in
    if (!user || location.pathname === '/messages') return null;

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        const userMsgObj = { 
            text: userMsg, 
            isBot: false, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };

        setMessages(prev => [...prev, userMsgObj]);
        setInput('');
        setIsLoading(true);

        // Prepare history for API (excluding the intro message to keep context clean, or keeping all)
        const historyToSend = messages.map(msg => ({
            text: msg.text,
            isBot: msg.isBot
        }));

        try {
            const res = await api.post('chatbot/', { message: userMsg, history: historyToSend });
            setMessages(prev => [...prev, { 
                text: res.data.response, 
                isBot: true, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }]);
        } catch (error) {
            console.error("Chatbot API Error:", error);
            setMessages(prev => [...prev, { 
                text: "Désolé, je rencontre des difficultés pour me connecter. Si vous rencontrez un problème technique persistant, veuillez le signaler aux administrateurs en cliquant sur le bouton de signalement en haut.", 
                isBot: true, 
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendTicket = async (e) => {
        e.preventDefault();
        if (!ticketMessage.trim() || isSubmittingTicket) return;

        try {
            setIsSubmittingTicket(true);
            await api.post('support-tickets/', { message: ticketMessage.trim() });
            setTicketMessage('');
            setMode('ticket_success');
        } catch (error) {
            console.error("Error creating support ticket:", error);
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-28 lg:bottom-8 right-8 w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[100] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <MessageCircle className="w-7 h-7 relative z-10 group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-sky-500 rounded-full border-4 border-white animate-pulse z-20"></div>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95, transformOrigin: 'bottom right' }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            height: isMinimized ? '80px' : 'min(600px, calc(100vh - 140px))'
                        }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-28 lg:bottom-8 right-4 lg:right-8 w-[400px] max-w-[calc(100vw-32px)] lg:max-w-[calc(100vw-64px)] bg-white rounded-[2.5rem] shadow-premium border border-white/50 z-[110] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-slate-950 p-6 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-600/10 rounded-full blur-3xl"></div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black flex items-center gap-2 uppercase tracking-tight">EduBot <Sparkles className="w-3 h-3 text-sky-400" /></h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">Assistant Actif</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 relative z-10">
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                                >
                                    <motion.div animate={{ rotate: isMinimized ? 180 : 0 }}>
                                        <ChevronDown className="w-4 h-4" />
                                    </motion.div>
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-slate-400 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Chat Mode */}
                                {mode === 'chat' && (
                                    <>
                                        {/* Ticket Banner */}
                                        <div className="bg-amber-50 border-b border-amber-100/60 p-3 text-center text-[10px] font-bold text-amber-800 flex justify-between items-center px-6 shrink-0">
                                            <span>Un bug ou un problème technique ?</span>
                                            <button 
                                                onClick={() => setMode('ticket')} 
                                                className="bg-amber-600 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider font-black hover:bg-amber-700 transition-colors shadow-sm"
                                            >
                                                Signaler
                                            </button>
                                        </div>

                                        {/* Messages Area */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 scrollbar-hide">
                                            {messages.map((m, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: m.isBot ? -10 : 10, y: 5 }}
                                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                                    key={i}
                                                    className={`flex flex-col ${m.isBot ? 'items-start' : 'items-end'}`}
                                                >
                                                    <div className={`max-w-[85%] p-5 rounded-[1.5rem] text-xs font-bold leading-relaxed shadow-sm ${m.isBot
                                                        ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                                        : 'bg-slate-950 text-white rounded-tr-none'
                                                        }`}>
                                                        {m.text}
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2">
                                                        {m.time || 'A l\'instant'}
                                                    </span>
                                                </motion.div>
                                            ))}
                                            {isLoading && (
                                                <div className="flex items-center gap-2 text-slate-400 px-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">EduBot réfléchit...</span>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Input Area */}
                                        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                                            <form onSubmit={handleSend} className="relative group">
                                                <input
                                                    type="text"
                                                    disabled={isLoading}
                                                    placeholder="Comment pouvons-nous vous aider ?"
                                                    className="w-full bg-slate-50 border-2 border-transparent rounded-[1.2rem] pl-6 pr-14 py-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 shadow-inner disabled:opacity-60"
                                                    value={input}
                                                    onChange={(e) => setInput(e.target.value)}
                                                />
                                                <button 
                                                    type="submit"
                                                    disabled={isLoading || !input.trim()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-slate-950 text-white rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-slate-200 active:scale-90 group-hover:rotate-12 disabled:opacity-50 disabled:hover:bg-slate-950"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </form>
                                            <p className="text-[8px] text-center text-slate-400 mt-4 uppercase font-black tracking-widest italic">
                                                Propulsé par EduUp AI • zone CEMAC
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Ticket Submission Mode */}
                                {mode === 'ticket' && (
                                    <div className="flex-1 p-8 flex flex-col bg-slate-50/50 justify-between overflow-y-auto">
                                        <div className="space-y-4">
                                            <button 
                                                onClick={() => setMode('chat')}
                                                className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-950 transition-colors uppercase tracking-wider"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Retour
                                            </button>

                                            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-3 text-amber-800">
                                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                                <div>
                                                    <h5 className="font-black text-xs uppercase tracking-wider mb-1">Signaler un Problème</h5>
                                                    <p className="text-[10px] font-bold leading-relaxed">
                                                        Décrivez l'erreur ou le problème technique que vous rencontrez. Un ticket sera directement transmis aux administrateurs de EduUp pour résolution.
                                                    </p>
                                                </div>
                                            </div>

                                            <form onSubmit={handleSendTicket} className="space-y-4">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2">Description du problème</label>
                                                    <textarea
                                                        rows={5}
                                                        required
                                                        value={ticketMessage}
                                                        onChange={(e) => setTicketMessage(e.target.value)}
                                                        placeholder="Veuillez décrire le bug rencontré (ex: erreur de paiement, problème de connexion visio...)"
                                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingTicket || !ticketMessage.trim()}
                                                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-900/10 active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isSubmittingTicket ? 'Envoi en cours...' : 'Envoyer le Ticket'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* Ticket Success Mode */}
                                {mode === 'ticket_success' && (
                                    <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-6 bg-slate-50/50">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                            <CheckCircle2 className="w-8 h-8 animate-bounce" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Ticket Créé avec Succès !</h4>
                                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                                                Votre problème a été enregistré et transmis à nos administrateurs. Nous vous tiendrons informé de son évolution.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setMode('chat')}
                                            className="px-6 py-3 bg-slate-950 hover:bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                                        >
                                            Retour au Chat
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
