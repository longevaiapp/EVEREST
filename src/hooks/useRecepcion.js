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
      const visitsData = await visitService.getToday();
      setVisits(visitsData || []);
    } catch (err) {
      console.error('Error loading visits:', err);
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

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadTodayVisits(),
        loadTodayAppointments(),
      ]);
    } catch (err) {
      setError('Error cargando datos iniciales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadTodayVisits, loadTodayAppointments]);

  // Cargar datos al montar
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh automático cada 30 segundos para visitas y citas
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodayVisits();
      loadTodayAppointments();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadTodayVisits, loadTodayAppointments]);

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
      const newOwner = await ownerService.create(data);
      setFoundOwner(newOwner);
      return newOwner;
    } catch (err) {
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
      const newPet = await petService.create(data);
      setOwnerPets(prev => [...prev, newPet]);
      return newPet;
    } catch (err) {
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
      const visit = await visitService.create(petId);
      setVisits(prev => [visit, ...prev]);
      await loadTodayVisits(); // Refresh
      return visit;
    } catch (err) {
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
  };
};

export default useRecepcion;
