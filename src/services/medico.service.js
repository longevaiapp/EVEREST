// src/services/medico.service.js
// Servicio para todas las operaciones del módulo Médico

import api from './api';

// ============================================================================
// DASHBOARD - Datos generales del médico
// ============================================================================

export const medicoService = {
  /**
   * Obtener citas y visitas de hoy
   */
  async getCitasHoy() {
    console.log('[medicoService] Llamando a /medico/citas-hoy...');
    const response = await api.get('/medico/citas-hoy');
    console.log('[medicoService] Respuesta completa:', response);
    // El interceptor ya devuelve response.data, que es { status, data }
    // Necesitamos extraer response.data (que contiene visits, appointments, resumen)
    const data = response.data || response;
    console.log('[medicoService] Data extraída:', data);
    return data;
  },

  /**
   * Obtener información completa del paciente
   * @param {string} petId
   */
  async getPaciente(petId) {
    const response = await api.get(`/medico/paciente/${petId}`);
    return response.data?.paciente;
  },

  /**
   * Obtener historial médico completo
   * @param {string} petId
   */
  async getHistorial(petId) {
    const response = await api.get(`/pets/historial/${petId}`);
    return response.data;
  },
};

// ============================================================================
// CONSULTAS
// ============================================================================

export const consultaService = {
  /**
   * Iniciar nueva consulta
   * @param {Object} data - { visitId, petId }
   */
  async iniciar(data) {
    const response = await api.post('/medico/consulta', data);
    return response.data?.consulta;
  },

  /**
   * Actualizar consulta (SOAP notes, vitales, etc.)
   * @param {string} consultaId
   * @param {Object} data
   */
  async actualizar(consultaId, data) {
    const response = await api.put(`/medico/consulta/${consultaId}`, data);
    return response.data?.consulta;
  },

  /**
   * Obtener consulta por ID
   * @param {string} consultaId
   */
  async getById(consultaId) {
    const response = await api.get(`/consultations/${consultaId}`);
    return response.data?.consultation;
  },

  /**
   * Completar consulta
   * @param {string} consultaId
   * @param {Object} data - { diagnosis, soapPlan, followUpDate?, followUpNotes? }
   */
  async completar(consultaId, data) {
    const response = await api.put(`/consultations/${consultaId}/complete`, data);
    return response.data?.consultation;
  },
};

// ============================================================================
// DIAGNÓSTICOS
// ============================================================================

