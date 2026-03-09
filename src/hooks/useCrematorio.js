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

  return {
    // State
    orders,
    selectedOrder,
    urns,
    packagingRanges,
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
    createUrn,
    updateUrn,
    // Packaging
    fetchPackagingRanges,
    // Stats
    fetchStats,
  };
}
