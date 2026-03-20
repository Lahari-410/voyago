'use client';

// AuthContext makes the logged-in user available everywhere in the app
// Without this, every page would need to separately fetch "who am I?"
//
// Usage in any component:
//   const { user, login, logout } = useAuth();

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api, getToken, setToken, removeToken } from './api';
import { disconnectSocket } from './socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true while checking if already logged in

  // On app load, check if there's already a token saved from a previous session
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const data = await api.auth.me();
          setUser(data.user);
        } catch {
          // Token is invalid or expired — remove it
          removeToken();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (body: { name: string; email: string; password: string; phone: string }) => {
    const data = await api.auth.register(body);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — components call useAuth() to get user/login/logout
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
