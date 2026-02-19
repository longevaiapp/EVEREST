// src/services/recepcion.service.js
// Servicio para todas las operaciones del módulo Recepción

import api from './api';

// ============================================================================
// OWNERS (PROPIETARIOS)
// ============================================================================

export const ownerService = {
  /**
   * Obtener lista de propietarios con paginación
   * @param {Object} params - { search, page, limit }
   */
  async getAll(params = {}) {
    const response = await api.get('/owners', { params });
    return response.data;
  },

  /**
   * Buscar propietario por teléfono
   * @param {string} phone
   */
  async searchByPhone(phone) {
    const response = await api.get('/owners', { 
      params: { search: phone } 
    });
    return response.data?.owners?.[0] || null;
  },

  /**
   * Obtener propietario por ID con sus mascotas
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/owners/${id}`);
    return response.data?.owner;
  },

  /**
   * Crear nuevo propietario
   * @param {Object} data - { nombre, telefono, email?, direccion?, ciudad?, codigoPostal? }
   */
  async create(data) {
    const response = await api.post('/owners', data);
    return response.data?.owner;
  },

  /**
   * Actualizar propietario
   * @param {string} id
   * @param {Object} data
   */
  async update(id, data) {
    const response = await api.put(`/owners/${id}`, data);
    return response.data?.owner;
  },

  /**
   * Eliminar propietario
   * @param {string} id
   */
  async delete(id) {
    await api.delete(`/owners/${id}`);
  },
};

// ============================================================================
// PETS (MASCOTAS/PACIENTES)
// ============================================================================

export const petService = {
  /**
   * Obtener lista de mascotas con filtros
   * @param {Object} params - { search, estado, especie, page, limit }
   */
  async getAll(params = {}) {
    const response = await api.get('/pets', { params });
    console.log('[petService] getAll - response:', response);
    // El interceptor ya extrae response.data, que es { status, data: { pets, pagination } }
    return response.data;
  },

  /**
   * Obtener mascotas de un propietario
   * @param {string} ownerId
   */
  async getByOwner(ownerId) {
    const response = await api.get(`/pets/by-owner/${ownerId}`);
    return response.data?.pets || [];
  },

  /**
   * Obtener mascota por ID con historial completo
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/pets/${id}`);
    return response.data?.pet;
  },

  /**
   * Crear nueva mascota
   * @param {Object} data - Datos de la mascota
   */
  async create(data) {
    // Mapear datos del frontend al formato del backend
    const mappedData = {
      ownerId: data.ownerId,
      nombre: data.nombre,
      especie: mapEspecie(data.especie),
      raza: data.raza || null,
      sexo: data.sexo?.toUpperCase() === 'MACHO' ? 'MACHO' : 'HEMBRA',
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento).toISOString() : null,
      peso: data.peso ? parseFloat(data.peso) : null,
      color: data.color || null,
      condicionCorporal: mapCondicionCorporal(data.condicionCorporal),
      fotoUrl: data.fotoUrl || null, // Base64 encoded photo
      // Medical history
      snapTest: data.snapTest || null,
      analisisClinicos: data.analisisClinicos || null,
      antecedentes: data.antecedentes || null,
      // Vaccines
      desparasitacionExterna: data.desparasitacionExterna || false,
      ultimaDesparasitacion: data.ultimaDesparasitacion ? new Date(data.ultimaDesparasitacion).toISOString() : null,
      vacunasTexto: data.vacunas || null,
      vacunasActualizadas: data.vacunasActualizadas || false,
      ultimaVacuna: data.ultimaVacuna ? new Date(data.ultimaVacuna).toISOString() : null,
      // Surgeries
      esterilizado: data.esterilizado === 'Sí' || data.esterilizado === true,
      otrasCirugias: data.otrasCirugias === 'Sí' || data.otrasCirugias === true,
      detalleCirugias: data.detalleCirugias || null,
      // Reproductive
      ultimoCelo: data.ultimoCelo ? new Date(data.ultimoCelo).toISOString() : null,
      cantidadPartos: data.cantidadPartos ? parseInt(data.cantidadPartos) : null,
      ultimoParto: data.ultimoParto ? new Date(data.ultimoParto).toISOString() : null,
      // Feeding
      alimento: data.alimento || null,
      porcionesPorDia: data.porcionesPorDia || null,
      otrosAlimentos: data.otrosAlimentos || null,
      frecuenciaOtrosAlimentos: data.frecuenciaOtrosAlimentos || null,
      // Allergies
      alergias: data.alergias || null,
      enfermedadesCronicas: data.enfermedadesCronicas || null,
      // Lifestyle
      conviveOtrasMascotas: data.conviveOtrasMascotas === 'Sí' || data.conviveOtrasMascotas === true,
      cualesMascotas: data.cualesMascotas || null,
      actividadFisica: data.actividadFisica === 'Sí' || data.actividadFisica === true,
      frecuenciaActividad: data.frecuenciaActividad || null,
      saleViaPublica: data.saleViaPublica === 'Sí' || data.saleViaPublica === true,
      frecuenciaSalida: data.frecuenciaSalida || null,
      otrosDatos: data.otrosDatos || null,
    };

    console.log('[petService] CREATE - fotoUrl length:', mappedData.fotoUrl?.length || 0);
    console.log('[petService] CREATE - fotoUrl first 100 chars:', mappedData.fotoUrl?.substring(0, 100));
    
    const response = await api.post('/pets', mappedData);
    return response.data?.pet;
  },

  /**
   * Actualizar mascota
   * @param {string} id
   * @param {Object} data
   */
  async update(id, data) {
    const response = await api.put(`/pets/${id}`, data);
    return response.data?.pet;
  },

  /**
   * Actualizar estado de mascota
   * @param {string} id
   * @param {string} estado
   */
  async updateStatus(id, estado) {
    const response = await api.patch(`/pets/${id}/status`, { estado });
    return response.data?.pet;
  },

  /**
   * Obtener calendario de medicina preventiva
   * Mascotas que necesitan vacunas o desparasitación
   */
  async getPreventiveCalendar() {
    const response = await api.get('/pets/preventive-calendar');
    return response.data?.preventiveCalendar || [];
  },

  /**
   * Obtener historial médico completo de una mascota
   * Incluye consultas, cirugías, hospitalizaciones, vacunas y notas
   * @param {string} petId
   */
  async getHistorial(petId) {
    const response = await api.get(`/pets/historial/${petId}`);
    return response.data;
  },
};

