// src/hooks/useFarmacia.js
// Custom hook for Pharmacy module state management and API integration

import { useState, useEffect, useCallback, useMemo } from 'react';
import farmaciaService from '../services/farmacia.service';

/**
 * Custom hook for Pharmacy module
 * Provides state management and API integration for pharmacy operations
 */
const useFarmacia = () => {
  // ==================== STATE ====================
  
  // Medications
  const [medications, setMedications] = useState([]);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [medicationFilters, setMedicationFilters] = useState({
    search: '',
    category: '',
    status: '',
    lowStock: false,
    expiringSoon: false
  });
  
  // Prescriptions
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  
  // Dispense History
  const [dispenseHistory, setDispenseHistory] = useState([]);
  const [dispenseFilters, setDispenseFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });
  
  // Alerts
  const [stockAlerts, setStockAlerts] = useState([]);
  const [lowStockMedications, setLowStockMedications] = useState([]);
  const [expiringMedications, setExpiringMedications] = useState([]);
  
  // Stock movements
  const [stockMovements, setStockMovements] = useState([]);
  
  // Dashboard stats
  const [pharmacyStats, setPharmacyStats] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState({
    medications: false,
    prescriptions: false,
    dispenses: false,
    alerts: false,
    stats: false,
    action: false
  });
  
  // Error state
  const [error, setError] = useState(null);

  // ==================== COMPUTED VALUES (useMemo) ====================

  /**
   * Count of medications below minimum stock level
   */
  const lowStockCount = useMemo(() => {
    return medications.filter(med => 
      med.stockActual !== undefined && 
      med.stockMinimo !== undefined && 
      med.stockActual <= med.stockMinimo
    ).length;
  }, [medications]);

  /**
   * Prescriptions marked as urgent (high priority)
   */
  const urgentPrescriptions = useMemo(() => {
    return pendingPrescriptions.filter(rx => 
      rx.prioridad === 'URGENTE' || rx.prioridad === 'ALTA' || rx.priority === 'urgent' || rx.priority === 'high'
    );
  }, [pendingPrescriptions]);

  /**
   * Today's statistics from dispense history
   */
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayDispenses = dispenseHistory.filter(d => {
      const dispenseDate = new Date(d.createdAt || d.fecha).toISOString().split('T')[0];
      return dispenseDate === today;
    });
    
    return {
      count: todayDispenses.length,
      totalValue: todayDispenses.reduce((sum, d) => sum + (d.total || d.valorTotal || 0), 0),
      itemsDispensed: todayDispenses.reduce((sum, d) => {
        if (d.items) return sum + d.items.length;
        return sum + 1;
      }, 0)
    };
  }, [dispenseHistory]);

  // ==================== MEDICATIONS ====================

  /**
   * Fetch all medications with optional filters
   * @param {Object} filters - Optional filters to override internal state
   */
  const fetchMedications = useCallback(async (filters = null) => {
    setLoading(prev => ({ ...prev, medications: true }));
    setError(null);
    try {
      // Use passed filters or fall back to internal medicationFilters state
      const filtersToUse = filters || medicationFilters;
      const data = await farmaciaService.getMedications(filtersToUse);
      setMedications(data);
      console.log('[useFarmacia] Medications loaded:', data.length);
    } catch (err) {
      console.error('[useFarmacia] Error fetching medications:', err);
      setError(err.message || 'Failed to load medications');
    } finally {
      setLoading(prev => ({ ...prev, medications: false }));
    }
  }, [medicationFilters]);

  /**
   * Fetch a single medication by ID
   */
  const fetchMedicationById = useCallback(async (id) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const data = await farmaciaService.getMedicationById(id);
      setSelectedMedication(data);
      console.log('[useFarmacia] Medication loaded:', data);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching medication:', err);
      setError(err.message || 'Failed to load medication');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  /**
   * Create a new medication
   */
  const createMedication = useCallback(async (data) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const newMedication = await farmaciaService.createMedication(data);
      setMedications(prev => [...prev, newMedication]);
      console.log('[useFarmacia] Medication created:', newMedication);
      return newMedication;
    } catch (err) {
      console.error('[useFarmacia] Error creating medication:', err);
      setError(err.message || 'Failed to create medication');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  /**
   * Update an existing medication
   */
  const updateMedication = useCallback(async (id, data) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const updatedMedication = await farmaciaService.updateMedication(id, data);
      setMedications(prev => 
        prev.map(med => med.id === id ? updatedMedication : med)
      );
      if (selectedMedication?.id === id) {
        setSelectedMedication(updatedMedication);
      }
      console.log('[useFarmacia] Medication updated:', updatedMedication);
      return updatedMedication;
    } catch (err) {
      console.error('[useFarmacia] Error updating medication:', err);
      setError(err.message || 'Failed to update medication');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [selectedMedication]);

  /**
   * Delete a medication
   */
  const deleteMedication = useCallback(async (id) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      await farmaciaService.deleteMedication(id);
      setMedications(prev => prev.filter(med => med.id !== id));
      if (selectedMedication?.id === id) {
        setSelectedMedication(null);
      }
      console.log('[useFarmacia] Medication deleted:', id);
      return true;
    } catch (err) {
      console.error('[useFarmacia] Error deleting medication:', err);
      setError(err.message || 'Failed to delete medication');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [selectedMedication]);

  /**
   * Adjust medication stock
   */
  const adjustStock = useCallback(async (id, quantity, reason, batchNumber = null) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const updatedMedication = await farmaciaService.adjustStock(id, quantity, reason, batchNumber);
      setMedications(prev => 
        prev.map(med => med.id === id ? updatedMedication : med)
      );
      if (selectedMedication?.id === id) {
        setSelectedMedication(updatedMedication);
      }
      console.log('[useFarmacia] Stock adjusted:', updatedMedication);
      return updatedMedication;
    } catch (err) {
      console.error('[useFarmacia] Error adjusting stock:', err);
      setError(err.message || 'Failed to adjust stock');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, [selectedMedication]);

  // ==================== ALERTS ====================

  /**
   * Fetch low stock medications
   */
  const fetchLowStockMedications = useCallback(async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const data = await farmaciaService.getLowStockMedications();
      setLowStockMedications(data);
      console.log('[useFarmacia] Low stock medications:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching low stock:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  /**
   * Fetch expiring medications
   */
  const fetchExpiringMedications = useCallback(async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const data = await farmaciaService.getExpiringMedications();
      setExpiringMedications(data);
      console.log('[useFarmacia] Expiring medications:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching expiring:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  /**
   * Fetch all stock alerts
   */
  const fetchStockAlerts = useCallback(async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const data = await farmaciaService.getStockAlerts();
      setStockAlerts(data);
      console.log('[useFarmacia] Stock alerts:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching alerts:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  /**
   * Resolve a stock alert
   */
  const resolveAlert = useCallback(async (id, status, notes = '') => {
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const updatedAlert = await farmaciaService.resolveAlert(id, status, notes);
      setStockAlerts(prev => 
        prev.map(alert => alert.id === id ? updatedAlert : alert)
      );
      console.log('[useFarmacia] Alert resolved:', updatedAlert);
      return updatedAlert;
    } catch (err) {
      console.error('[useFarmacia] Error resolving alert:', err);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  /**
   * Fetch stock movements for a medication
   */
  const fetchStockMovements = useCallback(async (medicationId, filters = {}) => {
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const data = await farmaciaService.getStockMovements(medicationId, filters);
      setStockMovements(data);
      console.log('[useFarmacia] Stock movements:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching movements:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  // ==================== PRESCRIPTIONS ====================

  /**
   * Fetch pending prescriptions
   */
  const fetchPendingPrescriptions = useCallback(async () => {
    setLoading(prev => ({ ...prev, prescriptions: true }));
    setError(null);
    try {
      const data = await farmaciaService.getPendingPrescriptions();
      setPendingPrescriptions(data);
      console.log('[useFarmacia] Pending prescriptions:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching prescriptions:', err);
      setError(err.message || 'Failed to load prescriptions');
      return [];
    } finally {
      setLoading(prev => ({ ...prev, prescriptions: false }));
    }
  }, []);

  /**
   * Reject a prescription
   */
  const rejectPrescription = useCallback(async (id, reason) => {
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const updatedPrescription = await farmaciaService.rejectPrescription(id, reason);
      setPendingPrescriptions(prev => prev.filter(p => p.id !== id));
      console.log('[useFarmacia] Prescription rejected:', id);
      return updatedPrescription;
    } catch (err) {
      console.error('[useFarmacia] Error rejecting prescription:', err);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  // ==================== DISPENSES ====================

  /**
   * Fetch dispense history
   */
  const fetchDispenseHistory = useCallback(async (filters = {}) => {
    setLoading(prev => ({ ...prev, dispenses: true }));
    setError(null);
    try {
      const appliedFilters = { ...dispenseFilters, ...filters };
      const data = await farmaciaService.getDispenses(appliedFilters);
      setDispenseHistory(data);
      console.log('[useFarmacia] Dispense history loaded:', data.length);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching dispense history:', err);
      setError(err.message || 'Failed to load dispense history');
      return [];
    } finally {
      setLoading(prev => ({ ...prev, dispenses: false }));
    }
  }, [dispenseFilters]);

  /**
   * Dispense a prescription (fulfill prescription)
   * @param {string} prescriptionId - Prescription ID
   * @param {string} petId - Pet ID
   * @param {Array} items - Array of { medicationId, medicationName, requestedQty, dispensedQty, unitPrice, reason }
   * @param {string} deliveredTo - Name of person receiving medication
   * @param {string} notes - Optional notes
   */
  const dispensePrescription = useCallback(async (prescriptionId, petId, items, deliveredTo = '', notes = '') => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const newDispense = await farmaciaService.createDispense({
        prescriptionId,
        petId,
        items,
        deliveredTo,
        notes
      });
      setDispenseHistory(prev => [newDispense, ...prev]);
      // Remove from pending prescriptions
      setPendingPrescriptions(prev => 
        prev.filter(p => p.id !== prescriptionId)
      );
      console.log('[useFarmacia] Prescription dispensed:', newDispense);
      return newDispense;
    } catch (err) {
      console.error('[useFarmacia] Error dispensing prescription:', err);
      setError(err.message || 'Failed to dispense prescription');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  /**
   * Mark medication as expired
   * @param {string} id - Medication ID
   * @param {number} quantity - Quantity to mark as expired
   * @param {string} notes - Notes for the expiration
   * @param {string} batchNumber - Batch number (optional)
   */
  const markAsExpired = useCallback(async (id, quantity, notes = '', batchNumber = null) => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const updatedMedication = await farmaciaService.markAsExpired(
        id, 
        quantity,
        notes,
        batchNumber
      );
      setMedications(prev => 
        prev.map(med => med.id === id ? updatedMedication : med)
      );
      console.log('[useFarmacia] Medication marked as expired:', updatedMedication);
      return updatedMedication;
    } catch (err) {
      console.error('[useFarmacia] Error marking as expired:', err);
      setError(err.message || 'Failed to mark medication as expired');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  /**
   * Check for expiring medications and create alerts
   * Scans all medications for upcoming expirations and creates alerts
   */
  const checkExpiringMedications = useCallback(async () => {
    setLoading(prev => ({ ...prev, action: true }));
    setError(null);
    try {
      const result = await farmaciaService.checkExpiringMedications();
      console.log('[useFarmacia] Expiring medications check:', result);
      // Refresh alerts after check
      const alerts = await farmaciaService.getStockAlerts();
      setStockAlerts(alerts);
      return result;
    } catch (err) {
      console.error('[useFarmacia] Error checking expiring medications:', err);
      setError(err.message || 'Failed to check expiring medications');
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  }, []);

  // ==================== DASHBOARD ====================

  /**
   * Fetch pharmacy dashboard stats
   * @param {Object} params - Optional date range
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   */
  const fetchPharmacyStats = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const data = await farmaciaService.getPharmacyStats(params);
      setPharmacyStats(data);
      console.log('[useFarmacia] Stats loaded:', data);
      return data;
    } catch (err) {
      console.error('[useFarmacia] Error fetching stats:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  /**
   * Refresh all pharmacy data
   */
  const refreshAll = useCallback(async () => {
    console.log('[useFarmacia] Refreshing all data...');
    await Promise.all([
      fetchMedications(),
      fetchPendingPrescriptions(),
      fetchDispenseHistory(),
      fetchStockAlerts(),
      fetchPharmacyStats()
    ]);
    console.log('[useFarmacia] All data refreshed');
  }, [fetchMedications, fetchPendingPrescriptions, fetchDispenseHistory, fetchStockAlerts, fetchPharmacyStats]);

  // ==================== EFFECTS ====================

  // Initial data load
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // ==================== RETURN ====================

  return {
    // State
    medications,
    selectedMedication,
    medicationFilters,
    pendingPrescriptions,
    selectedPrescription,
    dispenseHistory,
    dispenseFilters,
    stockAlerts,
    lowStockMedications,
    expiringMedications,
    stockMovements,
    pharmacyStats,
    loading,
    error,
    
    // Computed values
    lowStockCount,
    urgentPrescriptions,
    todayStats,
    
    // Setters
    setSelectedMedication,
    setMedicationFilters,
    setSelectedPrescription,
    setDispenseFilters,
    
    // Medication actions
    fetchMedications,
    fetchMedicationById,
    createMedication,
    updateMedication,
    deleteMedication,
    adjustStock,
    markAsExpired,
    
    // Alert actions
    fetchLowStockMedications,
    fetchExpiringMedications,
    fetchStockAlerts,
    resolveAlert,
    fetchStockMovements,
    checkExpiringMedications,
    
    // Prescription actions
    fetchPendingPrescriptions,
    rejectPrescription,
    dispensePrescription,
    
    // Dispense actions
    fetchDispenseHistory,
    
    // Dashboard actions
    fetchPharmacyStats,
    refreshAll
  };
};

export default useFarmacia;