export const diagnosticoService = {
  /**
   * Crear diagnóstico
   * @param {Object} data - { consultationId, descripcion, tipo, severidad?, codigoCIE10?, etc. }
   */
  async crear(data) {
    // Construir payload limpio solo con campos válidos
    const payload = {
      consultationId: data.consultationId,
      descripcion: data.descripcion,
      tipo: data.tipo || 'PRESUNTIVO',
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (data.severidad) payload.severidad = data.severidad;
    if (data.codigoCIE10) payload.codigoCIE10 = data.codigoCIE10;
    if (data.nombreCIE10) payload.nombreCIE10 = data.nombreCIE10;
    if (data.observaciones) payload.observaciones = data.observaciones;
    if (data.esPrincipal !== undefined) payload.esPrincipal = data.esPrincipal;
    
    const response = await api.post('/medico/diagnostico', payload);
    return response.data?.diagnostico;
  },

  /**
   * Actualizar diagnóstico
   * @param {string} diagnosticoId
   * @param {Object} data
   */
  async actualizar(diagnosticoId, data) {
    const response = await api.put(`/medico/diagnostico/${diagnosticoId}`, data);
    return response.data?.diagnostico;
  },
};

// ============================================================================
// SIGNOS VITALES
// ============================================================================

export const signosVitalesService = {
  /**
   * Registrar signos vitales
   * @param {Object} data - { consultationId, petId, temperatura, frecuenciaCardiaca, etc. }
   */
  async registrar(data) {
    // Limpiar campos undefined/NaN para que zod no falle
    const mappedData = {};
    
    // Campo requerido
    mappedData.consultationId = data.consultationId;
    
    // Campos opcionales - solo incluir si tienen valor válido (no NaN)
    const temp = parseFloat(data.temperatura);
    if (!isNaN(temp)) mappedData.temperatura = temp;
    
    const fc = parseInt(data.frecuenciaCardiaca);
    if (!isNaN(fc)) mappedData.frecuenciaCardiaca = fc;
    
    const fr = parseInt(data.frecuenciaRespiratoria);
    if (!isNaN(fr)) mappedData.frecuenciaRespiratoria = fr;
    
    if (data.presionArterial) mappedData.presionArterial = data.presionArterial;
    
    const pulso = parseInt(data.pulso);
    if (!isNaN(pulso)) mappedData.pulso = pulso;
    
    const peso = parseFloat(data.peso);
    if (!isNaN(peso)) mappedData.peso = peso;
    
    if (data.hidratacion) mappedData.hidratacion = data.hidratacion;
    if (data.mucosas) mappedData.mucosas = data.mucosas;
    
    const dolor = parseInt(data.escalaDolor);
    if (!isNaN(dolor)) mappedData.escalaDolor = dolor;
    
    if (data.observaciones) mappedData.observaciones = data.observaciones;
    
    const response = await api.post('/medico/signos-vitales', mappedData);
    return response.data?.signosVitales;
  },

  /**
   * Obtener historial de signos vitales
   * @param {string} petId
   */
  async getHistorial(petId) {
    const response = await api.get(`/medico/signos-vitales/${petId}`);
    return response.data?.signosVitales || [];
  },
};

// ============================================================================
// RECETAS / PRESCRIPCIONES
// ============================================================================

export const recetaService = {
  /**
   * Crear receta
   * @param {Object} data - { consultationId, petId, items, generalInstructions? }
   */
  async crear(data) {
    console.log('[recetaService.crear] data recibida:', JSON.stringify(data, null, 2));
    
    const mappedItems = data.items.map(item => ({
      name: item.nombre || item.name,
      dosage: item.dosis || item.dosage,
      frequency: item.frecuencia || item.frequency,
      duration: item.duracion || item.duration || '7 días',
      quantity: item.cantidad || item.quantity || 1,
      instructions: item.instrucciones || item.instructions,
      type: item.type || 'USO_INMEDIATO',
      medicationId: item.medicationId || undefined,
    }));

    const payload = {
      consultationId: data.consultationId,
      petId: data.petId,
      items: mappedItems,
      generalInstructions: data.instruccionesGenerales || data.generalInstructions,
    };
    
    console.log('[recetaService.crear] payload a enviar:', JSON.stringify(payload, null, 2));
    
    const response = await api.post('/prescriptions', payload);
    return response.data?.prescription;
  },

  /**
   * Obtener recetas de una consulta
   * @param {string} consultationId
   */
  async getByConsulta(consultationId) {
    const response = await api.get('/prescriptions', { 
      params: { consultationId } 
    });
    return response.data?.prescriptions || [];
  },

  /**
   * Obtener recetas pendientes (para farmacia)
   */
  async getPendientes() {
    const response = await api.get('/prescriptions/pending');
    return response.data?.prescriptions || [];
  },

  /**
   * Obtener recetas externas para PDF (RECETA_EXTERNA)
   * @param {string} consultationId
   */
  async getExternalForPdf(consultationId) {
    const response = await api.get(`/prescriptions/external/${consultationId}`);
    return {
      prescriptions: response.data?.prescriptions || [],
      businessInfo: response.data?.businessInfo || null,
    };
  },
};

// ============================================================================
// ÓRDENES DE LABORATORIO
// ============================================================================

export const laboratorioService = {
  /**
   * Crear orden de laboratorio
   * Soporta un solo tipo o múltiples tipos (estudios)
   * @param {Object} data - { consultationId, petId, type?, estudios?, urgency?, notes? }
   */
  async crearOrden(data) {
    console.log('[laboratorioService.crearOrden] data recibida:', JSON.stringify(data, null, 2));
    
    // Si vienen múltiples estudios, crear una orden por cada uno
    if (data.estudios && Array.isArray(data.estudios) && data.estudios.length > 0) {
      const ordenes = [];
      for (const estudio of data.estudios) {
        const payload = {
          consultationId: data.consultationId,
          petId: data.petId,
          type: estudio,
          urgency: data.urgency || data.prioridad || 'NORMAL',
          notes: data.notes || data.indicaciones,
        };
        console.log('[laboratorioService.crearOrden] payload:', JSON.stringify(payload, null, 2));
        const response = await api.post('/medico/orden-laboratorio', payload);
        ordenes.push(response.data?.ordenLaboratorio);
      }
      return ordenes;
    }
    
    // Si viene un solo tipo
    const payload = {
      consultationId: data.consultationId,
      petId: data.petId,
      type: data.type || data.tipo,
      urgency: data.urgency || data.prioridad || 'NORMAL',
      notes: data.notes || data.indicaciones,
    };
    console.log('[laboratorioService.crearOrden] payload single:', JSON.stringify(payload, null, 2));
    const response = await api.post('/medico/orden-laboratorio', payload);
    return response.data?.ordenLaboratorio;
  },

  /**
   * Obtener órdenes de una consulta
   * @param {string} consultationId
   */
  async getByConsulta(consultationId) {
    const response = await api.get('/lab-requests', { 
      params: { consultationId } 
    });
    return response.data?.labRequests || [];
  },

  /**
   * Obtener órdenes pendientes
   */
  async getPendientes() {
    const response = await api.get('/lab-requests/pending');
    return response.data?.labRequests || [];
  },

  /**
   * Obtener resultados de laboratorio completados (para el panel del médico)
   */
  async getResultados() {
    const response = await api.get('/medico/lab-results');
    return response.data?.labResults || [];
  },
};

// ============================================================================
// CITAS DE SEGUIMIENTO (agendadas por médico)
// ============================================================================

export const citaSeguimientoService = {
  /**
   * Crear cita de seguimiento desde resultados de lab
   * @param {Object} data - { petId, labRequestId?, motivo, fecha, hora, notas? }
   */
  async crear(data) {
    console.log('[citaSeguimientoService.crear] data:', JSON.stringify(data, null, 2));
    const response = await api.post('/medico/cita-seguimiento', {
      petId: data.petId,
      labRequestId: data.labRequestId,
      motivo: data.motivo,
      fecha: data.fecha,
      hora: data.hora,
      notas: data.notas,
    });
    return response.data?.cita;
  },

  /**
   * Obtener citas agendadas por médicos (para recepción)
   */
  async getCitasMedico() {
    const response = await api.get('/medico/citas-seguimiento');
    return response.data?.appointments || [];
  },
};

// ============================================================================
// HOSPITALIZACIÓN
// ============================================================================

export const hospitalizacionService = {
  /**
   * Hospitalizar paciente
   * @param {Object} data - { consultationId, petId, type?, reason, location?, frecuenciaMonitoreo?, cuidadosEspeciales?, estimacionDias? }
   */
  async hospitalizar(data) {
    console.log('[hospitalizacionService.hospitalizar] data recibida:', JSON.stringify(data, null, 2));
    
    const payload = {
      consultationId: data.consultationId,
      petId: data.petId,
      type: data.type || 'GENERAL',
      reason: data.motivo || data.reason,
      location: data.ubicacion || data.location,
      frecuenciaMonitoreo: data.frecuenciaMonitoreo,
      cuidadosEspeciales: data.cuidadosEspeciales,
      estimacionDias: data.estimacionDias ? parseInt(data.estimacionDias) : undefined,
    };
    
    // Limpiar campos undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
        delete payload[key];
      }
    });
    
    console.log('[hospitalizacionService.hospitalizar] payload:', JSON.stringify(payload, null, 2));
    
    const response = await api.post('/medico/hospitalizacion', payload);
    return response.data?.hospitalizacion;
  },

  /**
   * Registrar monitoreo
   * @param {string} hospitalizacionId
   * @param {Object} data
   */
  async registrarMonitoreo(hospitalizacionId, data) {
    const response = await api.put(`/medico/hospitalizacion/${hospitalizacionId}`, {
      monitoring: {
        temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
        frecuenciaCardiaca: data.frecuenciaCardiaca ? parseInt(data.frecuenciaCardiaca) : undefined,
        frecuenciaRespiratoria: data.frecuenciaRespiratoria ? parseInt(data.frecuenciaRespiratoria) : undefined,
        presionArterial: data.presionArterial,
        nivelConciencia: data.nivelConciencia,
        escalaDolor: data.escalaDolor ? parseInt(data.escalaDolor) : undefined,
        observaciones: data.observaciones,
      }
    });
    return response.data?.hospitalizacion;
  },

  /**
   * Obtener pacientes hospitalizados
   */
  async getHospitalizados() {
    const response = await api.get('/hospitalizations/active');
    return response.data?.hospitalizations || [];
  },

  /**
   * Dar alta de hospitalización
   * @param {string} hospitalizacionId
   * @param {Object} data - { dischargeNotes }
   */
  async darAlta(hospitalizacionId, data) {
    const response = await api.put(`/medico/hospitalizacion/${hospitalizacionId}`, {
      discharge: true,
      dischargeNotes: data.dischargeNotes || data.resumen,
    });
    return response.data?.hospitalizacion;
  },
};

// ============================================================================
// NOTAS MÉDICAS
// ============================================================================

export const notasMedicasService = {
  /**
   * Crear nota médica
   * @param {Object} data - { petId, consultationId?, type, content, isPrivate? }
   */
  async crear(data) {
    const response = await api.post('/medico/nota', {
      petId: data.petId,
      consultationId: data.consultationId,
      type: data.tipo || data.type || 'GENERAL',
      content: data.contenido || data.content,
      isPrivate: data.esPrivada || data.isPrivate || false,
    });
    return response.data?.nota;
  },

  /**
   * Obtener notas de un paciente
   * @param {string} petId
   */
  async getByPaciente(petId) {
    // Las notas vienen como parte del historial del paciente
    const response = await api.get(`/medico/historial/${petId}`);
    return response.data?.historial?.notas || [];
  },
};

// Export all services
export default {
  medico: medicoService,
  consulta: consultaService,
  diagnostico: diagnosticoService,
  signosVitales: signosVitalesService,
  receta: recetaService,
  laboratorio: laboratorioService,
  hospitalizacion: hospitalizacionService,
  notasMedicas: notasMedicasService,
  citaSeguimiento: citaSeguimientoService,
};
