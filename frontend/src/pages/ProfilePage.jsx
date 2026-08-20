import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, MapPin, Globe,
    Save, ArrowLeft, Camera, Loader2, CheckCircle2, X, AlertTriangle, Trash2,
    Plus, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ProfilePage = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = React.useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        city: '',
        country: 'Cameroun',
        gender: 'M',
        teacher_profile: {
            academic_title: 'Mr',
            bio: '',
            subjects: [],
            custom_subjects: ''
        }
    });
    const [customSubjectInput, setCustomSubjectInput] = useState('');
    const [allSubjects, setAllSubjects] = useState([]);
    const [profileImage, setProfileImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api/', '') || 'http://localhost:8000';

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        // Populate form from AuthContext user (already fetched)
        setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
            city: user.city || '',
            country: user.country || 'Cameroun',
            gender: user.gender || 'M',
            teacher_profile: user.role === 'teacher' ? {
                academic_title: user.teacher_profile?.academic_title || 'Mr',
                bio: user.teacher_profile?.bio || '',
                subjects: user.teacher_profile?.subjects?.map(s => typeof s === 'object' ? s.id : s) || [],
                levels: user.teacher_profile?.levels?.map(l => typeof l === 'object' ? l.id : l) || [],
                custom_subjects: user.teacher_profile?.custom_subjects || ''
            } : {}
        });

        // Fetch subjects if teacher
        if (user.role === 'teacher') {
            api.get('subjects/').then(res => setAllSubjects(res.data)).catch(console.error);
        }

        if (user.profile_picture) {
            const pic = user.profile_picture.startsWith('http')
                ? user.profile_picture
                : `${API_BASE}${user.profile_picture}`;
            setProfileImage(pic);
        }
    }, [user, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-sky-600 animate-spin" />
            </div>
        );
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            // Use AuthContext updateProfile so user state (incl. photo) updates globally
            const payload = { ...formData };
            if (selectedFile) payload.profile_picture = selectedFile;
            await updateProfile(payload);
            setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
            setSelectedFile(null);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Une erreur est survenue lors de la mise à jour.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await api.delete('users/me/');
            logout(navigate);
        } catch (err) {
            setMessage({ type: 'error', text: 'Erreur lors de la suppression du compte.' });
            setIsDeleteDialogOpen(false);
            setIsDeleting(false);
        }
    };

    if (!user && !isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
                <p className="font-black uppercase tracking-widest text-slate-400">Veuillez vous connecter</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-3 bg-slate-950 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                >
                    Connexion
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-sky-100 pb-20">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24">
                <div className="flex items-center gap-4 mb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Paramètres de compte</p>
                </div>

                <header className="mb-16">
                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-none">Mon <span className="text-slate-400">Profil.</span></h1>
                    <p className="text-slate-500 font-medium italic">Personnalisez votre identité sur la plateforme EduUp.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Photo de Profil */}
                    <div className="col-span-1">
                        <div className="glass p-8 rounded-[3rem] text-center border border-white relative overflow-hidden group">
                            <div className="relative inline-block mb-6">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-sky-500 to-purple-500 rounded-[3rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                                <img
                                    src={profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                    className="w-32 h-32 rounded-[2.5rem] bg-white p-2 border-2 border-white shadow-xl relative z-10 object-cover"
                                    alt="avatar"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-950 text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-lg z-20 hover:bg-sky-600 transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{user?.username}</h3>
                            <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest italic">{user?.role === 'teacher' ? 'Professeur Elite' : 'Étudiant Elite'}</p>
                        </div>
                    </div>

                    {/* Formulaire */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="glass p-6 sm:p-10 rounded-[2rem] md:rounded-[4rem] border border-white shadow-premium space-y-8">
                            <AnimatePresence>
                                {message.text && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                            }`}
                                    >
                                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {message.text}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                    <input
                                        type="email"
                                        disabled
                                        value={formData.email}
                                        className="w-full bg-slate-100/50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-400 cursor-not-allowed outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone (Zone CEMAC)</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                    <input
                                        type="tel"
                                        placeholder="+237 6..."
                                        value={formData.phone_number}
                                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sexe</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'M', label: 'Masculin' },
                                        { id: 'F', label: 'Féminin' }
                                    ].map(g => (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                                const nextTitle = g.id === 'F' && formData.teacher_profile?.academic_title === 'Mr' ? 'Mme' :
                                                    g.id === 'M' && formData.teacher_profile?.academic_title === 'Mme' ? 'Mr' :
                                                        formData.teacher_profile?.academic_title;

                                                setFormData({
                                                    ...formData,
                                                    gender: g.id,
                                                    teacher_profile: user.role === 'teacher' ? {
                                                        ...formData.teacher_profile,
                                                        academic_title: nextTitle
                                                    } : formData.teacher_profile
                                                });
                                            }}
                                            className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${formData.gender === g.id
                                                ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-sm'
                                                : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ville</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                        <input
                                            type="text"
                                            placeholder="Douala, Yaoundé..."
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pays</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                        <select
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all appearance-none uppercase tracking-widest text-[10px]"
                                        >
                                            <option value="Cameroun">Cameroun</option>
                                            <option value="Gabon">Gabon</option>
                                            <option value="Congo">Congo</option>
                                            <option value="Tchad">Tchad</option>
                                            <option value="RCA">RCA</option>
                                            <option value="Guinée Équatoriale">Guinée Équatoriale</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {user.role === 'teacher' && (
                                <div className="space-y-6 pt-6 border-t border-slate-100 mt-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informations Enseignant</h3>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre Académique</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                ...(formData.gender === 'F'
                                                    ? [{ id: 'Mme', label: 'Mme' }]
                                                    : [{ id: 'Mr', label: 'M.' }]),
                                                { id: 'Dr', label: 'Docteur' },
                                                { id: 'Pr', label: 'Professeur' }
                                            ].map(title => (
                                                <button
                                                    key={title.id}
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        teacher_profile: { ...formData.teacher_profile, academic_title: title.id }
                                                    })}
                                                    className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${formData.teacher_profile?.academic_title === title.id
                                                        ? 'border-sky-500 bg-sky-50 text-sky-600'
                                                        : 'border-slate-100 text-slate-400 hover:border-slate-200'
                                                        }`}
                                                >
                                                    {title.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bio / Description</label>
                                        <textarea
                                            value={formData.teacher_profile?.bio}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                teacher_profile: { ...formData.teacher_profile, bio: e.target.value }
                                            })}
                                            rows={4}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all resize-none"
                                            placeholder="Parlez-nous de vous et de votre méthode d'enseignement..."
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <BookOpen className="w-3 h-3 text-sky-600" /> Matières Enseignées
                                            </label>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Sélectionnez vos spécialités</span>
                                        </div>

                                        <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
                                            {/* Predefined Subjects Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {allSubjects.map(sub => {
                                                    const isSelected = formData.teacher_profile?.subjects?.includes(sub.id);
                                                    return (
                                                        <button
                                                            key={sub.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = formData.teacher_profile?.subjects || [];
                                                                const next = isSelected
                                                                    ? current.filter(id => id !== sub.id)
                                                                    : [...current, sub.id];
                                                                setFormData({
                                                                    ...formData,
                                                                    teacher_profile: { ...formData.teacher_profile, subjects: next }
                                                                });
                                                            }}
                                                            className={`group relative flex items-center justify-center px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all duration-300 border-2 ${isSelected
                                                                ? 'bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-200 scale-[1.02]'
                                                                : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200 hover:text-sky-600 hover:bg-sky-50/30'
                                                                }`}
                                                        >
                                                            {isSelected && (
                                                                <motion.div layoutId="select-check" className="absolute -top-1.5 -right-1.5 bg-white text-sky-600 rounded-full p-0.5 shadow-md z-10">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </motion.div>
                                                            )}
                                                            <span className="truncate">{sub.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Custom Subjects Tags */}
                                            <div className="pt-4 border-t border-slate-100/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Autres matières</label>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <AnimatePresence mode="popLayout">
                                                        {(formData.teacher_profile?.custom_subjects?.split(',').filter(s => s.trim()) || []).map((tag, i) => (
                                                            <motion.span
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                key={`tag-${i}`}
                                                                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 shadow-sm group/tag hover:border-sky-200 transition-all"
                                                            >
                                                                {tag.trim()}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const tags = formData.teacher_profile.custom_subjects.split(',').filter(s => s.trim());
                                                                        tags.splice(i, 1);
                                                                        setFormData({
                                                                            ...formData,
                                                                            teacher_profile: { ...formData.teacher_profile, custom_subjects: tags.join(',') }
                                                                        });
                                                                    }}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </motion.span>
                                                        ))}
                                                    </AnimatePresence>
                                                </div>

                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                        <Plus className="w-4 h-4 text-sky-600 opacity-40 group-focus-within:opacity-100 transition-opacity" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Ajouter une autre matière... (Appuyez sur Entrée)"
                                                        value={customSubjectInput}
                                                        onChange={(e) => setCustomSubjectInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = customSubjectInput.trim();
                                                                if (val) {
                                                                    const current = formData.teacher_profile.custom_subjects || '';
                                                                    const tags = current.split(',').map(s => s.trim()).filter(s => s);
                                                                    if (!tags.includes(val)) {
                                                                        setFormData({
                                                                            ...formData,
                                                                            teacher_profile: {
                                                                                ...formData.teacher_profile,
                                                                                custom_subjects: tags.length > 0 ? `${current},${val}` : val
                                                                            }
                                                                        });
                                                                    }
                                                                    setCustomSubjectInput('');
                                                                }
                                                            }
                                                        }}
                                                        className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 focus:border-sky-200 outline-none transition-all placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest placeholder:font-black placeholder:opacity-40"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-6 bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 mt-10"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Enregistrer les modifications</>}
                            </button>
                        </form>

                        {/* Danger Zone */}
                        <div className="mt-12 p-10 border border-red-100 bg-red-50/50 rounded-[3rem]">
                            <h3 className="text-red-600 font-black tracking-tight text-xl mb-3 flex items-center gap-3"><AlertTriangle className="w-5 h-5" /> Zone Dangereuse</h3>
                            <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                                La suppression de votre compte est définitive. Toutes vos données, y compris votre profil, vos messages et votre historique de sessions seront définitivement effacées.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="px-8 py-4 bg-white border-2 border-red-100 text-red-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-3"
                            >
                                <Trash2 className="w-4 h-4" /> Supprimer mon compte
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {isDeleteDialogOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white p-10 rounded-[3rem] shadow-premium max-w-sm w-full relative z-10 text-center"
                        >
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Supprimer le compte ?</h2>
                            <p className="text-slate-500 font-medium text-sm mb-10">Cette action est <span className="text-red-500 font-bold">irréversible</span>. Êtes-vous sûr de vouloir nous quitter ?</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-600 transition-colors flex items-center justify-center gap-3"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Oui, supprimer définitivement"}
                                </button>
                                <button
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    className="w-full py-4 bg-slate-50 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
