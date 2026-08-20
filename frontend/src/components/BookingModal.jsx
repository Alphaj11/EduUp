import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar as CalendarIcon, Clock, CreditCard, CheckCircle2,
    Loader2, Phone, Video, MapPin, MessageSquare, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const BookingModal = ({ teacher, isOpen, onClose }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [operator, setOperator] = useState('orange');
    const [bookingData, setBookingData] = useState({
        date: '',
        time: '',
        subject: teacher?.subjects?.[0]?.id || '',
        duration_hours: 1,
        course_type: 'in_person',
        location_note: '',
    });
    const [error, setError] = useState('');
    const [createdBooking, setCreatedBooking] = useState(null);

    const totalPrice = Math.round((teacher?.hourly_rate || 0) * bookingData.duration_hours);

    const handleNextStep = async () => {
        if (!bookingData.date || !bookingData.time || !bookingData.subject) {
            setError('Veuillez remplir tous les champs');
            return;
        }
        setError('');
        // NOTE: Bypassing step 2 (payment) for testing
        await handlePayment();
    };

    const handlePayment = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await api.post('bookings/', {
                teacher: teacher.id,
                subject: bookingData.subject,
                date: bookingData.date,
                time: bookingData.time,
                duration_hours: bookingData.duration_hours,
                course_type: bookingData.course_type,
                location_note: bookingData.location_note,
                payment_status: 'paid',
                status: 'pending'
            });
            setCreatedBooking(res.data);
            setStep(3);
        } catch (err) {
            setError("Erreur lors de la réservation. Veuillez réessayer.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const goToMessaging = () => {
        const teacherUserId = teacher?.user?.id;
        onClose();
        navigate(`/messages?with=${teacherUserId}&booking=${createdBooking?.id}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 dark:bg-slate-800">
                    <motion.div
                        className="h-1 bg-sky-500"
                        animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                        transition={{ duration: 0.4 }}
                    />
                </div>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-sky-600 rounded-xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step === 3 ? 'bg-emerald-50 text-emerald-500' : 'bg-sky-50 text-sky-600'
                            }`}>
                            {step === 1 ? <CalendarIcon className="w-5 h-5" />
                                : step === 2 ? <CreditCard className="w-5 h-5" />
                                    : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                {step === 1 ? 'Réserver une séance'
                                    : step === 2 ? 'Paiement Mobile Money'
                                        : 'Réservation Confirmée !'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {step < 3 ? `Étape ${step} sur 2` : 'Succès'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 text-center">
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Session Details */}
                    {step === 1 && (
                        <div className="space-y-5">
                            {/* Teacher Info */}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <img
                                    src={teacher.user.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.user.username}`}
                                    className="w-12 h-12 rounded-xl object-cover"
                                    alt=""
                                />
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{teacher.user.first_name} {teacher.user.last_name}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{teacher.hourly_rate} XAF/h</p>
                                </div>
                            </div>

                            {/* Course Type Toggle */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type de cours</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setBookingData({ ...bookingData, course_type: 'in_person' })}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${bookingData.course_type === 'in_person'
                                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                                            }`}
                                    >
                                        <MapPin className={`w-5 h-5 ${bookingData.course_type === 'in_person' ? 'text-sky-600' : 'text-slate-400'}`} />
                                        <span className={`text-xs font-black uppercase tracking-wider ${bookingData.course_type === 'in_person' ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500'}`}>Présentiel</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBookingData({ ...bookingData, course_type: 'online' })}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${bookingData.course_type === 'online'
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                                            }`}
                                    >
                                        <Video className={`w-5 h-5 ${bookingData.course_type === 'online' ? 'text-violet-600' : 'text-slate-400'}`} />
                                        <span className={`text-xs font-black uppercase tracking-wider ${bookingData.course_type === 'online' ? 'text-violet-700 dark:text-violet-400' : 'text-slate-500'}`}>En ligne</span>
                                    </button>
                                </div>
                                {bookingData.course_type === 'online' && (
                                    <p className="text-[10px] text-violet-600 font-bold mt-2 ml-1 flex items-center gap-1">
                                        <Video className="w-3 h-3" />
                                        Un lien Jitsi Meet sera généré automatiquement après confirmation.
                                    </p>
                                )}
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Matière</label>
                                <select
                                    value={bookingData.subject}
                                    onChange={(e) => setBookingData({ ...bookingData, subject: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-100 outline-none appearance-none"
                                >
                                    {teacher.subjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                    <input
                                        type="date"
                                        value={bookingData.date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Heure</label>
                                    <input
                                        type="time"
                                        value={bookingData.time}
                                        onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-100 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Durée (heures)</label>
                                <div className="flex items-center gap-3">
                                    {[1, 2, 3].map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => setBookingData({ ...bookingData, duration_hours: h })}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${bookingData.duration_hours === h
                                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                }`}
                                        >
                                            {h}h
                                        </button>
                                    ))}
                                    <div className="flex-[1.5] relative">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            placeholder="Autre..."
                                            value={bookingData.duration_hours}
                                            onChange={(e) => setBookingData({ ...bookingData, duration_hours: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-100 outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">HEURES</span>
                                    </div>
                                </div>
                            </div>

                            {/* Location (in-person only) */}
                            {bookingData.course_type === 'in_person' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lieu (optionnel)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Ex: Akwa, Douala"
                                            value={bookingData.location_note}
                                            onChange={(e) => setBookingData({ ...bookingData, location_note: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-100 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Price Summary */}
                            <div className="p-4 bg-gradient-to-br from-sky-50 to-violet-50 dark:from-sky-900/20 dark:to-violet-900/20 rounded-2xl flex justify-between items-center">
                                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Total estimé</span>
                                <span className="text-2xl font-black text-sky-600">{totalPrice.toLocaleString()} XAF</span>
                            </div>

                            <button
                                onClick={handleNextStep}
                                disabled={isLoading}
                                className="w-full py-4 bg-sky-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmer (Test sans paiement) <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Payment */}
                    {step === 2 && (
                        <div className="space-y-5">
                            {/* Booking Summary */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2">
                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Récapitulatif</h4>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-slate-600 dark:text-slate-300">Type</span>
                                    <span className={bookingData.course_type === 'online' ? 'text-violet-600' : 'text-sky-600'}>
                                        {bookingData.course_type === 'online' ? '🎥 En ligne' : '📍 Présentiel'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-slate-600 dark:text-slate-300">Durée</span>
                                    <span className="text-slate-900 dark:text-white">{bookingData.duration_hours}h</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-slate-600 dark:text-slate-300">Date</span>
                                    <span className="text-slate-900 dark:text-white">{bookingData.date} à {bookingData.time}</span>
                                </div>
                            </div>

                            <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Choisissez votre opérateur</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setOperator('orange')}
                                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${operator === 'orange' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-black text-white">O</div>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">Orange Money</span>
                                </button>
                                <button
                                    onClick={() => setOperator('mtn')}
                                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${operator === 'mtn' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-slate-100 dark:border-slate-700'}`}
                                >
                                    <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-white">M</div>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs">MTN MoMo</span>
                                </button>
                            </div>

                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="tel" placeholder="+237 6XX XXX XXX" className="w-full font-bold bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl pl-10 pr-4 py-4 text-sm focus:ring-2 focus:ring-sky-100 outline-none" />
                            </div>

                            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex justify-between items-center">
                                <span className="text-xs font-black text-sky-900 dark:text-sky-300 uppercase tracking-widest">Total à payer</span>
                                <span className="text-2xl font-black text-sky-600">{totalPrice.toLocaleString()} XAF</span>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isLoading}
                                className="w-full py-5 bg-slate-950 dark:bg-sky-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sky-600 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Confirmer & Payer</>}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Success */}
                    {step === 3 && (
                        <div className="text-center py-6">
                            <motion.div
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                                className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5"
                            >
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </motion.div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">C'est réservé !</h4>
                            <p className="text-slate-400 mb-6 text-sm font-medium">
                                Votre demande est enregistrée.
                                {bookingData.course_type === 'online'
                                    ? " Un lien de cours virtuel a été généré et vous sera partagé par messagerie."
                                    : " Le professeur vous contactera pour confirmer le lieu."}
                            </p>

                            {createdBooking?.course_type === 'online' && createdBooking?.meeting_link && (
                                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-2xl mb-5 text-left">
                                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Lien de la salle virtuelle</p>
                                    <p className="text-xs font-bold text-violet-700 dark:text-violet-300 break-all">{createdBooking.meeting_link}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={goToMessaging}
                                    className="w-full py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
                                >
                                    <MessageSquare className="w-4 h-4" /> Envoyer un message au professeur
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest"
                                >
                                    Retour au tableau de bord
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default BookingModal;
