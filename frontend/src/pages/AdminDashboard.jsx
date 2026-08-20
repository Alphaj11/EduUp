import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import {
    LayoutDashboard, DollarSign, Users, Calendar, ShieldAlert,
    TrendingUp, Activity, CheckCircle, Plus, Search, FileText,
    ArrowRight, Minus, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // State Data
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [pendingInterests, setPendingInterests] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTypeFilter, setUserTypeFilter] = useState('student'); // student or teacher
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Form state for creating an admin
    const [newAdmin, setNewAdmin] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleTriggerCancellation = async () => {
        try {
            setIsCancelling(true);
            const res = await api.post('admin/trigger_cancellation/');
            toast.success(`Succès : ${res.data.cancelled_count} cours obsolètes annulés et remboursés.`);
        } catch (error) {
            console.error("Cancellation error:", error);
            toast.error("Erreur lors de l'annulation des cours.");
        } finally {
            setIsCancelling(false);
        }
    };

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                setLoading(true);
                const [statsRes, txRes, bookingsRes, usersRes, teachersRes, interestsRes, ticketsRes] = await Promise.all([
                    api.get('admin/stats/'),
                    api.get('admin/global_transactions/'),
                    api.get('admin/global_bookings/'),
                    api.get(`admin/list_users/?role=${userTypeFilter}`),
                    api.get('admin/pending_teachers/'),
                    api.get('admin/pending_interests/'),
                    api.get('support-tickets/')
                ]);

                setStats(statsRes.data);
                setTransactions(txRes.data);
                setBookings(bookingsRes.data);
                setUsersList(usersRes.data);
                setPendingTeachers(teachersRes.data);
                setPendingInterests(interestsRes.data);
                setSupportTickets(ticketsRes.data);
            } catch (error) {
                console.error("Error fetching admin data:", error);
                toast.error("Erreur de chargement des données. Veuillez réessayer.");
            } finally {
                setLoading(false);
            }
        };

        if (user && (user.role === 'admin' || user.is_superuser)) {
            fetchAdminData();
        }
    }, [user, userTypeFilter]);

    const handleResolveTicket = async (ticketId) => {
        try {
            const res = await api.post(`support-tickets/${ticketId}/resolve/`);
            setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, is_resolved: res.data.is_resolved } : t));
            toast.success("Ticket marqué comme résolu !");
        } catch (error) {
            console.error("Error resolving ticket:", error);
            toast.error("Erreur lors de la résolution du ticket.");
        }
    };

    const filteredUsers = usersList.filter(u => 
        (u.first_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.last_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get(`admin/export_users_csv/?role=${userTypeFilter}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `users_${userTypeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Export CSV réussi !");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Erreur lors de l'export CSV.");
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await api.post('admin/create_admin/', newAdmin);
            toast.success("Administrateur créé avec succès !");
            setNewAdmin({ username: '', email: '', password: '', first_name: '', last_name: '' });
        } catch (error) {
            console.error("Create admin error:", error);
            toast.error(error.response?.data?.error || "Erreur lors de la création.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleUserStatus = async (userId) => {
        try {
            const res = await api.post('admin/toggle_user_status/', { user_id: userId });
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
            toast.success(res.data.is_active ? "Utilisateur réactivé" : "Utilisateur suspendu");
        } catch (error) {
            toast.error(error.response?.data?.error || "Erreur lors du changement de statut");
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur définitivement ?")) return;
        try {
            await api.post('admin/delete_user/', { user_id: userId });
            setUsersList(prev => prev.filter(u => u.id !== userId));
            toast.success("Utilisateur supprimé avec succès");
        } catch (error) {
            toast.error(error.response?.data?.error || "Erreur lors de la suppression");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col pt-24 items-center justify-center">
                <Navbar />
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement du panel...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 pt-24 selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar />

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative">
                {/* Header Profile Area (Admin View) */}
                <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 sm:p-12 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-10 opacity-70"></div>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-900/20 uppercase">
                                {user?.first_name?.[0] || user?.username?.[0] || 'A'}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 rounded-xl border-4 border-white flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                Superviseur Global
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
                                Panel <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-600">Admin</span>
                            </h1>
                            <p className="text-sm font-bold text-slate-500 tracking-wide">Vue panoramique de la plateforme EduUp.</p>
                            <button
                                onClick={handleTriggerCancellation}
                                disabled={isCancelling}
                                className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {isCancelling ? 'Traitement...' : 'Nettoyer Cours Obsolètes'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Navigation Sidebar */}
                    <div className="lg:w-72 shrink-0">
                        <div className="sticky top-32 space-y-2">
                            {[
                                { id: 'overview', icon: LayoutDashboard, label: 'Vue Globale' },
                                { id: 'workflow', icon: CheckCircle, label: 'À Valider' },
                                { id: 'users', icon: Users, label: 'Utilisateurs' },
                                { id: 'transactions', icon: DollarSign, label: 'Transactions' },
                                { id: 'bookings', icon: Calendar, label: 'Réservations' },
                                { id: 'support', icon: HelpCircle, label: 'Tickets Support' },
                                { id: 'admins', icon: ShieldAlert, label: 'Accès & Admins' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-4 p-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === item.id
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20'
                                        : 'bg-white text-slate-500 border border-slate-200/60 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-200' : 'text-slate-400'}`} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 max-w-full overflow-hidden">

                        {/* OVERVIEW TAB */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                        {/* Stat Cards */}
                                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-emerald-200 hover:shadow-xl transition-all">
                                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6"><DollarSign className="w-6 h-6" /></div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Commissions (20%)</h4>
                                            <p className="text-3xl font-black text-slate-900">{stats?.total_commission?.toLocaleString('fr-FR') || 0} <span className="text-sm text-slate-400">{user?.currency || 'XOF'}</span></p>
                                        </div>

                                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm"><TrendingUp className="w-6 h-6 text-indigo-300" /></div>
                                            <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Argent en circulation</h4>
                                            <p className="text-3xl font-black">{stats?.total_circulation?.toLocaleString('fr-FR') || 0} <span className="text-sm text-indigo-400">{user?.currency || 'XOF'}</span></p>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-sky-200 hover:shadow-xl transition-all">
                                            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center mb-6"><Users className="w-6 h-6" /></div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisateurs</h4>
                                            <p className="text-3xl font-black text-slate-900">{stats?.total_users || 0} <span className="text-sm text-slate-400">inscrits</span></p>
                                            <div className="mt-4 flex gap-3 text-[10px] font-bold text-slate-500 uppercase">
                                                <span>{stats?.students_count} Élèves</span>
                                                <span>{stats?.teachers_count} Profs</span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-amber-200 hover:shadow-xl transition-all">
                                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6"><Activity className="w-6 h-6" /></div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taux de réussite</h4>
                                            <p className="text-3xl font-black text-slate-900">{stats?.success_rate || 0}%</p>
                                            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase">{stats?.completed_bookings} sur {stats?.total_bookings} réservations</p>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:border-indigo-200 hover:shadow-xl transition-all">
                                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><Plus className="w-6 h-6" /></div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inscrits aujourd'hui</h4>
                                            <p className="text-3xl font-black text-slate-900">+{stats?.new_users_today || 0}</p>
                                            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase">Total: {stats?.total_users}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
                                            <h3 className="text-lg font-black text-emerald-900 mb-2">Total Dépôts</h3>
                                            <p className="text-3xl font-black text-emerald-600">{stats?.total_deposits?.toLocaleString('fr-FR') || 0} {user?.currency || 'XOF'}</p>
                                        </div>
                                        <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm">
                                            <h3 className="text-lg font-black text-rose-900 mb-2">Total Retraits</h3>
                                            <p className="text-3xl font-black text-rose-600">{stats?.total_withdrawals?.toLocaleString('fr-FR') || 0} {user?.currency || 'XOF'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 mb-2">Comptabilité détaillée</h3>
                                            <p className="text-sm text-slate-500 font-medium">Répartition du montant en circulation sur la plateforme (Portefeuilles).</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fonds Disponibles (Libres)</p>
                                                <p className="text-xl font-black text-slate-900">{stats?.total_balance?.toLocaleString('fr-FR') || 0} {user?.currency || 'XOF'}</p>
                                            </div>
                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fonds Sécurisés (Escrow)</p>
                                                <p className="text-xl font-black text-slate-900">{stats?.total_escrow?.toLocaleString('fr-FR') || 0} {user?.currency || 'XOF'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* WORKFLOW TAB */}
                            {activeTab === 'workflow' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                    {/* Professeurs en attente */}
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 mb-1">Professeurs en attente de validation</h3>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Examinez et approuvez les nouveaux inscrits</p>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">{pendingTeachers.length} à traiter</span>
                                        </div>
                                        <div className="p-4 md:p-8">
                                            {pendingTeachers.length === 0 ? (
                                                <div className="text-center py-10 text-slate-400 font-bold text-sm">Aucun profil en attente.</div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {pendingTeachers.map(profile => (
                                                        <div key={profile.id} className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 gap-6">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">
                                                                    {profile.user?.first_name?.[0] || 'T'}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h4 className="font-black text-slate-900 text-sm">{profile.academic_title} {profile.user?.first_name} {profile.user?.last_name}</h4>
                                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                            profile.teacher_type === 'fonctionnaire' ? 'bg-amber-100 text-amber-800' :
                                                                            profile.teacher_type === 'etudiant' ? 'bg-sky-100 text-sky-800' :
                                                                            'bg-emerald-100 text-emerald-800'
                                                                        }`}>
                                                                            {profile.teacher_type === 'fonctionnaire' ? 'Fonctionnaire' :
                                                                             profile.teacher_type === 'etudiant' ? 'Étudiant Enseignant' :
                                                                             'Indépendant / Privé'}
                                                                        </span>
                                                                    </div>

                                                                    <p className="text-[10px] text-slate-500 font-bold tracking-widest">
                                                                        ID: {profile.user?.id} • {profile.user?.email} • {profile.experience_years || 0} ans d'expérience
                                                                    </p>

                                                                    {/* Document links */}
                                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                                        {profile.identity_document && (
                                                                            <a
                                                                                href={profile.identity_document.startsWith('http') ? profile.identity_document : `http://localhost:8000${profile.identity_document}`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[10px] font-black text-slate-600 transition-colors shadow-xs"
                                                                            >
                                                                                🪪 Pièce d'identité
                                                                            </a>
                                                                        )}
                                                                        {profile.bac_diploma && (
                                                                            <a
                                                                                href={profile.bac_diploma.startsWith('http') ? profile.bac_diploma : `http://localhost:8000${profile.bac_diploma}`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[10px] font-black text-slate-600 transition-colors shadow-xs"
                                                                            >
                                                                                🎓 Diplôme BAC
                                                                            </a>
                                                                        )}
                                                                        {profile.last_diploma && (
                                                                            <a
                                                                                href={profile.last_diploma.startsWith('http') ? profile.last_diploma : `http://localhost:8000${profile.last_diploma}`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[10px] font-black text-slate-600 transition-colors shadow-xs"
                                                                            >
                                                                                📜 {profile.teacher_type === 'etudiant' ? "Carte d'étudiant" : "Dernier diplôme"}
                                                                            </a>
                                                                        )}
                                                                        {profile.civil_servant_certificate && (
                                                                            <a
                                                                                href={profile.civil_servant_certificate.startsWith('http') ? profile.civil_servant_certificate : `http://localhost:8000${profile.civil_servant_certificate}`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-[10px] font-black text-slate-600 transition-colors shadow-xs"
                                                                            >
                                                                                🛡️ Certificat Fonctionnaire
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await api.post('admin/approve_teacher/', { profile_id: profile.id });
                                                                            setPendingTeachers(prev => prev.filter(p => p.id !== profile.id));
                                                                            toast.success("Professeur approuvé !");
                                                                        } catch (e) {
                                                                            toast.error("Erreur lors de l'approbation");
                                                                        }
                                                                    }}
                                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md active:scale-95 transition-all text-center"
                                                                >
                                                                    Accepter
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if(window.confirm("Refuser ce professeur ?")) {
                                                                            try {
                                                                                await api.post('admin/reject_teacher/', { profile_id: profile.id });
                                                                                setPendingTeachers(prev => prev.filter(p => p.id !== profile.id));
                                                                                toast.success("Professeur refusé !");
                                                                            } catch (e) {
                                                                                toast.error("Erreur lors du refus");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all text-center"
                                                                >
                                                                    Refuser
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Intérêts de cours en attente */}
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 mb-1">Intérêts de cours à transmettre</h3>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Mises en relation sécurisées</p>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">{pendingInterests.length} à traiter</span>
                                        </div>
                                        <div className="p-4 md:p-8">
                                            {pendingInterests.length === 0 ? (
                                                <div className="text-center py-10 text-slate-400 font-bold text-sm">Aucun intérêt de cours en attente.</div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {pendingInterests.map(interest => (
                                                        <div key={interest.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 gap-6">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-md text-[9px] font-black uppercase tracking-widest">Élève: {interest.course_request_details?.student_details?.first_name}</span>
                                                                    <ArrowRight className="w-4 h-4 text-slate-300" />
                                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-black uppercase tracking-widest">Prof: {interest.teacher_details?.academic_title} {interest.teacher_details?.user_details?.last_name}</span>
                                                                </div>
                                                                <h4 className="font-black text-slate-900 text-sm mb-1">Pour: {interest.course_request_details?.level_details?.name} ({interest.course_request_details?.subjects_details?.map(s => s.name).join(', ')})</h4>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rythme : {interest.course_request_details?.rhythm}</p>
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await api.post('admin/transmit_interest/', { interest_id: interest.id });
                                                                        setPendingInterests(prev => prev.filter(p => p.id !== interest.id));
                                                                        toast.success("Intérêt transmis à l'élève avec succès !");
                                                                    } catch (e) {
                                                                        toast.error("Erreur lors de la transmission");
                                                                    }
                                                                }}
                                                                className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                                            >
                                                                <ArrowRight className="w-4 h-4" /> Transmettre à l'élève
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* USERS TAB */}
                            {activeTab === 'users' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                            <button
                                                onClick={() => setUserTypeFilter('student')}
                                                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${userTypeFilter === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                ÉLÈVES ({stats?.students_count || 0})
                                            </button>
                                            <button
                                                onClick={() => setUserTypeFilter('teacher')}
                                                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${userTypeFilter === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                PROFS ({stats?.teachers_count || 0})
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleExportCSV}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                                            >
                                                <FileText className="w-4 h-4" /> Export CSV
                                            </button>
                                            <button
                                                onClick={handlePrint}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                                            >
                                                <Activity className="w-4 h-4" /> Imprimer / PDF
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative mt-2">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Rechercher par nom, email, identifiant..." 
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                        <div className="p-4 md:p-8 overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Candidat</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Contact</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Localisation</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Statut</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredUsers.map((u) => (
                                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-4 border-b border-slate-50">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-indigo-600">
                                                                        {u.first_name?.[0] || u.username?.[0]}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold">@{u.username}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 border-b border-slate-50">
                                                                <p className="text-xs font-bold text-slate-700">{u.email}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{u.phone_number || 'Pas de numéro'}</p>
                                                            </td>
                                                            <td className="py-4 border-b border-slate-50 text-xs font-bold text-slate-600">
                                                                {u.city}, {u.country}
                                                            </td>
                                                            <td className="py-4 border-b border-slate-50">
                                                                {u.is_active ? (
                                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">Actif</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-rose-100 text-rose-700 rounded-md">Suspendu</span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 border-b border-slate-50 text-right space-x-2">
                                                                <button onClick={() => toggleUserStatus(u.id)} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${u.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                                                    {u.is_active ? 'Suspendre' : 'Activer'}
                                                                </button>
                                                                <button onClick={() => deleteUser(u.id)} className="text-[10px] font-black uppercase px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-all">
                                                                    Supprimer
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {filteredUsers.length === 0 && <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest">Aucun utilisateur trouvé.</div>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* TRANSACTIONS TAB */}
                            {activeTab === 'transactions' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-900">Les 50 dernières transactions</h3>
                                    </div>
                                    <div className="p-4 md:p-8 overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID / Date</th>
                                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Utilisateur</th>
                                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Type</th>
                                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Statut</th>
                                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Montant</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="py-4 border-b border-slate-50">
                                                            <p className="text-xs font-bold text-slate-900">{tx.reference_id || `#${tx.id}`}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </td>
                                                        <td className="py-4 border-b border-slate-50 text-sm font-bold text-slate-700">
                                                            {tx.user_full_name}
                                                        </td>
                                                        <td className="py-4 border-b border-slate-50 text-xs font-bold text-slate-500 uppercase">
                                                            {tx.transaction_type}
                                                        </td>
                                                        <td className="py-4 border-b border-slate-50">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                        <td className={`py-4 border-b border-slate-50 text-right font-black ${parseFloat(tx.amount) > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                            {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toLocaleString('fr-FR')} {user?.currency || 'XOF'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {transactions.length === 0 && <div className="text-center py-10 text-slate-400 font-bold text-sm">Vide.</div>}
                                    </div>
                                </motion.div>
                            )}

                            {/* BOOKINGS TAB */}
                            {activeTab === 'bookings' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-900">Aperçu Récent des Réservations</h3>
                                    </div>
                                    <div className="p-4 md:p-8">
                                        <div className="space-y-4">
                                            {bookings.map((booking) => (
                                                <div key={booking.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all gap-4">
                                                    <div>
                                                        <h4 className="font-black text-slate-900">{booking.subject_details?.name || 'Matière'}</h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                            Le {new Date(booking.date).toLocaleDateString()} • {booking.duration_hours}h • {booking.course_type === 'online' ? 'Ligne' : 'Présentiel'}
                                                        </p>
                                                    </div>
                                                    <div className="text-center sm:text-right">
                                                        <p className="text-sm font-bold text-slate-700">Prix : {booking.price} {user?.currency || 'XOF'}</p>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-1 inline-block ${booking.status === 'completed' ? 'text-emerald-500' :
                                                            booking.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'
                                                            }`}>
                                                            {booking.status} / {booking.payment_status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {bookings.length === 0 && <div className="text-center py-10 text-slate-400 font-bold text-sm">Vide.</div>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SUPPORT TICKETS TAB */}
                            {activeTab === 'support' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 mb-1">Tickets de Support</h3>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Gérer les signalements et problèmes techniques des utilisateurs</p>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">
                                                {supportTickets.filter(t => !t.is_resolved).length} ouverts
                                            </span>
                                        </div>
                                        <div className="p-4 md:p-8 overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID / Date</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Utilisateur</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Message / Signalement</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Statut</th>
                                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {supportTickets.map((ticket) => (
                                                        <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-6 border-b border-slate-50 text-xs font-bold text-slate-900">
                                                                <p>#{ticket.id}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold mt-1">
                                                                    {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </td>
                                                            <td className="py-6 border-b border-slate-50">
                                                                <p className="text-xs font-bold text-slate-800">
                                                                    {ticket.user_details?.first_name} {ticket.user_details?.last_name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-bold">
                                                                    @{ticket.user_details?.username} ({ticket.user_details?.role})
                                                                </p>
                                                            </td>
                                                            <td className="py-6 border-b border-slate-50 text-xs text-slate-600 font-medium max-w-md whitespace-pre-wrap leading-relaxed">
                                                                {ticket.message}
                                                            </td>
                                                            <td className="py-6 border-b border-slate-50">
                                                                {ticket.is_resolved ? (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md">Résolu</span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md animate-pulse">Ouvert</span>
                                                                )}
                                                            </td>
                                                            <td className="py-6 border-b border-slate-50 text-right">
                                                                {!ticket.is_resolved && (
                                                                    <button
                                                                        onClick={() => handleResolveTicket(ticket.id)}
                                                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                                                                    >
                                                                        Résoudre
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {supportTickets.length === 0 && (
                                                <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest">
                                                    Aucun ticket de support trouvé.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ADMINS CREATION TAB */}
                            {activeTab === 'admins' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-8 md:p-12">
                                    <div className="mb-8">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6"><ShieldAlert className="w-8 h-8" /></div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Ajouter un Administrateur</h2>
                                        <p className="text-sm text-slate-500 font-medium">Créez un profil administrateur bénéficiant d'un accès intégral au système financier et aux paramètres globaux.</p>
                                    </div>

                                    <form onSubmit={handleCreateAdmin} className="space-y-6 max-w-xl">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Prénom</label>
                                                <input
                                                    type="text" required value={newAdmin.first_name} onChange={e => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-slate-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nom</label>
                                                <input
                                                    type="text" required value={newAdmin.last_name} onChange={e => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-slate-900"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Pseudonyme (Unique)</label>
                                            <input
                                                type="text" required value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-slate-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cordonnées Email</label>
                                            <input
                                                type="email" required value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-slate-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Mot de passe provisoire</label>
                                            <input
                                                type="password" required value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-slate-900"
                                            />
                                        </div>

                                        <button
                                            type="submit" disabled={isSubmitting}
                                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? 'Création en cours...' : <><Plus className="w-4 h-4" /> Créer le Gestionnaire</>}
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
