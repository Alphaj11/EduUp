import React, { useState, useEffect } from 'react';
import { BookOpen, Menu, X, ChevronDown, LogOut, LayoutDashboard, MessageSquare, User, Search, ArrowRight, Bell, Calendar } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LogoutModal from './LogoutModal';
import api from '../api/axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:8000';

const getAvatarUrl = (user) => {
    if (!user) return `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`;
    if (user.profile_picture) {
        if (user.profile_picture.startsWith('http')) return user.profile_picture;
        return `${API_BASE}${user.profile_picture}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`;
};

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchUnread = async () => {
            if (!user) return;
            try {
                const res = await api.get('messages/conversations/');
                const count = res.data.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
                setUnreadCount(count);
            } catch (err) {
                console.error("Error fetching unread count");
            }
        };

        const fetchNotifications = async () => {
            if (!user) return;
            try {
                const res = await api.get('notifications/');
                // Filter notifications based on role and requirement
                // Students: only booking_confirmed, booking_cancelled
                // Teachers: only new_booking
                const filtered = res.data.filter(n => {
                    if (user.role === 'student') {
                        return n.type === 'booking_confirmed' || n.type === 'booking_cancelled' || n.type === 'new_booking' || n.type === 'message';
                    } else if (user.role === 'teacher') {
                        return n.type === 'new_booking' || n.type === 'message';
                    }
                    return false;
                });
                setNotifications(filtered);
                setUnreadNotificationsCount(filtered.filter(n => !n.is_read).length);
            } catch (err) {
                console.error("Error fetching notifications");
            }
        };

        fetchUnread();
        fetchNotifications();
        const interval = setInterval(() => {
            fetchUnread();
            fetchNotifications();
        }, 15000);
        return () => clearInterval(interval);
    }, [user, location.pathname]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const noNavbarRoutes = ['/login', '/register', '/forgot-password'];
    const isNoNavbarRoute = noNavbarRoutes.includes(location.pathname) || location.pathname.startsWith('/classroom/');

    const navLinks = user?.role === 'teacher'
        ? [
            { name: 'Pourquoi nous ?', href: '/#features' },
            { name: 'Comment ça marche', href: '/#how-it-works' },
        ]
        : [
            { name: 'Pourquoi nous ?', href: '/#features' },
            { name: 'Comment ça marche', href: '/#how-it-works' },
            { name: 'Trouver un Professeur', href: '/tutors' },
        ];

    const handleLogoutConfirm = async () => {
        try {
            await api.patch('users/presence/', { is_online: false });
        } catch (e) { }
        setShowLogoutModal(false);
        logout(navigate);
    };


    const avatarUrl = getAvatarUrl(user);

    if (isNoNavbarRoute) return null;

    return (
        <>
            <LogoutModal
                isOpen={showLogoutModal}
                onConfirm={handleLogoutConfirm}
                onCancel={() => setShowLogoutModal(false)}
            />

            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'}`}>
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className={`rounded-2xl px-5 py-3 flex items-center justify-between transition-all duration-300 ${isScrolled
                        ? 'bg-white/95 shadow-lg shadow-slate-200/50 border border-slate-100 backdrop-blur-xl'
                        : 'bg-white/70 shadow-sm border border-white/80 backdrop-blur-md'
                        }`}>

                        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                            <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-all">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-slate-900">
                                Edu<span className="text-sky-500">Up</span>
                            </span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.href}
                                    className={`text-[10px] font-black uppercase tracking-widest transition-colors relative group ${location.pathname === link.href
                                        ? 'text-sky-600'
                                        : 'text-slate-500 hover:text-sky-600'
                                        }`}
                                >
                                    {link.name}
                                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-sky-500 rounded-full transition-all duration-300 ${location.pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                                        }`} />
                                </Link>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-slate-800">
                            <div className="hidden lg:flex items-center gap-2">
                                {user ? (
                                    <>
                                        <Link
                                            to="/messages"
                                            className="p-2.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all relative"
                                            title="Messages"
                                        >
                                            <MessageSquare className="w-5 h-5" />
                                            {unreadCount > 0 && (
                                                <span className="absolute top-2 right-2 flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                </span>
                                            )}
                                        </Link>

                                        <div className="relative">
                                            <button
                                                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                                                className={`p-2.5 rounded-xl transition-all relative ${showNotificationsDropdown ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'}`}
                                                title="Notifications"
                                            >
                                                <Bell className="w-5 h-5" />
                                                {unreadNotificationsCount > 0 && (
                                                    <span className="absolute top-2 right-2 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                            </button>

                                            <AnimatePresence>
                                                {showNotificationsDropdown && (
                                                    <>
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            onClick={() => setShowNotificationsDropdown(false)}
                                                            className="fixed inset-0 z-10"
                                                        />
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                            className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 origin-top-left md:origin-top-right"
                                                        >
                                                            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</span>
                                                                {notifications.length > 0 && (
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await api.patch('notifications/mark_all_read/');
                                                                                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                                                                    setUnreadNotificationsCount(0);
                                                                                } catch (e) {
                                                                                    console.error(e);
                                                                                }
                                                                            }}
                                                                            className="text-[9px] font-bold text-sky-600 hover:underline"
                                                                        >
                                                                            Tout lu
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (window.confirm('Supprimer toutes les notifications ?')) {
                                                                                    try {
                                                                                        await api.delete('notifications/delete_all/');
                                                                                        setNotifications([]);
                                                                                        setUnreadNotificationsCount(0);
                                                                                    } catch (e) {
                                                                                        console.error(e);
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="text-[9px] font-bold text-red-500 hover:underline"
                                                                        >
                                                                            Supprimer
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="max-h-[400px] overflow-y-auto">
                                                                {notifications.length === 0 ? (
                                                                    <div className="p-8 text-center">
                                                                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                                                        <p className="text-xs text-slate-400 font-medium">Aucune notification</p>
                                                                    </div>
                                                                ) : (
                                                                    notifications.slice(0, 10).map((notif) => (
                                                                        <button
                                                                            key={notif.id}
                                                                            onClick={async () => {
                                                                                if (!notif.is_read) {
                                                                                    try {
                                                                                        await api.patch(`notifications/${notif.id}/mark_read/`);
                                                                                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                                                                                        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
                                                                                    } catch (e) {
                                                                                        console.error(e);
                                                                                    }
                                                                                }
                                                                                setShowNotificationsDropdown(false);
                                                                                if (notif.type === 'message') {
                                                                                    navigate('/messages');
                                                                                } else if (notif.type.startsWith('booking_') || notif.type === 'new_booking') {
                                                                                    navigate(user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
                                                                                }
                                                                            }}
                                                                            className={`w-full p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 ${!notif.is_read ? 'bg-sky-50/30' : ''}`}
                                                                        >
                                                                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${notif.type === 'message' ? 'bg-blue-100 text-blue-600' :
                                                                                notif.type === 'booking_confirmed' ? 'bg-emerald-100 text-emerald-600' :
                                                                                    notif.type === 'booking_cancelled' ? 'bg-red-100 text-red-600' :
                                                                                        'bg-amber-100 text-amber-600'
                                                                                }`}>
                                                                                {notif.type === 'message' ? <MessageSquare className="w-4 h-4" /> :
                                                                                    notif.type.includes('booking') ? <Calendar className="w-4 h-4" /> :
                                                                                        <Bell className="w-4 h-4" />}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-[11px] font-bold text-slate-900 leading-tight mb-0.5">{notif.title}</p>
                                                                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-normal">{notif.content}</p>
                                                                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                                                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </p>
                                                                            </div>
                                                                            {!notif.is_read && (
                                                                                <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1"></div>
                                                                            )}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <Link
                                            to={(user.role === 'admin' || user.is_superuser) ? '/admin-dashboard' : user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg"
                                        >
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            Mon Espace
                                        </Link>

                                        <Link
                                            to="/profile"
                                            className="p-1 hover:ring-2 hover:ring-sky-400 rounded-xl transition-all"
                                            title="Mon profil"
                                        >
                                            <img
                                                src={avatarUrl}
                                                className="w-8 h-8 rounded-lg object-cover bg-slate-100"
                                                alt="avatar"
                                                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`; }}
                                            />
                                        </Link>

                                        <button
                                            onClick={() => setShowLogoutModal(true)}
                                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Déconnexion"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sky-600 transition-colors">
                                            Connexion
                                        </Link>
                                        <Link to="/register" className="px-6 py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all shadow-lg shadow-sky-500/20">
                                            Commencer
                                        </Link>
                                    </>
                                )}
                            </div>

                            <button
                                className="lg:hidden w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed top-0 right-0 bottom-0 w-[80vw] max-w-sm bg-white z-[120] lg:hidden overflow-y-auto p-8 shadow-2xl"
                            >
                                <div className="h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-12">
                                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <span className="font-black text-slate-900">EduUp</span>
                                        </Link>
                                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                                            <X className="w-5 h-5 text-slate-900" />
                                        </button>
                                    </div>

                                    {user && (
                                        <div className="mb-10 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                            <img src={avatarUrl} className="w-12 h-12 rounded-xl object-cover bg-white" alt="" />
                                            <div>
                                                <p className="font-black text-slate-900 text-sm leading-tight">{user.first_name} {user.last_name}</p>
                                                <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{user.role}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 flex-1">
                                        {navLinks.map((link) => (
                                            <Link
                                                key={link.name}
                                                to={link.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block py-4 text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 hover:text-sky-600 transition-colors"
                                            >
                                                {link.name}
                                            </Link>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-8 border-t border-slate-100 space-y-4">
                                        {!user ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white rounded-xl">Connexion</Link>
                                                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center font-black text-[10px] uppercase tracking-widest border-2 border-slate-100 rounded-xl">Inscription</Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                <Link
                                                    to={(user.role === 'admin' || user.is_superuser) ? '/admin-dashboard' : user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="w-full py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <LayoutDashboard className="w-4 h-4" /> Mon Espace
                                                </Link>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Link to="/messages" onClick={() => setIsMobileMenuOpen(false)} className="py-4 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                        <MessageSquare className="w-4 h-4" /> Chat
                                                    </Link>
                                                    <button onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} className="py-4 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                        <LogOut className="w-4 h-4" /> Quitter
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </nav>
        </>
    );
};

export default Navbar;
