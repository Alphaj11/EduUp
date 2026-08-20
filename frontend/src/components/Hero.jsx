import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Star, Play, Award, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Hero = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';

    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-50 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-100 rounded-full blur-[120px] opacity-40 animate-pulse delay-700"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">

                    {/* Left Content */}
                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 mb-8 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest">N°1 en zone CEMAC</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-slate-900 leading-[0.95] tracking-tight mb-6 md:mb-8">
                            L'Expertise au Service de <br />
                            <span className="text-sky-600">Votre Réussite.</span>
                        </h1>

                        <p className="text-base md:text-lg lg:text-xl text-slate-500 max-w-xl leading-relaxed mb-8 md:mb-12 font-medium">
                            Notre mission première est d'accompagner chaque élève vers l'excellence scolaire. Nous mettons à votre disposition une élite d'enseignants, sélectionnés via un processus de qualification extrêmement rigoureux, pour vous garantir un accompagnement de haute qualité et des résultats inespérés.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5">
                            {!isTeacher && (
                                <Link
                                    to="/tutors"
                                    className="px-10 py-5 bg-sky-600 text-white font-black uppercase tracking-widest rounded-[2rem] flex items-center justify-center gap-3 hover:bg-sky-700 hover:scale-[1.02] transition-all shadow-2xl shadow-sky-200 active:scale-95"
                                >
                                    Trouver un Prof <ArrowRight className="w-5 h-5" />
                                </Link>
                            )}
                            <a href="/#how-it-works" className="px-10 py-5 bg-white text-slate-900 font-black uppercase tracking-widest rounded-[2rem] border-2 border-slate-100 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                                <Play className="w-5 h-5 text-sky-600 fill-sky-600" /> Voir la Démo
                            </a>
                        </div>

                        {/* Social Proof */}
                        <div className="mt-10 md:mt-16 pt-8 md:pt-12 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-black text-slate-900 leading-none">500+</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profs Certifiés</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-black text-slate-900 leading-none">12K+</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Élèves Heureux</span>
                            </div>
                            <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zone CEMAC Only</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Image Content */}
                    <motion.div
                        className="lg:col-span-5 relative"
                        initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="relative z-10 p-4 bg-white rounded-[4rem] shadow-premium ring-1 ring-slate-100">
                            <img
                                src="/images/hero_inspiring.png"
                                alt="Successful African Students"
                                className="w-full aspect-[4/5] object-cover rounded-[3.5rem] shadow-inner"
                            />
                        </div>

                        {/* Floating Cards */}
                        <motion.div
                            className="absolute -top-6 -right-6 lg:-top-10 lg:-right-10 p-4 lg:p-6 glass rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl z-20 hidden md:block border border-white/50"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="bg-sky-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg shadow-sky-200">
                                <Award className="w-7 h-7" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Qualification Exigeante</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">100% Profils vérifiés</p>
                        </motion.div>

                        <motion.div
                            className="absolute -bottom-6 -left-10 p-8 glass rounded-[3rem] shadow-2xl z-20 max-w-[240px] border border-white/50"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase leading-none">Paiement</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Mobile Money</p>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[100%]"></div>
                            </div>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
