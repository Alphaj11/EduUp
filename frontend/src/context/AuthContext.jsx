import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('users/me/');
            setUser(res.data);
            return res.data;
        } catch (err) {
            // Token invalid or expired
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            throw err;
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetchProfile().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const response = await api.post('auth/login/', { username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        // Fetch full profile so we have profile_picture, role, etc.
        const profile = await fetchProfile();
        return profile;
    };

    const register = async (userData) => {
        await api.post('auth/register/', userData);
        return login(userData.email, userData.password);
    };

    const logout = (navigate) => {
        // Mark user offline before logout
        api.patch('users/presence/', { is_online: false }).catch(() => { });
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        if (navigate) navigate('/');
    };

    const updateProfile = async (data) => {
        const formData = new FormData();

        const appendNested = (obj, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                const formKey = prefix ? `${prefix}[${key}]` : key;
                if (value && typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
                    appendNested(value, formKey);
                } else if (Array.isArray(value)) {
                    value.forEach(v => formData.append(formKey, v));
                } else if (value !== undefined && value !== null) {
                    formData.append(formKey, value);
                }
            });
        };

        appendNested(data);

        const res = await api.patch('users/me/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setUser(res.data);
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, authenticated: !!user, login, register, logout, loading, fetchProfile, updateProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
