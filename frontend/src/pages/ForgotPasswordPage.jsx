import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Sparkles, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

// ─── Step indicator ──────────────────────────────────────────────────────────
const StepDot = ({ active, done, label }) => (
    <div className="flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300
            ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
              active ? 'bg-sky-600 text-white shadow-lg shadow-sky-200' :
              'bg-slate-100 text-slate-400'}`}>
            {done ? <CheckCircle2 className="w-4 h-4" /> : label}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block
            ${active ? 'text-sky-600' : done ? 'text-emerald-500' : 'text-slate-300'}`}>
            {label === 1 ? 'Email' : label === 2 ? 'Code' : 'Mdp'}
        </span>
    </div>
);

const StepLine = ({ done }) => (
    <div className={`flex-1 h-0.5 mt-4 mx-2 rounded-full transition-all duration-500
        ${done ? 'bg-emerald-400' : 'bg-slate-100'}`} />
);

// ─── 6-digit code input ───────────────────────────────────────────────────────
const CodeInput = ({ value, onChange }) => {
    const inputs = useRef([]);
    const digits = (value + '      ').slice(0, 6).split('');

    const handleKey = (e, idx) => {
        if (e.key === 'Backspace') {
            const next = [...digits];
            next[idx] = '';
            onChange(next.join('').trimEnd());
            if (idx > 0) inputs.current[idx - 1]?.focus();
        } else if (/^\d$/.test(e.key)) {
            const next = [...digits];
            next[idx] = e.key;
            onChange(next.join('').trimEnd());
            if (idx < 5) inputs.current[idx + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted);
        inputs.current[Math.min(pasted.length, 5)]?.focus();
    };

    return (
        <div className="flex gap-3 justify-center my-6">
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d.trim()}
                    onKeyDown={e => handleKey(e, i)}
                    onPaste={handlePaste}
                    onChange={() => {}}
                    className={`w-12 h-14 text-center text-xl font-black rounded-2xl border-2 outline-none transition-all duration-200
                        ${d.trim() ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm shadow-sky-100' : 'border-slate-100 bg-slate-50 text-slate-900'}
                        focus:border-sky-500 focus:bg-sky-50 focus:ring-4 focus:ring-sky-50`}
                />
            ))}
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);          // 1 = email | 2 = code | 3 = new password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // ── Step 1 : request code ────────────────────────────────────────────────
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('auth/password-reset/request/', { email });
            setStep(2);
            startCooldown();
        } catch {
            setError("Une erreur est survenue. Vérifiez votre connexion.");
        } finally {
            setIsLoading(false);
        }
    };

    const startCooldown = () => {
        setResendCooldown(60);
        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        try {
            await api.post('auth/password-reset/request/', { email });
            startCooldown();
        } catch {
            setError("Impossible de renvoyer le code.");
        }
    };

    // ── Step 2 : verify code ─────────────────────────────────────────────────
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        if (code.trim().length !== 6) {
            setError('Veuillez entrer les 6 chiffres du code.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.post('auth/password-reset/verify/', { email, code });
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Code invalide ou expiré.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 3 : set new password ─────────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.post('auth/password-reset/confirm/', { email, code, new_password: newPassword });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Une erreur est survenue.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Shared field style ────────────────────────────────────────────────────
    const inputCls = "w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-sky-100 outline-none transition-all";
    const btnCls = "w-full py-6 bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] hover:bg-sky-600 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none rounded-b-[100px] blur-3xl opacity-50" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-50 rounded-full blur-3xl opacity-60" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass p-10 md:p-12 rounded-[4rem] border border-white shadow-premium text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-600 transition-colors mb-8 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour à la connexion
                    </Link>

                    {/* Step indicator */}
                    {!success && (
                        <div className="flex items-center justify-center mb-10 px-4">
                            <StepDot active={step === 1} done={step > 1} label={1} />
                            <StepLine done={step > 1} />
                            <StepDot active={step === 2} done={step > 2} label={2} />
                            <StepLine done={step > 2} />
                            <StepDot active={step === 3} done={false} label={3} />
                        </div>
                    )}

                    <AnimatePresence mode="wait">

                        {/* ── SUCCESS ── */}
                        {success && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Mot de passe modifié !</h2>
                                <p className="text-slate-500 font-medium text-sm mb-10">
                                    Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                                </p>
                                <button onClick={() => navigate('/login')} className={btnCls}>
                                    Se connecter
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 1 : Email ── */}
                        {!success && step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <Sparkles className="w-8 h-8 text-sky-500" />
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-3 leading-none">
                                    Mot de passe <br /><span className="text-slate-400">oublié ?</span>
                                </h1>
                                <p className="text-slate-500 font-medium italic mb-8 text-sm">
                                    Entrez votre email pour recevoir un code de vérification à 6 chiffres.
                                </p>

                                <form onSubmit={handleRequestCode} className="space-y-5 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                            <input
                                                type="email" required
                                                className={inputCls}
                                                placeholder="votre@email.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                                    <button type="submit" disabled={isLoading} className={btnCls}>
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer le code'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── STEP 2 : Code ── */}
                        {!success && step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <ShieldCheck className="w-8 h-8 text-sky-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Vérifiez votre email</h2>
                                <p className="text-slate-500 font-medium text-sm mb-1">
                                    Un code à 6 chiffres a été envoyé à
                                </p>
                                <p className="font-black text-sky-600 text-sm mb-6">{email}</p>

                                <form onSubmit={handleVerifyCode}>
                                    <CodeInput value={code} onChange={setCode} />
                                    {error && <p className="text-red-500 text-xs font-bold text-center mb-4">{error}</p>}
                                    <p className="text-[10px] text-slate-400 font-bold mb-6 uppercase tracking-widest">
                                        Code valable 15 minutes
                                    </p>
                                    <button type="submit" disabled={isLoading || code.trim().length !== 6} className={btnCls}>
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vérifier le code'}
                                    </button>
                                </form>

                                <button
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0}
                                    className="mt-5 text-xs font-bold text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-40"
                                >
                                    {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 3 : New password ── */}
                        {!success && step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <KeyRound className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Nouveau mot de passe</h2>
                                <p className="text-slate-500 font-medium text-sm mb-8">
                                    Choisissez un nouveau mot de passe sécurisé (min. 8 caractères).
                                </p>

                                <form onSubmit={handleResetPassword} className="space-y-5 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                            <input
                                                type={showPwd ? 'text' : 'password'}
                                                required minLength={8}
                                                className={`${inputCls} pr-12`}
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd(p => !p)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                                            >
                                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-600 opacity-40" />
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                required minLength={8}
                                                className={`${inputCls} pr-12 ${confirmPassword && newPassword !== confirmPassword ? 'ring-2 ring-red-200' : ''}`}
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(p => !p)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                                            >
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-red-400 text-[10px] font-bold ml-1">Les mots de passe ne correspondent pas.</p>
                                        )}
                                    </div>

                                    {/* Strength bar */}
                                    {newPassword && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1,2,3,4].map(i => (
                                                    <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                                                        newPassword.length >= i * 3
                                                            ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-sky-400' : 'bg-emerald-400'
                                                            : 'bg-slate-100'
                                                    }`} />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">
                                                {newPassword.length < 6 ? 'Faible' : newPassword.length < 9 ? 'Moyen' : newPassword.length < 12 ? 'Fort' : 'Très fort'}
                                            </p>
                                        </div>
                                    )}

                                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
                                        className={btnCls}
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enregistrer le mot de passe'}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                        &copy; {new Date().getFullYear()} EduUp Elite. Tous droits réservés.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
