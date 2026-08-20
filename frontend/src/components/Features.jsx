import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Shield, Star, BookOpen, Smartphone } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: Users,
            title: "Professeurs Experts",
            desc: "Une sélection rigoureuse d'enseignants certifiés en zone CEMAC pour garantir l'excellence.",
            color: "sky"
        },
        {
            icon: Calendar,
            title: "Planning Flexible",
            desc: "Réservez vos cours en quelques clics selon vos disponibilités réelles.",
            color: "emerald"
        },
        {
            icon: Shield,
            title: "Confiance Totale",
            desc: "Paiements sécurisés et suivis pédagogiques détaillés après chaque session.",
            color: "purple"
        }
    ];

    return (
        <section id="features" className="py-16 md:py-32 px-4 sm:px-8 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 md:mb-20 gap-6 md:gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-600 mb-4">L'excellence au service de l'élève</h2>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[0.9] tracking-tighter">
                            Pourquoi EduUp change <br />
                            <span className="text-slate-400">la donne ?</span>
                        </h3>
                    </div>
                    <p className="text-slate-500 font-medium max-w-sm border-l-2 border-sky-100 pl-6">
                        Nous avons construit bien plus qu'une plateforme : un écosystème de réussite complet et moderne.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="group p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-2xl hover:shadow-sky-100/30 transition-all duration-500 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-sky-600 group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-6">
                                <feature.icon className="w-8 h-8 text-sky-600 group-hover:text-white transition-colors" />
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">{feature.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-6">
                                {feature.desc}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                En savoir plus <Smartphone className="w-3 h-3" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
