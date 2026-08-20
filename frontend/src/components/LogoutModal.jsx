import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, AlertTriangle } from 'lucide-react';

const LogoutModal = ({ isOpen, onConfirm, onCancel }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
                    >
                        {/* Icon */}
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                            Déconnexion
                        </h3>
                        <p className="text-slate-500 text-sm font-medium mb-8">
                            Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm uppercase tracking-wider"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-3.5 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-lg shadow-red-100"
                            >
                                <LogOut className="w-4 h-4" />
                                Déconnecter
                            </button>
                        </div>

                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LogoutModal;
