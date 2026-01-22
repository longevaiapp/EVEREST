// src/services/auth.service.js
// Servicio de autenticación

import api from './api';

const authService = {
  /**
   * Login de usuario
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{user: Object, token: string}>}
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Logout - limpia tokens
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obtener usuario actual del localStorage
   * @returns {Object|null}
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Verificar si hay sesión activa
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  /**
   * Obtener token actual
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Obtener perfil del usuario logueado
   * @returns {Promise<Object>}
   */
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;
