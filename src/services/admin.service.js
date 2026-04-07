// src/services/admin.service.js
// Admin module API service - Business Info and Settings

import api from './api';

/**
 * Admin Service
 * Handles all API calls for the Admin module
 */
const adminService = {
  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users
   */
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data || response;
  },

  /**
   * Create a new user
   */
  createUser: async (data) => {
    const response = await api.post('/admin/users', data);
    return response.data || response;
  },

  /**
   * Update user
   */
  updateUser: async (id, data) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data || response;
  },

  /**
   * Update user dashboard permissions
   */
  updatePermissions: async (id, dashboardAccess) => {
    const response = await api.put(`/admin/users/${id}/permissions`, { dashboardAccess });
    return response.data || response;
  },

  /**
   * Deactivate user
   */
  deactivateUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data || response;
  },

  // ==================== BUSINESS INFO ====================

  /**
   * Get clinic/business configuration
   * @returns {Promise<Object>} Business info data
   */
  getBusinessInfo: async () => {
    const response = await api.get('/business-info');
    return response.data || response;
  },

  /**
   * Save clinic/business configuration (create or update)
   * @param {Object} data - Business info data
   * @returns {Promise<Object>} Saved business info
   */
  saveBusinessInfo: async (data) => {
    const response = await api.post('/business-info', data);
    return response.data?.businessInfo || response.data;
  },

  /**
   * Upload clinic logo
   * @param {string} base64Logo - Base64 encoded logo image
   * @returns {Promise<Object>} Updated business info
   */
  uploadLogo: async (base64Logo) => {
    const response = await api.put('/business-info/logo', { logo: base64Logo });
    return response.data?.businessInfo || response.data;
  },

  /**
   * Upload vet signature
   * @param {string} base64Signature - Base64 encoded signature image
   * @returns {Promise<Object>} Updated business info
   */
  uploadSignature: async (base64Signature) => {
    const response = await api.put('/business-info/signature', { signature: base64Signature });
    return response.data?.businessInfo || response.data;
  },

  // ==================== HELPERS ====================

  /**
   * Convert file to base64
   * @param {File} file - File object
   * @returns {Promise<string>} Base64 string
   */
  fileToBase64: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  },
};

export default adminService;
