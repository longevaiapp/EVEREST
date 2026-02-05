// src/services/notification.service.js
// Notification service - connects to backend API

import api from './api';

/**
 * Notification Service
 * Handles all API calls for notifications
 */
const notificationService = {
  /**
   * Get notifications for current user
   * @param {Object} filters - { leida, tipo, limit }
   * @returns {Promise<Array>} List of notifications
   */
  getNotifications: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.leida !== undefined) params.append('leida', filters.leida);
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    
    const response = await api.get(url);
    return response.data?.notifications || response.data || [];
  },

  /**
   * Get unread notification count
   * @returns {Promise<number>} Unread count
   */
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.count || 0;
  },

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data?.notification || response.data;
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<void>}
   */
  markAllAsRead: async () => {
    await api.put('/notifications/mark-all-read');
  },

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   * @returns {Promise<void>}
   */
  deleteNotification: async (id) => {
    await api.delete(`/notifications/${id}`);
  },

  /**
   * Clear all notifications
   * @returns {Promise<void>}
   */
  clearAll: async () => {
    await api.delete('/notifications/clear');
  },
};

export default notificationService;
