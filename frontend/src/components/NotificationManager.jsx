import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * NotificationManager handles:
 * 1. Requesting browser notification permissions
 * 2. Polling the backend for new notifications
 * 3. Playing sound alerts
 * 4. Showing system notifications
 */
const NotificationManager = () => {
    const { user, authenticated } = useAuth();
    const lastNotificationIdRef = useRef(null);
    const audioRef = useRef(new Audio('/notif_alert.mp3')); // Fixed local path
    const pollInterval = useRef(null);

    useEffect(() => {
        console.log("NotificationManager: Auth state changed", { authenticated, user: !!user });
        if (authenticated && user) {
            // ... (permission logic)
            if ("Notification" in window) {
                if (Notification.permission === "default") {
                    Notification.requestPermission();
                }
            }

            fetchInitialLastId();

            pollInterval.current = setInterval(fetchNotifications, 10000);

            return () => {
                if (pollInterval.current) clearInterval(pollInterval.current);
            };
        }
    }, [authenticated, user]);

    const fetchInitialLastId = async () => {
        try {
            const response = await api.get('notifications/');
            const notifications = response.data;
            if (notifications.length > 0) {
                lastNotificationIdRef.current = notifications[0].id;
            } else {
                lastNotificationIdRef.current = 0;
            }
        } catch (error) {
            console.error("Error fetching initial notifications:", error);
        }
    };

    const fetchNotifications = async () => {
        try {
            console.log("NotificationManager: Polling for new notifications...");
            const response = await api.get('notifications/');
            const notifications = response.data;

            if (notifications.length > 0) {
                const newNotifications = notifications.filter(n => !n.is_read && (lastNotificationIdRef.current === null || n.id > lastNotificationIdRef.current));

                if (newNotifications.length > 0) {
                    lastNotificationIdRef.current = notifications[0].id;

                    const latest = newNotifications[0];
                    playNotificationSound();
                    showSystemNotification(latest.title, latest.content);
                }
            }
        } catch (error) {
            console.error("Error polling notifications:", error);
        }
    };

    const playNotificationSound = () => {
        audioRef.current.play().catch(err => {
            console.warn("Audio playback blocked: User must interact with the page first.", err);
        });
    };

    const showSystemNotification = (title, body) => {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                try {
                    new Notification(title, {
                        body: body,
                        icon: '/vite.svg',
                        tag: 'eduup-notification', // Avoid duplicates
                        silent: true // Don't use browser's default sound, we use ours
                    });
                } catch (e) {
                    console.error("Error showing system notification:", e);
                }
            } else {
                console.warn("Notification permission not granted:", Notification.permission);
            }
        }
    };

    return null;
};

export default NotificationManager;
