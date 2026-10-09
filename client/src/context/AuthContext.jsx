import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('air_power_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('air_power_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          localStorage.setItem('air_power_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        logout();
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('air_power_token', newToken);
      localStorage.setItem('air_power_user', JSON.stringify(newUser));
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout request errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('air_power_token');
      localStorage.removeItem('air_power_user');
    }
  };

  const hasRole = (roles = []) => {
    if (!user || !user.role_name) return false;
    if (roles.length === 0) return true;
    return roles.some((r) => r.toLowerCase() === user.role_name.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
