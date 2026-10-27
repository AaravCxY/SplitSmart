import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on browser refresh
  const checkAuth = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    if (data.success && data.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.message || 'Login failed');
  };

  const register = async (name, email, password, confirmPassword) => {
    const data = await api.register({ name, email, password, confirmPassword });
    if (data.success && data.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Continue client cleanup even if network fails
    }
    setUser(null);
  };

  const updateProfile = async (name) => {
    const data = await api.updateProfile({ name });
    if (data.success && data.user) {
      setUser((prev) => ({ ...prev, ...data.user }));
      return data.user;
    }
    throw new Error(data.message || 'Profile update failed');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        checkAuth,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
