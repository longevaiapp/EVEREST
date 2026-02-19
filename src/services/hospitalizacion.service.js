// src/services/hospitalizacion.service.js
// Servicio de Hospitalización - Conecta con el backend

import api from './api';

const hospitalizacionService = {
  // ==================== HOSPITALIZACIONES ====================
  
  // Obtener todas las hospitalizaciones activas
  // NOTA: El interceptor de axios ya devuelve response.data
  getHospitalizaciones: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    
    const queryString = params.toString();
    const url = queryString ? `/hospitalizations?${queryString}` : '/hospitalizations';
    return await api.get(url);
  },

  // Obtener estadísticas
  getStats: async () => {
    return await api.get('/hospitalizations/summary/stats');
  },

  // Obtener hospitalización por ID
  getHospitalizacion: async (id) => {
    return await api.get(`/hospitalizations/${id}`);
  },

  // ==================== SIGNOS VITALES ====================
  
  // Obtener registros de signos vitales
  getVitalSigns: async (hospitalizationId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/monitorings`);
  },

  // Registrar signos vitales
  addVitalSigns: async (hospitalizationId, data) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/monitorings`, data);
  },

  // ==================== PLAN TERAPÉUTICO ====================
  
  // Obtener plan terapéutico
  getTherapyPlan: async (hospitalizationId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/therapy-items`);
  },

  // Agregar medicamento al plan
  addTherapyItem: async (hospitalizationId, data) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/therapy-items`, data);
  },

  // Desactivar medicamento del plan
  deactivateTherapyItem: async (hospitalizationId, itemId) => {
    return await api.delete(`/hospitalizations/${hospitalizationId}/therapy-items/${itemId}`);
  },

  // Activar medicamento del plan
  activateTherapyItem: async (hospitalizationId, itemId) => {
    return await api.patch(`/hospitalizations/${hospitalizationId}/therapy-items/${itemId}`, { isActive: true });
  },

  // ==================== ADMINISTRACIÓN DE MEDICAMENTOS ====================
  
  // Obtener medicamentos pendientes
  getPendingMedications: async (hospitalizationId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/pending-medications`);
  },

  // Administrar medicamento
  administerMedication: async (hospitalizationId, adminId) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/administer-medication/${adminId}`);
  },

  // Generar horario diario
  generateDailySchedule: async (hospitalizationId) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/generate-daily-schedule`);
  },

  // ==================== NEONATOS ====================
  
  // Obtener neonatos
  getNeonates: async (hospitalizationId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/neonates`);
  },

  // Agregar neonato
  addNeonate: async (hospitalizationId, data) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/neonates`, data);
  },

  // Agregar registro de neonato
  addNeonateRecord: async (hospitalizationId, neonateId, data) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/neonates/${neonateId}/records`, data);
  },

  // Obtener historial de registros de un neonato
  getNeonateRecords: async (hospitalizationId, neonateId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/neonates/${neonateId}/records`);
  },

  // ==================== COSTOS ====================
  
  // Obtener costos de hospitalización
  getCosts: async (hospitalizationId) => {
    return await api.get(`/hospitalizations/${hospitalizationId}/costs`);
  },

  // ==================== ACTUALIZAR HOSPITALIZACIÓN ====================
  
  // Actualizar datos de hospitalización (diagnóstico, líquidos, notas, etc.)
  updateHospitalization: async (hospitalizationId, data) => {
    return await api.patch(`/hospitalizations/${hospitalizationId}`, data);
  },

  // ==================== ALTA ====================
  
  // Dar de alta médica (pasa a ALTA_PENDIENTE para cobro en recepción)
  discharge: async (hospitalizationId, data = {}) => {
    return await api.put(`/hospitalizations/${hospitalizationId}/discharge`, data);
  },
  
  // Obtener hospitalizaciones pendientes de cobro (para recepción)
  getPendingDischarges: async () => {
    const response = await api.get('/hospitalizations/pending-discharge');
    return response.data || { count: 0, hospitalizations: [] };
  },
  
  // Completar alta después de cobro (llamado por recepción)
  completeDischarge: async (hospitalizationId) => {
    return await api.post(`/hospitalizations/${hospitalizationId}/complete-discharge`);
  },
};

export default hospitalizacionService;
