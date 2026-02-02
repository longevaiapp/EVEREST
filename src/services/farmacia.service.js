// src/services/farmacia.service.js
// Pharmacy module API service

import api from './api';

/**
 * Pharmacy Service
 * Handles all API calls for the Pharmacy module
 */
const farmaciaService = {
  // ==================== MEDICATIONS ====================

  /**
   * Get all medications with optional filters
   * @param {Object} filters - { search, category, status, lowStock, expiringSoon }
   * @returns {Promise<Array>} List of medications
   */
  getMedications: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.lowStock) params.append('lowStock', 'true');
    if (filters.expiringSoon) params.append('expiringSoon', 'true');
    
    const queryString = params.toString();
    const url = queryString ? `/medications?${queryString}` : '/medications';
    
    const response = await api.get(url);
    return response.data.data?.medications || response.data.data || [];
  },

  /**
   * Get a single medication by ID
   * @param {string} id - Medication ID
   * @returns {Promise<Object>} Medication details
   */
  getMedicationById: async (id) => {
    const response = await api.get(`/medications/${id}`);
    return response.data.data?.medication || response.data.data;
  },

  /**
   * Create a new medication
   * @param {Object} data - Medication data
   * @returns {Promise<Object>} Created medication
   */
  createMedication: async (data) => {
    const response = await api.post('/medications', data);
    return response.data.data?.medication || response.data.data;
  },

  /**
   * Update an existing medication
   * @param {string} id - Medication ID
   * @param {Object} data - Updated medication data
   * @returns {Promise<Object>} Updated medication
   */
  updateMedication: async (id, data) => {
    const response = await api.put(`/medications/${id}`, data);
    return response.data.data?.medication || response.data.data;
  },

  /**
   * Delete a medication
   * @param {string} id - Medication ID
   * @returns {Promise<Object>} Deletion result
   */
  deleteMedication: async (id) => {
    const response = await api.delete(`/medications/${id}`);
    return response.data;
  },

  /**
   * Adjust medication stock
   * @param {string} id - Medication ID
   * @param {number} quantity - Quantity to adjust (positive or negative)
   * @param {string} reason - Reason for adjustment
   * @param {string} batchNumber - Batch number (optional)
   * @returns {Promise<Object>} Updated medication
   */
  adjustStock: async (id, quantity, reason, batchNumber = null) => {
    const response = await api.put(`/medications/${id}/adjust-stock`, {
      quantity,
      reason,
      batchNumber
    });
    return response.data.data?.medication || response.data.data;
  },

  /**
   * Get medications with low stock
   * @returns {Promise<Array>} List of low stock medications
   */
  getLowStockMedications: async () => {
    const response = await api.get('/medications/low-stock');
    return response.data.data?.medications || response.data.data || [];
  },

  /**
   * Get medications expiring soon
   * @returns {Promise<Array>} List of expiring medications
   */
  getExpiringMedications: async () => {
    const response = await api.get('/medications/expiring');
    return response.data.data?.medications || response.data.data || [];
  },

  /**
   * Check for expiring medications and create alerts
   * @returns {Promise<Object>} Check result with counts and created alerts
   */
  checkExpiringMedications: async () => {
    const response = await api.post('/medications/check-expiring');
    return response.data.data;
  },

  /**
   * Mark medication units as expired
   * @param {string} id - Medication ID
   * @param {number} quantity - Quantity to mark as expired
   * @param {string} notes - Notes for the expiration
   * @param {string} batchNumber - Batch number (optional)
   * @returns {Promise<Object>} Updated medication
   */
  markAsExpired: async (id, quantity, notes = '', batchNumber = null) => {
    const response = await api.put(`/medications/${id}/mark-expired`, {
      quantity,
      notes,
      batchNumber
    });
    return response.data.data?.medication || response.data.data;
  },

  /**
   * Get all stock alerts (low stock + expiring)
   * @returns {Promise<Array>} List of stock alerts
   */
  getStockAlerts: async () => {
    const response = await api.get('/medications/alerts');
    return response.data.data?.alerts || response.data.data || [];
  },

  /**
   * Resolve a stock alert
   * @param {string} id - Alert ID
   * @param {string} status - New status ('resolved', 'acknowledged', 'ignored')
   * @param {string} notes - Resolution notes
   * @returns {Promise<Object>} Updated alert
   */
  resolveAlert: async (id, status, notes = '') => {
    const response = await api.put(`/medications/alerts/${id}/resolve`, {
      status,
      notes
    });
    return response.data.data?.alert || response.data.data;
  },

  /**
   * Get stock movements for a medication
   * @param {string} medicationId - Medication ID
   * @param {Object} filters - { startDate, endDate, type }
   * @returns {Promise<Array>} List of stock movements
   */
  getStockMovements: async (medicationId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type) params.append('type', filters.type);
    
    const queryString = params.toString();
    const url = queryString 
      ? `/medications/${medicationId}/movements?${queryString}` 
      : `/medications/${medicationId}/movements`;
    
    const response = await api.get(url);
    return response.data.data?.movements || response.data.data || [];
  },

  // ==================== PRESCRIPTIONS ====================

  /**
   * Get pending prescriptions (for pharmacy to dispense)
   * @returns {Promise<Array>} List of pending prescriptions
   */
  getPendingPrescriptions: async () => {
    const response = await api.get('/prescriptions/pending');
    return response.data.data?.prescriptions || response.data.data || [];
  },

  /**
   * Reject a prescription
   * @param {string} id - Prescription ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated prescription
   */
  rejectPrescription: async (id, reason) => {
    const response = await api.put(`/prescriptions/${id}/reject`, { reason });
    return response.data.data?.prescription || response.data.data;
  },

  // ==================== DISPENSES ====================

  /**
   * Get dispense history with optional filters
   * @param {Object} filters - { date, startDate, endDate, prescriptionId, medicationId }
   * @returns {Promise<Array>} List of dispenses
   */
  getDispenses: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.prescriptionId) params.append('prescriptionId', filters.prescriptionId);
    if (filters.medicationId) params.append('medicationId', filters.medicationId);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = queryString ? `/dispenses?${queryString}` : '/dispenses';
    
    const response = await api.get(url);
    return response.data.data?.dispenses || response.data.data || [];
  },

  /**
   * Create a new dispense (fulfill prescription)
   * @param {Object} data - { prescriptionId, petId, items: [{ medicationId, medicationName, requestedQty, dispensedQty, unitPrice, reason }], deliveredTo, notes }
   * @returns {Promise<Object>} Created dispense
   */
  createDispense: async (data) => {
    // Format payload to match backend schema exactly
    const payload = {
      prescriptionId: data.prescriptionId,
      petId: data.petId,
      items: data.items.map(item => ({
        medicationId: item.medicationId,
        medicationName: item.medicationName || item.name || 'Unknown',
        requestedQty: item.requestedQty || item.quantity || 1,
        dispensedQty: item.dispensedQty || item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        reason: item.reason
      })),
      deliveredTo: data.deliveredTo || '',
      notes: data.notes || ''
    };
    const response = await api.post('/dispenses', payload);
    return response.data.data?.dispense || response.data.data;
  },

  // ==================== DASHBOARD & STATS ====================

  /**
   * Get pharmacy dashboard statistics
   * @returns {Promise<Object>} Pharmacy stats
   */
  getPharmacyStats: async () => {
    const response = await api.get('/dashboard/pharmacy');
    return response.data.data || response.data;
  }
};

export default farmaciaService;
