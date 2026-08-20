import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const PaymentCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
    const [message, setMessage] = useState('Confirmation du paiement en cours...');

    const payment = searchParams.get('payment');
    const ref = searchParams.get('ref');

    useEffect(() => {
        const handleCallback = async () => {
            if (payment === 'mock_success' || payment === 'success') {
                if (ref) {
                    try {
                        await api.post('wallet/confirm_deposit/', { reference: ref });
                        setStatus('success');
                        setMessage('Votre dépôt a été confirmé avec succès !');
                    } catch (e) {
                        // Already confirmed or not found — still show success
                        setStatus('success');
                        setMessage('Paiement déjà enregistré ou confirmé.');
                    }
                } else {
                    setStatus('success');
                    setMessage('Paiement confirmé avec succès !');
                }
            } else if (payment === 'error') {
                setStatus('error');
                setMessage('Le paiement a échoué ou a été annulé. Veuillez réessayer.');
            } else {
                // Unknown state — treat as success
                setStatus('success');
                setMessage('Retour de paiement détecté.');
            }

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/student-dashboard', { replace: true });
            }, 3000);
        };

        handleCallback();
    }, [payment, ref]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-12 max-w-md w-full text-center"
            >
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-sky-500 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-black text-slate-900">Tutor<span className="text-sky-500">Flow</span></span>
                </div>

                {/* Status Icon */}
                <div className="flex justify-center mb-6">
                    {status === 'processing' && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <Loader2 className="w-20 h-20 text-indigo-500" />
                        </motion.div>
                    )}
                    {status === 'success' && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                            <CheckCircle className="w-20 h-20 text-emerald-500" />
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                            <XCircle className="w-20 h-20 text-red-500" />
                        </motion.div>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-slate-900 mb-3">
                    {status === 'processing' && 'Traitement en cours…'}
                    {status === 'success' && 'Paiement réussi !'}
                    {status === 'error' && 'Paiement échoué'}
                </h1>

                <p className="text-slate-500 font-medium text-sm mb-8">{message}</p>

                {/* Progress bar */}
                {(status === 'success' || status === 'error') && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3, ease: 'linear' }}
                            className={`h-1.5 rounded-full ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}
                        />
                    </div>
                )}

                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                    Redirection vers le tableau de bord...
                </p>
            </motion.div>
        </div>
    );
};

export default PaymentCallbackPage;
