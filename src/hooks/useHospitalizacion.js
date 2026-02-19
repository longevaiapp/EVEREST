// src/hooks/useHospitalizacion.js
// Hook personalizado para el módulo de hospitalización

import { useState, useEffect, useCallback } from 'react';
import hospitalizacionService from '../services/hospitalizacion.service';

const useHospitalizacion = () => {
  // ==================== STATE ====================
  const [hospitalizaciones, setHospitalizaciones] = useState([]);
  const [stats, setStats] = useState({ general: 0, uci: 0, neonatos: 0, infecciosos: 0, total: 0 });
  const [selectedHospitalization, setSelectedHospitalization] = useState(null);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [therapyPlan, setTherapyPlan] = useState([]);
  const [pendingMedications, setPendingMedications] = useState([]);
  const [neonates, setNeonates] = useState([]);
  const [costs, setCosts] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==================== FETCH HOSPITALIZACIONES ====================
  const fetchHospitalizaciones = useCallback(async (type = null, status = null) => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      
      const data = await hospitalizacionService.getHospitalizaciones(filters);
      setHospitalizaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching hospitalizaciones:', err);
      setError(err.response?.data?.error || 'Error al cargar hospitalizaciones');
      setHospitalizaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH STATS ====================
  const fetchStats = useCallback(async () => {
    try {
      const data = await hospitalizacionService.getStats();
      setStats(data || { general: 0, uci: 0, neonatos: 0, infecciosos: 0, total: 0 });
    } catch (err) {
      console.error('Error fetching stats:', err);
      // No setear error aquí, stats son secundarios
    }
  }, []);

  // ==================== LOAD ON MOUNT ====================
  useEffect(() => {
    fetchHospitalizaciones();
    fetchStats();
  }, [fetchHospitalizaciones, fetchStats]);

  // ==================== SELECT HOSPITALIZATION ====================
  const selectHospitalization = useCallback(async (hospitalization) => {
    if (!hospitalization) {
      setSelectedHospitalization(null);
      setVitalSigns([]);
      setTherapyPlan([]);
      setPendingMedications([]);
      setNeonates([]);
      setCosts(null);
      return;
    }

    setLoading(true);
    try {
      // First, get full hospitalization details with consultation data
      const fullDetails = await hospitalizacionService.getHospitalizacion(hospitalization.id);
      setSelectedHospitalization(fullDetails);
      
      // Set monitorings and therapy from the full details if available
      if (fullDetails.monitorings) {
        setVitalSigns(fullDetails.monitorings);
      }
      if (fullDetails.therapyPlan) {
        setTherapyPlan(fullDetails.therapyPlan);
      }
      
      // Load additional data (pending medications, costs)
      const [meds, costsData] = await Promise.all([
        hospitalizacionService.getPendingMedications(hospitalization.id),
        hospitalizacionService.getCosts(hospitalization.id),
      ]);
      
      setPendingMedications(Array.isArray(meds) ? meds : []);
      setCosts(costsData);
      
      // Si es neonatos, cargar neonatos
      if (fullDetails.type === 'NEONATOS') {
        const neonatesData = await hospitalizacionService.getNeonates(hospitalization.id);
        setNeonates(Array.isArray(neonatesData) ? neonatesData : []);
      } else {
        setNeonates(fullDetails.neonates || []);
      }
    } catch (err) {
      console.error('Error loading hospitalization details:', err);
      setError(err.response?.data?.error || 'Error al cargar detalles');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ADD VITAL SIGNS ====================
  const addVitalSigns = useCallback(async (hospitalizationId, data) => {
    setLoading(true);
    setError(null);
    try {
      const newRecord = await hospitalizacionService.addVitalSigns(hospitalizationId, data);
      setVitalSigns(prev => [newRecord, ...prev]);
      
      // Also update the hospitalizaciones list to refresh monitoring status/alerts
      setHospitalizaciones(prev => prev.map(h => {
        if (h.id === hospitalizationId) {
          return {
            ...h,
            monitorings: [newRecord, ...(h.monitorings || [])],
            // Also update latestMonitoring for getMonitoringStatus function
            latestMonitoring: {
              temperatura: newRecord.temperatura,
              frecuenciaCardiaca: newRecord.frecuenciaCardiaca,
              frecuenciaRespiratoria: newRecord.frecuenciaRespiratoria,
              recordedAt: newRecord.recordedAt
            }
          };
        }
        return h;
      }));
      
      // Update selectedHospitalization if it's the same one
      setSelectedHospitalization(prev => {
        if (prev?.id === hospitalizationId) {
          return {
            ...prev,
            monitorings: [newRecord, ...(prev.monitorings || [])],
            latestMonitoring: {
              temperatura: newRecord.temperatura,
              frecuenciaCardiaca: newRecord.frecuenciaCardiaca,
              frecuenciaRespiratoria: newRecord.frecuenciaRespiratoria,
              recordedAt: newRecord.recordedAt
            }
          };
        }
        return prev;
      });
      
      return true;
    } catch (err) {
      console.error('Error adding vital signs:', err);
      setError(err.response?.data?.error || 'Error al registrar signos vitales');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ADD THERAPY ITEM ====================
  const addTherapyItem = useCallback(async (hospitalizationId, data) => {
    setLoading(true);
    setError(null);
    try {
      const newItem = await hospitalizacionService.addTherapyItem(hospitalizationId, data);
      setTherapyPlan(prev => [...prev, newItem]);
      return true;
    } catch (err) {
      console.error('Error adding therapy item:', err);
      setError(err.response?.data?.error || 'Error al agregar medicamento');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== DEACTIVATE THERAPY ITEM ====================
  const deactivateTherapyItem = useCallback(async (hospitalizationId, itemId) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.deactivateTherapyItem(hospitalizationId, itemId);
      setTherapyPlan(prev => 
        prev.map(item => item.id === itemId ? { ...item, activo: false } : item)
      );
      return true;
    } catch (err) {
      console.error('Error deactivating therapy item:', err);
      setError(err.response?.data?.error || 'Error al suspender medicamento');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ACTIVATE THERAPY ITEM ====================
  const activateTherapyItem = useCallback(async (hospitalizationId, itemId) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.activateTherapyItem(hospitalizationId, itemId);
      setTherapyPlan(prev => 
        prev.map(item => item.id === itemId ? { ...item, activo: true } : item)
      );
      return true;
    } catch (err) {
      console.error('Error activating therapy item:', err);
      setError(err.response?.data?.error || 'Error al activar medicamento');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ADMINISTER MEDICATION ====================
  const administerMedication = useCallback(async (hospitalizationId, adminId) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.administerMedication(hospitalizationId, adminId);
      // Actualizar lista de medicamentos pendientes
      setPendingMedications(prev => 
        prev.map(med => 
          med.id === adminId 
            ? { ...med, administrado: true, horaAdministrado: new Date().toISOString() }
            : med
        )
      );
      // Refrescar costos
      const costsData = await hospitalizacionService.getCosts(hospitalizationId);
      setCosts(costsData);
      return true;
    } catch (err) {
      console.error('Error administering medication:', err);
      setError(err.response?.data?.error || 'Error al administrar medicamento');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== GENERATE DAILY SCHEDULE ====================
  const generateDailySchedule = useCallback(async (hospitalizationId) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.generateDailySchedule(hospitalizationId);
      // Refrescar medicamentos pendientes
      const meds = await hospitalizacionService.getPendingMedications(hospitalizationId);
      setPendingMedications(Array.isArray(meds) ? meds : []);
      return true;
    } catch (err) {
      console.error('Error generating schedule:', err);
      setError(err.response?.data?.error || 'Error al generar horario');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ADD NEONATE ====================
  const addNeonate = useCallback(async (hospitalizationId, data) => {
    setLoading(true);
    setError(null);
    try {
      const newNeonate = await hospitalizacionService.addNeonate(hospitalizationId, data);
      setNeonates(prev => [...prev, newNeonate]);
      return true;
    } catch (err) {
      console.error('Error adding neonate:', err);
      setError(err.response?.data?.error || 'Error al registrar neonato');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== ADD NEONATE RECORD ====================
  const addNeonateRecord = useCallback(async (hospitalizationId, neonateId, data) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.addNeonateRecord(hospitalizationId, neonateId, data);
      // Refrescar neonatos para obtener los nuevos records
      const neonatesData = await hospitalizacionService.getNeonates(hospitalizationId);
      setNeonates(Array.isArray(neonatesData) ? neonatesData : []);
      return true;
    } catch (err) {
      console.error('Error adding neonate record:', err);
      setError(err.response?.data?.error || 'Error al registrar seguimiento');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== GET NEONATE RECORDS ====================
  const getNeonateRecords = useCallback(async (hospitalizationId, neonateId) => {
    setLoading(true);
    setError(null);
    try {
      const records = await hospitalizacionService.getNeonateRecords(hospitalizationId, neonateId);
      return Array.isArray(records) ? records : [];
    } catch (err) {
      console.error('Error getting neonate records:', err);
      setError(err.response?.data?.error || 'Error al obtener registros');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== DISCHARGE ====================
  const dischargePatient = useCallback(async (hospitalizationId, dischargeType, notes) => {
    setLoading(true);
    setError(null);
    try {
      await hospitalizacionService.discharge(hospitalizationId, { type: dischargeType, notes });
      // Refrescar lista
      await fetchHospitalizaciones();
      await fetchStats();
      setSelectedHospitalization(null);
      setVitalSigns([]);
      setTherapyPlan([]);
      setPendingMedications([]);
      setNeonates([]);
      setCosts(null);
      return true;
    } catch (err) {
      console.error('Error discharging patient:', err);
      setError(err.response?.data?.error || 'Error al dar de alta');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchHospitalizaciones, fetchStats]);

  // ==================== CLEAR ERROR ====================
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==================== RETURN ====================
  return {
    // State
    hospitalizaciones,
    stats,
    selectedHospitalization,
    vitalSigns,
    therapyPlan,
    pendingMedications,
    neonates,
    costs,
    loading,
    error,
    
    // Actions
    fetchHospitalizaciones,
    fetchStats,
    selectHospitalization,
    addVitalSigns,
    addTherapyItem,
    deactivateTherapyItem,
    activateTherapyItem,
    administerMedication,
    generateDailySchedule,
    addNeonate,
    addNeonateRecord,
    getNeonateRecords,
    dischargePatient,
    clearError,
  };
};

export default useHospitalizacion;
