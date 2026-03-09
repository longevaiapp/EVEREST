// src/hooks/useCrematorio.js
// Custom hook for cremation module state management

import { useState, useCallback } from 'react';
import crematorioService from '../services/crematorio.service';

export default function useCrematorio() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [urns, setUrns] = useState([]);
  const [packagingRanges, setPackagingRanges] = useState([]);
  const [stats, setStats] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState({
    orders: false,
    urns: false,
    stats: false,
  });

  // ==================== ORDERS ====================
  const fetchOrders = useCallback(async (filters = {}) => {
    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const data = await crematorioService.getOrders(filters);
      setOrders(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchOrders error:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, []);

  const fetchOrder = useCallback(async (id) => {
    try {
      const data = await crematorioService.getOrder(id);
      setSelectedOrder(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchOrder error:', err);
      return null;
    }
  }, []);

  const createOrder = useCallback(async (data) => {
    const order = await crematorioService.createOrder(data);
    setOrders(prev => [order, ...prev]);
    return order;
  }, []);

  const updateOrder = useCallback(async (id, data) => {
    const updated = await crematorioService.updateOrder(id, data);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
    if (selectedOrder?.id === id) setSelectedOrder(updated);
    return updated;
  }, [selectedOrder]);

  const updateOrderStatus = useCallback(async (id, data) => {
    const updated = await crematorioService.updateOrderStatus(id, data);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
    if (selectedOrder?.id === id) setSelectedOrder(prev => ({ ...prev, ...updated }));
    return updated;
  }, [selectedOrder]);

  // ==================== PAYMENTS ====================
  const createPayment = useCallback(async (orderId, data) => {
    const payment = await crematorioService.createPayment(orderId, data);
    // Refresh order to get updated payment list
    await fetchOrder(orderId);
    return payment;
  }, [fetchOrder]);

  // ==================== URNS ====================
  const fetchUrns = useCallback(async (withPrices = true) => {
    setLoading(prev => ({ ...prev, urns: true }));
    try {
      const data = withPrices
        ? await crematorioService.getUrns()
        : await crematorioService.getPublicUrns();
      setUrns(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchUrns error:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, urns: false }));
    }
  }, []);

  const createUrn = useCallback(async (data) => {
    const urn = await crematorioService.createUrn(data);
    setUrns(prev => [...prev, urn]);
    return urn;
  }, []);

  const updateUrn = useCallback(async (id, data) => {
    const updated = await crematorioService.updateUrn(id, data);
    setUrns(prev => prev.map(u => u.id === id ? updated : u));
    return updated;
  }, []);

  // Fetch all urns (including inactive) - admin only
  const fetchAllUrns = useCallback(async () => {
    setLoading(prev => ({ ...prev, urns: true }));
    try {
      const data = await crematorioService.getAllUrns();
      setUrns(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchAllUrns error:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, urns: false }));
    }
  }, []);

  // ==================== PACKAGING ====================
  const fetchPackagingRanges = useCallback(async () => {
    try {
      const data = await crematorioService.getPackagingRanges();
      setPackagingRanges(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchPackagingRanges error:', err);
      return [];
    }
  }, []);

  const createPackagingRange = useCallback(async (data) => {
    const range = await crematorioService.createPackagingRange(data);
    setPackagingRanges(prev => [...prev, range]);
    return range;
  }, []);

  const updatePackagingRange = useCallback(async (id, data) => {
    const updated = await crematorioService.updatePackagingRange(id, data);
    setPackagingRanges(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const deletePackagingRange = useCallback(async (id) => {
    await crematorioService.deletePackagingRange(id);
    setPackagingRanges(prev => prev.filter(r => r.id !== id));
  }, []);

  // ==================== STATS ====================
  const fetchStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const data = await crematorioService.getStats();
      setStats(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchStats error:', err);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  // ==================== SUPPLIES ====================
  const fetchSupplies = useCallback(async () => {
    try {
      const data = await crematorioService.getSupplies();
      setSupplies(data);
      return data;
    } catch (err) {
      console.error('[useCrematorio] fetchSupplies error:', err);
      return [];
    }
  }, []);

  const createSupply = useCallback(async (data) => {
    const supply = await crematorioService.createSupply(data);
    setSupplies(prev => [...prev, supply]);
    return supply;
  }, []);

  const updateSupply = useCallback(async (id, data) => {
    const updated = await crematorioService.updateSupply(id, data);
    setSupplies(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  }, []);

  const deleteSupply = useCallback(async (id) => {
    await crematorioService.deleteSupply(id);
    setSupplies(prev => prev.filter(s => s.id !== id));
  }, []);

  const adjustSupplyStock = useCallback(async (id, quantity) => {
    const updated = await crematorioService.adjustSupplyStock(id, quantity);
    setSupplies(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  }, []);

  return {
    // State
    orders,
    selectedOrder,
    urns,
    packagingRanges,
    supplies,
    stats,
    loading,
    // Order operations
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    updateOrderStatus,
    setSelectedOrder,
    // Payment
    createPayment,
    // Urns
    fetchUrns,
    fetchAllUrns,
    createUrn,
    updateUrn,
    // Packaging
    fetchPackagingRanges,
    createPackagingRange,
    updatePackagingRange,
    deletePackagingRange,
    // Supplies
    fetchSupplies,
    createSupply,
    updateSupply,
    deleteSupply,
    adjustSupplyStock,
    // Stats
    fetchStats,
  };
}
