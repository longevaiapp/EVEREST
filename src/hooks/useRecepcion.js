// src/hooks/useRecepcion.js
// Hook personalizado para el módulo de Recepción
// Maneja estado, llamadas API y lógica de negocio

import { useState, useEffect, useCallback } from 'react';
import { ownerService, petService, visitService, appointmentService } from '../services/recepcion.service';

export const useRecepcion = () => {
  // ============================================================================
  // ESTADO
  // ============================================================================
  
  // Datos principales
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [visits, setVisits] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [preventiveCalendar, setPreventiveCalendar] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cliente buscado
  const [foundOwner, setFoundOwner] = useState(null);
  const [ownerPets, setOwnerPets] = useState([]);

  // ============================================================================
  // CARGAR DATOS INICIALES
  // ============================================================================

  const loadTodayVisits = useCallback(async () => {
    try {
      console.log('[useRecepcion] Cargando visitas del día...');
      const visitsData = await visitService.getToday();
      console.log('[useRecepcion] Visitas recibidas:', visitsData?.length || 0, visitsData);
      setVisits(visitsData || []);
    } catch (err) {
      console.error('[useRecepcion] Error loading visits:', err);
      setVisits([]);
    }
  }, []);

  const loadTodayAppointments = useCallback(async () => {
    try {
      const appointmentsData = await appointmentService.getToday();
      setAppointments(appointmentsData || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setAppointments([]);
    }
  }, []);

  const loadPreventiveCalendar = useCallback(async () => {
    try {
      const preventiveData = await petService.getPreventiveCalendar();
      setPreventiveCalendar(preventiveData || []);
    } catch (err) {
      console.error('Error loading preventive calendar:', err);
      setPreventiveCalendar([]);
    }
  }, []);

  const loadAllPets = useCallback(async () => {
    try {
      console.log('[useRecepcion] Cargando todas las mascotas...');
      const petsData = await petService.getAll();
      console.log('[useRecepcion] Mascotas recibidas:', petsData?.pets?.length || 0);
      setPets(petsData?.pets || []);
    } catch (err) {
      console.error('Error loading all pets:', err);
      setPets([]);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadTodayVisits(),
        loadTodayAppointments(),
        loadPreventiveCalendar(),
        loadAllPets(),
      ]);
    } catch (err) {
      setError('Error cargando datos iniciales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadTodayVisits, loadTodayAppointments, loadPreventiveCalendar, loadAllPets]);

  // Cargar datos al montar
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh automático cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodayVisits();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadTodayVisits]);

  // ============================================================================
  // OWNER (PROPIETARIO) OPERATIONS
  // ============================================================================

  const searchOwnerByPhone = useCallback(async (phone) => {
    if (!phone || phone.length < 8) {
      setFoundOwner(null);
      setOwnerPets([]);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const owner = await ownerService.searchByPhone(phone);
      
      if (owner) {
        setFoundOwner(owner);
        // Cargar mascotas del propietario
        const pets = await petService.getByOwner(owner.id);
        setOwnerPets(pets || []);
        return { owner, pets };
      } else {
        setFoundOwner(null);
        setOwnerPets([]);
        return null;
      }
    } catch (err) {
      console.error('Error searching owner:', err);
      setError('Error buscando cliente');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOwner = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useRecepcion] createOwner - data:', data);
      const newOwner = await ownerService.create(data);
      console.log('[useRecepcion] createOwner - resultado:', newOwner);
      setFoundOwner(newOwner);
      return newOwner;
    } catch (err) {
      console.error('[useRecepcion] createOwner - error:', err);
      const message = err.message || 'Error creando propietario';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOwner = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);

    try {
      const updatedOwner = await ownerService.update(id, data);
      if (foundOwner?.id === id) {
        setFoundOwner(updatedOwner);
      }
      return updatedOwner;
    } catch (err) {
      const message = err.message || 'Error actualizando propietario';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [foundOwner]);

  // ============================================================================
  // PET (MASCOTA) OPERATIONS
  // ============================================================================

  const createPet = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useRecepcion] createPet - data:', data);
      const newPet = await petService.create(data);
      console.log('[useRecepcion] createPet - resultado:', newPet);
      setOwnerPets(prev => [...prev, newPet]);
      return newPet;
    } catch (err) {
      console.error('[useRecepcion] createPet - error:', err);
      const message = err.message || 'Error registrando mascota';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePet = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);

    try {
      const updatedPet = await petService.update(id, data);
      setOwnerPets(prev => prev.map(p => p.id === id ? updatedPet : p));
      return updatedPet;
    } catch (err) {
      const message = err.message || 'Error actualizando mascota';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar mascotas por nombre, número de ficha o propietario
  const searchPets = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    try {
      console.log('[useRecepcion] searchPets - buscando:', searchTerm);
      const result = await petService.getAll({ search: searchTerm, limit: 20 });
      console.log('[useRecepcion] searchPets - resultado completo:', result);
      // El resultado puede ser { pets, pagination } o directamente un array
      const pets = result?.pets || result || [];
      console.log('[useRecepcion] searchPets - pets extraídos:', pets.length);
      return pets;
    } catch (err) {
      console.error('[useRecepcion] searchPets - error:', err);
      return [];
    }
  }, []);

  const getPetById = useCallback(async (id) => {
    try {
      return await petService.getById(id);
    } catch (err) {
      console.error('Error getting pet:', err);
      return null;
    }
  }, []);

  // ============================================================================
  // VISIT OPERATIONS
  // ============================================================================

  const checkInPet = useCallback(async (petId) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useRecepcion] checkInPet - petId:', petId);
      const visit = await visitService.create(petId);
      console.log('[useRecepcion] checkInPet - Visita creada:', visit);
      setVisits(prev => [visit, ...prev]);
      console.log('[useRecepcion] checkInPet - Refrescando visitas...');
      await loadTodayVisits(); // Refresh
      console.log('[useRecepcion] checkInPet - Completado');
      return visit;
    } catch (err) {
      console.error('[useRecepcion] checkInPet - Error:', err);
      const message = err.message || 'Error haciendo check-in';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [loadTodayVisits]);

  const completeTriage = useCallback(async (visitId, triageData) => {
    setLoading(true);
    setError(null);

    try {
      const visit = await visitService.completeTriage(visitId, triageData);
      setVisits(prev => prev.map(v => v.id === visitId ? visit : v));
      return visit;
    } catch (err) {
      const message = err.message || 'Error completando triage';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignDoctorToVisit = useCallback(async (visitId, doctorId) => {
    setLoading(true);
    setError(null);

    try {
      const visit = await visitService.assignDoctor(visitId, doctorId);
      setVisits(prev => prev.map(v => v.id === visitId ? visit : v));
      return visit;
    } catch (err) {
      const message = err.message || 'Error asignando doctor';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const dischargeVisit = useCallback(async (visitId, data) => {
    setLoading(true);
    setError(null);

    try {
      const visit = await visitService.discharge(visitId, data);
      // Remove from active visits (now has ALTA status)
      setVisits(prev => prev.filter(v => v.id !== visitId));
      return visit;
    } catch (err) {
      const message = err.message || 'Error procesando alta';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // APPOINTMENT OPERATIONS
  // ============================================================================

  const createAppointment = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const appointment = await appointmentService.create(data);
      setAppointments(prev => [...prev, appointment]);
      return appointment;
    } catch (err) {
      const message = err.message || 'Error creando cita';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmAppointment = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const appointment = await appointmentService.confirm(id);
      setAppointments(prev => prev.map(a => a.id === id ? appointment : a));
      return appointment;
    } catch (err) {
      const message = err.message || 'Error confirmando cita';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelAppointment = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const appointment = await appointmentService.cancel(id);
      setAppointments(prev => prev.map(a => a.id === id ? appointment : a));
      return appointment;
    } catch (err) {
      const message = err.message || 'Error cancelando cita';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Pacientes recién llegados (sin triage)
  const newArrivals = visits.filter(v => v.status === 'RECIEN_LLEGADO');
  
  // Pacientes en espera (con triage, esperando doctor)
  const waitingPatients = visits.filter(v => v.status === 'EN_ESPERA');
  
  // Todas las visitas activas
  const activeVisits = visits.filter(v => 
    !['ALTA', 'CANCELADO'].includes(v.status)
  );

  // Citas confirmadas de hoy
  const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMADA');
  
  // Citas pendientes de confirmación
  const pendingAppointments = appointments.filter(a => a.status === 'PENDIENTE');

  // ============================================================================
  // CLEAR STATE
  // ============================================================================

  const clearFoundOwner = useCallback(() => {
    setFoundOwner(null);
    setOwnerPets([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    loading,
    error,
    visits,
    appointments,
    preventiveCalendar,
    foundOwner,
    ownerPets,
    
    // Computed
    newArrivals,
    waitingPatients,
    activeVisits,
    confirmedAppointments,
    pendingAppointments,
    
    // Owner operations
    searchOwnerByPhone,
    createOwner,
    updateOwner,
    
    // Pet operations
    createPet,
    updatePet,
    getPetById,
    searchPets,
    
    // Visit operations
    checkInPet,
    completeTriage,
    assignDoctorToVisit,
    dischargeVisit,
    
    // Appointment operations
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    
    // Utils
    clearFoundOwner,
    clearError,
    loadInitialData,
    loadTodayVisits,
    loadPreventiveCalendar,
    loadAllPets,
    
    // All pets
    allPets: pets,
  };
};

export default useRecepcion;