// ============================================================================
// VISITS (VISITAS)
// ============================================================================

export const visitService = {
  /**
   * Obtener visitas de hoy (cola de espera)
   * Transforma los datos para aplanar pet y owner en la raíz
   */
  async getToday() {
    console.log('[visitService] getToday - Solicitando visitas del día...');
    const response = await api.get('/visits/today');
    console.log('[visitService] getToday - Respuesta completa:', response);
    console.log('[visitService] getToday - response.data:', response.data);
    const visits = response.data?.visits || [];
    console.log('[visitService] getToday - Visitas extraídas:', visits.length, visits);
    
    // Transformar para aplanar datos del pet y owner en la raíz
    const transformedVisits = visits.map(v => ({
      ...v,
      // Datos del pet en la raíz para fácil acceso
      petId: v.pet?.id,
      nombre: v.pet?.nombre || 'Sin nombre',
      especie: v.pet?.especie,
      raza: v.pet?.raza,
      sexo: v.pet?.sexo,
      edad: v.pet?.edad,
      numeroFicha: v.pet?.numeroFicha,
      fotoUrl: v.pet?.fotoUrl, // Foto del paciente
      // Datos del owner en la raíz
      propietario: v.pet?.owner?.nombre,
      telefono: v.pet?.owner?.telefono,
      email: v.pet?.owner?.email,
    }));
    
    return transformedVisits;
  },

  /**
   * Crear nueva visita (check-in)
   * @param {string|number} petId
   */
  async create(petId) {
    console.log('[visitService] create - petId:', petId);
    const response = await api.post('/visits', { petId: String(petId) });
    console.log('[visitService] create - Respuesta completa:', response);
    console.log('[visitService] create - response.data:', response.data);
    const visit = response.data?.visit;
    console.log('[visitService] create - Visita extraída:', visit);
    return visit;
  },

  /**
   * Completar triage
   * @param {string} visitId
   * @param {Object} data - { tipoVisita, motivo, prioridad, peso, temperatura?, antecedentes?, primeraVisita? }
   */
  async completeTriage(visitId, data) {
    const peso = parseFloat(data.peso);
    if (isNaN(peso) || peso <= 0) {
      throw new Error('El peso es requerido y debe ser un número positivo');
    }
    
    const mappedData = {
      tipoVisita: mapTipoVisita(data.tipoVisita),
      motivo: data.motivo || 'Consulta general',
      prioridad: data.prioridad?.toUpperCase() || 'MEDIA',
      peso: peso,
      temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
      antecedentes: data.antecedentes || undefined,
      primeraVisita: data.primeraVisita || false,
    };
    
    const response = await api.put(`/visits/${visitId}/triage`, mappedData);
    return response.data?.visit;
  },

  /**
   * Asignar visita a doctor
   * @param {string} visitId
   * @param {string} doctorId
   */
  async assignDoctor(visitId, doctorId) {
    const response = await api.put(`/visits/${visitId}/assign`, { doctorId });
    return response.data.visit;
  },

  /**
   * Obtener visita por ID
   * @param {string} id
   */
  async getById(id) {
    const response = await api.get(`/visits/${id}`);
    return response.data.visit;
  },

  /**
   * Procesar alta de visita
   * @param {string} visitId
   * @param {Object} data - { dischargeNotes?, total, metodoPago }
   */
  async discharge(visitId, data) {
    const mappedData = {
      dischargeNotes: data.dischargeNotes || undefined,
      total: parseFloat(data.total),
      metodoPago: mapMetodoPago(data.metodoPago),
    };
    
    const response = await api.put(`/visits/${visitId}/discharge`, mappedData);
    return response.data?.visit;
  },

  /**
   * Obtener desglose de costos de una visita (medicamentos dispensados)
   * @param {string} visitId
   */
  async getCosts(visitId) {
    const response = await api.get(`/visits/${visitId}/costs`);
    return response.data;
  },
};

