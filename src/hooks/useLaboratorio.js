// src/hooks/useLaboratorio.js
// Hook para manejar el estado y lógica del módulo de Laboratorio

import { useState, useEffect, useCallback } from 'react';
import laboratorioService from '../services/laboratorio.service';

/**
 * Hook para el módulo de Laboratorio
 * Maneja estado, carga de datos y acciones del laboratorio
 */
export const useLaboratorio = () => {
  // Estado de estudios
  const [estudios, setEstudios] = useState({
    pendientes: [],
    enProceso: [],
    completados: [],
    todos: [],
  });

  // Estadísticas
  const [stats, setStats] = useState({
    pendientes: 0,
    enProceso: 0,
    completados: 0,
    completadosHoy: 0,
  });

  // Estado de carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  /**
   * Cargar todos los estudios
   */
  const loadEstudios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendientes, enProceso, completados] = await Promise.all([
        laboratorioService.getByStatus('PENDIENTE'),
        laboratorioService.getByStatus('EN_PROCESO'),
        laboratorioService.getByStatus('COMPLETADO'),
      ]);

      setEstudios({
        pendientes,
        enProceso,
        completados,
        todos: [...pendientes, ...enProceso, ...completados],
      });

      // Calcular stats
      const today = new Date().toDateString();
      const completadosHoy = completados.filter(s => {
        const date = new Date(s.completedAt || s.updatedAt);
        return date.toDateString() === today;
      });

      setStats({
        pendientes: pendientes.length,
        enProceso: enProceso.length,
        completados: completados.length,
        completadosHoy: completadosHoy.length,
      });

      setLastUpdate(new Date());
    } catch (err) {
      console.error('[useLaboratorio] Error cargando estudios:', err);
      setError(err.message || 'Error al cargar estudios');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar estudios pendientes (para personal de laboratorio)
   */
  const loadPendientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendientes = await laboratorioService.getPendientes();
      
      // Separar pendientes y en proceso
      const soloPendientes = pendientes.filter(e => e.status === 'PENDIENTE');
      const soloEnProceso = pendientes.filter(e => e.status === 'EN_PROCESO');
      
      setEstudios(prev => ({
        ...prev,
        pendientes: soloPendientes,
        enProceso: soloEnProceso,
      }));

      setStats(prev => ({
        ...prev,
        pendientes: soloPendientes.length,
        enProceso: soloEnProceso.length,
      }));

      setLastUpdate(new Date());
    } catch (err) {
      console.error('[useLaboratorio] Error cargando pendientes:', err);
      setError(err.message || 'Error al cargar estudios pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // ACCIONES
  // ============================================================================

  /**
   * Iniciar procesamiento de un estudio
   */
  const iniciarEstudio = useCallback(async (estudioId) => {
    try {
      await laboratorioService.iniciarEstudio(estudioId);
      
      // Actualizar estado local
      setEstudios(prev => {
        const estudio = prev.pendientes.find(e => e.id === estudioId);
        if (!estudio) return prev;
        
        return {
          ...prev,
          pendientes: prev.pendientes.filter(e => e.id !== estudioId),
          enProceso: [...prev.enProceso, { ...estudio, status: 'EN_PROCESO' }],
        };
      });

      setStats(prev => ({
        ...prev,
        pendientes: prev.pendientes - 1,
        enProceso: prev.enProceso + 1,
      }));

      return { success: true };
    } catch (err) {
      console.error('[useLaboratorio] Error iniciando estudio:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Subir resultados de un estudio
   */
  const subirResultados = useCallback(async (estudioId, data) => {
    try {
      const resultado = await laboratorioService.subirResultados(estudioId, data);
      
      // Actualizar estado local
      setEstudios(prev => {
        const estudio = prev.enProceso.find(e => e.id === estudioId);
        if (!estudio) return prev;
        
        const estudioCompletado = { 
          ...estudio, 
          ...resultado,
          status: 'COMPLETADO',
          completedAt: new Date().toISOString(),
        };
        
        return {
          ...prev,
          enProceso: prev.enProceso.filter(e => e.id !== estudioId),
          completados: [estudioCompletado, ...prev.completados],
        };
      });

      setStats(prev => ({
        ...prev,
        enProceso: prev.enProceso - 1,
        completados: prev.completados + 1,
        completadosHoy: prev.completadosHoy + 1,
      }));

      return { success: true, data: resultado };
    } catch (err) {
      console.error('[useLaboratorio] Error subiendo resultados:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Obtener detalle de un estudio
   */
  const getEstudioDetalle = useCallback(async (estudioId) => {
    try {
      const estudio = await laboratorioService.getById(estudioId);
      return { success: true, data: estudio };
    } catch (err) {
      console.error('[useLaboratorio] Error obteniendo detalle:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ============================================================================
  // FILTROS Y BÚSQUEDA
  // ============================================================================

  /**
   * Filtrar estudios por término de búsqueda
   */
  const filterEstudios = useCallback((estudiosArray, searchTerm) => {
    if (!searchTerm) return estudiosArray;
    
    const term = searchTerm.toLowerCase();
    return estudiosArray.filter(estudio => {
      const petName = estudio.pet?.nombre?.toLowerCase() || '';
      const ownerName = estudio.pet?.owner?.nombre?.toLowerCase() || '';
      const type = laboratorioService.tipoToLabel(estudio.type).toLowerCase();
      
      return petName.includes(term) || ownerName.includes(term) || type.includes(term);
    });
  }, []);

  /**
   * Ordenar estudios por urgencia y fecha
   */
  const sortByUrgency = useCallback((estudiosArray) => {
    return [...estudiosArray].sort((a, b) => {
      // Urgentes primero
      if (a.urgency === 'URGENTE' && b.urgency !== 'URGENTE') return -1;
      if (a.urgency !== 'URGENTE' && b.urgency === 'URGENTE') return 1;
      
      // Luego por fecha (más antiguos primero)
      return new Date(a.requestedAt) - new Date(b.requestedAt);
    });
  }, []);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  // Cargar datos iniciales
  useEffect(() => {
    loadEstudios();
  }, [loadEstudios]);

  // Auto-refresh deshabilitado - usar botón manual "Actualizar"
  // Los datos se recargan automáticamente después de cada acción

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estado
    estudios,
    stats,
    loading,
    error,
    lastUpdate,

    // Acciones
    loadEstudios,
    loadPendientes,
    iniciarEstudio,
    subirResultados,
    getEstudioDetalle,

    // Filtros
    filterEstudios,
    sortByUrgency,

    // Helpers del servicio
    tipoToLabel: laboratorioService.tipoToLabel,
    requiereSedacion: laboratorioService.requiereSedacion,
    statusToClass: laboratorioService.statusToClass,
    urgencyToClass: laboratorioService.urgencyToClass,
  };
};

export default useLaboratorio;
