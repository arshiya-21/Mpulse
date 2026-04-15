import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('mpulse_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mpulse_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/verify')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('mpulse_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('mpulse_token');
        localStorage.removeItem('mpulse_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.requirePasswordReset) return data;
    localStorage.setItem('mpulse_token', data.token);
    localStorage.setItem('mpulse_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mpulse_token');
    localStorage.removeItem('mpulse_user');
    sessionStorage.removeItem('mpulse_perms_cache');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
