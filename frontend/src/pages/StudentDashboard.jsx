import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, MessageSquare, User, Clock, CheckCircle,
    ArrowRight, BookOpen, Star, GraduationCap, LayoutDashboard,
    Bell, Settings, LogOut, Search, Plus, Sparkles, Menu, X, Video,
    Shield, MapPin, QrCode, Copy, CheckCheck, Timer, Home, FileDown,
    Download, FileText, ChevronLeft, ChevronRight, Wallet, CreditCard, Minus,
    Activity
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDesktop } from '../hooks/useDesktop';
import api from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const isDesktop = useDesktop();
    const navigate = useNavigate(); // Added navigate
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'history'
    const [historyFilters, setHistoryFilters] = useState({ startDate: '', endDate: '' });
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    // In-person validation code modal
    const [codeModal, setCodeModal] = useState(null); // { code, expiresAt, bookingId }
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [codeCountdown, setCodeCountdown] = useState(0);
    const codeIntervalRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Financial State
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);
    const location = useLocation();

    // Course request states
    const [courseOffers, setCourseOffers] = useState([]);
    const [showCourseRequestModal, setShowCourseRequestModal] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [levels, setLevels] = useState([]);
    const [requestData, setRequestData] = useState({
        subjects: [],
        level: '',
        rhythm: ''
    });
    const [userLocation, setUserLocation] = useState(null);
    const [postingRequest, setPostingRequest] = useState(false);

    useEffect(() => {
        if (showCourseRequestModal && subjects.length === 0) {
            api.get('subjects/').then(res => setSubjects(res.data)).catch(console.error);
            api.get('levels/').then(res => setLevels(res.data)).catch(console.error);
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                });
            }
        }
    }, [showCourseRequestModal, subjects.length]);

    const handlePublishRequest = async (e) => {
        e.preventDefault();
        if (!userLocation) {
            alert("Nous avons besoin de votre position pour vous trouver des professeurs à proximité.");
            return;
        }
        setPostingRequest(true);
        try {
            await api.post('course-requests/', {
                subjects: requestData.subjects,
                level: requestData.level,
                rhythm: requestData.rhythm,
                latitude: userLocation.lat,
                longitude: userLocation.lon
            });
            setShowCourseRequestModal(false);
            alert("Votre demande a été publiée avec succès sur la carte. Les professeurs aux alentours seront informés !");
            setRequestData({ subjects: [], level: '', rhythm: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Erreur lors de la publication de la demande.");
        } finally {
            setPostingRequest(false);
        }
    };

    const handleAcceptOffer = async (offerId) => {
        try {
            await api.post(`course-interests/${offerId}/accept_offer/`);
            alert("Offre acceptée ! Vous pouvez maintenant contacter le professeur via la messagerie pour finaliser la réservation.");
            setCourseOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o));
        } catch (e) {
            alert(e.response?.data?.error || "Erreur lors de l'acceptation de l'offre");
        }
    };

    const handleRejectOffer = async (offerId) => {
        if (!window.confirm("Êtes-vous sûr de vouloir refuser ce professeur ?")) return;
        try {
            await api.post(`course-interests/${offerId}/reject_offer/`);
            setCourseOffers(prev => prev.filter(o => o.id !== offerId));
        } catch (e) {
            alert(e.response?.data?.error || "Erreur lors du refus de l'offre");
        }
    };

    // Auto-confirm sandbox mock deposits on return from payment page
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const paymentStatus = params.get('payment');
        const ref = params.get('ref');
        if ((paymentStatus === 'mock_success' || paymentStatus === 'success') && ref) {
            // Confirm this deposit reference on the backend
            api.post('wallet/confirm_deposit/', { reference: ref })
                .then(res => {
                    // Refresh wallet data
                    api.get('wallet/me/').then(r => setWallet(r.data)).catch(() => { });
                    api.get('transactions/').then(r => setTransactions(r.data || r.data?.results || [])).catch(() => { });
                })
                .catch(() => {
                    // Already confirmed or not found — silently ignore
                });
            // Clean the URL so it doesn't retrigger on reload
            window.history.replaceState({}, '', '/student-dashboard');
        }
    }, [location.search]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update every 10s
        return () => clearInterval(timer);
    }, []);

    // ... (rest of logic)
    useEffect(() => {
        if (isDesktop) setIsSidebarOpen(false);
    }, [isDesktop]);

    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await api.get('bookings/');
                setBookings(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const fetchNotifications = async () => {
            try {
                const res = await api.get('notifications/');
                setNotifications(res.data);
                setUnreadNotificationsCount(res.data.filter(n => !n.is_read).length);
            } catch {
                console.error("Error fetching notifications");
            }
        };

        const fetchWalletData = async () => {
            try {
                const wRes = await api.get('wallet/me/');
                setWallet(wRes.data);
                const tRes = await api.get('transactions/');
                setTransactions(tRes.data);
            } catch (err) {
                console.error("Error fetching wallet data", err);
            }
        };

        const fetchOffers = async () => {
            try {
                const res = await api.get('course-interests/');
                setCourseOffers(res.data);
            } catch (err) {
                console.error("Error fetching course offers", err);
            }
        };

        fetchBookings();
        fetchNotifications();
        fetchWalletData();
        fetchOffers();

        const interval = setInterval(() => {
            fetchBookings();
            fetchNotifications();
            fetchWalletData();
            fetchOffers();
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Countdown for validation code
    useEffect(() => {
        if (codeModal?.expiresAt) {
            clearInterval(codeIntervalRef.current);
            const tick = () => {
                const secs = Math.max(0, Math.floor((new Date(codeModal.expiresAt) - Date.now()) / 1000));
                setCodeCountdown(secs);
                if (secs === 0) clearInterval(codeIntervalRef.current);
            };
            tick();
            codeIntervalRef.current = setInterval(tick, 1000);
        }
        return () => clearInterval(codeIntervalRef.current);
    }, [codeModal]);

    const handleGenerateCode = async (bookingId) => {
        setCodeLoading(true);
        try {
            const res = await api.post(`bookings/${bookingId}/generate_validation_code/`);
            setCodeModal({ code: res.data.code, expiresAt: res.data.expires_at, bookingId });
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur lors de la génération du code.');
        } finally {
            setCodeLoading(false);
        }
    };

    // Polling for pending deposits
    useEffect(() => {
        const interval = setInterval(async () => {
            const pending = transactions.filter(tx => tx.transaction_type === 'deposit' && tx.status === 'pending');
            if (pending.length > 0) {
                for (const tx of pending) {
                    try {
                        await api.post('wallet/confirm_deposit/', { reference: tx.reference_id });
                        const [walletRes, txRes] = await Promise.all([
                            api.get('wallet/me/'),
                            api.get('transactions/')
                        ]);
                        setWallet(walletRes.data);
                        setTransactions(txRes.data);
                        toast.success(`Dépôt ${tx.reference_id} confirmé !`);
                    } catch (e) {
                        // Still pending
                    }
                }
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [transactions]);

    const handleVerifyDeposit = async (ref) => {
        try {
            await api.post('wallet/confirm_deposit/', { reference: ref });
            const [walletRes, txRes] = await Promise.all([
                api.get('wallet/me/'),
                api.get('transactions/')
            ]);
            setWallet(walletRes.data);
            setTransactions(txRes.data);
            toast.success("Dépôt confirmé !");
        } catch (e) {
            toast.error("Le paiement est toujours en attente ou a échoué.");
        }
    };

    const handleDeposit = async () => {
        if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
            alert('Veuillez entrer un montant valide.');
            return;
        }
        if (!user.phone_number) {
            if (window.confirm("Vous devez renseigner votre numéro de téléphone (ainsi que votre pays et ville) dans votre profil avant de faire un dépôt.\nVoulez-vous aller sur votre profil maintenant ?")) {
                navigate('/profile');
            }
            return;
        }
        setDepositLoading(true);
        try {
            const res = await api.post('wallet/deposit/', {
                amount: depositAmount,
                redirect_base_url: window.location.origin
            });
            if (res.data.checkout_url) {
                // In sandbox mock mode, the checkout_url already redirects to success page
                window.location.href = res.data.checkout_url;
            } else {
                alert('URL de paiement introuvable dans la réponse.');
            }
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur lors de la création du dépôt.');
        } finally {
            setDepositLoading(false);
            setDepositAmount('');
        }
    };

    const copyCode = () => {
        const textToCopy = codeModal?.code || '';
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy using navigator.clipboard', err);
                fallbackCopyTextToClipboard(textToCopy);
            });
        } else {
            fallbackCopyTextToClipboard(textToCopy);
        }
    };

    const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure the textarea is not visible
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }

        document.body.removeChild(textArea);
    };

    const formatCountdown = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
    const historicalBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

    const filteredHistory = historicalBookings.filter(b => {
        if (!historyFilters.startDate && !historyFilters.endDate) return true;
        const bDate = new Date(b.date);
        const start = historyFilters.startDate ? new Date(historyFilters.startDate) : null;
        const end = historyFilters.endDate ? new Date(historyFilters.endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && bDate < start) return false;
        if (end && bDate > end) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const stats = {
        today: bookings.filter(b => b.date === todayStr).length,
        pending: bookings.filter(b => b.status === 'pending').length,
        validated: bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length
    };

    const downloadCSV = (data) => {
        const headers = ["Date", "Heure", "Professeur", "Matière", "Type", "Durée", "Statut"];
        const rows = data.map(b => [
            b.date,
            b.time,
            `${b.teacher_details?.user?.first_name} ${b.teacher_details?.user?.last_name || ''}`,
            b.subject_details?.name || '',
            b.course_type === 'online' ? 'En ligne' : 'Présentiel',
            `${b.duration_hours}h`,
            b.status === 'completed' ? 'Terminé' : b.status === 'cancelled' ? 'Annulé' : b.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `historique_cours_${user?.first_name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const totalSessions = filteredHistory.length;
        const totalHours = filteredHistory.reduce((acc, b) => acc + (b.duration_hours || 0), 0);

        // Premium Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 50, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text("EduUp", 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("RAPPORT D'ACTIVITÉ - ÉLÈVE", 190, 25, { align: 'right' });

        doc.setFontSize(9);
        doc.text(`Période: ${historyFilters.startDate || 'Début'} au ${historyFilters.endDate || 'Aujourd\'hui'}`, 190, 32, { align: 'right' });

        // Summary Cards
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(20, 60, 80, 25, 3, 3, 'F');
        doc.roundedRect(110, 60, 80, 25, 3, 3, 'F');

        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFontSize(8);
        doc.text("TOTAL SESSIONS", 30, 68);
        doc.text("TOTAL HEURES", 120, 68);

        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(totalSessions.toString(), 30, 78);
        doc.text(`${totalHours}h`, 120, 78);

        // User Detail
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`Élève: ${user?.first_name} ${user?.last_name}`, 20, 100);
        doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 190, 100, { align: 'right' });

        // Table
        const headers = [["Date", "Professeur", "Matière", "Type", "Durée", "Statut", "Paiement"]];
        const data = filteredHistory.map(b => [
            b.date,
            `${b.teacher_details?.user?.first_name} ${b.teacher_details?.user?.last_name}`,
            b.subject_details?.name || b.subject,
            b.course_type === 'online' ? 'En ligne' : 'Présentiel',
            `${b.duration_hours}h`,
            b.status === 'completed' ? 'Terminé' : 'Annulé',
            b.payment_status === 'paid' ? 'Payé' : 'À régler'
        ]);

        autoTable(doc, {
            startY: 110,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: {
                fillColor: [14, 165, 233],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 4,
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 25 },
                4: { halign: 'center', cellWidth: 15 },
                5: { halign: 'center' },
                6: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [255, 255, 255] }
        });

        doc.save(`historique_eduup_eleve_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <>
            <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-sky-100 relative">
                {/* Premium Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {!isDesktop && isSidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsSidebarOpen(false)}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140]"
                            />
                            <motion.aside
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed top-0 left-0 bottom-0 w-[80vw] max-w-sm bg-white z-[150] overflow-y-auto p-8 shadow-2xl"
                            >
                                <div className="h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-12">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <span className="font-black text-slate-900">EduUp</span>
                                        </div>
                                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                                            <X className="w-5 h-5 text-slate-900" />
                                        </button>
                                    </div>

                                    <div className="mb-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
                                        <img src={user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} className="w-14 h-14 rounded-2xl object-cover bg-white relative z-10" alt="" />
                                        <div className="relative z-10">
                                            <p className="font-black text-slate-900 text-sm leading-tight">{user?.first_name} {user?.last_name}</p>
                                            <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Étudiant Élite</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        {[
                                            { name: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard', action: () => setActiveTab('overview') },
                                            { name: 'Historique', icon: Clock, path: '/student-dashboard', action: () => setActiveTab('history') },
                                            { name: 'Offres Reçues', icon: Star, path: '/student-dashboard', action: () => setActiveTab('offers') },
                                            { name: 'Trouver un Prof', icon: Search, path: '/tutors' },
                                            { name: 'Messages', icon: MessageSquare, path: '/messages' },
                                            { name: 'Mon Profil', icon: User, path: '/profile' }
                                        ].map((item) => (
                                            <button
                                                key={item.name}
                                                onClick={() => {
                                                    if (item.action) item.action();
                                                    navigate(item.path);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className="w-full flex items-center gap-4 py-4 px-6 text-xs font-black text-slate-950 uppercase tracking-widest border border-transparent hover:border-slate-100 hover:bg-slate-50 rounded-2xl transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                {item.name}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-8 border-t border-slate-100">
                                        <button
                                            onClick={() => setIsSidebarOpen(false)}
                                            className="w-full py-4 text-center font-black text-[10px] uppercase tracking-widest bg-slate-950 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
                                        >
                                            Fermer le menu
                                        </button>
                                    </div>
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-32 relative z-10 w-full">
                    {/* Mobile Toggle Button (Bottom Right) */}
                    <div className="lg:hidden fixed bottom-8 right-8 z-[100]">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-sky-600 transition-all active:scale-95 border-4 border-white"
                        >
                            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-start relative">
                        {/* Desktop Sidebar */}
                        <aside className="hidden lg:block w-80 sticky top-32">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm text-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>

                                <div className="relative inline-block mb-6">
                                    <div className="absolute -inset-2 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-full opacity-20 blur-lg"></div>
                                    <img
                                        src={user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                        className="w-24 h-24 rounded-full bg-white p-1 border-2 border-white shadow-md relative z-10 object-cover"
                                        alt="avatar"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-20">
                                        <GraduationCap className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">{user?.first_name} {user?.last_name}</h2>
                                <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest mb-8 border-b border-slate-200/60 pb-6 italic">Étudiant Élite</p>

                                <nav className="space-y-3 mb-8">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${activeTab === 'overview' ? 'bg-slate-950 text-white shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <LayoutDashboard className="w-4 h-4" /> Vue d'ensemble
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${activeTab === 'history' ? 'bg-slate-950 text-white shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Clock className="w-4 h-4" /> Historique
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('offers')}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${activeTab === 'offers' ? 'bg-slate-950 text-white shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-3"><Star className="w-4 h-4" /> Offres Reçues</div>
                                        {courseOffers.filter(o => o.status === 'transmitted').length > 0 && (
                                            <span className="bg-sky-500 text-white px-2 py-0.5 rounded-full text-[9px]">{courseOffers.filter(o => o.status === 'transmitted').length}</span>
                                        )}
                                    </button>
                                    <Link to="/profile" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                        <User className="w-4 h-4" /> Mon Profil
                                    </Link>
                                    <Link to="/messages" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                        <MessageSquare className="w-4 h-4" /> Mes Messages
                                    </Link>
                                </nav>

                                <button onClick={logout} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors border-t border-slate-100 mt-4 flex items-center justify-center gap-2 pt-6">
                                    <LogOut className="w-3 h-3" /> Déconnexion
                                </button>
                            </div>

                            <div className="mt-8 p-8 bg-slate-950 rounded-[3rem] text-white relative overflow-hidden group hidden lg:block">
                                <Sparkles className="absolute top-4 right-4 w-6 h-6 text-sky-500 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-4 italic">Action Rapide</p>
                                <h4 className="text-sm font-black uppercase mb-6 leading-tight">Besoin d'aide <br /> immédiate ?</h4>
                                <Link to="/tutors" className="w-full py-4 bg-sky-600 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-sky-500 transition-colors">
                                    <Search className="w-3 h-3" /> Trouver un Prof
                                </Link>
                            </div>
                        </aside>

                        {/* Dashboard Content */}
                        <div className="flex-1 space-y-12 overflow-x-hidden">
                            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-12">
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                                            <Menu className="w-6 h-6" />
                                        </button>
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600">Espace Étudiant 👋</h2>
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-[0.95]">Tableau de <br /> <span className="text-slate-400">Bord Scolaire.</span></h1>
                                    <p className="text-slate-500 font-medium italic">Bienvenue dans votre espace d'excellence.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                                            className={`p-4 rounded-2xl border border-slate-200 shadow-sm relative hover:bg-slate-50 transition-all ${showNotificationsDropdown ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-white text-slate-400'}`}
                                        >
                                            <Bell className={`w-5 h-5 transition-colors ${showNotificationsDropdown ? 'text-sky-600' : 'text-slate-400'}`} />
                                            {unreadNotificationsCount > 0 && (
                                                <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
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
                                                        className="fixed inset-0 z-[160]"
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute top-full left-0 md:left-auto md:right-0 mt-4 w-[calc(100vw-3rem)] sm:w-[450px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[170] origin-top-left md:origin-top-right"
                                                    >
                                                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
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
                                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                            {notifications.length === 0 ? (
                                                                <div className="p-12 text-center">
                                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                                        <Bell className="w-8 h-8 text-slate-200" />
                                                                    </div>
                                                                    <p className="text-xs text-slate-400 font-medium italic">Aucune nouvelle notification.</p>
                                                                </div>
                                                            ) : (
                                                                notifications.map((notif) => (
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
                                                                            if (notif.type === 'message' || notif.type === 'incoming_call') {
                                                                                navigate('/messages');
                                                                            } else if (notif.type.startsWith('booking_') || notif.type === 'new_booking') {
                                                                                setActiveTab('overview');
                                                                            }
                                                                        }}
                                                                        className={`w-full p-6 flex items-start gap-4 hover:bg-slate-50 transition-all text-left border-b border-slate-50/50 last:border-0 ${!notif.is_read ? 'bg-sky-50/30' : ''}`}
                                                                    >
                                                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${notif.type === 'message' ? 'bg-blue-100 text-blue-600' :
                                                                            notif.type === 'booking_confirmed' ? 'bg-emerald-100 text-emerald-600' :
                                                                                notif.type === 'booking_cancelled' ? 'bg-red-100 text-red-600' :
                                                                                    notif.type === 'booking_completed' ? 'bg-indigo-100 text-indigo-600' :
                                                                                        'bg-slate-100 text-slate-600'}`}>
                                                                            {notif.type === 'message' ? <MessageSquare className="w-5 h-5" /> :
                                                                                notif.type === 'booking_completed' ? <CheckCheck className="w-5 h-5" /> :
                                                                                    (notif.type.includes('booking') || notif.type === 'new_booking') ? <Calendar className="w-5 h-5" /> :
                                                                                        <Bell className="w-5 h-5" />}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[11px] font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">{notif.title}</p>
                                                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{notif.content}</p>
                                                                            <div className="flex items-center gap-2 mt-2">
                                                                                <Clock className="w-3 h-3 text-slate-400" />
                                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        {!notif.is_read && (
                                                                            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 mt-1 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
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
                                    <Link to="/tutors" className="px-8 py-4 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-500 transition-all shadow-xl shadow-sky-100 flex items-center gap-2 active:scale-95">
                                        <Search className="w-4 h-4" /> Trouver un Prof
                                    </Link>
                                </div>
                            </header>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {[
                                    { label: "Cours Aujourd'hui", val: stats.today, icon: Calendar, color: "sky" },
                                    { label: "Demandes", val: stats.pending, icon: Clock, color: "amber" },
                                    { label: "Sessions Validées", val: stats.validated, icon: CheckCircle, color: "emerald" }
                                ].map((stat, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group overflow-hidden">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${stat.color === 'sky' ? 'bg-sky-50 text-sky-600' : stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-3xl font-black text-slate-900 mb-1">{stat.val}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Session Logic */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-6 border-b border-slate-200">
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
                                        {activeTab === 'overview' ? <Clock className="w-6 h-6 text-sky-600" /> : activeTab === 'history' ? <Calendar className="w-6 h-6 text-sky-600" /> : <Wallet className="w-6 h-6 text-sky-600" />}
                                    </div>
                                    {activeTab === 'overview' ? 'Plan de Travail' : activeTab === 'history' ? 'Votre Historique' : 'Mon Portefeuille'}
                                </h2>
                                <div className="flex flex-wrap gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto">
                                    <button onClick={() => setActiveTab('overview')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>À Venir</button>
                                    <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Historique</button>
                                    <button onClick={() => setActiveTab('wallet')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'wallet' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Portail Financier</button>
                                </div>
                            </div>

                            {activeTab === 'overview' && (
                                <section>
                                    <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-sky-900/20 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/20 transition-all duration-700"></div>
                                        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-center gap-6">
                                            <div>
                                                <h3 className="text-2xl font-black mb-2 flex items-center gap-2"><MapPin className="w-6 h-6" /> Cours sur mesure</h3>
                                                <p className="text-sky-100 text-sm max-w-md">Publiez une demande publique avec vos critères géolocalisés. Les meilleurs professeurs proches de vous vous contacteront directement.</p>
                                            </div>
                                            <button onClick={() => setShowCourseRequestModal(true)} className="w-full md:w-auto px-6 py-4 bg-white text-sky-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-50 transition-all shadow-lg active:scale-95 whitespace-nowrap flex justify-center items-center gap-2">
                                                <Plus className="w-4 h-4"/>
                                                Publier une annonce
                                            </button>
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="space-y-6">
                                            {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-[2rem] animate-pulse border border-slate-100 shadow-sm"></div>)}
                                        </div>
                                    ) : upcomingBookings.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-6">
                                            {upcomingBookings.map(booking => (
                                                <motion.div key={booking.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col sm:flex-row items-center gap-8 hover:border-sky-500 hover:shadow-2xl hover:shadow-sky-500/5 transition-all group">
                                                    <div className="flex items-center gap-6 flex-1">
                                                        <img src={booking.teacher_details?.user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.teacher_details?.user?.username}`} className="w-20 h-20 rounded-[1.5rem] object-cover bg-slate-50" alt="" />
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{booking.subject_details?.name}</span>
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${booking.course_type === 'online' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>{booking.course_type === 'online' ? 'En ligne' : 'Présentiel'}</span>
                                                            </div>
                                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                                                                {booking.teacher_details?.academic_title === 'Dr' ? 'Dr.' : booking.teacher_details?.academic_title === 'Pr' ? 'Pr.' : booking.teacher_details?.academic_title === 'Mme' ? 'Mme' : 'M.'} {booking.teacher_details?.user?.last_name}
                                                            </h3>
                                                            <p className="text-slate-400 font-bold text-sm mt-1">{new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {booking.time?.substring(0, 5)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 sm:mt-0">
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            booking.status === 'completed' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                                booking.status === 'cancelled' ? 'bg-red-50 text-red-500 border border-red-100' :
                                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                            {booking.status === 'pending' ? 'En attente' : booking.status === 'confirmed' ? 'Confirmé' : booking.status === 'cancelled' ? 'Annulé' : 'Terminé'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {booking.course_type === 'online' && booking.status === 'confirmed' && (() => {
                                                                const start = new Date(`${booking.date}T${booking.time}`);
                                                                const windowStart = new Date(start.getTime() - (15 * 60 * 1000));
                                                                const canJoin = currentTime >= windowStart;

                                                                if (!canJoin) return (
                                                                    <button disabled className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-not-allowed" title={`Disponible à ${windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                                                        <Video className="w-3.5 h-3.5" />Rejoindre
                                                                    </button>
                                                                );

                                                                return (
                                                                    <Link to={`/classroom/${booking.id}`} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-violet-100 active:scale-95">
                                                                        <Video className="w-3.5 h-3.5" />Rejoindre
                                                                    </Link>
                                                                );
                                                            })()}
                                                            {booking.course_type === 'in_person' && booking.status === 'confirmed' && (() => {
                                                                const start = new Date(`${booking.date}T${booking.time}`);
                                                                const end = new Date(start.getTime() + (booking.duration_hours * 60 * 60 * 1000));
                                                                const windowStart = new Date(end.getTime() - (5 * 60 * 1000));
                                                                const canGen = currentTime >= windowStart;

                                                                return (
                                                                    <button
                                                                        onClick={() => handleGenerateCode(booking.id)}
                                                                        disabled={codeLoading || !canGen}
                                                                        className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:bg-slate-300 ${canGen ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100' : 'bg-slate-300 shadow-none'}`}
                                                                        title={!canGen ? `Disponible à ${windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                                                                    >
                                                                        <Shield className="w-3.5 h-3.5" />{codeLoading ? '...' : 'Code Fin'}
                                                                    </button>
                                                                );
                                                            })()}
                                                            <Link to={`/messages?with=${booking.teacher_details?.user?.id || booking.teacher}`} className="p-3 bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all">
                                                                <MessageSquare className="w-4 h-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-20 bg-white rounded-[3rem] border border-slate-200 border-dashed">
                                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Aucune session prévue</p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Historique des cours</h2>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Consultez et exportez vos sessions passées</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => downloadCSV(filteredHistory)}
                                                className="px-6 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                            >
                                                <Download className="w-4 h-4" /> Exporter en CSV
                                            </button>
                                            <button
                                                onClick={downloadPDF}
                                                className="px-6 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-sky-500 transition-all shadow-xl shadow-sky-200 active:scale-95"
                                            >
                                                <FileText className="w-4 h-4" /> Télécharger en PDF
                                            </button>
                                        </div>
                                    </div>

                                    {/* History Filters */}
                                    <div className="p-5 sm:p-8 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col sm:flex-row flex-wrap items-end gap-4 sm:gap-6 text-left">
                                        <div className="w-full sm:flex-1 sm:min-w-[200px]">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Date de début</label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                                                <input
                                                    type="date"
                                                    value={historyFilters.startDate}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border border-transparent focus:border-sky-500 focus:bg-white outline-none text-xs font-bold transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="w-full sm:flex-1 sm:min-w-[200px]">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Date de fin</label>
                                            <div className="relative group">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
                                                <input
                                                    type="date"
                                                    value={historyFilters.endDate}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border border-transparent focus:border-sky-500 focus:bg-white outline-none text-xs font-bold transition-all"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setHistoryFilters({ startDate: '', endDate: '' })}
                                            className="w-full sm:w-auto px-8 py-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Réinitialiser
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 mt-8">
                                        {paginatedHistory.length > 0 ? (
                                            <>
                                                {paginatedHistory.map(booking => (
                                                    <motion.div key={booking.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-lg transition-all group">
                                                        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-100 group-hover:bg-sky-50 transition-colors">
                                                                <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter">{new Date(booking.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                                                <span className="text-lg md:text-xl font-black text-slate-900 leading-none">{new Date(booking.date).getDate()}</span>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{booking.subject_details?.name}</span>
                                                                    <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${booking.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{booking.status === 'completed' ? 'Validé' : 'Annulé'}</span>
                                                                </div>
                                                                <h4 className="font-bold text-slate-900 truncate text-sm md:text-base">{booking.teacher_details?.user?.first_name} {booking.teacher_details?.user?.last_name}</h4>
                                                                <p className="text-[10px] md:text-xs text-slate-400 font-medium truncate">{booking.time?.substring(0, 5)} · {booking.duration_hours}h · {booking.course_type === 'online' ? 'En ligne' : 'Présentiel'}</p>
                                                            </div>
                                                        </div>
                                                        <Link to={`/messages?with=${booking.teacher_details?.user?.id || booking.teacher}`} className="w-full sm:w-auto text-center px-6 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all active:scale-95 shadow-sm">
                                                            Contacter
                                                        </Link>
                                                    </motion.div>
                                                ))}

                                                {/* Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="mt-8 flex items-center justify-center gap-4">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                                                        >
                                                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                                                        </button>
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                                            Page <span className="text-sky-600">{currentPage}</span> sur {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                                                        >
                                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center p-12 bg-white/50 rounded-3xl border border-slate-100 border-dashed">
                                                <p className="text-slate-400 font-medium italic">Aucun cours trouvé dans l'historique pour ces critères.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'offers' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                            <Star className="w-8 h-8 text-sky-500" /> 
                                            Propositions de Professeurs
                                        </h2>
                                    </div>
                                    <p className="text-slate-500 mb-6 text-sm">Découvrez les professeurs qui ont répondu à vos demandes de cours et acceptez leurs offres pour commencer.</p>
                                    
                                    {courseOffers.filter(o => o.status === 'transmitted').length === 0 ? (
                                        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                <Star className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 mb-2">Aucune offre pour le moment</h3>
                                            <p className="text-slate-500 text-sm">Publiez une demande de cours sur la carte pour que les professeurs puissent vous proposer leurs services.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {courseOffers.filter(o => o.status === 'transmitted').map(offer => {
                                                const prof = offer.teacher_details?.user;
                                                const profile = offer.teacher_details;
                                                return (
                                                    <div key={offer.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <img 
                                                                src={prof?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${prof?.username}`} 
                                                                className="w-16 h-16 rounded-full object-cover bg-slate-100" 
                                                                alt=""
                                                            />
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 text-lg">{prof?.first_name} {prof?.last_name}</h4>
                                                                <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> {prof?.city}, {prof?.country}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-slate-500 font-medium">Expérience</span>
                                                                <span className="font-bold text-slate-900">{profile?.experience_years} ans</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 text-sm">
                                                                <span className="text-slate-500 font-medium">Spécialités</span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {profile?.subjects_details?.map(s => (
                                                                        <span key={s.id} className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md text-xs font-bold">{s.name}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                                                                <span className="text-slate-500 font-medium">Tarif horaire</span>
                                                                <span className="font-black text-sky-600">{profile?.hourly_rate} {prof?.currency || 'XOF'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 mt-auto pt-2">
                                                            <button 
                                                                onClick={() => handleAcceptOffer(offer.id)}
                                                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 text-center"
                                                            >
                                                                Accepter l'offre
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRejectOffer(offer.id)}
                                                                className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                                                            >
                                                                Refuser
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'wallet' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gradient-to-br from-sky-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-sky-900/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/20 transition-all duration-700"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                        <Wallet className="w-6 h-6 text-white" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-widest text-sky-100">Solde Disponible</span>
                                                </div>
                                                <h3 className="text-5xl font-black tracking-tight mt-6 mb-2">
                                                    {wallet ? parseFloat(wallet.balance).toLocaleString('fr-FR') : '0'} <span className="text-2xl text-sky-200">{user?.currency || 'XOF'}</span>
                                                </h3>
                                                <p className="text-sm font-medium text-sky-100">Plus {wallet ? parseFloat(wallet.escrow_balance).toLocaleString('fr-FR') : '0'} {user?.currency || 'XOF'} réservés en séquestre.</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-6"><CreditCard className="w-6 h-6 text-sky-600" /> Ajouter des fonds</h3>
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">{user?.currency || 'XOF'}</span>
                                                    <input
                                                        type="number"
                                                        value={depositAmount}
                                                        onChange={(e) => setDepositAmount(e.target.value)}
                                                        placeholder="Ex: 10000"
                                                        className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-transparent focus:border-sky-500 focus:bg-white rounded-2xl outline-none text-slate-900 font-bold transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleDeposit}
                                                    disabled={depositLoading}
                                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                                                >
                                                    {depositLoading ? 'Chargement...' : 'Faire un dépôt'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold mt-4">Paiements sécurisés via GeniusPay (Mobile Money & Cartes).</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="text-lg font-black text-slate-900">Historique des transactions</h3>
                                        </div>
                                        <div className="p-4 md:p-8">
                                            {transactions.length === 0 ? (
                                                <div className="text-center py-10">
                                                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="w-6 h-6" /></div>
                                                    <p className="text-slate-500 font-bold text-sm">Aucune transaction pour le moment.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {transactions.map(tx => (
                                                        <div key={tx.id} className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all gap-4">
                                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.transaction_type === 'deposit' ? 'bg-emerald-100 text-emerald-600' :
                                                                    tx.transaction_type === 'booking_refund' ? 'bg-indigo-100 text-indigo-600' :
                                                                        'bg-slate-200 text-slate-600'
                                                                    }`}>
                                                                    {tx.transaction_type === 'deposit' ? <Plus className="w-6 h-6" /> :
                                                                        tx.transaction_type === 'booking_refund' ? <ArrowRight className="w-6 h-6" /> :
                                                                            <Minus className="w-6 h-6" />}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-black text-slate-900 truncate">{tx.description || tx.transaction_type}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {tx.status === 'completed' ? 'Complété' : tx.status === 'pending' ? 'En attente' : 'Échoué'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-full sm:w-auto text-right">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <span className={`text-lg font-black ${parseFloat(tx.amount) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                        {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toLocaleString('fr-FR')} {user?.currency || 'XOF'}
                                                                    </span>
                                                                    {tx.transaction_type === 'deposit' && tx.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleVerifyDeposit(tx.reference_id)}
                                                                            className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline flex items-center gap-1"
                                                                        >
                                                                            <Activity className="w-3 h-3" /> Vérifier
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            <AnimatePresence>
                {codeModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300]" onClick={() => setCodeModal(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 20 }}
                            className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 w-auto md:w-[420px] max-h-[90vh] z-[301] overflow-hidden flex flex-col"
                        >
                            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-100 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center"><Shield className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" /></div>
                                        <div>
                                            <h2 className="text-base md:text-lg font-black text-slate-900 leading-tight">Code de Validation</h2>
                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cours Présentiel</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setCodeModal(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-50"><X className="w-4 h-4" /></button>
                                </div>

                                <p className="text-xs md:text-sm text-slate-500 mb-6 leading-relaxed">Montrez ce code à votre professeur à la <strong className="text-slate-700">fin du cours</strong>. Il devra le saisir dans son espace.</p>

                                <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-[1.5rem] p-6 md:p-8 text-center border border-emerald-100 mb-4">
                                    <div className="text-4xl xs:text-5xl md:text-6xl font-black tracking-[0.2em] md:tracking-[0.3em] text-slate-900 mb-4 tabular-nums">{codeModal.code}</div>
                                    <button
                                        onClick={copyCode}
                                        className={`flex items-center gap-2 mx-auto text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm ${codeCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900'}`}
                                    >
                                        {codeCopied ? <><CheckCheck className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier le code</>}
                                    </button>
                                </div>

                                <div className={`flex items-center justify-center gap-3 py-3 px-6 rounded-2xl mb-6 ${codeCountdown < 60 ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
                                    <Timer className={`w-4 h-4 ${codeCountdown < 60 ? 'text-red-500' : 'text-slate-400'}`} />
                                    <span className={`font-black text-base md:text-lg tabular-nums ${codeCountdown < 60 ? 'text-red-600' : 'text-slate-700'}`}>{codeCountdown > 0 ? formatCountdown(codeCountdown) : 'Expiré'}</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{codeCountdown > 0 ? 'restantes' : '— Regeneré'}</span>
                                </div>

                                {codeCountdown === 0 ? (
                                    <button onClick={() => handleGenerateCode(codeModal.bookingId)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100">
                                        <Shield className="w-4 h-4 inline mr-2" />Générer un Nouveau Code
                                    </button>
                                ) : (
                                    <button onClick={() => setCodeModal(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Fermer la fenêtre</button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCourseRequestModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCourseRequestModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-950 p-8 text-white relative">
                                <Sparkles className="absolute top-6 right-6 w-8 h-8 text-sky-400 opacity-20" />
                                <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Publier une annonce</h3>
                                <p className="text-sky-400 text-[10px] font-black uppercase tracking-[0.2em]">Ciblez les professeurs près de chez vous.</p>
                            </div>
                            
                            <form onSubmit={handlePublishRequest} className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Niveau Scolaire</label>
                                    <select
                                        required
                                        value={requestData.level}
                                        onChange={(e) => setRequestData({ ...requestData, level: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none"
                                    >
                                        <option value="">Sélectionnez un niveau...</option>
                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Matières Souhaitées (Multisélection possible)</label>
                                    <select
                                        multiple
                                        required
                                        value={requestData.subjects}
                                        onChange={(e) => {
                                            const options = [...e.target.selectedOptions];
                                            const values = options.map(option => option.value);
                                            setRequestData({ ...requestData, subjects: values });
                                        }}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm min-h-[120px]"
                                    >
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2">Maintenez CTRL (ou CMD sur Mac) pour sélectionner plusieurs matières.</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Rythme Souhaité</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: 2 fois par semaine, soirs et weekends"
                                        value={requestData.rhythm}
                                        onChange={(e) => setRequestData({ ...requestData, rhythm: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                    />
                                </div>

                                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-4">
                                    <MapPin className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900 leading-tight mb-1">Localisation Active</p>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {userLocation ? "Votre position a été identifiée. Les professeurs dans votre zone seront alertés." : "Nous identifions votre position actuelle..."}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCourseRequestModal(false)}
                                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={postingRequest || !userLocation}
                                        className="flex-[2] py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-500 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {postingRequest ? 'Publication...' : <><MapPin className="w-3 h-3"/> Publier sur la Carte</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default StudentDashboard;