// ============================================================================
// APPOINTMENTS (CITAS)
// ============================================================================

export const appointmentService = {
  /**
   * Obtener citas con filtros
   * @param {Object} params - { date, status, page, limit }
   */
  async getAll(params = {}) {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  /**
   * Crear nueva cita
   * @param {Object} data - { petId, fecha, hora, tipo, motivo?, notas? }
   * También acepta formato alternativo: { petId, scheduledDate, appointmentType, reason }
   */
  async create(data) {
    // Mapear campos si vienen en formato alternativo
    let mappedData;
    
    if (data.scheduledDate) {
      // Formato alternativo del frontend
      const date = new Date(data.scheduledDate);
      mappedData = {
        petId: String(data.petId),
        fecha: date.toISOString(),
        hora: date.toTimeString().slice(0, 5), // HH:MM
        tipo: mapTipoCita(data.appointmentType || data.tipo),
        motivo: data.reason || data.motivo || 'Consulta programada',
        notas: data.notas || undefined,
      };
    } else {
      // Formato directo
      mappedData = {
        petId: String(data.petId),
        fecha: new Date(data.fecha).toISOString(),
        hora: data.hora,
        tipo: mapTipoCita(data.tipo),
        motivo: data.motivo || 'Consulta programada',
        notas: data.notas || undefined,
      };
    }
    
    const response = await api.post('/appointments', mappedData);
    return response.data?.appointment;
  },

  /**
   * Actualizar cita
   * @param {string} id
   * @param {Object} data
   */
  async update(id, data) {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data?.appointment;
  },

  /**
   * Confirmar cita
   * @param {string} id
   */
  async confirm(id) {
    const response = await api.put(`/appointments/${id}/confirm`);
    return response.data?.appointment;
  },

  /**
   * Cancelar cita
   * @param {string} id
   */
  async cancel(id) {
    const response = await api.put(`/appointments/${id}/cancel`);
    return response.data?.appointment;
  },

  /**
   * Obtener citas de hoy
   */
  async getToday() {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/appointments', { 
      params: { fecha: today } 
    });
    return response.data?.appointments || [];
  },
};

// ============================================================================
// HELPERS - Mapeo de datos
// ============================================================================

function mapEspecie(especie) {
  const map = {
    'Perro': 'PERRO',
    'Gato': 'GATO',
    'Ave': 'AVE',
    'Roedor': 'ROEDOR',
    'Reptil': 'REPTIL',
    'Otro': 'OTRO',
  };
  return map[especie] || 'OTRO';
}

function mapCondicionCorporal(condicion) {
  const map = {
    '1': 'MUY_DELGADO',
    '2': 'DELGADO',
    '3': 'IDEAL',
    '4': 'SOBREPESO',
    '5': 'OBESO',
  };
  return map[condicion] || 'IDEAL';
}

function mapTipoVisita(tipo) {
  const map = {
    'consulta_general': 'CONSULTA_GENERAL',
    'seguimiento': 'SEGUIMIENTO',
    'medicina_preventiva': 'MEDICINA_PREVENTIVA',
    'emergencia': 'EMERGENCIA',
  };
  return map[tipo] || 'CONSULTA_GENERAL';
}

function mapTipoCita(tipo) {
  // Si ya viene en formato correcto (mayúsculas), retornarlo
  const validTypes = ['CONSULTA_GENERAL', 'SEGUIMIENTO', 'VACUNACION', 'CIRUGIA', 'EMERGENCIA'];
  if (validTypes.includes(tipo)) {
    return tipo;
  }
  
  // Mapeo de formatos alternativos
  const map = {
    'consulta_general': 'CONSULTA_GENERAL',
    'seguimiento': 'SEGUIMIENTO',
    'cirugia_programada': 'CIRUGIA',
    'cirugia': 'CIRUGIA',
    'vacunacion': 'VACUNACION',
    'emergencia': 'EMERGENCIA',
  };
  return map[tipo?.toLowerCase()] || 'CONSULTA_GENERAL';
}

function mapMetodoPago(metodo) {
  const map = {
    'efectivo': 'EFECTIVO',
    'tarjeta': 'TARJETA',
    'transferencia': 'TRANSFERENCIA',
  };
  return map[metodo?.toLowerCase()] || 'EFECTIVO';
}

// Export all services
export default {
  owner: ownerService,
  pet: petService,
  visit: visitService,
  appointment: appointmentService,
};
