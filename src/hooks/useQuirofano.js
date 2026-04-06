// src/hooks/useQuirofano.js
import { useState, useCallback, useEffect } from 'react';
import quirofanoService from '../services/quirofano.service';

export default function useQuirofano() {
  const [surgeries, setSurgeries] = useState([]);
  const [stats, setStats] = useState({ programadas: 0, enPreparacion: 0, enCurso: 0, completadas: 0, total: 0 });
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quirofanoService.getToday();
      setSurgeries(res.data?.surgeries || res.surgeries || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await quirofanoService.getBoardStats();
      setStats(res.data?.stats || res.stats || {});
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const selectSurgery = useCallback(async (surgery) => {
    if (!surgery) { setSelectedSurgery(null); return; }
    try {
      const res = await quirofanoService.getSurgery(surgery.id);
      setSelectedSurgery(res.data?.surgery || res.surgery || surgery);
    } catch (err) {
      setSelectedSurgery(surgery);
    }
  }, []);

  const prepare = useCallback(async (surgeryId, data) => {
    const res = await quirofanoService.prepare(surgeryId, data);
    const updated = res.data?.surgery || res.surgery;
    setSelectedSurgery(updated);
    await fetchToday();
    await fetchStats();
    return updated;
  }, [fetchToday, fetchStats]);

  const startSurgery = useCallback(async (surgeryId, data) => {
    const res = await quirofanoService.start(surgeryId, data);
    const updated = res.data?.surgery || res.surgery;
    setSelectedSurgery(updated);
    await fetchToday();
    await fetchStats();
    return updated;
  }, [fetchToday, fetchStats]);

  const completeSurgery = useCallback(async (surgeryId, data) => {
    const res = await quirofanoService.complete(surgeryId, data);
    const updated = res.data?.surgery || res.surgery;
    setSelectedSurgery(updated);
    await fetchToday();
    await fetchStats();
    return updated;
  }, [fetchToday, fetchStats]);

  const cancelSurgery = useCallback(async (surgeryId, reason) => {
    await quirofanoService.cancel(surgeryId, reason);
    setSelectedSurgery(null);
    await fetchToday();
    await fetchStats();
  }, [fetchToday, fetchStats]);

  const addVitals = useCallback(async (surgeryId, data) => {
    const res = await quirofanoService.addVitals(surgeryId, data);
    // Refresh selected surgery to include new vitals
    await selectSurgery({ id: surgeryId });
    return res.data?.vitals || res.vitals;
  }, [selectSurgery]);

  const addPreMed = useCallback(async (surgeryId, data) => {
    const res = await quirofanoService.addPreMed(surgeryId, data);
    await selectSurgery({ id: surgeryId });
    return res.data?.preMed || res.preMed;
  }, [selectSurgery]);

  const removePreMed = useCallback(async (surgeryId, preMedId) => {
    await quirofanoService.removePreMed(surgeryId, preMedId);
    await selectSurgery({ id: surgeryId });
  }, [selectSurgery]);

  useEffect(() => {
    fetchToday();
    fetchStats();
  }, [fetchToday, fetchStats]);

  return {
    surgeries,
    stats,
    selectedSurgery,
    loading,
    error,
    fetchToday,
    fetchStats,
    selectSurgery,
    prepare,
    startSurgery,
    completeSurgery,
    cancelSurgery,
    addVitals,
    addPreMed,
    removePreMed,
  };
}
