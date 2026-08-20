import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Tracks user presence via:
 * - document visibility (tab switch)
 * - window beforeunload (close/navigate away)
 * - periodic heartbeat every 30s
 */
const usePresence = () => {
    const { user } = useAuth();
    const heartbeatRef = useRef(null);

    const setOnline = () => {
        if (!localStorage.getItem('access_token')) return;
        api.patch('users/presence/', { is_online: true }).catch(() => { });
    };

    const setOffline = () => {
        if (!localStorage.getItem('access_token')) return;
        api.patch('users/presence/', { is_online: false }).catch(() => { });
    };

    useEffect(() => {
        if (!user) return;

        setOnline();

        // Heartbeat to maintain online status
        heartbeatRef.current = setInterval(setOnline, 30000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setOffline();
            } else {
                setOnline();
            }
        };

        const handleBeforeUnload = () => {
            setOffline();
            // Use sendBeacon for reliability on unload
            const token = localStorage.getItem('access_token');
            if (token) {
                const blob = new Blob(
                    [JSON.stringify({ is_online: false })],
                    { type: 'application/json' }
                );
                navigator.sendBeacon(
                    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/'}users/presence/`,
                    blob
                );
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(heartbeatRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            setOffline();
        };
    }, [user]);
};

export default usePresence;
