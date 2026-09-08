import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Users, Calendar, Clock,
    Settings, CheckCircle, TrendingUp, BookOpen,
    Bell, ChevronRight, LayoutDashboard, LogOut,
    Sparkles, User, Star, Plus, PieChart, Menu, X,
    Video, MapPin, MessageSquare, Check, XCircle, Loader2,
    Shield, CheckCheck, Home, KeyRound, FileDown, Search, Filter,
    Download, FileText, ChevronLeft, AlertCircle, Wallet, CreditCard, ArrowRight, Minus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDesktop } from '../hooks/useDesktop';
import api from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const isDesktop = useDesktop();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [filterMode, setFilterMode] = useState('week'); // 'week' or 'all'
    const [activeTab, setActiveTab] = useState('overview');
    const [historyFilters, setHistoryFilters] = useState({ startDate: '', endDate: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [requests, setRequests] = useState([]);
    const [mapCenter, setMapCenter] = useState([3.8480, 11.5021]); // Default Yaounde
    const [searchRadius, setSearchRadius] = useState(50);
    const [expressingInterest, setExpressingInterest] = useState(null);
    const itemsPerPage = 10;

    // Financial State
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    const downloadCSV = (data) => {
        const headers = ["Date", "Heure", "Élève", "Matière", "Type", "Durée (h)", "Statut"];
        const rows = data.map(b => [
            b.date,
            b.time,
            `${b.student_details?.first_name || ''} ${b.student_details?.last_name || ''}`,
            b.subject_name || b.subject_details?.name || '',
            b.course_type === 'online' ? 'En ligne' : 'Présentiel',
            b.duration_hours,
            b.status === 'completed' ? 'Validé' : b.status === 'cancelled' ? 'Annulé' : b.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `historique_eduup_prof_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Teacher specific features
    const [teacherProfile, setTeacherProfile] = useState(null);
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [newRate, setNewRate] = useState('');
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [students, setStudents] = useState([]);
    const [newSessionData, setNewSessionData] = useState({
        student: '',
        subject: '',
        date: '',
        time: '',
        duration_hours: 1,
        course_type: 'online'
    });
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [studentSearch, setStudentSearch] = useState({ name: '', city: '', country: '' });
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
    const [sessionCreated, setSessionCreated] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

    // In-person code validation
    const [validationInputs, setValidationInputs] = useState({}); // { [bookingId]: code }
    const [validatingId, setValidatingId] = useState(null);
    const [validationResult, setValidationResult] = useState({}); // { [bookingId]: 'success' | 'error' | msg }

    const filteredStudents = students.filter(s => {
        const matchesName = `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.name.toLowerCase());
        const matchesCity = !studentSearch.city || (s.city && s.city.toLowerCase().includes(studentSearch.city.toLowerCase()));
        const matchesCountry = !studentSearch.country || (s.country && s.country.toLowerCase().includes(studentSearch.country.toLowerCase()));
        return matchesName && matchesCity && matchesCountry;
    });

    // Close sidebar when switching to desktop
    useEffect(() => {
        if (isDesktop) setIsSidebarOpen(false);
    }, [isDesktop]);

    const updateBookingStatus = useCallback(async (bookingId, newStatus) => {
        setUpdatingStatus(bookingId);
        try {
            await api.patch(`bookings/${bookingId}/update_status/`, { status: newStatus });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingStatus(null);
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

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

        const fetchTeacherProfile = async () => {
            try {
                const res = await api.get('teachers/me/');
                setTeacherProfile(res.data);
                setNewRate(res.data.hourly_rate);
            } catch (err) {
                console.error("Error fetching teacher profile", err);
            }
        };

        const fetchStudents = async () => {
            try {
                const res = await api.get('users/chat-contacts/');
                setStudents(res.data.filter(u => u.role === 'student'));
            } catch (err) {
                console.error("Error fetching students", err);
            }
        };

        const fetchNotifications = async () => {
            try {
                const res = await api.get('notifications/');
                setNotifications(res.data);
                const unread = res.data.filter(n => !n.is_read).length;
                setUnreadNotificationsCount(unread);
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

        const fetchRequests = async () => {
            try {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setMapCenter([latitude, longitude]);
                        const res = await api.get(`course-requests/map_points/?lat=${latitude}&lon=${longitude}&radius=${searchRadius}`);
                        setRequests(res.data);
                    }, async () => {
                        const res = await api.get('course-requests/map_points/');
                        setRequests(res.data);
                    });
                } else {
                    const res = await api.get('course-requests/map_points/');
                    setRequests(res.data);
                }
            } catch (err) {
                console.error("Error fetching requests", err);
            }
        };

        fetchBookings();
        fetchTeacherProfile();
        fetchStudents();
        fetchNotifications();
        fetchWalletData();
        fetchRequests();

        const interval = setInterval(() => {
            fetchBookings();
            fetchNotifications();
            fetchWalletData();
            fetchRequests();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleWithdraw = async () => {
        if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
            alert('Veuillez entrer un montant valide.');
            return;
        }
        if (!user.phone_number) {
            if (window.confirm("Vous devez renseigner votre numéro de téléphone (ainsi que votre pays et ville) dans votre profil avant de faire un retrait.\nVoulez-vous aller sur votre profil maintenant ?")) {
                navigate('/profile');
            }
            return;
        }
        setWithdrawLoading(true);
        try {
            await api.post('wallet/withdraw/', { amount: withdrawAmount });
            alert('Retrait initié avec succès ! Les fonds seront transférés sur votre compte Mobile Money très prochainement.');
            // Refresh
            const wRes = await api.get('wallet/me/');
            setWallet(wRes.data);
            const tRes = await api.get('transactions/');
            setTransactions(tRes.data);
        } catch (e) {
            alert(e.response?.data?.error || 'Erreur lors du retrait.');
        } finally {
            setWithdrawLoading(false);
            setWithdrawAmount('');
        }
    };

    const handleUpdateRate = async () => {
        setIsSavingRate(true);
        try {
            const res = await api.patch(`teachers/${teacherProfile.id}/`, { hourly_rate: newRate });
            setTeacherProfile(res.data);
            setIsEditingRate(false);
        } catch (err) {
            console.error("Error updating rate", err);
        } finally {
            setIsSavingRate(false);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!newSessionData.student || !newSessionData.subject || !newSessionData.date || !newSessionData.time) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }
        setIsCreatingSession(true);
        try {
            // teacher_profile is what the backend expects for 'teacher' field if NOT request.user, 
            // but here request.user IS the teacher, so perform_create handles it.
            // We just need to send student and subject
            await api.post('bookings/', {
                ...newSessionData
            });
            setSessionCreated(true);
            // Refresh bookings
            const response = await api.get('bookings/');
            setBookings(response.data);
            // Reset form
            setNewSessionData({
                student: '',
                subject: '',
                date: '',
                time: '',
                duration_hours: 1,
                course_type: 'online'
            });
        } catch (err) {
            console.error("Error creating session", err);
        } finally {
            setIsCreatingSession(false);
        }
    };

    // Dynamic Stats Calculation
    const totalEarnings = bookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (parseFloat(b.teacher_details?.hourly_rate || 0) * b.duration_hours), 0);

    const uniqueStudents = new Set(bookings.map(b => b.student)).size;

    const statsData = {
        earnings: Math.round(totalEarnings),
        students: uniqueStudents,
        sessions: bookings.filter(b => b.status === 'completed').length,
        pending: bookings.filter(b => b.status === 'pending').length
    };

    // Filtering helpers
    const isPast = (date, time) => {
        const now = new Date();
        const bookingDate = new Date(`${date}T${time}`);
        return bookingDate < now;
    };

    const upcomingBookings = bookings.filter(b => {
        return b.status === 'confirmed' || b.status === 'pending';
    });

    const historicalBookings = bookings.filter(b => {
        if (b.status !== 'completed' && b.status !== 'cancelled') return false;
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

    const totalPages = Math.ceil(historicalBookings.length / itemsPerPage);
    const paginatedHistory = historicalBookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const downloadPDF = () => {
        const doc = new jsPDF();
        const totalSessions = historicalBookings.length;
        const totalHours = historicalBookings.reduce((acc, b) => acc + (b.duration_hours || 0), 0);

        // Premium Header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 50, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text("EduUp", 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("RAPPORT D'ACTIVITÉ - PROFESSEUR", 190, 25, { align: 'right' });

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
        doc.text(`Professeur: ${user?.first_name} ${user?.last_name}`, 20, 100);
        doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 190, 100, { align: 'right' });

        // Table
        const headers = [["Date", "Élève", "Matière", "Type", "Durée", "Statut", "Paiement"]];
        const data = historicalBookings.map(b => [
            b.date,
            `${b.student_details?.first_name} ${b.student_details?.last_name}`,
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

        doc.save(`historique_eduup_prof_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-100/50 text-slate-900 font-sans selection:bg-sky-100 overflow-x-hidden">
            {/* Mobile Sidebar Overlay (Premium Independence) */}
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
                                        <p className="font-black text-slate-900 text-sm leading-tight">
                                            {user?.teacher_profile?.academic_title === 'Dr' ? 'Dr.' : user?.teacher_profile?.academic_title === 'Pr' ? 'Pr.' : user?.teacher_profile?.academic_title === 'Mme' ? 'Mme' : 'M.'} {user?.last_name}
                                        </p>
                                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{user?.role}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {/* Sidebar Navigation Items */}
                                    {[
                                        { name: 'Dashboard', icon: LayoutDashboard, handler: () => setActiveTab('overview') },
                                        { name: 'Demandes (Carte)', icon: MapPin, handler: () => setActiveTab('requests') },
                                        { name: 'Cours', icon: BookOpen, handler: () => setActiveTab('schedule') },
                                        { name: 'Historique', icon: Calendar, handler: () => setActiveTab('history') },
                                        { name: 'Messages', icon: MessageSquare, handler: () => navigate('/messages') },
                                        { name: 'Profil', icon: User, handler: () => navigate('/profile') },
                                        { name: 'Revenus', icon: PieChart, handler: () => setActiveTab('revenue') }
                                    ].map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => {
                                                item.handler();
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

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
                {/* Mobile Toggle Button */}
                <div className="lg:hidden fixed bottom-8 right-8 z-[100]">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-sky-600 transition-all active:scale-95 border-4 border-white"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative">
                    {/* Desktop Side Bar */}
                    <aside className="hidden lg:block w-80 sticky top-32">
                        <div className="bg-white/60 backdrop-blur-xl shadow-sm border border-slate-200/60 text-center rounded-3xl p-8">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                            <div className="relative inline-block mb-8">
                                <div className="absolute -inset-2 bg-gradient-to-tr from-sky-500 to-purple-500 rounded-[3rem] opacity-20 blur-xl"></div>
                                <img
                                    src={user?.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                    className="w-28 h-28 rounded-[2.5rem] bg-white p-2 border-2 border-white shadow-xl relative z-10 object-cover"
                                    alt="avatar"
                                />
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg z-20">
                                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                                {user?.teacher_profile?.academic_title === 'Dr' ? 'Dr.' : user?.teacher_profile?.academic_title === 'Pr' ? 'Pr.' : user?.teacher_profile?.academic_title === 'Mme' ? 'Mme' : 'M.'} {user?.last_name}
                            </h2>
                            <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-4 italic">Enseignant Certifié CEMAC</p>

                            {/* Hourly Rate Quick Edit */}
                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tarif Horaire</p>
                                {isEditingRate ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={newRate}
                                            onChange={(e) => setNewRate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none text-sm font-bold"
                                        />
                                        <button
                                            onClick={handleUpdateRate}
                                            disabled={isSavingRate}
                                            className="p-2 bg-sky-600 text-white rounded-xl active:scale-95 disabled:opacity-50"
                                        >
                                            {isSavingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => setIsEditingRate(false)} className="p-2 bg-white text-slate-400 rounded-xl">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsEditingRate(true)}>
                                        <span className="text-lg font-black text-slate-900">{teacherProfile?.hourly_rate || '0.00'} <span className="text-[10px] text-slate-400">{user?.currency || 'XOF'}/h</span></span>
                                        <Settings className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <LayoutDashboard className="w-4 h-4" /> Vue d'ensemble
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-amber-500 text-white shadow-xl shadow-amber-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <MapPin className="w-4 h-4" /> Demandes
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'schedule' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <BookOpen className="w-4 h-4" /> Mes Cours
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <Calendar className="w-4 h-4" /> Historique
                            </button>
                            <Link to="/messages" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                <MessageSquare className="w-4 h-4" /> Messagerie
                            </Link>
                            <Link to="/profile" className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-sky-600 font-black text-[10px] uppercase tracking-widest transition-all">
                                <User className="w-4 h-4" /> Mon Profil
                            </Link>
                            <button
                                onClick={() => setActiveTab('revenue')}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'revenue' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50 hover:text-sky-600'}`}
                            >
                                <PieChart className="w-4 h-4" /> Revenus
                            </button>

                            <div className="pt-6 border-t border-slate-100 mt-6">
                                <button
                                    onClick={() => logout(navigate)}
                                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Déconnexion
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Dashboard Content */}
                    {teacherProfile?.status === 'pending' ? (
                        <div className="flex-1 space-y-12 w-full flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mb-6">
                                <Clock className="w-10 h-10 text-amber-500" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Profil en attente d'approbation</h1>
                            <p className="text-slate-500 max-w-md mx-auto text-lg leading-relaxed">Votre candidature est actuellement examinée par notre équipe pour s'assurer de vos compétences. Nous vous informerons dès que votre compte sera prêt et validé.</p>
                            <button onClick={() => logout(navigate)} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
                                <LogOut className="w-4 h-4" /> Se déconnecter
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 space-y-12 w-full">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-6">
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="lg:hidden w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <Menu className="w-6 h-6" />
                                    </button>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600">Bonjour, {user?.first_name} 👋</h2>
                                </div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-[0.95]">Centre de <br /> <span className="text-slate-400">Management Élite.</span></h1>
                                <p className="text-slate-500 font-medium italic">Analysez votre performance et gérez vos élèves en temps réel.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                                        className={`p-4 rounded-2xl border border-slate-100 relative group transition-all ${showNotificationsDropdown ? 'bg-sky-50 border-sky-100 text-sky-600' : 'bg-white text-slate-400 hover:text-sky-600 hover:border-sky-100 hover:bg-sky-50'}`}
                                    >
                                        <Bell className={`w-6 h-6 transition-colors ${showNotificationsDropdown ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-600'}`} />
                                        {unreadNotificationsCount > 0 && (
                                            <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100 flex items-center justify-center text-[7px] text-white font-bold">
                                                {unreadNotificationsCount}
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
                                                    className="fixed inset-0 z-[160]"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute top-full left-0 md:left-auto md:right-0 mt-4 w-[calc(100vw-3rem)] sm:w-[400px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[170] origin-top-left md:origin-top-right"
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
                                                                <p className="text-xs text-slate-400 font-medium italic">Aucun nouveau cours programmé.</p>
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
                                                                        // For teachers, new_booking means checking the dashboard
                                                                        if (notif.type === 'new_booking') {
                                                                            setActiveTab('schedule');
                                                                        } else if (notif.type === 'incoming_call' || notif.type === 'message') {
                                                                            navigate('/messages');
                                                                        }
                                                                    }}
                                                                    className={`w-full p-6 flex items-start gap-4 hover:bg-slate-50 transition-all text-left border-b border-slate-50/50 last:border-0 ${!notif.is_read ? 'bg-sky-50/30' : ''}`}
                                                                >
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-slate-50 text-slate-400' :
                                                                        notif.type === 'booking_confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            notif.type === 'booking_cancelled' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                                notif.type === 'booking_completed' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                                                    'bg-sky-50 text-sky-600 border border-sky-100'}`}>
                                                                        {notif.type === 'new_booking' ? <Plus className="w-5 h-5" /> :
                                                                            notif.type === 'booking_confirmed' ? <CheckCircle className="w-5 h-5" /> :
                                                                                notif.type === 'booking_cancelled' ? <XCircle className="w-5 h-5" /> :
                                                                                    notif.type === 'booking_completed' ? <CheckCheck className="w-5 h-5" /> :
                                                                                        <Bell className="w-5 h-5" />}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">{notif.title}</p>
                                                                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{notif.content}</p>
                                                                        <p className="text-[9px] text-slate-400 mt-2 font-bold flex items-center gap-1.5">
                                                                            <Clock className="w-3 h-3" />
                                                                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
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
                                <button
                                    onClick={() => {
                                        setSessionCreated(false);
                                        setShowNewSessionModal(true);
                                    }}
                                    className="px-8 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-500 transition-colors flex items-center gap-3 active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> Nouvelle Session
                                </button>
                            </div>
                        </header>

                        {/* Stats Grid */}
                        {(activeTab === 'overview' || activeTab === 'revenue') && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                {[
                                    { label: 'Revenus', val: `${statsData.earnings} ${user?.currency || 'XOF'}`, icon: DollarSign, color: 'emerald' },
                                    { label: 'Élèves', val: statsData.students, icon: Users, color: 'sky' },
                                    { label: 'Sessions', val: statsData.sessions, icon: CheckCircle, color: 'purple' },
                                    { label: 'En attente', val: statsData.pending, icon: Clock, color: 'amber' },
                                ].map((s, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className={`bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <s.icon className={`w-12 h-12 ${s.color === 'emerald' ? 'text-emerald-500' :
                                                s.color === 'sky' ? 'text-sky-500' :
                                                    s.color === 'purple' ? 'text-purple-500' : 'text-amber-500'
                                                }`} />
                                        </div>
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            s.color === 'sky' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                                                s.color === 'purple' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            <s.icon className="w-5 h-5 md:w-6 md:h-6" />
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{s.val}</div>
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Pending Requests Section */}
                        {activeTab === 'overview' && bookings.filter(b => b.status === 'pending').length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 mb-12 shadow-sm shadow-amber-100"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center animate-pulse">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-amber-900 tracking-tight">Demandes nécessitant votre attention</h3>
                                        <p className="text-xs text-amber-600 font-medium">Veuillez accepter ou refuser ces demandes avant l'heure de début prévue.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bookings.filter(b => b.status === 'pending').map(booking => (
                                        <div key={booking.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between gap-4 group hover:border-amber-200 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-amber-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-amber-100">
                                                    <span className="text-[9px] font-bold uppercase text-amber-600">
                                                        {new Date(booking.date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}
                                                    </span>
                                                    <span className="text-lg font-black text-amber-700">
                                                        {new Date(booking.date).getDate()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black uppercase text-amber-500 mb-0.5 truncate">{booking.subject_details?.name}</p>
                                                    <h4 className="font-bold text-slate-900 text-sm truncate">{booking.student_details?.first_name} {booking.student_details?.last_name || `Élève #${booking.student}`}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500">{booking.time?.substring(0, 5)} · {booking.duration_hours}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                    disabled={updatingStatus === booking.id}
                                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                                                >
                                                    {updatingStatus === booking.id ? '...' : 'Accepter'}
                                                </button>
                                                <button
                                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                    disabled={updatingStatus === booking.id}
                                                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
                                                >
                                                    Refuser
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Main Content Sections */}
                        <div className={`grid gap-12 ${activeTab === 'overview' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
                            {/* Schedule List */}
                            {(activeTab === 'overview' || activeTab === 'schedule') && (
                                <div className={activeTab === 'overview' ? "lg:col-span-2" : "col-span-1"}>
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
                                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-sky-600" />
                                            </div>
                                            {activeTab === 'overview' ? 'Prochaines Séances' : 'Planning Complet'}
                                        </h2>
                                        {activeTab === 'schedule' && (
                                            <button
                                                onClick={() => setFilterMode(prev => prev === 'week' ? 'all' : 'week')}
                                                className="text-xs font-bold text-sky-600 uppercase tracking-wider px-4 py-2 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                                            >
                                                {filterMode === 'week' ? 'Voir Tout' : 'Semaine Complète'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {loading ? (
                                            [1, 2].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>)
                                        ) : (() => {
                                            const filtered = upcomingBookings.filter(b => {
                                                if (filterMode === 'all' || activeTab === 'overview') return true;
                                                const bDate = new Date(b.date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const nextWeek = new Date(today);
                                                nextWeek.setDate(today.getDate() + 7);
                                                return bDate >= today && bDate <= nextWeek;
                                            });

                                            if (upcomingBookings.length === 0) {
                                                return (
                                                    <div className="bg-slate-50 rounded-3xl p-16 border border-slate-100 border-dashed text-center">
                                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                            <Calendar className="w-8 h-8 text-slate-300" />
                                                        </div>
                                                        <p className="text-slate-500 font-medium text-sm">Aucune session prévue pour le moment.</p>
                                                    </div>
                                                );
                                            }

                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="text-center p-8 bg-white/50 rounded-3xl border border-slate-100">
                                                        <p className="text-slate-500 font-medium italic">Aucune session pour cette période.</p>
                                                    </div>
                                                );
                                            }

                                            return filtered.map((booking) => (
                                                <motion.div
                                                    key={booking.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-bold uppercase text-slate-500">
                                                                {new Date(booking.date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}
                                                            </span>
                                                            <span className="text-xl font-black text-slate-900 tracking-tight">
                                                                {new Date(booking.date).getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">{booking.subject_details?.name}</span>
                                                                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${booking.course_type === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                                                    }`}>
                                                                    {booking.course_type === 'online' ? <><Video className="w-3 h-3" /> En ligne</> : <><MapPin className="w-3 h-3" /> Présentiel</>}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 text-[15px]">
                                                                {booking.student_details?.first_name} {booking.student_details?.last_name || `Élève #${booking.student}`}
                                                            </h4>
                                                            <div className="flex items-center gap-3 mt-1.5">
                                                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4 text-slate-400" /> {booking.time?.substring(0, 5)} · {booking.duration_hours}h
                                                                </p>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                                                                    booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                                    }`}>{booking.status === 'confirmed' ? 'Confirmé' : booking.status === 'cancelled' ? 'Annulé' : 'En attente'}</span>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/messages?with=${booking.student_details?.id || booking.student}`);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                                                    title="Discuter avec l'élève"
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                                                        {booking.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                                                    disabled={updatingStatus === booking.id}
                                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                                                                >
                                                                    <Check className="w-4 h-4" /> Accepter
                                                                </button>
                                                                <button
                                                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                                                    disabled={updatingStatus === booking.id}
                                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-4 h-4" /> Refuser
                                                                </button>
                                                            </>
                                                        )}
                                                        {booking.status === 'confirmed' && booking.course_type === 'online' && (() => {
                                                            const start = new Date(`${booking.date}T${booking.time}`);
                                                            const windowStart = new Date(start.getTime() - (15 * 60 * 1000));
                                                            const canJoin = currentTime >= windowStart;

                                                            if (!canJoin) return (
                                                                <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl font-bold text-xs cursor-not-allowed flex items-center gap-1.5" title={`Disponible à ${windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                                                    <Video className="w-4 h-4" /> Rejoindre
                                                                </button>
                                                            );

                                                            return (
                                                                <Link
                                                                    to={`/classroom/${booking.id}`}
                                                                    className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                                                                >
                                                                    <Video className="w-4 h-4" /> Rejoindre
                                                                </Link>
                                                            );
                                                        })()}
                                                        {booking.status === 'confirmed' && booking.course_type === 'in_person' && !booking.is_validated && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <input
                                                                    type="text"
                                                                    maxLength={6}
                                                                    placeholder="Code 6 chiffres"
                                                                    value={validationInputs[booking.id] || ''}
                                                                    onChange={e => setValidationInputs(prev => ({ ...prev, [booking.id]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                                                    className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm font-black tracking-[0.2em] text-center bg-slate-50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-slate-300"
                                                                />
                                                                <button
                                                                    onClick={async () => {
                                                                        const code = validationInputs[booking.id];
                                                                        if (!code || code.length !== 6) return;
                                                                        setValidatingId(booking.id);
                                                                        try {
                                                                            await api.post(`bookings/${booking.id}/validate_in_person/`, { code });
                                                                            setValidationResult(prev => ({ ...prev, [booking.id]: 'success' }));
                                                                            setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed', is_validated: true } : b));
                                                                        } catch (e) {
                                                                            setValidationResult(prev => ({ ...prev, [booking.id]: e.response?.data?.error || 'Code incorrect' }));
                                                                        } finally {
                                                                            setValidatingId(null);
                                                                        }
                                                                    }}
                                                                    disabled={validatingId === booking.id || (validationInputs[booking.id] || '').length !== 6}
                                                                    className="p-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 font-bold text-xs"
                                                                >
                                                                    {validatingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />} Valider
                                                                </button>
                                                            </div>
                                                        )}
                                                        {validationResult[booking.id] && (
                                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${validationResult[booking.id] === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                                                {validationResult[booking.id] === 'success' ? '✓ Validé !' : validationResult[booking.id]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* History Section */}
                            {activeTab === 'history' && (
                                <div className="space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Historique des cours</h2>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Gérez et exportez vos sessions passées</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => downloadCSV(historicalBookings)}
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

                                    {/* History Table/List */}
                                    <div className="space-y-4">
                                        {paginatedHistory.length > 0 ? (
                                            <>
                                                {paginatedHistory.map((booking) => (
                                                    <motion.div key={booking.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group gap-6">
                                                        <div className="flex items-center gap-6 w-full sm:w-auto">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-slate-50 ${booking.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                                {booking.status === 'completed' ? <CheckCheck className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h4 className="font-black text-slate-900 text-base truncate">{booking.subject_name || booking.subject_details?.name}</h4>
                                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {booking.status === 'completed' ? 'Validé' : 'Annulé'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Le {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · Avec {booking.student_details?.first_name} {booking.student_details?.last_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between w-full sm:w-auto sm:text-right gap-8">
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 mb-0.5">{booking.duration_hours}h de cours</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{booking.course_type === 'online' ? 'En ligne' : 'Présentiel'}</p>
                                                            </div>
                                                            <Link to={`/messages?with=${booking.student}`} className="p-3 bg-slate-50 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all">
                                                                <MessageSquare className="w-4 h-4" />
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {/* Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="mt-8 flex items-center justify-center gap-4">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                                        >
                                                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                                                        </button>
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                                            Page <span className="text-sky-600">{currentPage}</span> sur {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                                                        >
                                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-slate-100 border-dashed">
                                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                                    <Search className="w-10 h-10 text-slate-200" />
                                                </div>
                                                <h3 className="text-lg font-black text-slate-900 mb-2">Aucun résultat</h3>
                                                <p className="text-sm text-slate-400 font-medium">Affinez vos filtres pour trouver des sessions passées.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Performance Radar Sidebar */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10"></div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3 tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            Impact Score
                                        </h3>
                                        <div className="space-y-8">
                                            <div>
                                                <div className="flex justify-between items-end text-xs font-bold uppercase tracking-wider mb-3">
                                                    <span className="text-slate-500">Satisfaction Élèves</span>
                                                    <span className="text-slate-900 text-sm">4.9/5</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} whileInView={{ width: '98%' }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-indigo-500 rounded-full"></motion.div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-end text-xs font-bold uppercase tracking-wider mb-3">
                                                    <span className="text-slate-500">Réactivité</span>
                                                    <span className="text-slate-900 text-sm">100%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }} className="h-full bg-emerald-500 rounded-full"></motion.div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Requests Map Tab */}
                        {activeTab === 'requests' && (
                            <div className="space-y-5">
                                {/* Header bar */}
                                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-sky-500" /> Demandes à proximité
                                        </h2>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {requests.length > 0
                                                ? `${requests.length} annonce${requests.length > 1 ? 's' : ''} correspondant à votre profil`
                                                : 'Aucune annonce dans votre zone pour l\'instant'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-bold">Rayon :</span>
                                        {[10, 25, 50, 100].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setSearchRadius(r)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${searchRadius === r ? 'bg-sky-600 text-white shadow-md shadow-sky-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {r} km
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Map + sidebar grid */}
                                <div className="grid lg:grid-cols-5 gap-4 items-start">

                                    {/* Request cards sidebar */}
                                    <div className="lg:col-span-2 flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-0.5">
                                        {requests.length === 0 ? (
                                            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                                                <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                                <p className="text-slate-500 font-medium text-sm">Aucune demande disponible</p>
                                                <p className="text-slate-400 text-xs mt-1">Revenez plus tard ou élargissez le rayon</p>
                                            </div>
                                        ) : requests.map((req, i) => {
                                            const cardColors = ['#f59e0b','#8b5cf6','#22c55e','#f97316','#ec4899','#0ea5e9'];
                                            const color = cardColors[i % cardColors.length];
                                            return (
                                                <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all group">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm" style={{ background: color }}>
                                                            {i + 1}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-black text-slate-900 text-sm leading-tight">{req.level?.name || 'Niveau non spécifié'}</h4>
                                                            <p className="text-xs font-bold mt-0.5" style={{ color }}>{req.subjects?.map(s => s.name).join(' · ') || 'Matières'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 space-y-1 pl-12">
                                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />{req.rhythm || 'Rythme à définir'}
                                                        </p>
                                                        {req.address && (
                                                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3 shrink-0" />{req.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            setExpressingInterest(req.id);
                                                            try {
                                                                await api.post('course-interests/', { course_request: req.id });
                                                                alert("Profil transmis ! L'élève recevra votre profil complet par message.");
                                                                setRequests(prev => prev.filter(r => r.id !== req.id));
                                                            } catch (e) {
                                                                alert(e.response?.data?.error || "Erreur lors de la transmission");
                                                            } finally {
                                                                setExpressingInterest(null);
                                                            }
                                                        }}
                                                        disabled={expressingInterest === req.id}
                                                        className="w-full mt-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 text-white"
                                                        style={{ background: expressingInterest === req.id ? '#94a3b8' : '#0f172a' }}
                                                    >
                                                        {expressingInterest === req.id ? 'Envoi en cours...' : 'Postuler →'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Map */}
                                    <div className="lg:col-span-3 h-[560px] rounded-3xl overflow-hidden shadow-lg" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                                        <MapContainer
                                            center={mapCenter}
                                            zoom={11}
                                            scrollWheelZoom={true}
                                            style={{ height: '100%', width: '100%' }}
                                            attributionControl={false}
                                            zoomControl={true}
                                        >
                                            <TileLayer
                                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                            />
                                            <Circle
                                                center={mapCenter}
                                                radius={searchRadius * 1000}
                                                pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.05, weight: 1.5, dashArray: '8 6' }}
                                            />
                                            {/* My position dot */}
                                            <Marker
                                                position={mapCenter}
                                                icon={L.divIcon({
                                                    className: '',
                                                    html: `<div style="width:18px;height:18px;background:#38bdf8;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(56,189,248,0.25),0 2px 8px rgba(0,0,0,0.4)"></div>`,
                                                    iconSize: [18, 18],
                                                    iconAnchor: [9, 9],
                                                })}
                                            >
                                                <Popup closeButton={false}>
                                                    <div style={{ fontFamily: 'system-ui', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>📍 Votre position</div>
                                                </Popup>
                                            </Marker>
                                            {/* Request markers */}
                                            {requests.map((req, i) => {
                                                const colors = ['#f59e0b','#8b5cf6','#22c55e','#f97316','#ec4899','#0ea5e9'];
                                                const color = colors[i % colors.length];
                                                return (
                                                    <Marker
                                                        key={req.id}
                                                        position={[req.latitude, req.longitude]}
                                                        icon={L.divIcon({
                                                            className: '',
                                                            html: `<div style="width:36px;height:36px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;font-family:system-ui;cursor:pointer">${i + 1}</div>`,
                                                            iconSize: [36, 36],
                                                            iconAnchor: [18, 18],
                                                        })}
                                                    >
                                                        <Popup closeButton={false} maxWidth={240}>
                                                            <div style={{ fontFamily: 'system-ui', padding: '4px 2px', minWidth: 210 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 12 }}>{i + 1}</div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>{req.level?.name || 'Niveau'}</div>
                                                                        <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{req.subjects?.map(s => s.name).join(' · ')}</div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 10px', marginBottom: 10, fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                                                                    <div>🕒 {req.rhythm}</div>
                                                                    {req.address && <div>📍 {req.address}</div>}
                                                                </div>
                                                                <button
                                                                    onClick={async () => {
                                                                        setExpressingInterest(req.id);
                                                                        try {
                                                                            await api.post('course-interests/', { course_request: req.id });
                                                                            alert("Profil transmis ! L'élève recevra votre profil complet par message.");
                                                                            setRequests(prev => prev.filter(r => r.id !== req.id));
                                                                        } catch (e) {
                                                                            alert(e.response?.data?.error || "Erreur");
                                                                        } finally {
                                                                            setExpressingInterest(null);
                                                                        }
                                                                    }}
                                                                    disabled={expressingInterest === req.id}
                                                                    style={{ width: '100%', padding: '9px 0', background: '#0f172a', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: expressingInterest === req.id ? 0.6 : 1 }}
                                                                >
                                                                    {expressingInterest === req.id ? 'Envoi...' : 'Postuler →'}
                                                                </button>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}
                                        </MapContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Revenue Tab */}
                        {activeTab === 'revenue' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/20 transition-all duration-700"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                    <Wallet className="w-6 h-6 text-white" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Solde Disponible</span>
                                            </div>
                                            <h3 className="text-5xl font-black tracking-tight mt-6 mb-2">
                                                {wallet ? parseFloat(wallet.balance).toLocaleString('fr-FR') : '0'} <span className="text-2xl text-emerald-200">{user?.currency || 'XOF'}</span>
                                            </h3>
                                            <p className="text-sm font-medium text-emerald-100">Plus {wallet ? parseFloat(wallet.escrow_balance).toLocaleString('fr-FR') : '0'} {user?.currency || 'XOF'} en attente de validation.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 mb-6"><CreditCard className="w-6 h-6 text-emerald-600" /> Retirer mes gains</h3>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">{user?.currency || 'XOF'}</span>
                                                <input
                                                    type="number"
                                                    value={withdrawAmount}
                                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                                    placeholder="Ex: 5000"
                                                    className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none text-slate-900 font-bold transition-all"
                                                />
                                            </div>
                                            <button
                                                onClick={handleWithdraw}
                                                disabled={withdrawLoading}
                                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                                            >
                                                {withdrawLoading ? 'Traitement...' : 'Retirer'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold mt-4">Frais de plateforme (20%) déduits automatiquement. Retraits via GeniusPay.</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-900">Historique des transactions financières</h3>
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
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.transaction_type === 'booking_payment' ? 'bg-emerald-100 text-emerald-600' :
                                                                tx.transaction_type === 'withdrawal' ? 'bg-amber-100 text-amber-600' :
                                                                    tx.transaction_type === 'fee' ? 'bg-indigo-100 text-indigo-600' :
                                                                        'bg-slate-200 text-slate-600'
                                                                }`}>
                                                                {tx.transaction_type === 'booking_payment' ? <Plus className="w-6 h-6" /> :
                                                                    tx.transaction_type === 'withdrawal' ? <ArrowRight className="w-6 h-6" /> :
                                                                        <Minus className="w-6 h-6" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-black text-slate-900 truncate">{tx.description || tx.transaction_type}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {tx.status === 'completed' ? 'Complété' : tx.status === 'pending' ? 'En attente' : 'Échoué'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-full sm:w-auto text-right">
                                                            <span className={`text-lg font-black ${parseFloat(tx.amount) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toLocaleString('fr-FR')} {user?.currency || 'XOF'}
                                                            </span>
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
                    )}
                </div>
            </main>
            {/* New Session Modal */}
            <AnimatePresence>
                {showNewSessionModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewSessionModal(false)}
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
                                <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Programmer une séance</h3>
                                <p className="text-sky-400 text-[10px] font-black uppercase tracking-[0.2em]">Créez un nouvel engagement avec votre élève.</p>
                            </div>

                            {sessionCreated ? (
                                <div className="p-12 text-center space-y-8">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100"
                                    >
                                        <CheckCircle className="w-12 h-12" />
                                    </motion.div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Session Confirmée</h3>
                                        <p className="text-slate-500 font-medium italic">Votre élève a été notifié et la session est ajoutée à votre agenda.</p>
                                    </div>
                                    <button
                                        onClick={() => { setShowNewSessionModal(false); setSessionCreated(false); }}
                                        className="w-full py-5 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-sky-600 transition-all active:scale-95"
                                    >
                                        Terminer
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateSession} className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Trouver l'élève</label>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nom..."
                                                    value={studentSearch.name}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, name: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Ville..."
                                                    value={studentSearch.city}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, city: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Pays..."
                                                    value={studentSearch.country}
                                                    onChange={(e) => setStudentSearch({ ...studentSearch, country: e.target.value })}
                                                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                                                />
                                            </div>
                                            <select
                                                required
                                                value={newSessionData.student}
                                                onChange={(e) => setNewSessionData({ ...newSessionData, student: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none transition-all"
                                            >
                                                <option value="">
                                                    {studentSearch.name || studentSearch.city || studentSearch.country
                                                        ? `Résultats (${filteredStudents.length})...`
                                                        : 'Sélectionner un élève...'
                                                    }
                                                </option>
                                                {filteredStudents.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.first_name} {s.last_name} ({s.city || '???'}, {s.country || '???'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Matière</label>
                                            <select
                                                required
                                                value={newSessionData.subject}
                                                onChange={(e) => setNewSessionData({ ...newSessionData, subject: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none transition-all"
                                            >
                                                <option value="">Sélectionner la matière...</option>
                                                {teacherProfile?.subjects?.map(sub => (
                                                    <option key={sub.id} value={sub.id}>
                                                        {sub.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Durée (Heures)</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    required
                                                    value={newSessionData.duration_hours}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, duration_hours: parseFloat(e.target.value) })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Format</label>
                                                <select
                                                    value={newSessionData.course_type}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, course_type: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm appearance-none"
                                                >
                                                    <option value="online">En ligne</option>
                                                    <option value="in_person">Présentiel</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={newSessionData.date}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, date: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Heure</label>
                                                <input
                                                    type="time"
                                                    required
                                                    value={newSessionData.time}
                                                    onChange={(e) => setNewSessionData({ ...newSessionData, time: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 outline-none font-bold text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setShowNewSessionModal(false); setSessionCreated(false); }}
                                            className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreatingSession}
                                            className="flex-1 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-100 hover:bg-sky-500 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            {isCreatingSession ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer la séance'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
