import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Ghost } from 'lucide-react';

const NotFoundPage = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[100px] opacity-60 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="max-w-2xl w-full text-center relative z-10">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="mb-8 relative inline-block"
                >
                    <div className="text-[180px] font-black text-slate-200 leading-none select-none">404</div>
                    <motion.div
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        <Ghost className="w-24 h-24 text-sky-500 opacity-80" />
                    </motion.div>
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-black text-slate-900 mb-4 tracking-tight"
                >
                    Oups ! Page Introuvable
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-500 text-lg mb-12 max-w-md mx-auto leading-relaxed"
                >
                    Il semble que vous ayez navigué vers un territoire inconnu. Pas de panique, retournons en lieu sûr !
                </motion.p>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-8 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-500 transition-all shadow-xl shadow-sky-500/25 group w-full sm:w-auto"
                    >
                        <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                        Retour à l'accueil
                    </Link>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-lg w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Page Précédente
                    </button>
                </motion.div>
            </div>

            {/* Floating floating micro-animations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -100],
                            x: [0, Math.random() * 50 - 25],
                            opacity: [0, 0.3, 0]
                        }}
                        transition={{
                            duration: 5 + Math.random() * 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "linear"
                        }}
                        className="absolute h-2 w-2 bg-sky-300 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            bottom: "-20px"
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default NotFoundPage;
