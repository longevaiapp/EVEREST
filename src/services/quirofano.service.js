// src/services/quirofano.service.js
import api from './api';

const quirofanoService = {
  // List surgeries with filters
  getSurgeries: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.fecha) params.append('fecha', filters.fecha);
    if (filters.surgeonId) params.append('surgeonId', filters.surgeonId);
    return api.get(`/surgeries?${params.toString()}`);
  },

  // Today's surgeries
  getToday: () => api.get('/surgeries/today'),

  // Board summary stats
  getBoardStats: () => api.get('/surgeries/board'),

  // Get surgery details
  getSurgery: (id) => api.get(`/surgeries/${id}`),

  // Schedule surgery
  schedule: (data) => api.post('/surgeries', data),

  // Update surgery info
  update: (id, data) => api.put(`/surgeries/${id}`, data),

  // Pre-op preparation
  prepare: (id, data) => api.put(`/surgeries/${id}/prepare`, data),

  // Start surgery
  start: (id, data = {}) => api.put(`/surgeries/${id}/start`, data),

  // Complete surgery
  complete: (id, data) => api.put(`/surgeries/${id}/complete`, data),

  // Cancel surgery
  cancel: (id, reason) => api.put(`/surgeries/${id}/cancel`, { reason }),

  // ---- Vitals (intra-operative) ----
  getVitals: (surgeryId) => api.get(`/surgeries/${surgeryId}/vitals`),
  addVitals: (surgeryId, data) => api.post(`/surgeries/${surgeryId}/vitals`, data),

  // ---- Pre-medication ----
  getPreMeds: (surgeryId) => api.get(`/surgeries/${surgeryId}/pre-meds`),
  addPreMed: (surgeryId, data) => api.post(`/surgeries/${surgeryId}/pre-meds`, data),
  removePreMed: (surgeryId, preMedId) => api.delete(`/surgeries/${surgeryId}/pre-meds/${preMedId}`),
};

export default quirofanoService;
