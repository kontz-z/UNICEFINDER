import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getUser());
  const [token, setToken] = useState(() => api.getToken());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user;
  const isEmployee = api.isEmployeeUser(user);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const freshUser = await api.getCurrentUser();
          setUser(freshUser);
        } catch (err) {
          console.warn('Falha ao validar sessão inicial:', err);
          setUser(null);
          setToken(null);
          api.clearAuth();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const handleLogin = async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const handleRegister = async (userData) => {
    const res = await api.register(userData);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await api.getCurrentUser();
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isEmployee,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export default AuthContext;
