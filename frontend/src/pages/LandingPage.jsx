import React, { useEffect } from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Star, Quote, Sparkles, Trophy } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const LandingPage = () => {
    const { hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const element = document.getElementById(hash.replace('#', ''));
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [hash]);

    return (
        <div className="min-h-screen bg-white selection:bg-sky-100 selection:text-sky-900 pt-20">

            <main>
                <Hero />

                {/* Statistics / Trust Bar */}
                <section className="py-12 bg-slate-50 border-y border-slate-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-12">
                        {[
                            { label: "Villes couvertes", val: "15+" },
                            { label: "Matières enseignées", val: "40+" },
                            { label: "Taux de réussite", val: "94%" },
                            { label: "Support 24/7", val: "Live" }
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="text-3xl font-black text-sky-600">{stat.val}</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it Works Section - Completely Re-imagined */}
                <section id="how-it-works" className="py-16 md:py-32 px-4 sm:px-8 bg-white relative scroll-mt-32">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600 mb-6">Le parcours vers le succès</h2>
                                <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 mb-8 md:mb-12 leading-[0.95] tracking-tighter">
                                    Une expérience <br />
                                    <span className="text-slate-400">sans friction.</span>
                                </h3>

                                <div className="space-y-12">
                                    {[
                                        { step: "01", title: "Profil Elite", desc: "Parcourez les profils d'enseignants vérifiés et choisissez selon vos objectifs." },
                                        { step: "02", title: "Réservation Instantanée", desc: "Planifiez votre première séance en moins de 2 minutes." },
                                        { step: "03", title: "Tableau de Bord", desc: "Suivez votre progression et recevez des feedbacks après chaque séance." },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex gap-8 group">
                                            <div className="relative">
                                                <span className="text-5xl font-black text-slate-100 group-hover:text-sky-100 transition-colors duration-500">{item.step}</span>
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-sky-600 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{item.title}</h4>
                                                <p className="text-slate-500 font-medium leading-relaxed max-w-sm">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="relative bg-slate-900 rounded-[2rem] lg:rounded-[4rem] p-8 lg:p-16 text-white overflow-hidden shadow-2xl shadow-sky-900/20"
                            >
                                <Sparkles className="absolute top-10 right-10 w-12 h-12 text-sky-500 opacity-20" />
                                <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-sky-500 rounded-full blur-[100px] opacity-20"></div>

                                <h3 className="text-3xl font-black mb-10 leading-tight">Standards de Qualité <br /> zone CEMAC</h3>
                                <ul className="space-y-6 mb-16">
                                    {[
                                        "Validation systématique des diplômes",
                                        "Entretien pédagogique obligatoire",
                                        "Collecte d'avis élèves vérifiés",
                                        "Paiement Mobile Money natif",
                                        "Rapport de séance digitalisé"
                                    ].map((text, i) => (
                                        <li key={i} className="flex items-center gap-4 group">
                                            <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500 transition-colors">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 group-hover:text-white" />
                                            </div>
                                            <span className="font-bold text-sm tracking-wide text-slate-300 group-hover:text-white transition-colors uppercase">{text}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-md relative">
                                    <Quote className="absolute top-4 right-8 w-12 h-12 text-sky-500/10" />
                                    <p className="italic text-slate-300 text-lg leading-relaxed mb-6 font-medium relative z-10">
                                        "Grâce à l'accompagnement de mon tuteur EduUp, j'ai obtenu mon BAC avec mention Très Bien !"
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center font-black text-[10px] text-white shadow-lg shadow-sky-500/20">YK</div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-widest text-white">Yasmine K.</p>
                                            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Élève, Yaoundé</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <Features />

                {/* Inspiring Success Gallery Preview */}
                <section className="py-16 md:py-24 px-4 sm:px-8 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative rounded-[4rem] overflow-hidden shadow-3xl group">
                            <img
                                src="/images/hero_inspiring.png"
                                alt="Inspiration Succès"
                                className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] object-cover group-hover:scale-105 transition-transform duration-[2s]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                            <div className="absolute bottom-6 md:bottom-12 left-4 md:left-12 right-4 md:right-12 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                                <div className="max-w-xl">
                                    <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-sky-500/20">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-4 uppercase">
                                        L'excellence <br /> <span className="text-sky-500">sans frontières.</span>
                                    </h3>
                                    <p className="text-slate-300 font-medium italic">Nous formons la prochaine génération de leaders en zone CEMAC.</p>
                                </div>
                                <Link to="/register" className="px-6 md:px-10 py-4 md:py-5 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-sky-50 transition-colors shadow-2xl shrink-0">
                                    Rejoindre l'élite <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final High-Impact CTA */}
                <section className="py-16 md:py-32 px-4 sm:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-7xl mx-auto rounded-[2rem] md:rounded-[5rem] overflow-hidden bg-slate-950 px-6 py-16 sm:px-12 sm:py-24 md:p-32 text-center relative shadow-3xl"
                    >
                        {/* Abstract Background Design */}
                        <div className="absolute top-0 right-0 w-[40%] h-full bg-sky-500/5 blur-[120px] rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-[40%] h-full bg-purple-500/5 blur-[120px] rounded-full"></div>

                        <div className="relative z-10 max-w-4xl mx-auto">
                            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black text-white mb-8 md:mb-10 leading-[0.9] tracking-tighter">
                                Transformez votre <br />
                                <span className="text-sky-600">avenir</span> académique.
                            </h2>
                            <p className="text-slate-400 text-lg md:text-xl font-medium mb-16 max-w-2xl mx-auto leading-relaxed">
                                Ne laissez pas vos difficultés freiner vos ambitions. Rejoignez la communauté EduUp dès aujourd'hui.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                <Link
                                    to="/register"
                                    className="px-12 py-6 bg-sky-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-[2rem] shadow-2xl shadow-sky-900/40 hover:bg-sky-500 transition-all flex items-center justify-center gap-4 group hover:scale-105 active:scale-95"
                                >
                                    Faire le premier pas <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link to="/contact" className="px-12 py-6 flex items-center justify-center bg-white/5 border border-white/5 text-white font-black uppercase tracking-[0.2em] text-xs rounded-[2rem] hover:bg-white transition-all hover:text-slate-900">
                                    Parler à un conseiller
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
