// src/services/laboratorio.service.js
// Servicio para el módulo de Laboratorio - conecta con API real

import api from './api';

/**
 * Servicio de Laboratorio
 * Maneja todas las operaciones de estudios/exámenes de laboratorio
 */
const laboratorioService = {
  // ============================================================================
  // OBTENER ESTUDIOS
  // ============================================================================

  /**
   * Obtener todos los estudios de laboratorio
   * @param {Object} filters - { status?, urgency?, consultationId? }
   * @returns {Promise<Array>} Lista de estudios
   */
  async getAll(filters = {}) {
    try {
      const response = await api.get('/lab-requests', { params: filters });
      return response?.data?.labRequests || [];
    } catch (error) {
      console.error('[laboratorioService.getAll] Error:', error);
      return [];
    }
  },

  /**
   * Obtener estudios pendientes (PENDIENTE + EN_PROCESO)
   * @returns {Promise<Array>} Lista de estudios pendientes
   */
  async getPendientes() {
    try {
      const response = await api.get('/lab-requests/pending');
      return response?.data?.labRequests || [];
    } catch (error) {
      console.error('[laboratorioService.getPendientes] Error:', error);
      return [];
    }
  },

  /**
   * Obtener estudios por estado
   * @param {string} status - PENDIENTE, EN_PROCESO, COMPLETADO
   * @returns {Promise<Array>}
   */
  async getByStatus(status) {
    try {
      const response = await api.get('/lab-requests', { params: { status } });
      return response?.data?.labRequests || [];
    } catch (error) {
      console.error('[laboratorioService.getByStatus] Error:', error);
      // Retornar array vacío en caso de error para no romper el UI
      return [];
    }
  },

  /**
   * Obtener detalle de un estudio
   * @param {string} id - ID del estudio
   * @returns {Promise<Object>}
   */
  async getById(id) {
    try {
      const response = await api.get(`/lab-requests/${id}`);
      return response?.data?.labRequest;
    } catch (error) {
      console.error('[laboratorioService.getById] Error:', error);
      throw error;
    }
  },

  // ============================================================================
  // PROCESAR ESTUDIOS
  // ============================================================================

  /**
   * Iniciar procesamiento de un estudio
   * @param {string} id - ID del estudio
   * @returns {Promise<Object>} Estudio actualizado
   */
  async iniciarEstudio(id) {
    try {
      console.log('[laboratorioService.iniciarEstudio] Llamando PUT /lab-requests/' + id + '/start');
      const response = await api.put(`/lab-requests/${id}/start`);
      console.log('[laboratorioService.iniciarEstudio] Respuesta:', response?.data);
      return response?.data?.labRequest;
    } catch (error) {
      console.error('[laboratorioService.iniciarEstudio] Error:', error.response?.status, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Subir resultados de un estudio
   * @param {string} id - ID del estudio
   * @param {Object} data - { results, resultFiles? }
   * @returns {Promise<Object>} Estudio con resultados
   */
  async subirResultados(id, data) {
    try {
      // Construir resultados con observaciones si existen
      let fullResults = data.results || data.resultados || '';
      const observaciones = data.observaciones;
      
      if (observaciones && observaciones.trim()) {
        fullResults += `\n\n--- Observaciones ---\n${observaciones}`;
      }
      
      // Procesar archivos - pueden ser objetos {name, type, data} o strings
      const archivos = data.resultFiles || data.archivos || [];
      const processedFiles = archivos.map(file => {
        if (typeof file === 'object' && file.data) {
          // Es un objeto con base64 - guardar el data URI completo
          return file.data;
        }
        return file; // Ya es un string (URL o nombre)
      });
      
      const payload = {
        results: fullResults,
        resultFiles: processedFiles,
      };
      
      console.log('[laboratorioService.subirResultados] Enviando:', { id, filesCount: processedFiles.length });
      const response = await api.put(`/lab-requests/${id}/results`, payload);
      console.log('[laboratorioService.subirResultados] Respuesta:', response?.data);
      return response?.data?.labRequest;
    } catch (error) {
      console.error('[laboratorioService.subirResultados] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  /**
   * Obtener conteo de estudios por estado
   * @returns {Promise<Object>} { pendientes, enProceso, completados, completadosHoy }
   */
  async getStats() {
    try {
      const [pendientes, enProceso, completados] = await Promise.all([
        this.getByStatus('PENDIENTE'),
        this.getByStatus('EN_PROCESO'),
        this.getByStatus('COMPLETADO'),
      ]);

      // Filtrar completados hoy
      const today = new Date().toDateString();
      const completadosHoy = completados.filter(s => {
        const completedDate = new Date(s.completedAt || s.updatedAt);
        return completedDate.toDateString() === today;
      });

      return {
        pendientes: pendientes.length,
        enProceso: enProceso.length,
        completados: completados.length,
        completadosHoy: completadosHoy.length,
      };
    } catch (error) {
      console.error('[laboratorioService.getStats] Error:', error);
      return { pendientes: 0, enProceso: 0, completados: 0, completadosHoy: 0 };
    }
  },

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Mapear tipo de estudio a nombre legible
   */
  tipoToLabel(type) {
    const labels = {
      HEMOGRAMA: 'Hemograma',
      QUIMICA_SANGUINEA: 'Química Sanguínea',
      URINALISIS: 'Urianálisis',
      RAYOS_X: 'Rayos X',
      ULTRASONIDO: 'Ultrasonido',
      ELECTROCARDIOGRAMA: 'Electrocardiograma',
      CITOLOGIA: 'Citología',
      BIOPSIA: 'Biopsia',
      COPROLOGIA: 'Coprología',
      PERFIL_TIROIDEO: 'Perfil Tiroideo',
    };
    return labels[type] || type;
  },

  /**
   * Verificar si el estudio requiere sedación
   */
  requiereSedacion(type) {
    const tiposConSedacion = ['RAYOS_X', 'ULTRASONIDO', 'ELECTROCARDIOGRAMA'];
    return tiposConSedacion.includes(type);
  },

  /**
   * Mapear urgencia a clase CSS
   */
  urgencyToClass(urgency) {
    return urgency === 'URGENTE' ? 'urgente' : 'normal';
  },

  /**
   * Mapear estado a clase CSS
   */
  statusToClass(status) {
    const classes = {
      PENDIENTE: 'pending',
      EN_PROCESO: 'processing',
      COMPLETADO: 'completed',
    };
    return classes[status] || 'pending';
  },
};

export default laboratorioService;
