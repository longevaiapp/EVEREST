// src/hooks/useMedico.js
// Hook personalizado para el módulo de Médico
// Maneja estado, llamadas API y lógica de negocio

import { useState, useEffect, useCallback } from 'react';
import { 
  medicoService, 
  consultaService, 
  diagnosticoService,
  signosVitalesService,
  recetaService,
  laboratorioService,
  hospitalizacionService 
} from '../services/medico.service';

export const useMedico = () => {
  // ============================================================================
  // ESTADO
  // ============================================================================
  
  // Datos principales
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [resumen, setResumen] = useState({
    enEspera: 0,
    enConsulta: 0,
    enEstudios: 0,
    citasProgramadas: 0,
  });
  
  // Consulta activa
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================================
  // CARGAR DATOS INICIALES
  // ============================================================================

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useMedico] Cargando datos del dashboard...');
      const data = await medicoService.getCitasHoy();
      console.log('[useMedico] Datos recibidos:', data);
      console.log('[useMedico] Visitas:', data.visits?.length || 0);
      console.log('[useMedico] Citas:', data.appointments?.length || 0);
      console.log('[useMedico] Resumen:', data.resumen);
      setVisits(data.visits || []);
      setAppointments(data.appointments || []);
      setResumen(data.resumen || {
        enEspera: 0,
        enConsulta: 0,
        enEstudios: 0,
        citasProgramadas: 0,
      });
    } catch (err) {
      console.error('[useMedico] Error loading dashboard data:', err);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar - solo una vez
  useEffect(() => {
    loadDashboardData();
    // NOTE: Auto-refresh deshabilitado porque causa problemas de recarga continua
    // Si se necesita refresh manual, usar el botón de recargar en el dashboard
  }, [loadDashboardData]);

  // ============================================================================
  // PACIENTE OPERATIONS
  // ============================================================================

  const getPaciente = useCallback(async (petId) => {
    setLoading(true);
    try {
      const paciente = await medicoService.getPaciente(petId);
      setSelectedPatient(paciente);
      return paciente;
    } catch (err) {
      console.error('Error getting patient:', err);
      setError('Error obteniendo datos del paciente');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistorial = useCallback(async (petId) => {
    try {
      const data = await medicoService.getHistorial(petId);
      return data;
    } catch (err) {
      console.error('Error getting history:', err);
      return null;
    }
  }, []);

  // ============================================================================
  // CONSULTA OPERATIONS
  // ============================================================================

  const iniciarConsulta = useCallback(async (visitId, petId) => {
    setLoading(true);
    setError(null);

    try {
      const consulta = await consultaService.iniciar({ visitId, petId });
      setActiveConsultation(consulta);
      await loadDashboardData(); // Refresh data
      return consulta;
    } catch (err) {
      const message = err.message || 'Error iniciando consulta';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  const actualizarConsulta = useCallback(async (consultaId, data) => {
    setLoading(true);
    setError(null);

    try {
      const consulta = await consultaService.actualizar(consultaId, data);
      setActiveConsultation(consulta);
      return consulta;
    } catch (err) {
      const message = err.message || 'Error actualizando consulta';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const completarConsulta = useCallback(async (consultaId, data) => {
    setLoading(true);
    setError(null);

    try {
      const consulta = await consultaService.completar(consultaId, data);
      setActiveConsultation(null);
      setSelectedPatient(null);
      await loadDashboardData();
      return consulta;
    } catch (err) {
      const message = err.message || 'Error completando consulta';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  // ============================================================================
  // DIAGNÓSTICO OPERATIONS
  // ============================================================================

  const agregarDiagnostico = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const diagnostico = await diagnosticoService.crear(data);
      return diagnostico;
    } catch (err) {
      const message = err.message || 'Error agregando diagnóstico';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // SIGNOS VITALES OPERATIONS
  // ============================================================================

  const registrarSignosVitales = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const signos = await signosVitalesService.registrar(data);
      return signos;
    } catch (err) {
      const message = err.message || 'Error registrando signos vitales';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Alias que acepta consultationId como primer parámetro
  const guardarSignosVitales = useCallback(async (consultationId, data) => {
    return registrarSignosVitales({ consultationId, ...data });
  }, [registrarSignosVitales]);

  // ============================================================================
  // RECETA OPERATIONS
  // ============================================================================

  const crearReceta = useCallback(async (consultationIdOrData, data = null) => {
    console.log('[useMedico.crearReceta] consultationIdOrData:', consultationIdOrData);
    console.log('[useMedico.crearReceta] data:', data);
    
    setLoading(true);
    setError(null);

    try {
      // Soporte para ambos formatos: crearReceta(data) o crearReceta(consultationId, data)
      const payload = data ? { consultationId: consultationIdOrData, ...data } : consultationIdOrData;
      console.log('[useMedico.crearReceta] payload final:', payload);
      const receta = await recetaService.crear(payload);
      return receta;
    } catch (err) {
      const message = err.message || 'Error creando receta';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // LABORATORIO OPERATIONS
  // ============================================================================

  const crearOrdenLab = useCallback(async (consultationIdOrData, data = null) => {
    console.log('[useMedico.crearOrdenLab] consultationIdOrData:', consultationIdOrData);
    console.log('[useMedico.crearOrdenLab] data:', data);
    
    setLoading(true);
    setError(null);

    try {
      // Soporte para ambos formatos: crearOrdenLab(data) o crearOrdenLab(consultationId, data)
      const payload = data ? { consultationId: consultationIdOrData, ...data } : consultationIdOrData;
      console.log('[useMedico.crearOrdenLab] payload final:', payload);
      const orden = await laboratorioService.crearOrden(payload);
      await loadDashboardData(); // Refresh to update patient status
      return orden;
    } catch (err) {
      const message = err.message || 'Error creando orden de laboratorio';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  // ============================================================================
  // HOSPITALIZACIÓN OPERATIONS
  // ============================================================================

  const hospitalizarPaciente = useCallback(async (consultationIdOrData, data = null) => {
    console.log('[useMedico.hospitalizarPaciente] consultationIdOrData:', consultationIdOrData);
    console.log('[useMedico.hospitalizarPaciente] data:', data);
    
    setLoading(true);
    setError(null);

    try {
      // Soporte para ambos formatos: hospitalizarPaciente(data) o hospitalizarPaciente(consultationId, data)
      const payload = data ? { consultationId: consultationIdOrData, ...data } : consultationIdOrData;
      console.log('[useMedico.hospitalizarPaciente] payload final:', payload);
      const hospitalizacion = await hospitalizacionService.hospitalizar(payload);
      setActiveConsultation(null);
      setSelectedPatient(null);
      await loadDashboardData();
      return hospitalizacion;
    } catch (err) {
      const message = err.message || 'Error hospitalizando paciente';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  const registrarMonitoreo = useCallback(async (hospitalizacionId, data) => {
    setLoading(true);
    setError(null);

    try {
      const monitoreo = await hospitalizacionService.registrarMonitoreo(hospitalizacionId, data);
      return monitoreo;
    } catch (err) {
      const message = err.message || 'Error registrando monitoreo';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  // Pacientes en espera (desde visits)
  const waitingPatients = visits.filter(v => 
    v.status === 'EN_ESPERA' || v.status === 'RECIEN_LLEGADO'
  ).map(v => ({
    id: v.pet?.id,
    visitId: v.id,
    consultationId: v.consultation?.id,
    // Datos del pet
    nombre: v.pet?.nombre || 'Sin nombre',
    especie: v.pet?.especie,
    raza: v.pet?.raza,
    edad: v.pet?.edad,
    sexo: v.pet?.sexo,
    color: v.pet?.color,
    peso: v.peso || v.pet?.peso, // Peso de la visita o del pet
    numeroFicha: v.pet?.numeroFicha,
    fotoUrl: v.pet?.fotoUrl,
    esterilizado: v.pet?.esterilizado,
    microchip: v.pet?.microchip,
    // Datos del propietario
    propietario: v.pet?.owner?.nombre,
    telefono: v.pet?.owner?.telefono,
    email: v.pet?.owner?.email,
    direccion: v.pet?.owner?.direccion,
    // Datos de la visita
    motivo: v.motivo,
    prioridad: v.prioridad,
    temperatura: v.temperatura,
    antecedentes: v.antecedentes,
    tipoVisita: v.tipoVisita,
    estado: v.status,
    horaRegistro: v.arrivalTime ? new Date(v.arrivalTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--',
  }));

  // Pacientes en consulta
  const patientsInConsultation = visits.filter(v => 
    v.status === 'EN_CONSULTA'
  ).map(v => ({
    id: v.pet?.id,
    visitId: v.id,
    consultationId: v.consultation?.id,
    // Datos del pet
    nombre: v.pet?.nombre || 'Sin nombre',
    especie: v.pet?.especie,
    raza: v.pet?.raza,
    edad: v.pet?.edad,
    sexo: v.pet?.sexo,
    color: v.pet?.color,
    peso: v.peso || v.pet?.peso,
    numeroFicha: v.pet?.numeroFicha,
    fotoUrl: v.pet?.fotoUrl,
    esterilizado: v.pet?.esterilizado,
    // Datos del propietario
    propietario: v.pet?.owner?.nombre,
    telefono: v.pet?.owner?.telefono,
    // Datos de la visita
    motivo: v.motivo,
    prioridad: v.prioridad,
    temperatura: v.temperatura,
    antecedentes: v.antecedentes,
    estado: v.status,
    horaConsulta: v.consultation?.startTime 
      ? new Date(v.consultation.startTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) 
      : '--:--',
  }));

  // Pacientes en estudios
  const patientsInStudies = visits.filter(v => 
    v.status === 'EN_ESTUDIOS'
  ).map(v => ({
    id: v.pet?.id,
    visitId: v.id,
    nombre: v.pet?.nombre || 'Sin nombre',
    especie: v.pet?.especie,
    raza: v.pet?.raza,
    edad: v.pet?.edad,
    sexo: v.pet?.sexo,
    peso: v.peso || v.pet?.peso,
    numeroFicha: v.pet?.numeroFicha,
    fotoUrl: v.pet?.fotoUrl,
    propietario: v.pet?.owner?.nombre,
    telefono: v.pet?.owner?.telefono,
    motivo: v.motivo,
    estado: v.status,
  }));

  // Citas de hoy - Incluyendo objeto paciente completo para el dashboard
  const todayAppointments = appointments.map(a => ({
    id: a.id,
    petId: a.pet?.id,
    pacienteNombre: a.pet?.nombre,
    propietario: a.pet?.owner?.nombre,
    hora: a.hora,
    tipo: a.tipo,
    motivo: a.motivo,
    estado: a.status,
    confirmada: a.confirmada,
    // Objeto paciente completo para el MedicoDashboard
    paciente: a.pet ? {
      id: a.pet.id,
      nombre: a.pet.nombre,
      especie: a.pet.especie,
      raza: a.pet.raza,
      fotoUrl: a.pet.fotoUrl, // Foto del paciente
      propietario: a.pet.owner,
    } : null,
  }));

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    loading,
    error,
    visits,
    appointments,
    resumen,
    activeConsultation,
    selectedPatient,
    
    // Derived data
    waitingPatients,
    patientsInConsultation,
    patientsInStudies,
    todayAppointments,
    
    // Actions
    loadDashboardData,
    getPaciente,
    getHistorial,
    setSelectedPatient,
    setActiveConsultation,
    
    // Consulta
    iniciarConsulta,
    actualizarConsulta,
    completarConsulta,
    
    // Medical operations
    agregarDiagnostico,
    registrarSignosVitales,
    guardarSignosVitales,
    crearReceta,
    crearOrdenLab,
    hospitalizarPaciente,
    registrarMonitoreo,
    
    // Clear error
    clearError: () => setError(null),
  };
};

export default useMedico;
