// src/context/AuthContext.jsx
// Contexto de autenticación con JWT

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar usuario al iniciar
  useEffect(() => {
    const initAuth = () => {
      try {
        const savedUser = authService.getCurrentUser();
        const token = authService.getToken();
        
        if (savedUser && token) {
          setUser(savedUser);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const { user: userData, token } = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      const message = err.message || 'Error al iniciar sesión';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setError(null);
  }, []);

  // Verificar si tiene un rol específico
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.rol);
  }, [user]);

  // Verificar si es recepción o admin
  const canAccessRecepcion = useCallback(() => {
    return hasRole(['RECEPCION', 'ADMIN']);
  }, [hasRole]);

  // Verificar si es médico o admin
  const canAccessMedico = useCallback(() => {
    return hasRole(['MEDICO', 'ADMIN']);
  }, [hasRole]);

  // Verificar si es farmacia o admin
  const canAccessFarmacia = useCallback(() => {
    return hasRole(['FARMACIA', 'ADMIN']);
  }, [hasRole]);

  // Verificar si es laboratorio o admin
  const canAccessLaboratorio = useCallback(() => {
    return hasRole(['LABORATORIO', 'ADMIN']);
  }, [hasRole]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    canAccessRecepcion,
    canAccessMedico,
    canAccessFarmacia,
    canAccessLaboratorio,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
