// src/services/preventiva.service.js
// Servicio para operaciones del módulo Medicina Preventiva

import api from './api';

// ============================================================================
// QUEUE - Cola de pacientes de medicina preventiva
// ============================================================================

export const preventivaService = {
  /**
   * Obtener cola de pacientes de medicina preventiva
   */
  async getQueue() {
    const response = await api.get('/preventive-medicine/queue');
    return response.data || response;
  },

  /**
   * Obtener vacunas disponibles en inventario
   * @param {string} especie - 'PERRO' | 'GATO' | undefined
   */
  async getVaccines(especie) {
    const params = especie ? { especie } : {};
    const response = await api.get('/preventive-medicine/vaccines', { params });
    return response.data?.vaccines || response.vaccines || [];
  },

  /**
   * Obtener desparasitantes disponibles en inventario
   * @param {string} especie - 'PERRO' | 'GATO' | undefined
   */
  async getDewormers(especie) {
    const params = especie ? { especie } : {};
    const response = await api.get('/preventive-medicine/dewormers', { params });
    return response.data?.dewormers || response.dewormers || [];
  },

  /**
   * Obtener historial de vacunas y desparasitaciones de una mascota
   * @param {string} petId
   */
  async getPetHistory(petId) {
    const response = await api.get(`/preventive-medicine/pet/${petId}/history`);
    return response.data || response;
  },

  /**
   * Completar atención de medicina preventiva
   * @param {Object} data - Datos de la atención
   * @param {string} data.visitId
   * @param {string} data.petId
   * @param {number} data.temperatura
   * @param {number} data.peso
   * @param {number} data.frecuenciaCardiaca
   * @param {number} data.frecuenciaRespiratoria
   * @param {string} data.condicionGeneral - 'Normal' | 'Requiere atención'
   * @param {string} data.observaciones
   * @param {Array} data.vaccines - Array de vacunas a aplicar
   * @param {Array} data.dewormings - Array de desparasitantes a aplicar
   */
  async attendPreventive(data) {
    const response = await api.post('/preventive-medicine/attend', data);
    return response.data || response;
  },

  /**
   * Registrar vacuna individual (quick add)
   * @param {Object} data
   */
  async addVaccine(data) {
    const response = await api.post('/preventive-medicine/vaccine', data);
    return response.data || response;
  },

  /**
   * Registrar desparasitación individual
   * @param {Object} data
   */
  async addDeworming(data) {
    const response = await api.post('/preventive-medicine/deworming', data);
    return response.data || response;
  },

  /**
   * Obtener registros de medicina preventiva de hoy
   */
  async getTodayRecords() {
    const response = await api.get('/preventive-medicine/today');
    return response.data?.records || response.records || [];
  },

  /**
   * Obtener vacunas y desparasitaciones próximas (próximos 30 días)
   */
  async getUpcoming() {
    const response = await api.get('/preventive-medicine/upcoming');
    return response.data || response;
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcular próxima fecha basada en intervalo en días
 * @param {number} diasIntervalo 
 * @returns {Date}
 */
export const calcularProximaFecha = (diasIntervalo) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasIntervalo);
  return fecha;
};

/**
 * Formatear intervalo de refuerzo para mostrar
 * @param {string} intervalo - Días en string (ej: '365', '90')
 * @returns {string}
 */
export const formatearIntervalo = (intervalo) => {
  const dias = parseInt(intervalo);
  if (isNaN(dias)) return intervalo;
  
  if (dias >= 365) {
    const anios = Math.floor(dias / 365);
    return anios === 1 ? '1 año' : `${anios} años`;
  }
  if (dias >= 30) {
    const meses = Math.floor(dias / 30);
    return meses === 1 ? '1 mes' : `${meses} meses`;
  }
  return `${dias} días`;
};

/**
 * Obtener color de badge según especie
 * @param {string} especie 
 * @returns {string}
 */
export const getEspecieColor = (especie) => {
  switch (especie?.toUpperCase()) {
    case 'PERRO': return '#4A90A4';
    case 'GATO': return '#9B59B6';
    default: return '#7F8C8D';
  }
};

/**
 * Verificar si una vacuna/desparasitación está próxima a vencer
 * @param {Date} proximaFecha 
 * @param {number} diasAlerta - Días antes para alertar (default: 7)
 * @returns {boolean}
 */
export const estaProximoAVencer = (proximaFecha, diasAlerta = 7) => {
  if (!proximaFecha) return false;
  const fecha = new Date(proximaFecha);
  const hoy = new Date();
  const diferenciaDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  return diferenciaDias <= diasAlerta && diferenciaDias > 0;
};

/**
 * Verificar si una vacuna/desparasitación está vencida
 * @param {Date} proximaFecha 
 * @returns {boolean}
 */
export const estaVencida = (proximaFecha) => {
  if (!proximaFecha) return false;
  const fecha = new Date(proximaFecha);
  return fecha < new Date();
};

export default preventivaService;
