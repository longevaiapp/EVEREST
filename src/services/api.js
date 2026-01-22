// src/services/api.js
// Configuración central de API con Axios

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    // Retornar solo los datos de la respuesta
    return response.data;
  },
  (error) => {
    // Manejar errores específicos
    if (error.response) {
      const { status, data } = error.response;
      
      // Token expirado o inválido
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirigir a login si no estamos ya ahí
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      // Error del servidor con mensaje
      if (data?.message) {
        throw new Error(data.message);
      }
    }
    
    // Error de red
    if (error.code === 'ECONNABORTED') {
      throw new Error('La conexión tardó demasiado. Intenta de nuevo.');
    }
    
    if (!error.response) {
      throw new Error('Error de conexión. Verifica tu internet.');
    }
    
    throw error;
  }
);

export default api;
