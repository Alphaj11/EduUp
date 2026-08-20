import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(username, password);
            if (user.role === 'admin' || user.is_superuser) navigate('/admin-dashboard');
            else if (user.role === 'teacher') navigate('/teacher-dashboard');
            else navigate('/student-dashboard');
        } catch (err) {
            setError('Identifiants incorrects. Veuillez réessayer.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-50 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[120px] opacity-40"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl glass rounded-[2rem] md:rounded-[4rem] shadow-premium overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50"
            >
                {/* Left Panel */}
                <div className="md:w-[40%] bg-slate-950 p-8 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden min-h-[200px] md:min-h-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                    <Link to="/" className="flex items-center gap-3 relative z-10 group">
                        <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white">Edu<span className="text-sky-600">Up</span></span>
                    </Link>

                    <div className="relative z-10">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-4 md:mb-8 leading-[0.95] tracking-tighter text-white">L'excellence <br className="hidden md:block" /> académique.</h2>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-xs text-sm">Accédez à votre espace personnalisé et suivez votre progression avec les meilleurs experts de la zone CEMAC.</p>
                    </div>

                    <div className="relative z-10 pt-12 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 mb-2">Statut Plateforme</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Opérationnel en zone CEMAC</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="md:w-[60%] p-8 sm:p-12 lg:p-20 bg-white/40 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <header className="mb-12">
                            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Bon retour.</h1>
                            <p className="text-slate-500 font-medium italic">Content de vous revoir parmi nous.</p>
                        </header>

                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 mb-8 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 text-center">
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email ou Identifiant</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                                    placeholder="jean.dupont ou jean@eduup.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mot de passe</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" className="w-5 h-5 rounded-lg text-sky-600 focus:ring-sky-500 border-slate-200" />
                                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-700 transition-colors uppercase tracking-widest">Rester connecté</span>
                                </label>
                                <Link to="/forgot-password" className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest border-b-2 border-transparent hover:border-sky-600 transition-all">Oublié ?</Link>
                            </div>

                            <button
                                disabled={isLoading}
                                className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98] group mt-10"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Connexion <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>

                        <p className="mt-12 text-center text-xs font-medium text-slate-500">
                            Pas encore membre ? <Link to="/register" className="font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest text-[10px] ml-2 border-b-2 border-sky-100 hover:border-sky-600 transition-all">Rejoignez-nous</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>

    );
};

export default LoginPage;
