import React from 'react';
import { BookOpen, Instagram, Twitter, Facebook, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-slate-950 text-slate-400 pt-16 md:pt-32 pb-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 mb-16 md:mb-24">
                    {/* Brand Section */}
                    <div className="lg:col-span-5">
                        <Link to="/" className="flex items-center gap-3 mb-8 group">
                            <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:rotate-12 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="text-3xl font-black tracking-tight text-white">
                                Edu<span className="text-sky-600">Up</span>
                            </span>
                        </Link>
                        <p className="max-w-md text-lg leading-relaxed mb-10 text-slate-400">
                            La plateforme d'excellence pour le soutien scolaire en zone CEMAC. Nous connectons les meilleurs talents pédagogiques avec les élèves les plus ambitieux.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="/" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-sky-600 hover:border-sky-500 transition-all group">
                                <Facebook className="w-5 h-5 group-hover:scale-110" />
                            </a>
                            <a href="/" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-sky-600 hover:border-sky-500 transition-all group">
                                <Twitter className="w-5 h-5 group-hover:scale-110" />
                            </a>
                            <a href="/" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-sky-600 hover:border-sky-500 transition-all group">
                                <Instagram className="w-5 h-5 group-hover:scale-110" />
                            </a>
                        </div>
                    </div>

                    {/* Links Sections */}
                    <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-8">Plateforme</h4>
                            <ul className="space-y-4">
                                {[
                                    { name: 'Trouver un Prof', path: '/tutors' },
                                    { name: 'Devenir Tuteur', path: '/register' },
                                    { name: 'Comment ça marche', path: '/#how-it-works' },
                                    { name: 'Tarification', path: '/' }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <Link to={item.path} className="text-sm font-bold hover:text-sky-500 transition-colors flex items-center gap-2 group">
                                            {item.name} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-8">Support</h4>
                            <ul className="space-y-4">
                                {[
                                    { name: 'Aide en ligne', path: '/contact' },
                                    { name: 'Nous contacter', path: '/contact' },
                                    { name: 'Sécurité', path: '/' },
                                    { name: 'Confidentialité', path: '/' }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <Link to={item.path} className="text-sm font-bold hover:text-sky-500 transition-colors">{item.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-8">Contact</h4>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-sky-600 shrink-0" />
                                    <span className="text-sm font-bold leading-relaxed">Bonapriso, Douala,<br />Cameroun</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Phone className="w-5 h-5 text-sky-600 shrink-0" />
                                    <span className="text-sm font-bold">+237 600 000 000</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-sky-600 shrink-0" />
                                    <span className="text-sm font-bold">contact.ttf@gmail.com</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        &copy; 2026 EduUp. Partenaire éducatif en zone CEMAC.
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                        {['Cameroun', 'Gabon', 'Congo', 'Tchad', 'RCA', 'Guinée Éq.'].map((country) => (
                            <span key={country} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {country}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
