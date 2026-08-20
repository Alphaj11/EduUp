import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen, ArrowRight, User, GraduationCap, Loader2, CheckCircle, Sparkles,
    Eye, EyeOff, IdCard, FileText, Award, Shield, Upload, X, CheckCircle2, AlertCircle, Briefcase, School
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ─── Composant upload de fichier ──────────────────────────────────────────────
const FileUploadZone = ({ label, hint, accept, file, onChange, onClear, required = false, icon: Icon = FileText }) => {
    const inputRef = useRef(null);
    const isDone = !!file;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-sky-500" />
                    {label}
                    {required && <span className="text-red-400">*</span>}
                </label>
                {!required && <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Optionnel</span>}
            </div>

            <div
                onClick={() => !isDone && inputRef.current?.click()}
                className={`relative w-full rounded-2xl border-2 transition-all duration-200 cursor-pointer group
                    ${isDone
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-dashed border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/40'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={e => e.target.files[0] && onChange(e.target.files[0])}
                />

                {isDone ? (
                    <div className="flex items-center gap-3 px-5 py-4">
                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-emerald-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                                {(file.size / 1024).toFixed(0)} Ko
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onClear(); }}
                            className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                        <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:bg-sky-50 transition-colors">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 group-hover:text-sky-600 transition-colors">
                            Cliquez pour parcourir
                        </p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">{hint}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Indicateur de progression ────────────────────────────────────────────────
const StepBar = ({ current, total }) => (
    <div className="flex items-center gap-2 mb-10">
        {Array.from({ length: total }, (_, i) => {
            const n = i + 1;
            const done = n < current;
            const active = n === current;
            return (
                <React.Fragment key={n}>
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black transition-all duration-300
                        ${done ? 'bg-emerald-500 text-white shadow shadow-emerald-200'
                          : active ? 'bg-sky-600 text-white shadow shadow-sky-200'
                          : 'bg-slate-100 text-slate-400'}`}
                    >
                        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
                    </div>
                    {i < total - 1 && (
                        <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${done ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
const RegisterPage = () => {
    const [role, setRole] = useState('student');
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', username: '', email: '', password: '', gender: 'M'
    });

    // Teacher step 2
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableLevels, setAvailableLevels] = useState([]);
    const [teacherProfile, setTeacherProfile] = useState({
        subjects: [], levels: [], academic_title: 'Mr', experience_years: 0, teacher_type: 'prive'
    });

    // Teacher step 3 — documents
    const [docs, setDocs] = useState({
        identity_document: null,
        bac_diploma: null,
        last_diploma: null, // represents either last diploma OR student ID card
        civil_servant_certificate: null,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const totalSteps = role === 'teacher' ? 3 : 1;

    useEffect(() => {
        api.get('subjects/').then(r => setAvailableSubjects(r.data)).catch(() => {});
        api.get('levels/').then(r => setAvailableLevels(r.data)).catch(() => {});
    }, []);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const setDoc = (key, file) => setDocs(prev => ({ ...prev, [key]: file }));
    const clearDoc = key => setDocs(prev => ({ ...prev, [key]: null }));

    // Reset certificate document if teacher type changes to non-civil-servant
    useEffect(() => {
        if (teacherProfile.teacher_type !== 'fonctionnaire') {
            clearDoc('civil_servant_certificate');
        }
    }, [teacherProfile.teacher_type]);

    // Validation step 3
    const docsValid = () => {
        if (!docs.identity_document) return false;
        if (!docs.bac_diploma) return false;
        if (!docs.last_diploma) return false; // This is the last diploma or student card
        if (teacherProfile.teacher_type === 'fonctionnaire' && !docs.civil_servant_certificate) return false;
        return true;
    };

    const handleSubmit = async e => {
        e.preventDefault();

        // Navigation entre étapes
        if (role === 'teacher' && step === 1) { setStep(2); return; }
        if (role === 'teacher' && step === 2) { setStep(3); return; }

        // Étape finale — soumission
        setError('');
        setIsLoading(true);
        try {
            const fd = new FormData();
            fd.append('first_name', formData.first_name);
            fd.append('last_name', formData.last_name);
            fd.append('username', formData.username);
            fd.append('email', formData.email);
            fd.append('password', formData.password);
            fd.append('gender', formData.gender);
            fd.append('role', role);

            if (role === 'teacher') {
                fd.append('teacher_profile', JSON.stringify(teacherProfile));
                if (docs.identity_document)        fd.append('identity_document', docs.identity_document);
                if (docs.bac_diploma)              fd.append('bac_diploma', docs.bac_diploma);
                if (docs.last_diploma)             fd.append('last_diploma', docs.last_diploma);
                if (docs.civil_servant_certificate) fd.append('civil_servant_certificate', docs.civil_servant_certificate);
            }

            await api.post('auth/register/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (role === 'teacher') {
                navigate('/login', { state: { registrationSuccess: true } });
            } else {
                await register({ ...formData, role });
                navigate('/student-dashboard');
            }
        } catch (err) {
            if (role === 'teacher' && (err.response?.status === 401 || err.response?.status === 403)) {
                navigate('/login', { state: { registrationSuccess: true } });
            } else {
                const errorMsg = err.response?.data?.detail || "Une erreur est survenue lors de l'inscription.";
                setError(errorMsg);
                setStep(1);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls = "w-full px-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300";
    const btnCls = "w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98] group";

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-50 rounded-full blur-[120px] opacity-60" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[120px] opacity-40" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-6xl glass rounded-[2rem] md:rounded-[4rem] shadow-premium overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50"
            >
                {/* ── Left panel ── */}
                <div className="md:w-[35%] bg-slate-950 p-8 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden text-center md:text-left">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full -ml-32 -mt-32 blur-3xl" />
                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 justify-center md:justify-start mb-16 group">
                            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:rotate-12 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tight">Edu<span className="text-sky-600">Up</span></span>
                        </Link>

                        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-4 md:mb-8 leading-[0.95] tracking-tighter">
                            Bâtissons <br /> l'avenir.
                        </h2>
                        <p className="text-slate-400 font-medium text-sm leading-relaxed mb-12 max-w-xs mx-auto md:mx-0">
                            Rejoignez la communauté éducative la plus dynamique d'Afrique Centrale.
                        </p>

                        <div className="space-y-6 hidden md:block">
                            {["Mentorat d'élite", "Sécurisé Mobile Money", "Suivi 360°"].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-sky-600 group-hover:border-sky-500 transition-all">
                                        <CheckCircle className="w-4 h-4 text-sky-500 group-hover:text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 hidden md:block mt-12">
                        <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden">
                            <Sparkles className="absolute top-4 right-4 w-6 h-6 text-sky-500/20" />
                            <p className="text-xs font-medium italic text-slate-300 leading-relaxed">"EduUp : la plateforme que nous attendions tous."</p>
                            <p className="text-[10px] font-black text-sky-500 mt-4 uppercase tracking-widest">— Dr. Jordan, Inspecteur</p>
                        </div>
                    </div>
                </div>

                {/* ── Right panel ── */}
                <div className="md:w-[65%] p-10 lg:p-16 bg-white/40 flex flex-col justify-center overflow-y-auto">
                    <div className="max-w-2xl mx-auto w-full">
                        <header className="mb-8 text-center md:text-left">
                            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Créer un compte.</h1>
                            <p className="text-slate-500 font-medium italic text-sm">
                                {role === 'teacher' && step === 2 ? "Votre expertise (Étape 2/3)."
                                 : role === 'teacher' && step === 3 ? "Vos documents justificatifs (Étape 3/3)."
                                 : "Choisissez votre rôle pour commencer l'aventure."}
                            </p>
                        </header>

                        {/* Step bar */}
                        {role === 'teacher' && <StepBar current={step} total={3} />}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="p-4 mb-6 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">

                                {/* ═══ ÉTAPE 1 — Infos personnelles ═══ */}
                                {step === 1 && (
                                    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                        {/* Rôle */}
                                        <div className="grid grid-cols-2 gap-6 mb-4">
                                            {[
                                                { id: 'student', label: 'Élève', sub: 'Je veux apprendre', icon: GraduationCap },
                                                { id: 'teacher', label: 'Professeur', sub: 'Je veux enseigner', icon: User }
                                            ].map(r => (
                                                <button key={r.id} type="button" onClick={() => setRole(r.id)}
                                                    className={`flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all active:scale-95 relative overflow-hidden group
                                                        ${role === r.id ? 'border-sky-600 bg-white shadow-2xl shadow-sky-100' : 'border-transparent bg-slate-50/50 hover:bg-white hover:border-sky-100'}`}
                                                >
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${role === r.id ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                        <r.icon className="w-7 h-7" />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${role === r.id ? 'text-sky-600' : 'text-slate-400'}`}>{r.sub}</span>
                                                        <span className={`text-sm font-black uppercase tracking-[0.2em] ${role === r.id ? 'text-slate-900' : 'text-slate-600'}`}>{r.label}</span>
                                                    </div>
                                                    {role === r.id && <motion.div layoutId="activeRole" className="absolute top-4 right-4 w-2 h-2 rounded-full bg-sky-600" />}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Sexe */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sexe</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[{ id: 'M', label: 'Masculin' }, { id: 'F', label: 'Féminin' }].map(g => (
                                                    <button key={g.id} type="button" onClick={() => setFormData({ ...formData, gender: g.id })}
                                                        className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] border-2 transition-all active:scale-95
                                                            ${formData.gender === g.id ? 'border-sky-600 bg-sky-50 text-sky-600 shadow-lg shadow-sky-100' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-white hover:border-sky-100'}`}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{g.label}</span>
                                                        {formData.gender === g.id && <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Nom / Prénom */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Prénom</label>
                                                <input required name="first_name" type="text" value={formData.first_name} onChange={handleChange} className={inputCls} placeholder="Jean" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nom</label>
                                                <input required name="last_name" type="text" value={formData.last_name} onChange={handleChange} className={inputCls} placeholder="Dupont" />
                                            </div>
                                        </div>

                                        {/* Identifiant / Email */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identifiant</label>
                                                <input required name="username" type="text" value={formData.username} onChange={handleChange} className={inputCls} placeholder="jean.dupont" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                                                <input required name="email" type="email" value={formData.email} onChange={handleChange} className={inputCls} placeholder="jean@eduup.com" />
                                            </div>
                                        </div>

                                        {/* Mot de passe */}
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                                            <div className="relative">
                                                <input required name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                                                    className={inputCls} placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors">
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <button disabled={isLoading} className={`${btnCls} mt-6`}>
                                            {isLoading
                                                ? <Loader2 className="w-5 h-5 animate-spin" />
                                                : <>{role === 'teacher' ? 'Continuer (Étape 2/3)' : 'Créer mon compte'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                            }
                                        </button>
                                    </motion.div>
                                )}

                                {/* ═══ ÉTAPE 2 — Profil enseignant ═══ */}
                                {step === 2 && role === 'teacher' && (
                                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                                        {/* Matières */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Matières enseignées</label>
                                            <div className="flex flex-wrap gap-2">
                                                {availableSubjects.map(s => (
                                                    <button type="button" key={s.id} onClick={() => {
                                                        const next = teacherProfile.subjects.includes(s.id)
                                                            ? teacherProfile.subjects.filter(id => id !== s.id)
                                                            : [...teacherProfile.subjects, s.id];
                                                        setTeacherProfile({ ...teacherProfile, subjects: next });
                                                    }} className={`px-4 py-2 rounded-[1rem] text-xs font-bold transition-all border-2
                                                        ${teacherProfile.subjects.includes(s.id) ? 'bg-sky-50 border-sky-600 text-sky-700' : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'}`}>
                                                        {s.name}
                                                    </button>
                                                ))}
                                                {availableSubjects.length === 0 && <span className="text-xs text-slate-400 italic">Chargement...</span>}
                                            </div>
                                        </div>

                                        {/* Niveaux */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Niveaux scolaires ciblés</label>
                                            <div className="flex flex-wrap gap-2">
                                                {availableLevels.map(l => (
                                                    <button type="button" key={l.id} onClick={() => {
                                                        const next = teacherProfile.levels.includes(l.id)
                                                            ? teacherProfile.levels.filter(id => id !== l.id)
                                                            : [...teacherProfile.levels, l.id];
                                                        setTeacherProfile({ ...teacherProfile, levels: next });
                                                    }} className={`px-4 py-2 rounded-[1rem] text-xs font-bold transition-all border-2
                                                        ${teacherProfile.levels.includes(l.id) ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-500 hover:border-slate-200'}`}>
                                                        {l.name}
                                                    </button>
                                                ))}
                                                {availableLevels.length === 0 && <span className="text-xs text-slate-400 italic">Chargement...</span>}
                                            </div>
                                        </div>

                                        {/* Titre / Expérience */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Votre Titre</label>
                                                <select required value={teacherProfile.academic_title}
                                                    onChange={e => setTeacherProfile({ ...teacherProfile, academic_title: e.target.value })}
                                                    className={inputCls + " cursor-pointer"}>
                                                    <option value="Mr">Monsieur (Mr)</option>
                                                    <option value="Mme">Madame (Mme)</option>
                                                    <option value="Dr">Docteur (Dr)</option>
                                                    <option value="Pr">Professeur (Pr)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Années d'expérience</label>
                                                <input type="number" required min="0" value={teacherProfile.experience_years}
                                                    onChange={e => setTeacherProfile({ ...teacherProfile, experience_years: parseInt(e.target.value) || 0 })}
                                                    className={inputCls} placeholder="Ex: 5" />
                                            </div>
                                        </div>

                                        {/* Nouveau : Type d'Enseignant (Statut) */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Votre statut professionnel</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                {[
                                                    { id: 'prive', label: 'Indépendant / Privé', sub: 'À mon compte', icon: Briefcase },
                                                    { id: 'fonctionnaire', label: 'Fonctionnaire', sub: 'De l\'État', icon: Shield },
                                                    { id: 'etudiant', label: 'Étudiant', sub: 'Enseignement secondaire', icon: School }
                                                ].map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setTeacherProfile({ ...teacherProfile, teacher_type: t.id })}
                                                        className={`flex flex-col items-center text-center gap-2 p-5 rounded-2xl border-2 transition-all active:scale-95 relative overflow-hidden
                                                            ${teacherProfile.teacher_type === t.id ? 'border-sky-600 bg-sky-50/50 shadow-md shadow-sky-100/50' : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'}`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${teacherProfile.teacher_type === t.id ? 'bg-sky-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                            <t.icon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <span className="block text-[11px] font-black text-slate-900 leading-tight">{t.label}</span>
                                                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{t.sub}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mt-6">
                                            <button type="button" onClick={() => setStep(1)}
                                                className="w-[30%] py-6 glass text-slate-600 font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-slate-50 border border-slate-200 transition-all flex justify-center items-center">
                                                Retour
                                            </button>
                                            <button className="w-[70%] py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl flex items-center justify-center gap-3 group">
                                                Continuer (Étape 3/3) <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ═══ ÉTAPE 3 — Documents justificatifs ═══ */}
                                {step === 3 && role === 'teacher' && (
                                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">

                                        <div className="p-5 bg-sky-50 rounded-2xl border border-sky-100 flex items-start gap-4">
                                            <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center shrink-0">
                                                <Shield className="w-4 h-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-sky-800 mb-1">Documents requis pour validation</p>
                                                <p className="text-[11px] text-sky-600 font-medium leading-relaxed">
                                                    Ces documents seront examinés par notre équipe administrative. Votre compte sera activé après approbation.
                                                    Formats acceptés&nbsp;: PDF, JPG, PNG (max 5 Mo).
                                                </p>
                                            </div>
                                        </div>

                                        <FileUploadZone
                                            label="Pièce d'identité"
                                            hint="CNI · Passeport · PDF ou image"
                                            accept="image/*,.pdf"
                                            file={docs.identity_document}
                                            onChange={f => setDoc('identity_document', f)}
                                            onClear={() => clearDoc('identity_document')}
                                            required
                                            icon={IdCard}
                                        />

                                        <FileUploadZone
                                            label="Diplôme du BAC"
                                            hint="Ou attestation de réussite"
                                            accept="image/*,.pdf"
                                            file={docs.bac_diploma}
                                            onChange={f => setDoc('bac_diploma', f)}
                                            onClear={() => clearDoc('bac_diploma')}
                                            required
                                            icon={GraduationCap}
                                        />

                                        {/* Dernier diplôme / Carte étudiant selon statut */}
                                        {teacherProfile.teacher_type === 'etudiant' ? (
                                            <FileUploadZone
                                                label="Carte d'étudiant / Certificat de scolarité"
                                                hint="Document de l'année universitaire en cours"
                                                accept="image/*,.pdf"
                                                file={docs.last_diploma}
                                                onChange={f => setDoc('last_diploma', f)}
                                                onClear={() => clearDoc('last_diploma')}
                                                required
                                                icon={School}
                                            />
                                        ) : (
                                            <FileUploadZone
                                                label="Dernier diplôme obtenu"
                                                hint="Licence · Master · Doctorat · etc."
                                                accept="image/*,.pdf"
                                                file={docs.last_diploma}
                                                onChange={f => setDoc('last_diploma', f)}
                                                onClear={() => clearDoc('last_diploma')}
                                                required
                                                icon={Award}
                                            />
                                        )}

                                        {/* Certificat uniquement pour les fonctionnaires */}
                                        {teacherProfile.teacher_type === 'fonctionnaire' && (
                                            <FileUploadZone
                                                label="Certificat de fonctionnaire"
                                                hint="Arrêté d'intégration, de nomination ou d'appartenance"
                                                accept="image/*,.pdf"
                                                file={docs.civil_servant_certificate}
                                                onChange={f => setDoc('civil_servant_certificate', f)}
                                                onClear={() => clearDoc('civil_servant_certificate')}
                                                required
                                                icon={Shield}
                                            />
                                        )}

                                        <div className="flex gap-4 pt-2">
                                            <button type="button" onClick={() => setStep(2)}
                                                className="w-[30%] py-6 glass text-slate-600 font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-slate-50 border border-slate-200 transition-all flex justify-center items-center">
                                                Retour
                                            </button>
                                            <button
                                                disabled={isLoading || !docsValid()}
                                                className="w-[70%] py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer ma demande'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </form>

                        <p className="mt-10 text-center text-xs font-medium text-slate-500">
                            Déjà membre ?{' '}
                            <Link to="/login" className="font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest text-[10px] ml-2 border-b-2 border-sky-100 hover:border-sky-600 transition-all">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
