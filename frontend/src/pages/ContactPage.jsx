import React, { useState } from 'react';
import { Mail, Send, CheckCircle, ArrowLeft, Phone, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { motion } from 'framer-motion';

const ContactPage = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('contact/', formData);
            setSuccess(true);
            setFormData({ first_name: '', last_name: '', email: '', subject: '', message: '' });
        } catch (err) {
            setError(err.response?.data?.error || "Une erreur s'est produite lors de l'envoi du message.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative isolate overflow-hidden pt-32 pb-24 px-4 sm:px-6">
            <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-sky-100 rounded-full blur-[120px] opacity-40 -z-10" />
            <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-sky-200 rounded-full blur-[120px] opacity-30 -z-10" />

            <div className="max-w-7xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-sky-600 transition-colors mb-12">
                    <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
                </Link>

                <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-tight mb-6">
                            Contactez <span className="text-sky-600">Nous</span>
                        </h1>
                        <p className="text-slate-500 font-medium leading-relaxed max-w-lg text-lg mb-12">
                            Avez-vous des questions ou des suggestions ? Remplissez ce formulaire et nous vous répondrons dans les plus brefs délais.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email professionnel</p>
                                    <p className="font-bold text-slate-900 text-lg">contact.ttf@gmail.com</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Téléphone</p>
                                    <p className="font-bold text-slate-900 text-lg">+237 600 000 000</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nos bureaux</p>
                                    <p className="font-bold text-slate-900 text-lg">Bonapriso, Douala, Cameroun</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-[100px] -z-10" />

                        {success ? (
                            <div className="text-center py-20">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 shadow-inner">
                                    <CheckCircle className="w-12 h-12" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4">Message envoyé !</h3>
                                <p className="text-slate-500 mb-8 font-medium">Nous avons bien reçu votre demande et vous répondrons très vite sur votre adresse.</p>
                                <button onClick={() => setSuccess(false)} className="px-8 py-4 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-sky-500 transition-all">
                                    Envoyer un autre message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold ring-1 ring-red-100">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Prénom</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none font-bold text-sm transition-all"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nom</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none font-bold text-sm transition-all"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Adresse Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none font-bold text-sm transition-all"
                                        placeholder="jean.doe@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Objet du message</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none font-bold text-sm transition-all"
                                        placeholder="Comment pouvons-nous vous aider ?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Votre Message</label>
                                    <textarea
                                        required
                                        rows="5"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-sky-500 focus:bg-white outline-none font-bold text-sm transition-all resize-none"
                                        placeholder="Bonjour, je vous contacte pour..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Envoyer le message <Send className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
