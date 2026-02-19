// src/hooks/useEstilista.js
// Hook personalizado para el módulo de Estilista (Grooming)
// Maneja estado, llamadas API y lógica de negocio

import { useState, useEffect, useCallback } from 'react';
import { groomingService } from '../services/grooming.service';

export const useEstilista = () => {
    // ============================================================================
    // ESTADO
    // ============================================================================

    // Lista de visitas de estética del día
    const [groomingVisits, setGroomingVisits] = useState([]);

    // Resumen del dashboard
    const [resumen, setResumen] = useState({
        pendientes: 0,
        enProceso: 0,
        completados: 0,
        total: 0,
    });

    // Paciente/servicio seleccionado
    const [selectedGrooming, setSelectedGrooming] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ============================================================================
    // CARGAR DATOS INICIALES
    // ============================================================================

    const loadGroomingVisits = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('[useEstilista] Cargando visitas de estética del día...');
            const visits = await groomingService.getTodayVisits();
            console.log('[useEstilista] Visitas recibidas:', visits?.length || 0);

            setGroomingVisits(visits || []);

            // Calculate summary
            const pendientes = visits?.filter(v => v.groomingService?.status === 'PENDIENTE').length || 0;
            const enProceso = visits?.filter(v => v.groomingService?.status === 'EN_PROCESO').length || 0;
            const completados = visits?.filter(v => v.groomingService?.status === 'COMPLETADO').length || 0;

            setResumen({
                pendientes,
                enProceso,
                completados,
                total: visits?.length || 0,
            });

        } catch (err) {
            console.error('[useEstilista] Error loading grooming visits:', err);
            setError('Error cargando visitas de estética');
        } finally {
            setLoading(false);
        }
    }, []);

    // Cargar datos al montar
    useEffect(() => {
        loadGroomingVisits();
    }, [loadGroomingVisits]);

    // ============================================================================
    // SELECCIÓN DE PACIENTE
    // ============================================================================

    const selectPatient = useCallback(async (visit) => {
        if (!visit) {
            setSelectedPatient(null);
            setSelectedGrooming(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            console.log('[useEstilista] Selecting patient:', visit.pet?.nombre);

            // Set patient info first (always available from visit)
            setSelectedPatient({
                ...visit.pet,
                owner: visit.pet?.owner,
                visitId: visit.id,
                arrivalTime: visit.arrivalTime,
                serviceType: visit.serviceType,
            });

            // Try to get grooming details (may not exist if form not filled yet)
            try {
                const groomingDetails = await groomingService.getByVisit(visit.id);
                setSelectedGrooming(groomingDetails);
            } catch (groomingErr) {
                // Grooming service doesn't exist yet - use data from visit.groomingService if available
                console.log('[useEstilista] No grooming service record yet, using visit data:', visit.groomingService);
                setSelectedGrooming(visit.groomingService || null);
            }

        } catch (err) {
            console.error('[useEstilista] Error selecting patient:', err);
            setError('Error cargando detalles del paciente');
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================================================
    // ACTUALIZACIÓN DE ESTADO DEL SERVICIO
    // ============================================================================

    const startService = useCallback(async (groomingId) => {
        setLoading(true);
        try {
            console.log('[useEstilista] Starting service:', groomingId);
            const updated = await groomingService.startService(groomingId);

            // Update local state
            setSelectedGrooming(updated);
            await loadGroomingVisits(); // Refresh list

            return updated;
        } catch (err) {
            console.error('[useEstilista] Error starting service:', err);
            setError('Error iniciando servicio');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadGroomingVisits]);

    const completeService = useCallback(async (groomingId, internalUseData) => {
        setLoading(true);
        try {
            console.log('[useEstilista] Completing service:', groomingId, internalUseData);

            const updated = await groomingService.update(groomingId, {
                status: 'COMPLETADO',
                ...internalUseData,
            });

            // Update local state
            setSelectedGrooming(updated);
            await loadGroomingVisits(); // Refresh list

            return updated;
        } catch (err) {
            console.error('[useEstilista] Error completing service:', err);
            setError('Error completando servicio');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadGroomingVisits]);

    const cancelService = useCallback(async (groomingId, reason) => {
        setLoading(true);
        try {
            console.log('[useEstilista] Cancelling service:', groomingId);
            const updated = await groomingService.cancelService(groomingId, reason);

            // Update local state
            setSelectedGrooming(updated);
            await loadGroomingVisits(); // Refresh list

            return updated;
        } catch (err) {
            console.error('[useEstilista] Error cancelling service:', err);
            setError('Error cancelando servicio');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [loadGroomingVisits]);

    const updateInternalUse = useCallback(async (groomingId, data) => {
        setLoading(true);
        try {
            console.log('[useEstilista] Updating internal use data:', groomingId, data);
            const updated = await groomingService.update(groomingId, data);

            // Update local state
            setSelectedGrooming(updated);

            return updated;
        } catch (err) {
            console.error('[useEstilista] Error updating internal use:', err);
            setError('Error actualizando datos');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================================================
    // FILTROS
    // ============================================================================

    const getFilteredVisits = useCallback((filter) => {
        switch (filter) {
            case 'pending':
                return groomingVisits.filter(v => v.groomingService?.status === 'PENDIENTE');
            case 'in-progress':
                return groomingVisits.filter(v => v.groomingService?.status === 'EN_PROCESO');
            case 'completed':
                return groomingVisits.filter(v => v.groomingService?.status === 'COMPLETADO');
            default:
                return groomingVisits;
        }
    }, [groomingVisits]);

    // ============================================================================
    // RETURN
    // ============================================================================

    return {
        // State
        groomingVisits,
        resumen,
        selectedGrooming,
        selectedPatient,
        loading,
        error,

        // Actions
        loadGroomingVisits,
        selectPatient,
        startService,
        completeService,
        cancelService,
        updateInternalUse,

        // Helpers
        getFilteredVisits,
        clearError: () => setError(null),
        clearSelection: () => {
            setSelectedPatient(null);
            setSelectedGrooming(null);
        },
    };
};

export default useEstilista;
