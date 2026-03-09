// src/services/crematorio.service.js
// Cremation system API service

import api from './api';

const crematorioService = {
  // ==================== PACKAGING RANGES ====================
  getPackagingRanges: async () => {
    const response = await api.get('/cremation/packaging-ranges');
    return response.data.ranges;
  },

  createPackagingRange: async (data) => {
    const response = await api.post('/cremation/packaging-ranges', data);
    return response.data.range;
  },

  updatePackagingRange: async (id, data) => {
    const response = await api.put(`/cremation/packaging-ranges/${id}`, data);
    return response.data.range;
  },

  deletePackagingRange: async (id) => {
    await api.delete(`/cremation/packaging-ranges/${id}`);
  },

  // ==================== URNS ====================
  getPublicUrns: async () => {
    const response = await api.get('/cremation/urns/public');
    return response.data.urns;
  },

  getUrns: async () => {
    const response = await api.get('/cremation/urns');
    return response.data.urns;
  },

  getAllUrns: async () => {
    const response = await api.get('/cremation/urns/all');
    return response.data.urns;
  },

  createUrn: async (data) => {
    const response = await api.post('/cremation/urns', data);
    return response.data.urn;
  },

  updateUrn: async (id, data) => {
    const response = await api.put(`/cremation/urns/${id}`, data);
    return response.data.urn;
  },

  // ==================== ORDERS ====================
  createOrder: async (data) => {
    const response = await api.post('/cremation/orders', data);
    return response.data.order;
  },

  getOrders: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/cremation/orders?${params.toString()}`);
    return response.data.orders;
  },

  getOrder: async (id) => {
    const response = await api.get(`/cremation/orders/${id}`);
    return response.data.order;
  },

  updateOrder: async (id, data) => {
    const response = await api.patch(`/cremation/orders/${id}`, data);
    return response.data.order;
  },

  updateOrderStatus: async (id, data) => {
    const response = await api.patch(`/cremation/orders/${id}/status`, data);
    return response.data.order;
  },

  // ==================== PAYMENTS ====================
  createPayment: async (orderId, data) => {
    const response = await api.post(`/cremation/orders/${orderId}/payments`, data);
    return response.data.payment;
  },

  // ==================== STATS ====================
  getStats: async () => {
    const response = await api.get('/cremation/stats');
    return response.data.stats;
  },

  // ==================== EXPORT ====================
  exportOrders: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/cremation/export?${params.toString()}`);
    return response.data.orders;
  },
};

export default crematorioService;
