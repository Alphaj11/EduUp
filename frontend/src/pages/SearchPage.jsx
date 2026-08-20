import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Star, CheckCircle, MapPin, BookOpen,
    Book, X, ChevronDown, ArrowRight, Loader2, Sparkles, SlidersHorizontal, Menu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import BookingModal from '../components/BookingModal';
import { useDesktop } from '../hooks/useDesktop';
import api from '../api/axios';

const SearchPage = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        subject: '',
        level: '',
        min_rate: '',
        max_rate: '',
        country: '',
        city: '',
    });
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isBioModalOpen, setIsBioModalOpen] = useState(false);
    const [teacherForBio, setTeacherForBio] = useState(null);
    const isDesktop = useDesktop();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [levels, setLevels] = useState([]);

    // Close sidebar when switching to desktop
    useEffect(() => {
        if (isDesktop) setIsSidebarOpen(false);
    }, [isDesktop]);
    const [viewType, setViewType] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
        const fetchMetadata = async () => {
            try {
                const [sRes, lRes] = await Promise.all([
                    api.get('subjects/'),
                    api.get('levels/')
                ]);
                setSubjects(sRes.data);
                setLevels(lRes.data);
            } catch (err) {
                console.error("Error fetching metadata", err);
            }
        };
        fetchMetadata();
    }, []);

    useEffect(() => {
        const fetchTeachers = async () => {
            setLoading(true);
            try {
                // Remove empty filters
                const activeFilters = {};
                Object.keys(filters).forEach(key => {
                    if (filters[key]) activeFilters[key] = filters[key];
                });
                const response = await api.get('teachers/', { params: activeFilters });
                setTeachers(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeachers();
    }, [filters]);

    useEffect(() => {
        // Reset page when filters change
        setCurrentPage(1);
    }, [filters]);

    const totalPages = Math.ceil(teachers.length / itemsPerPage);
    const paginatedTeachers = teachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-sky-100 relative overflow-x-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-sky-100/40 to-transparent pointer-events-none rounded-b-full blur-3xl" />

            <main className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-32 relative z-10 w-full">
                {/* Mobile Toggle Button */}
                <div className="lg:hidden fixed bottom-8 right-8 z-[100]">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-16 h-16 bg-slate-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-sky-600 transition-all active:scale-95 border-4 border-white"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Premium Header */}
                <header className="mb-16 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Trouver votre mentor idéal</h2>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-4">
                            L'élite de <br />
                            <span className="text-slate-400">l'enseignement.</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-base md:text-lg">Plus de 500 professeurs certifiés en zone CEMAC à votre service.</p>
                    </motion.div>

                    <div className="flex bg-white/60 backdrop-blur-xl rounded-2xl p-1.5 shadow-sm border border-slate-200/60">
                        <button
                            onClick={() => setViewType('grid')}
                            className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${viewType === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
                        >
                            Grille
                        </button>
                        <button
                            onClick={() => setViewType('list')}
                            className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${viewType === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'}`}
                        >
                            Liste
                        </button>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-start relative">

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

                                        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
                                            <div className="w-10 h-10 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
                                                <SlidersHorizontal className="w-5 h-5" />
                                            </div>
                                            <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Filtres Avancés</span>
                                        </div>

                                        <div className="space-y-10 flex-1">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Matière</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-slate-50 border-none rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none uppercase tracking-wider"
                                                        value={filters.subject}
                                                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                                    >
                                                        <option value="">Tous les domaines</option>
                                                        {subjects.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Niveau d'études</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-slate-50 border-none rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none uppercase tracking-wider"
                                                        value={filters.level}
                                                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                                    >
                                                        <option value="">Tous les niveaux</option>
                                                        {levels.map(l => (
                                                            <option key={l.id} value={l.id}>{l.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Pays (CEMAC)</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-slate-50 border-none rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none uppercase tracking-wider"
                                                        value={filters.country}
                                                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                                                    >
                                                        <option value="">Tous les pays</option>
                                                        <option value="Cameroun">Cameroun</option>
                                                        <option value="Gabon">Gabon</option>
                                                        <option value="Tchad">Tchad</option>
                                                        <option value="Congo">Congo</option>
                                                        <option value="Centrafrique">Centrafrique</option>
                                                        <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ville</label>
                                                <input
                                                    type="text"
                                                    placeholder="ex: Douala, Libreville..."
                                                    className="w-full bg-slate-50 border-none rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 uppercase tracking-wider"
                                                    value={filters.city}
                                                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Budget Max (XAF/h)</label>
                                                <input
                                                    type="number"
                                                    placeholder="ex: 5000"
                                                    className="w-full bg-slate-50 border-none rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 uppercase tracking-wider"
                                                    value={filters.max_rate}
                                                    onChange={(e) => setFilters({ ...filters, max_rate: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-8 border-t border-slate-100">
                                            <button
                                                onClick={() => setIsSidebarOpen(false)}
                                                className="w-full py-4 text-center font-black text-[10px] uppercase tracking-widest bg-slate-950 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
                                            >
                                                Appliquer les filtres
                                            </button>
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Desktop Side Bar */}
                    <aside className="hidden lg:block w-80 sticky top-32">

                        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
                            <div className="w-10 h-10 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
                                <SlidersHorizontal className="w-5 h-5" />
                            </div>
                            <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Filtres Avancés</span>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Matière</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white border-2 border-slate-50 rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none hover:border-sky-100 uppercase tracking-wider"
                                        value={filters.subject}
                                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                    >
                                        <option value="">Tous les domaines</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Niveau d'études</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white border-2 border-slate-50 rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none hover:border-sky-100 uppercase tracking-wider"
                                        value={filters.level}
                                        onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                    >
                                        <option value="">Tous les niveaux</option>
                                        {levels.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Pays (CEMAC)</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white border-2 border-slate-50 rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 transition-all outline-none appearance-none hover:border-sky-100 uppercase tracking-wider"
                                        value={filters.country}
                                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                                    >
                                        <option value="">Tous les pays</option>
                                        <option value="Cameroun">Cameroun</option>
                                        <option value="Gabon">Gabon</option>
                                        <option value="Tchad">Tchad</option>
                                        <option value="Congo">Congo</option>
                                        <option value="Centrafrique">Centrafrique</option>
                                        <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ville</label>
                                <input
                                    type="text"
                                    placeholder="ex: Douala, Yaoundé..."
                                    className="w-full bg-white border-2 border-slate-50 rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 uppercase tracking-wider"
                                    value={filters.city}
                                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Budget Max (XAF/h)</label>
                                <input
                                    type="number"
                                    placeholder="ex: 5000"
                                    className="w-full bg-white border-2 border-slate-50 rounded-[1.2rem] px-5 py-4 text-xs font-black text-slate-700 focus:ring-4 focus:ring-sky-100 outline-none transition-all placeholder:text-slate-300 uppercase tracking-wider"
                                    value={filters.max_rate}
                                    onChange={(e) => setFilters({ ...filters, max_rate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* AI Suggestion Box */}
                        <div className="mt-12 pt-10 border-t border-slate-100">
                            <div className="p-8 bg-slate-950 rounded-[2.5rem] text-white relative overflow-hidden group">
                                <Sparkles className="absolute top-4 right-4 w-6 h-6 text-sky-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-sky-500">Assistant IA</p>
                                <p className="text-xs font-bold leading-relaxed mb-6 text-slate-400">Laissez notre IA analyser votre besoin et suggérer l'expert idéal.</p>
                                <button className="w-full py-4 bg-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-950/50 hover:bg-sky-500 transition-colors">Lancer l'Analyse</button>
                            </div>
                        </div>
                    </aside>

                    {/* Unified Main Content */}
                    <div className="flex-1">
                        {
                            loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10" >
                                    {
                                        [1, 2, 3, 4].map(i => (
                                            <div key={i} className="bg-white/40 h-[500px] rounded-[4rem] animate-pulse border-2 border-white/50 shadow-sm"></div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <div className="flex flex-col gap-10">
                                    <div className={`grid gap-6 md:gap-10 ${viewType === 'grid' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'} pb-24`}>
                                        <AnimatePresence mode="popLayout">
                                            {paginatedTeachers.map((teacher) => (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    key={teacher.id}
                                                    className={`bg-white p-5 md:p-8 rounded-3xl border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all group relative overflow-hidden flex ${viewType === 'list' ? 'flex-col md:flex-row items-stretch gap-4 md:gap-8' : 'flex-col'}`}
                                                >
                                                    {/* Badge Overlay - Hidden or repositioned on mobile List */}
                                                    <div className={`absolute top-4 right-4 md:top-6 md:right-6 flex flex-col items-end gap-2 z-20 ${viewType === 'list' ? 'hidden md:flex' : 'flex'}`}>
                                                        <div className="px-2 md:px-3 py-1 md:py-1.5 bg-amber-50 rounded-xl flex items-center gap-1 md:gap-1.5 border border-amber-100">
                                                            <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-amber-500 text-amber-500" />
                                                            <span className="text-[10px] md:text-[11px] font-bold text-amber-700 tracking-wider">{teacher.rating}</span>
                                                        </div>
                                                        {teacher.is_certified && (
                                                            <div className="px-2 md:px-3 py-1 md:py-1.5 bg-sky-50 rounded-xl flex items-center gap-1 md:gap-1.5 border border-sky-100">
                                                                <CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-sky-600" />
                                                                <span className="text-[9px] md:text-[10px] font-bold text-sky-700 tracking-wider uppercase">Certifié</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Profile Info Section */}
                                                    <div className={`flex flex-col flex-1 ${viewType === 'list' ? 'md:justify-between min-w-0 md:pr-12' : ''}`}>
                                                        {/* Header: Image + Name (Compact on mobile list) */}
                                                        <div className={`flex gap-4 md:gap-6 mb-4 md:mb-6 relative z-10 ${viewType === 'list' ? 'items-center md:items-start' : 'items-center'}`}>
                                                            <div className="relative shrink-0">
                                                                <div className="absolute -inset-2 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 blur-lg transition-opacity"></div>
                                                                <img
                                                                    src={teacher.user.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.user.username}`}
                                                                    className={`${viewType === 'list' ? 'w-16 h-16 md:w-24 md:h-24' : 'w-20 h-20 md:w-24 md:h-24'} rounded-full object-cover bg-white p-1 border-2 border-white shadow-md group-hover:scale-105 transition-transform`}
                                                                    alt=""
                                                                />
                                                                {teacher.user.is_online && (
                                                                    <div className="absolute bottom-1 right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full border-2 md:border-4 border-white shadow-sm ring-1 ring-emerald-100 animate-pulse"></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className={`${viewType === 'list' ? 'text-lg md:text-3xl' : 'text-xl md:text-3xl'} font-black text-slate-900 truncate tracking-tighter`}>
                                                                        {teacher.academic_title === 'Dr' ? 'Dr.' : teacher.academic_title === 'Pr' ? 'Pr.' : teacher.academic_title === 'Mme' ? 'Mme' : 'M.'} {teacher.user.last_name}
                                                                    </h3>
                                                                    {/* Mobile Rating Badge (List mode only) */}
                                                                    {viewType === 'list' && (
                                                                        <div className="md:hidden flex items-center gap-1 text-amber-500">
                                                                            <Star className="w-3 h-3 fill-amber-500" />
                                                                            <span className="text-[10px] font-bold">{teacher.rating}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-x-3 md:gap-x-4 gap-y-1 md:gap-y-2 mt-0.5">
                                                                    <span className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                        <MapPin className="w-3 md:w-3.5 md:h-3.5 text-sky-600" /> {teacher.user.city || 'CEMAC'}
                                                                    </span>
                                                                    <div className="hidden md:flex items-center gap-2">
                                                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <Star className="w-3.5 h-3.5 fill-indigo-500" /> {teacher.rating || 'Nouveau'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Info Grid (Experience, Mode) - More compact on mobile */}
                                                        <div className={`grid ${viewType === 'list' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'} gap-2 md:gap-4 mb-4 md:mb-6`}>
                                                            <div className="p-2 md:p-3 bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-100 flex flex-col justify-center">
                                                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Expérience</p>
                                                                <p className="text-[10px] md:text-xs font-bold text-slate-700">{teacher.experience_years} ans</p>
                                                            </div>
                                                            <div className="p-2 md:p-3 bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-100 flex flex-col justify-center">
                                                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modalité</p>
                                                                <p className="text-[10px] md:text-xs font-bold text-slate-700">{teacher.accepts_online ? 'En ligne' : 'Presentiel'}</p>
                                                            </div>
                                                            {/* Hidden Title box on mobile for better space */}
                                                            <div className="hidden md:block p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Titre</p>
                                                                <p className="text-xs font-bold text-slate-700">{teacher.academic_title}</p>
                                                            </div>
                                                        </div>

                                                        {/* Bio - Hidden on mobile List for maximum compactness */}
                                                        <p className={`text-[13px] md:text-sm font-medium text-slate-500 line-clamp-2 md:line-clamp-3 mb-4 md:mb-6 leading-relaxed italic border-l-[3px] border-slate-100 pl-4 ${viewType === 'list' ? 'hidden md:block flex-1' : ''}`}>
                                                            "{teacher.bio}"
                                                        </p>

                                                        {/* Subjects */}
                                                        <div className={`flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-8 mt-auto relative z-10 transition-transform group-hover:translate-x-1 ${viewType === 'list' ? 'md:flex' : ''}`}>
                                                            {teacher.subjects.slice(0, isDesktop ? 5 : 2).map((sub, idx) => (
                                                                <span key={sub.id} className="px-2.5 md:px-4 py-1 md:py-1.5 bg-white text-slate-600 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg md:rounded-xl border border-slate-200 flex items-center gap-1 md:gap-1.5 transition-all hover:border-sky-300 hover:text-sky-600 shadow-sm">
                                                                    <Book className="w-2.5 h-2.5 md:w-3 md:h-3" /> {sub.name}
                                                                </span>
                                                            ))}
                                                            {!isDesktop && teacher.subjects.length > 2 && (
                                                                <span className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider rounded-lg border border-slate-100">
                                                                    +{teacher.subjects.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer Actions */}
                                                    <div className={`flex items-center justify-between gap-4 md:gap-6 pt-4 md:pt-6 border-t border-slate-100 relative z-10 ${viewType === 'list' ? 'md:flex-col md:border-t-0 md:border-l md:pl-8 md:pt-0 md:justify-center md:items-center' : ''}`}>
                                                        <div className={`flex flex-col ${viewType === 'list' ? 'md:items-center md:text-center shrink-0 md:min-w-[140px]' : ''}`}>
                                                            <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Tarif Horaire</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-xl md:text-3xl font-bold text-indigo-600 tracking-tight">
                                                                    {Math.round(teacher.hourly_rate)}
                                                                </span>
                                                                <span className="text-[8px] md:text-[10px] uppercase text-slate-400 font-bold tracking-widest">XAF / h</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 md:gap-3 w-auto">
                                                            <button
                                                                onClick={() => {
                                                                    setTeacherForBio(teacher);
                                                                    setIsBioModalOpen(true);
                                                                }}
                                                                className="p-3 md:p-4 bg-slate-50 text-slate-600 rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all active:scale-95 border border-slate-200 flex items-center justify-center shrink-0"
                                                                title="Voir la bio"
                                                            >
                                                                <Menu className="w-4 h-4 md:w-5 md:h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTeacher(teacher);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="px-5 md:px-8 py-3 md:py-4 bg-slate-900 text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl md:rounded-[1.4rem] hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/5 active:scale-95 hover:shadow-sky-100 whitespace-nowrap"
                                                            >
                                                                Réserver
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-16 drop-shadow-sm">
                                            <button
                                                onClick={() => {
                                                    setCurrentPage(p => Math.max(1, p - 1));
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === 1}
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-slate-600 border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                            >
                                                <ChevronDown className="w-5 h-5 rotate-90" />
                                            </button>

                                            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl px-4 py-2 rounded-[1.2rem] border border-slate-100 shadow-sm">
                                                {[...Array(totalPages)].map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setCurrentPage(i + 1);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${currentPage === i + 1
                                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                                                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setCurrentPage(p => Math.min(totalPages, p + 1));
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === totalPages}
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-slate-600 border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                            >
                                                <ChevronDown className="w-5 h-5 -rotate-90" />
                                            </button>
                                        </div>
                                    )}

                                    {teachers.length === 0 && (
                                        <div className="col-span-full py-32 text-center bg-white/60 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm">
                                            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-premium border border-slate-100">
                                                <Search className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Aucun Mentor Trouvé</h3>
                                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto mb-8">Nous n'avons trouvé aucun professeur correspondant à vos critères actuels.</p>
                                            <button onClick={() => setFilters({ subject: '', level: '', min_rate: '', max_rate: '', country: '', city: '' })} className="px-8 py-4 bg-sky-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.2rem] hover:bg-sky-500 transition-all shadow-xl shadow-sky-100">Réinitialiser les filtres</button>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                </div>
            </main>

            {selectedTeacher && (
                <BookingModal
                    teacher={selectedTeacher}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {/* Bio Modal */}
            <AnimatePresence>
                {isBioModalOpen && teacherForBio && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsBioModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white p-10 rounded-[3rem] shadow-premium max-w-lg w-full relative z-10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Description du Professeur</h3>
                                        <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">À propos de {teacherForBio.user.first_name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsBioModalOpen(false)}
                                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4 italic text-slate-600 text-sm leading-relaxed relative">
                                    <span className="text-4xl text-sky-200 absolute -top-4 -left-2 font-serif opacity-50">"</span>
                                    {teacherForBio.bio || "Aucune description fournie."}
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {teacherForBio.subjects.map(sub => (
                                        <span key={sub.id} className="px-4 py-1.5 bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">
                                            {sub.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
        </div >
    );
};

export default SearchPage;
