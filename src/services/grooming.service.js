// src/services/grooming.service.js
// Service for all grooming/styling operations

import api from './api';

// ============================================================================
// GROOMING SERVICE
// ============================================================================

export const groomingService = {
    /**
     * Create a new grooming service record
     * @param {Object} data - Grooming form data
     * @param {string} data.visitId - Visit ID
     * @param {string} data.petId - Pet ID
     * @param {Object} data... - All grooming form fields
     */
    async create(data) {
        console.log('[groomingService] create - data:', data);
        const response = await api.post('/grooming', data);
        console.log('[groomingService] create - response:', response);
        // Backend returns { status: 'success', data: { groomingService } }
        return response.data?.data?.groomingService || response.data?.groomingService;
    },

    /**
     * Get grooming details for a specific visit
     * @param {string} visitId
     */
    async getByVisit(visitId) {
        const response = await api.get(`/grooming/${visitId}`);
        // Backend returns { status: 'success', data: { groomingService } }
        return response.data?.data?.groomingService || response.data?.groomingService;
    },

    /**
     * Get today's grooming visits
     */
    async getTodayVisits() {
        const response = await api.get('/grooming/today');
        // Backend returns { status: 'success', data: { visits } }
        return response.data?.data?.visits || response.data?.visits || [];
    },

    /**
     * Update grooming service (status, notes, etc.)
     * @param {string} id - Grooming service ID
     * @param {Object} data - Data to update
     */
    async update(id, data) {
        const response = await api.put(`/grooming/${id}`, data);
        // Backend returns { status: 'success', data: { groomingService } }
        return response.data?.data?.groomingService || response.data?.groomingService;
    },

    /**
     * Start grooming service (change status to EN_PROCESO)
     * @param {string} id - Grooming service ID
     */
    async startService(id) {
        return this.update(id, { status: 'EN_PROCESO' });
    },

    /**
     * Complete grooming service (change status to COMPLETADO)
     * @param {string} id - Grooming service ID
     * @param {string} notes - Optional completion notes
     */
    async completeService(id, notes = '') {
        return this.update(id, { status: 'COMPLETADO', notes });
    },

    /**
     * Cancel grooming service
     * @param {string} id - Grooming service ID
     * @param {string} notes - Cancellation reason
     */
    async cancelService(id, notes = '') {
        return this.update(id, { status: 'CANCELADO', notes });
    },
};

export default groomingService;
