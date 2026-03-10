import api from './api';

const BASE = '/blood-bank';

export default {
  // Config
  getConfig: () => api.get(`${BASE}/config`),
  updateConfig: (data) => api.put(`${BASE}/config`, data),

  // Dashboard
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // Donors
  getDonors: (params) => api.get(`${BASE}/donors`, { params }),
  createDonor: (data) => api.post(`${BASE}/donors`, data),
  getDonor: (id) => api.get(`${BASE}/donors/${id}`),
  updateDonor: (id, data) => api.put(`${BASE}/donors/${id}`, data),
  searchPet: (q) => api.get(`${BASE}/donors/search-pet`, { params: { q } }),
  getDonorHistory: (id) => api.get(`${BASE}/donors/${id}/history`),

  // Evaluations
  getEvaluations: (donorId) => api.get(`${BASE}/donors/${donorId}/evaluations`),
  createEvaluation: (donorId, data) => api.post(`${BASE}/donors/${donorId}/evaluations`, data),

  // Diagnostic Tests
  getTests: (donorId) => api.get(`${BASE}/donors/${donorId}/tests`),
  createTest: (donorId, data) => api.post(`${BASE}/donors/${donorId}/tests`, data),

  // Donations
  getDonations: (params) => api.get(`${BASE}/donations`, { params }),
  createDonation: (data) => api.post(`${BASE}/donations`, data),
  getDonation: (id) => api.get(`${BASE}/donations/${id}`),

  // Units (Inventory)
  getUnits: (params) => api.get(`${BASE}/units`, { params }),
  getUnit: (id) => api.get(`${BASE}/units/${id}`),
  updateUnitStatus: (id, data) => api.put(`${BASE}/units/${id}/status`, data),
  checkExpiry: () => api.post(`${BASE}/units/check-expiry`),

  // Transfusions
  getTransfusions: () => api.get(`${BASE}/transfusions`),
  createTransfusion: (data) => api.post(`${BASE}/transfusions`, data),
  getTransfusion: (id) => api.get(`${BASE}/transfusions/${id}`),

  // Alerts
  getAlerts: (params) => api.get(`${BASE}/alerts`, { params }),
  resolveAlert: (id, userId) => api.put(`${BASE}/alerts/${id}/resolve`, { userId }),
};
