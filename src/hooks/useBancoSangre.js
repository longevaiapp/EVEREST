import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import bancoSangreService from '../services/bancoSangre.service';

export default function useBancoSangre() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [units, setUnits] = useState([]);
  const [transfusions, setTransfusions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const setLoadingKey = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // Dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingKey('dashboard', true);
      const res = await bancoSangreService.getDashboard();
      setStats(res.data);
    } catch (e) {
      console.error('Error fetching dashboard:', e);
    } finally {
      setLoadingKey('dashboard', false);
    }
  }, []);

  // Donors
  const fetchDonors = useCallback(async (params = {}) => {
    try {
      setLoadingKey('donors', true);
      const res = await bancoSangreService.getDonors(params);
      setDonors(res.data);
    } catch (e) {
      console.error('Error fetching donors:', e);
    } finally {
      setLoadingKey('donors', false);
    }
  }, []);

  const fetchDonor = useCallback(async (id) => {
    try {
      setLoadingKey('donor', true);
      const res = await bancoSangreService.getDonor(id);
      setSelectedDonor(res.data);
      return res.data;
    } catch (e) {
      console.error('Error fetching donor:', e);
    } finally {
      setLoadingKey('donor', false);
    }
  }, []);

  const createDonor = useCallback(async (data) => {
    const res = await bancoSangreService.createDonor({ ...data, registeredById: user?.id });
    await fetchDonors();
    return res.data;
  }, [user, fetchDonors]);

  const updateDonor = useCallback(async (id, data) => {
    const res = await bancoSangreService.updateDonor(id, data);
    await fetchDonors();
    if (selectedDonor?.id === id) setSelectedDonor(res.data);
    return res.data;
  }, [fetchDonors, selectedDonor]);

  // Evaluations
  const createEvaluation = useCallback(async (donorId, data) => {
    const res = await bancoSangreService.createEvaluation(donorId, { ...data, evaluatorId: user?.id });
    if (selectedDonor?.id === donorId) await fetchDonor(donorId);
    return res.data;
  }, [user, selectedDonor, fetchDonor]);

  // Tests
  const createTest = useCallback(async (donorId, data) => {
    const res = await bancoSangreService.createTest(donorId, { ...data, registeredById: user?.id });
    if (selectedDonor?.id === donorId) await fetchDonor(donorId);
    return res.data;
  }, [user, selectedDonor, fetchDonor]);

  // Donations
  const createDonation = useCallback(async (data) => {
    const res = await bancoSangreService.createDonation({ ...data, medicoId: user?.id });
    await fetchDonors();
    await fetchUnits();
    await fetchDashboard();
    return res.data;
  }, [user, fetchDonors, fetchDashboard]);

  // Units
  const fetchUnits = useCallback(async (params = {}) => {
    try {
      setLoadingKey('units', true);
      const res = await bancoSangreService.getUnits(params);
      setUnits(res.data);
    } catch (e) {
      console.error('Error fetching units:', e);
    } finally {
      setLoadingKey('units', false);
    }
  }, []);

  const updateUnitStatus = useCallback(async (id, status, notas) => {
    const res = await bancoSangreService.updateUnitStatus(id, { status, notas });
    await fetchUnits();
    return res.data;
  }, [fetchUnits]);

  const checkExpiry = useCallback(async () => {
    const res = await bancoSangreService.checkExpiry();
    await fetchUnits();
    await fetchAlerts();
    await fetchDashboard();
    return res.data;
  }, [fetchDashboard]);

  // Transfusions
  const fetchTransfusions = useCallback(async () => {
    try {
      setLoadingKey('transfusions', true);
      const res = await bancoSangreService.getTransfusions();
      setTransfusions(res.data);
    } catch (e) {
      console.error('Error fetching transfusions:', e);
    } finally {
      setLoadingKey('transfusions', false);
    }
  }, []);

  const createTransfusion = useCallback(async (data) => {
    const res = await bancoSangreService.createTransfusion({ ...data, medicoId: user?.id });
    await fetchUnits();
    await fetchTransfusions();
    await fetchDashboard();
    return res.data;
  }, [user, fetchUnits, fetchTransfusions, fetchDashboard]);

  // Alerts
  const fetchAlerts = useCallback(async (params = {}) => {
    try {
      setLoadingKey('alerts', true);
      const res = await bancoSangreService.getAlerts(params);
      setAlerts(res.data);
    } catch (e) {
      console.error('Error fetching alerts:', e);
    } finally {
      setLoadingKey('alerts', false);
    }
  }, []);

  const resolveAlert = useCallback(async (id) => {
    const res = await bancoSangreService.resolveAlert(id, user?.id);
    await fetchAlerts();
    return res.data;
  }, [user, fetchAlerts]);

  // Config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await bancoSangreService.getConfig();
      setConfig(res.data);
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  }, []);

  const updateConfig = useCallback(async (data) => {
    const res = await bancoSangreService.updateConfig(data);
    setConfig(res.data);
    return res.data;
  }, []);

  // Search pet
  const searchPet = useCallback(async (q) => {
    if (!q || q.length < 2) return [];
    const res = await bancoSangreService.searchPet(q);
    return res.data;
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchDonors();
    fetchUnits();
    fetchAlerts({ resuelta: false });
    fetchConfig();
  }, []);

  return {
    stats, donors, selectedDonor, units, transfusions, alerts, config,
    loading, error,
    setSelectedDonor,
    fetchDashboard, fetchDonors, fetchDonor, createDonor, updateDonor,
    createEvaluation, createTest,
    createDonation,
    fetchUnits, updateUnitStatus, checkExpiry,
    fetchTransfusions, createTransfusion,
    fetchAlerts, resolveAlert,
    fetchConfig, updateConfig,
    searchPet,
  };
}
