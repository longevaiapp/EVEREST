// src/components/dashboards/CrematorioDashboard.jsx
// Main cremation dashboard with role-based sections

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import useCrematorio from '../../hooks/useCrematorio';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './CrematorioDashboard.css';

const STATUS_CONFIG = {
  SOLICITADA: { label: 'Solicitada', emoji: '📋', color: '#6366f1' },
  RECOLECCION_PROGRAMADA: { label: 'Recolección Programada', emoji: '📅', color: '#f59e0b' },
  RECOLECCION_REALIZADA: { label: 'Recolección Realizada', emoji: '✅', color: '#10b981' },
  EN_CREMATORIO: { label: 'En Crematorio', emoji: '🏭', color: '#8b5cf6' },
  EN_PROCESO: { label: 'En Proceso', emoji: '🔥', color: '#ef4444' },
  LISTA_PARA_ENTREGA: { label: 'Lista para Entrega', emoji: '📦', color: '#06b6d4' },
  ENTREGADA: { label: 'Entregada', emoji: '🕊️', color: '#22c55e' },
  CANCELADA: { label: 'Cancelada', emoji: '❌', color: '#9ca3af' },
};

const PAYMENT_STATUS = {
  PENDIENTE: { label: 'Pendiente', color: '#f59e0b' },
  PAGADO: { label: 'Pagado', color: '#22c55e' },
  FALLIDO: { label: 'Fallido', color: '#ef4444' },
};

// Role-based section visibility
const ROLE_SECTIONS = {
  ADMIN: ['general', 'ordenes', 'recoleccion', 'cremacion', 'entregas', 'catalogo', 'configuracion'],
  RECOLECTOR: ['recoleccion', 'ordenes'],
  OPERADOR_CREMATORIO: ['cremacion', 'ordenes'],
  ENTREGA: ['entregas', 'ordenes'],
};

const ROLE_DEFAULT_SECTION = {
  ADMIN: 'general',
  RECOLECTOR: 'recoleccion',
  OPERADOR_CREMATORIO: 'cremacion',
  ENTREGA: 'entregas',
};

const NEXT_STATUS_MAP = {
  SOLICITADA: 'RECOLECCION_PROGRAMADA',
  RECOLECCION_PROGRAMADA: 'RECOLECCION_REALIZADA',
  RECOLECCION_REALIZADA: 'EN_CREMATORIO',
  EN_CREMATORIO: 'EN_PROCESO',
  EN_PROCESO: 'LISTA_PARA_ENTREGA',
  LISTA_PARA_ENTREGA: 'ENTREGADA',
};

export default function CrematorioDashboard() {
  const { user } = useAuth();
  const rol = user?.rol || 'ADMIN';
  const isAdmin = rol === 'ADMIN';
  const allowedSections = ROLE_SECTIONS[rol] || ROLE_SECTIONS.ADMIN;

  const {
    orders, selectedOrder, urns, stats, loading,
    fetchOrders, fetchOrder, createOrder, updateOrder, updateOrderStatus,
    setSelectedOrder, createPayment, fetchUrns, fetchAllUrns, fetchStats,
    createUrn, updateUrn, fetchPackagingRanges, packagingRanges,
    createPackagingRange, updatePackagingRange, deletePackagingRange,
  } = useCrematorio();

  const [activeSection, setActiveSection] = useState(ROLE_DEFAULT_SECTION[rol] || 'general');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal visibility
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUrnModal, setShowUrnModal] = useState(false);
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [editingUrn, setEditingUrn] = useState(null);
  const [editingPackaging, setEditingPackaging] = useState(null);

  // Forms
  const [orderForm, setOrderForm] = useState({
    petName: '', species: 'Canino', breed: '', sex: '', age: '',
    color: '', characteristics: '', weightKg: '',
    clientName: '', clientPhone: '', clientEmail: '',
    originType: 'DIRECTO', originName: '',
    pickupAddress: '', pickupDate: '', pickupTimeSlot: '', pickupNotes: '',
    urnId: '', notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'EFECTIVO', reference: '', notes: '' });
  const [statusForm, setStatusForm] = useState({
    status: '', notes: '', assignedToId: '', pickupDate: '', pickupTimeSlot: '',
    receiverName: '', receiverPhone: '', deliveryNotes: '', deliveryDate: '',
  });
  const [urnForm, setUrnForm] = useState({ name: '', description: '', price: '', size: 'MEDIANA', imageUrl: '', active: true });
  const [packagingForm, setPackagingForm] = useState({ minKg: '', maxKg: '', label: '', requiresTwoOperators: false, sortOrder: '' });

  // Pet search state
  const [petSearchTerm, setPetSearchTerm] = useState('');
  const [petSearchResults, setPetSearchResults] = useState([]);
  const [petSearching, setPetSearching] = useState(false);
  const [showPetResults, setShowPetResults] = useState(false);
  const petSearchTimeout = useRef(null);

  // URL params: pre-fill from hospitalization
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const fromModule = searchParams.get('from');
    if (fromModule === 'hospitalizacion' || fromModule === 'medico') {
      const prefill = {
        petName: searchParams.get('petName') || '',
        species: searchParams.get('species') || 'Canino',
        breed: searchParams.get('breed') || '',
        sex: searchParams.get('sex') || '',
        age: searchParams.get('age') || '',
        color: searchParams.get('color') || '',
        characteristics: '',
        weightKg: searchParams.get('weightKg') || '',
        clientName: searchParams.get('clientName') || '',
        clientPhone: searchParams.get('clientPhone') || '',
        clientEmail: searchParams.get('clientEmail') || '',
        originType: 'CLINICA',
        originName: searchParams.get('originName') || 'Everest Veterinaria',
        pickupAddress: '', pickupDate: '', pickupTimeSlot: '', pickupNotes: '',
        urnId: '', notes: searchParams.get('notes') || '',
      };
      setOrderForm(prefill);
      setShowOrderModal(true);
      // Clear params so refresh doesn't re-open
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Pet search handler
  const handlePetSearch = useCallback((value) => {
    setPetSearchTerm(value);
    if (petSearchTimeout.current) clearTimeout(petSearchTimeout.current);
    if (!value || value.length < 2) {
      setPetSearchResults([]);
      setShowPetResults(false);
      return;
    }
    setPetSearching(true);
    petSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get('/pets', { params: { search: value, limit: 8 } });
        setPetSearchResults(res.data?.pets || []);
        setShowPetResults(true);
      } catch { setPetSearchResults([]); }
      finally { setPetSearching(false); }
    }, 350);
  }, []);

  const handleSelectPet = (pet) => {
    const speciesMap = { PERRO: 'Canino', GATO: 'Felino', AVE: 'Ave', REPTIL: 'Reptil', ROEDOR: 'Roedor' };
    const sexMap = { MACHO: 'Macho', HEMBRA: 'Hembra' };
    setOrderForm(prev => ({
      ...prev,
      petName: pet.nombre || '',
      species: speciesMap[pet.especie] || pet.especie || 'Canino',
      breed: pet.raza || '',
      sex: sexMap[pet.sexo] || pet.sexo || '',
      weightKg: pet.peso ? String(pet.peso) : '',
      color: pet.color || '',
      clientName: pet.owner?.nombre || '',
      clientPhone: pet.owner?.telefono || '',
      clientEmail: pet.owner?.email || '',
      originType: 'CLINICA',
      originName: 'Everest Veterinaria',
    }));
    setPetSearchTerm('');
    setPetSearchResults([]);
    setShowPetResults(false);
  };

  // Initial data load
  useEffect(() => {
    fetchOrders();
    // Admin sees all urns (including inactive); others see only active
    if (isAdmin) fetchAllUrns(); else fetchUrns();
    fetchStats();
    fetchPackagingRanges();
  }, [fetchOrders, fetchUrns, fetchAllUrns, fetchStats, fetchPackagingRanges, isAdmin]);

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        o.folio?.toLowerCase().includes(s) ||
        o.petName?.toLowerCase().includes(s) ||
        o.clientName?.toLowerCase().includes(s) ||
        o.clientPhone?.includes(s)
      );
    }
    return true;
  });

  const recoleccionOrders = orders.filter(o =>
    ['SOLICITADA', 'RECOLECCION_PROGRAMADA', 'RECOLECCION_REALIZADA'].includes(o.status)
  );
  const cremacionOrders = orders.filter(o =>
    ['RECOLECCION_REALIZADA', 'EN_CREMATORIO', 'EN_PROCESO', 'LISTA_PARA_ENTREGA'].includes(o.status)
  );
  const entregaOrders = orders.filter(o =>
    ['LISTA_PARA_ENTREGA', 'ENTREGADA'].includes(o.status)
  );

  // ==================== HANDLERS ====================
  const handleCreateOrder = async () => {
    if (!orderForm.petName || !orderForm.species || !orderForm.clientName || !orderForm.clientPhone) {
      alert('Por favor completa los campos obligatorios: Nombre mascota, Especie, Nombre cliente, Teléfono');
      return;
    }
    const weight = parseFloat(orderForm.weightKg);
    if (!weight || weight <= 0) {
      alert('El peso debe ser mayor a 0');
      return;
    }
    setSubmitting(true);
    try {
      // Clean empty strings to avoid validation errors
      const cleanData = Object.fromEntries(
        Object.entries({ ...orderForm, weightKg: weight }).map(([k, v]) => [k, v === '' ? undefined : v])
      );
      await createOrder(cleanData);
      setShowOrderModal(false);
      setOrderForm({
        petName: '', species: 'Canino', breed: '', sex: '', age: '',
        color: '', characteristics: '', weightKg: '',
        clientName: '', clientPhone: '', clientEmail: '',
        originType: 'DIRECTO', originName: '',
        pickupAddress: '', pickupDate: '', pickupTimeSlot: '', pickupNotes: '',
        urnId: '', notes: '',
      });
      await Promise.all([fetchStats(), fetchOrders()]);
    } catch (err) {
      alert('Error al crear orden: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (order) => {
    await fetchOrder(order.id);
    setShowDetailModal(true);
  };

  const handleStatusChange = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await updateOrderStatus(selectedOrder.id, { ...statusForm });
      setShowStatusModal(false);
      setStatusForm({ status: '', notes: '', assignedToId: '', pickupDate: '', pickupTimeSlot: '', receiverName: '', receiverPhone: '', deliveryNotes: '', deliveryDate: '' });
      // Refresh order detail if detail modal was open
      await fetchOrder(selectedOrder.id);
      await Promise.all([fetchStats(), fetchOrders()]);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await createPayment(selectedOrder.id, { ...paymentForm, amount: parseFloat(paymentForm.amount) || 0 });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', method: 'EFECTIVO', reference: '', notes: '' });
      // createPayment in hook already calls fetchOrder to refresh selectedOrder
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUrn = async () => {
    setSubmitting(true);
    try {
      const data = { ...urnForm, price: parseFloat(urnForm.price) || 0 };
      if (editingUrn) {
        await updateUrn(editingUrn.id, data);
      } else {
        await createUrn(data);
      }
      setShowUrnModal(false);
      setEditingUrn(null);
      setUrnForm({ name: '', description: '', price: '', size: 'MEDIANA', imageUrl: '', active: true });
      if (isAdmin) await fetchAllUrns(); else await fetchUrns();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUrnActive = async (urn) => {
    try {
      await updateUrn(urn.id, { active: !urn.active });
      if (isAdmin) await fetchAllUrns(); else await fetchUrns();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSavePackaging = async () => {
    setSubmitting(true);
    try {
      const data = {
        minKg: parseFloat(packagingForm.minKg) || 0,
        maxKg: parseFloat(packagingForm.maxKg) || 0,
        label: packagingForm.label,
        requiresTwoOperators: packagingForm.requiresTwoOperators,
        sortOrder: parseInt(packagingForm.sortOrder) || 0,
      };
      if (editingPackaging) {
        await updatePackagingRange(editingPackaging.id, data);
      } else {
        await createPackagingRange(data);
      }
      setShowPackagingModal(false);
      setEditingPackaging(null);
      setPackagingForm({ minKg: '', maxKg: '', label: '', requiresTwoOperators: false, sortOrder: '' });
      await fetchPackagingRanges();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePackaging = async (id) => {
    if (!confirm('¿Eliminar este rango de empaque?')) return;
    try {
      await deletePackagingRange(id);
      await fetchPackagingRanges();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const openStatusModal = (order, nextStatus) => {
    setSelectedOrder(order);
    setStatusForm(prev => ({ ...prev, status: nextStatus, deliveryDate: '' }));
    setShowStatusModal(true);
  };

  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    setPaymentForm(prev => ({ ...prev, amount: order.urn?.price || '' }));
    setShowPaymentModal(true);
  };

  const handleExport = () => {
    const headers = ['Folio', 'Estado', 'Mascota', 'Especie', 'Peso (kg)', 'Empaque', 'Cliente', 'Teléfono', 'Origen', 'Urna', 'Fecha'];
    const rows = filteredOrders.map(o => [
      o.folio, STATUS_CONFIG[o.status]?.label || o.status, o.petName, o.species,
      o.weightKg, o.packagingLabel, o.clientName, o.clientPhone,
      o.originName || o.originType, o.urn?.name || '-',
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crematorio-ordenes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
  const canSee = (section) => allowedSections.includes(section);

  return (
    <div className="dashboard crematorio-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>🔥 Crematorio</h2>
          <span className="sidebar-role">{rol.replace(/_/g, ' ')}</span>
        </div>
        <nav className="sidebar-nav">
          {canSee('general') && (
            <button className={`nav-item ${activeSection === 'general' ? 'active' : ''}`} onClick={() => setActiveSection('general')}>
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
          )}
          {canSee('ordenes') && (
            <button className={`nav-item ${activeSection === 'ordenes' ? 'active' : ''}`} onClick={() => setActiveSection('ordenes')}>
              <span className="nav-icon">📋</span>
              <span>Órdenes</span>
              {orders.length > 0 && <span className="nav-badge">{orders.length}</span>}
            </button>
          )}
          {canSee('recoleccion') && (
            <button className={`nav-item ${activeSection === 'recoleccion' ? 'active' : ''}`} onClick={() => setActiveSection('recoleccion')}>
              <span className="nav-icon">🚗</span>
              <span>Recolección</span>
              {recoleccionOrders.length > 0 && <span className="nav-badge">{recoleccionOrders.length}</span>}
            </button>
          )}
          {canSee('cremacion') && (
            <button className={`nav-item ${activeSection === 'cremacion' ? 'active' : ''}`} onClick={() => setActiveSection('cremacion')}>
              <span className="nav-icon">🔥</span>
              <span>Cremación</span>
              {cremacionOrders.length > 0 && <span className="nav-badge">{cremacionOrders.length}</span>}
            </button>
          )}
          {canSee('entregas') && (
            <button className={`nav-item ${activeSection === 'entregas' ? 'active' : ''}`} onClick={() => setActiveSection('entregas')}>
              <span className="nav-icon">📦</span>
              <span>Entregas</span>
              {entregaOrders.length > 0 && <span className="nav-badge">{entregaOrders.length}</span>}
            </button>
          )}
          {canSee('catalogo') && (
            <button className={`nav-item ${activeSection === 'catalogo' ? 'active' : ''}`} onClick={() => setActiveSection('catalogo')}>
              <span className="nav-icon">⚱️</span>
              <span>Catálogo Urnas</span>
            </button>
          )}
          {canSee('configuracion') && (
            <button className={`nav-item ${activeSection === 'configuracion' ? 'active' : ''}`} onClick={() => setActiveSection('configuracion')}>
              <span className="nav-icon">⚙️</span>
              <span>Configuración</span>
            </button>
          )}
        </nav>
      </aside>

      <main className="main-content">
        {/* ==================== DASHBOARD GENERAL ==================== */}
        {activeSection === 'general' && (
          <div className="section-content">
            <div className="section-header">
              <h2>📊 Dashboard General</h2>
              <button className="btn-primary" onClick={() => setShowOrderModal(true)}>+ Nueva Orden</button>
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-value">{stats?.totalOrders || 0}</div>
                <div className="kpi-label">Total Órdenes</div>
              </div>
              <div className="kpi-card kpi-warning">
                <div className="kpi-value">{stats?.pendingPickups || 0}</div>
                <div className="kpi-label">Pendientes Recolección</div>
              </div>
              <div className="kpi-card kpi-danger">
                <div className="kpi-value">{stats?.inProcess || 0}</div>
                <div className="kpi-label">En Cremación</div>
              </div>
              <div className="kpi-card kpi-info">
                <div className="kpi-value">{stats?.readyForDelivery || 0}</div>
                <div className="kpi-label">Listas para Entrega</div>
              </div>
              <div className="kpi-card kpi-success">
                <div className="kpi-value">{stats?.todayOrders || 0}</div>
                <div className="kpi-label">Órdenes Hoy</div>
              </div>
            </div>

            {/* Status distribution */}
            {stats?.byStatus && (
              <div className="status-distribution">
                <h3>Distribución por Estado</h3>
                <div className="status-bars">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = stats.byStatus[key] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="status-bar-item" onClick={() => { setStatusFilter(key); setActiveSection('ordenes'); }}>
                        <div className="status-bar-label">
                          <span>{cfg.emoji} {cfg.label}</span>
                          <span className="status-bar-count">{count}</span>
                        </div>
                        <div className="status-bar-track">
                          <div className="status-bar-fill" style={{ width: `${(count / stats.totalOrders) * 100}%`, backgroundColor: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent orders */}
            <div className="recent-orders">
              <h3>Órdenes Recientes</h3>
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Estado</th>
                      <th>Mascota</th>
                      <th>Cliente</th>
                      <th>Peso</th>
                      <th>Empaque</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 10).map(order => (
                      <tr key={order.id}>
                        <td className="folio-cell">{order.folio}</td>
                        <td>
                          <span className="status-badge" style={{ backgroundColor: STATUS_CONFIG[order.status]?.color + '20', color: STATUS_CONFIG[order.status]?.color }}>
                            {STATUS_CONFIG[order.status]?.emoji} {STATUS_CONFIG[order.status]?.label}
                          </span>
                        </td>
                        <td>{order.petName} ({order.species})</td>
                        <td>{order.clientName}</td>
                        <td>{order.weightKg} kg</td>
                        <td>
                          <span className={`packaging-badge ${order.requiresTwoOps ? 'heavy' : ''}`}>
                            {order.packagingLabel}
                            {order.requiresTwoOps && ' ⚠️'}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <button className="btn-sm" onClick={() => handleViewDetail(order)}>Ver</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ALL ORDERS ==================== */}
        {activeSection === 'ordenes' && (
          <div className="section-content">
            <div className="section-header">
              <h2>📋 Todas las Órdenes</h2>
              <div className="header-actions">
                <button className="btn-secondary" onClick={handleExport}>📥 Exportar CSV</button>
                <button className="btn-primary" onClick={() => setShowOrderModal(true)}>+ Nueva Orden</button>
              </div>
            </div>

            {/* Filters */}
            <div className="filters-row">
              <input
                className="search-input"
                placeholder="Buscar por folio, nombre, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Orders list */}
            <div className="orders-list">
              {loading.orders ? (
                <div className="loading-state">Cargando órdenes...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">No se encontraron órdenes</div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className={`order-card ${order.requiresTwoOps ? 'heavy-service' : ''}`}>
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: STATUS_CONFIG[order.status]?.color + '20', color: STATUS_CONFIG[order.status]?.color }}>
                        {STATUS_CONFIG[order.status]?.emoji} {STATUS_CONFIG[order.status]?.label}
                      </span>
                    </div>
                    <div className="order-card-body">
                      <div className="order-info-grid">
                        <div><strong>🐾 {order.petName}</strong> ({order.species}{order.breed ? ` - ${order.breed}` : ''})</div>
                        <div>👤 {order.clientName} • 📞 {order.clientPhone}</div>
                        <div>⚖️ {order.weightKg} kg • 📦 {order.packagingLabel} {order.requiresTwoOps ? '⚠️ 2 operadores' : ''}</div>
                        {order.urn && <div>⚱️ {order.urn.name}</div>}
                        {order.originName && <div>🏥 {order.originName} ({order.originType})</div>}
                      </div>
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm" onClick={() => handleViewDetail(order)}>👁️ Ver detalle</button>
                      {order.status !== 'ENTREGADA' && order.status !== 'CANCELADA' && (
                        <button className="btn-sm btn-status" onClick={() => {
                          openStatusModal(order, NEXT_STATUS_MAP[order.status] || '');
                        }}>
                          ➡️ Avanzar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== RECOLECCIÓN ==================== */}
        {activeSection === 'recoleccion' && (
          <div className="section-content">
            <div className="section-header">
              <h2>🚗 Recolección y Pagos</h2>
            </div>

            <div className="sub-sections">
              {/* Pending pickup */}
              <div className="sub-section">
                <h3>📋 Pendientes de Programar ({orders.filter(o => o.status === 'SOLICITADA').length})</h3>
                {orders.filter(o => o.status === 'SOLICITADA').map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>📋 Solicitada</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚖️ {order.weightKg} kg • 📦 {order.packagingLabel}</div>
                      <div>👤 {order.clientName} • 📞 {order.clientPhone}</div>
                      <div>📍 {order.pickupAddress}</div>
                      {order.requiresTwoOps && <div className="alert-two-ops">⚠️ Requiere 2 operadores</div>}
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm btn-status" onClick={() => openStatusModal(order, 'RECOLECCION_PROGRAMADA')}>📅 Programar</button>
                      <button className="btn-sm" onClick={() => handleViewDetail(order)}>Ver</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scheduled pickups */}
              <div className="sub-section">
                <h3>📅 Programadas ({orders.filter(o => o.status === 'RECOLECCION_PROGRAMADA').length})</h3>
                {orders.filter(o => o.status === 'RECOLECCION_PROGRAMADA').map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>📅 Programada</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚖️ {order.weightKg} kg</div>
                      <div>📍 {order.pickupAddress}</div>
                      <div>📅 {formatDate(order.pickupDate)} {order.pickupTimeSlot && `• 🕐 ${order.pickupTimeSlot}`}</div>
                      {order.assignedTo && <div>👷 {order.assignedTo.nombre}</div>}
                      {order.requiresTwoOps && <div className="alert-two-ops">⚠️ Requiere 2 operadores</div>}
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm btn-status" onClick={() => openStatusModal(order, 'RECOLECCION_REALIZADA')}>✅ Recolectada</button>
                      <button className="btn-sm btn-pay" onClick={() => openPaymentModal(order)}>💰 Cobrar</button>
                      <button className="btn-sm" onClick={() => handleViewDetail(order)}>Ver</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed pickups */}
              <div className="sub-section">
                <h3>✅ Recolectadas ({orders.filter(o => o.status === 'RECOLECCION_REALIZADA').length})</h3>
                {orders.filter(o => o.status === 'RECOLECCION_REALIZADA').map(order => (
                  <div key={order.id} className="order-card completed-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>✅ Recolectada</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚖️ {order.weightKg} kg</div>
                      <div>Recolectada: {formatDateTime(order.pickedUpAt)}</div>
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm btn-status" onClick={() => openStatusModal(order, 'EN_CREMATORIO')}>🏭 Recibir en Crematorio</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CREMACIÓN ==================== */}
        {activeSection === 'cremacion' && (
          <div className="section-content">
            <div className="section-header">
              <h2>🔥 Cremación</h2>
            </div>

            <div className="sub-sections">
              {/* Received at crematory */}
              <div className="sub-section">
                <h3>🏭 En Crematorio ({orders.filter(o => o.status === 'EN_CREMATORIO').length})</h3>
                {orders.filter(o => o.status === 'EN_CREMATORIO').map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>🏭 En Crematorio</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • {order.species} • ⚖️ {order.weightKg} kg</div>
                      <div>Recibido: {formatDateTime(order.receivedAt)}</div>
                      {order.operator && <div>👷 Operador: {order.operator.nombre}</div>}
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm btn-status btn-fire" onClick={() => openStatusModal(order, 'EN_PROCESO')}>🔥 Iniciar Cremación</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* In process */}
              <div className="sub-section">
                <h3>🔥 En Proceso ({orders.filter(o => o.status === 'EN_PROCESO').length})</h3>
                {orders.filter(o => o.status === 'EN_PROCESO').map(order => {
                  const startTime = order.cremationStartAt ? new Date(order.cremationStartAt) : null;
                  const elapsed = startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0;
                  return (
                    <div key={order.id} className="order-card in-process-card">
                      <div className="order-card-header">
                        <span className="order-folio">{order.folio}</span>
                        <span className="status-badge" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>🔥 En Proceso</span>
                      </div>
                      <div className="order-card-body">
                        <div>🐾 {order.petName} • ⚖️ {order.weightKg} kg</div>
                        <div>Inicio: {formatDateTime(order.cremationStartAt)}</div>
                        <div className="elapsed-time">⏱️ {elapsed} min transcurridos</div>
                      </div>
                      <div className="order-card-actions">
                        <button className="btn-sm btn-status btn-complete" onClick={() => openStatusModal(order, 'LISTA_PARA_ENTREGA')}>✅ Finalizar</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ready for delivery */}
              <div className="sub-section">
                <h3>📦 Listas para Entrega ({orders.filter(o => o.status === 'LISTA_PARA_ENTREGA').length})</h3>
                {orders.filter(o => o.status === 'LISTA_PARA_ENTREGA').map(order => (
                  <div key={order.id} className="order-card ready-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#06b6d420', color: '#06b6d4' }}>📦 Lista</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚱️ {order.urn?.name || 'Sin urna'}</div>
                      <div>Finalizada: {formatDateTime(order.cremationEndAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== ENTREGAS ==================== */}
        {activeSection === 'entregas' && (
          <div className="section-content">
            <div className="section-header">
              <h2>📦 Entregas</h2>
            </div>

            <div className="sub-sections">
              {/* Ready for delivery */}
              <div className="sub-section">
                <h3>📦 Pendientes de Entrega ({orders.filter(o => o.status === 'LISTA_PARA_ENTREGA').length})</h3>
                {orders.filter(o => o.status === 'LISTA_PARA_ENTREGA').map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚱️ {order.urn?.name || 'Sin urna'}</div>
                      <div>👤 {order.clientName} • 📞 {order.clientPhone}</div>
                      <div>📍 {order.pickupAddress}</div>
                      {order.deliveryDate && <div>📅 Entrega programada: <strong>{formatDate(order.deliveryDate)}</strong></div>}
                      {!order.deliveryDate && <div style={{ color: '#d97706', fontSize: '0.85rem' }}>⚠️ Sin fecha de entrega programada</div>}
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm btn-status" onClick={() => {
                        const date = prompt('Fecha de entrega (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
                        if (date) {
                          updateOrder(order.id, { deliveryDate: date }).then(() => fetchOrders());
                        }
                      }}>📅 Programar</button>
                      <button className="btn-sm btn-status btn-deliver" onClick={() => openStatusModal(order, 'ENTREGADA')}>🕊️ Entregar</button>
                      <button className="btn-sm" onClick={() => handleViewDetail(order)}>Ver</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivered */}
              <div className="sub-section">
                <h3>🕊️ Entregadas ({orders.filter(o => o.status === 'ENTREGADA').length})</h3>
                {orders.filter(o => o.status === 'ENTREGADA').slice(0, 20).map(order => (
                  <div key={order.id} className="order-card completed-card">
                    <div className="order-card-header">
                      <span className="order-folio">{order.folio}</span>
                      <span className="status-badge" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>🕊️ Entregada</span>
                    </div>
                    <div className="order-card-body">
                      <div>🐾 {order.petName} • ⚱️ {order.urn?.name || '-'}</div>
                      <div>Entregada: {formatDateTime(order.deliveredAt)}</div>
                      {order.receiverName && <div>Recibió: {order.receiverName}</div>}
                    </div>
                    <div className="order-card-actions">
                      <button className="btn-sm" onClick={() => handleViewDetail(order)}>Ver</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CATÁLOGO URNAS ==================== */}
        {activeSection === 'catalogo' && (
          <div className="section-content">
            <div className="section-header">
              <h2>⚱️ Catálogo de Urnas</h2>
              {isAdmin && (
                <button className="btn-primary" onClick={() => { setEditingUrn(null); setUrnForm({ name: '', description: '', price: '', size: 'MEDIANA', imageUrl: '', active: true }); setShowUrnModal(true); }}>
                  + Nueva Urna
                </button>
              )}
            </div>

            <div className="urns-grid">
              {urns.map(urn => (
                <div key={urn.id} className={`urn-card ${urn.active === false ? 'urn-inactive' : ''}`}>
                  {urn.imageUrl && <img src={urn.imageUrl} alt={urn.name} className="urn-image" />}
                  <div className="urn-info">
                    <h4>{urn.name} {urn.active === false && <span className="urn-inactive-badge">Inactiva</span>}</h4>
                    <p>{urn.description}</p>
                    <div className="urn-meta">
                      <span className="urn-size">{urn.size}</span>
                      <span className="urn-price">${parseFloat(urn.price).toLocaleString()}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="urn-actions">
                      <button className="btn-sm" onClick={() => {
                        setEditingUrn(urn);
                        setUrnForm({ name: urn.name, description: urn.description || '', price: urn.price, size: urn.size, imageUrl: urn.imageUrl || '', active: urn.active !== false });
                        setShowUrnModal(true);
                      }}>✏️ Editar</button>
                      <button className={`btn-sm ${urn.active === false ? 'btn-success' : 'btn-warning'}`} onClick={() => handleToggleUrnActive(urn)}>
                        {urn.active === false ? '✅ Activar' : '🚫 Desactivar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== CONFIGURACIÓN (ADMIN ONLY) ==================== */}
        {activeSection === 'configuracion' && isAdmin && (
          <div className="section-content">
            <div className="section-header">
              <h2>⚙️ Configuración de Empaque</h2>
              <button className="btn-primary" onClick={() => {
                setEditingPackaging(null);
                setPackagingForm({ minKg: '', maxKg: '', label: '', requiresTwoOperators: false, sortOrder: '' });
                setShowPackagingModal(true);
              }}>+ Nuevo Rango</button>
            </div>

            <div className="packaging-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Min (kg)</th>
                    <th>Max (kg)</th>
                    <th>Etiqueta</th>
                    <th>2 Operadores</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {packagingRanges.map(r => (
                    <tr key={r.id}>
                      <td>{r.sortOrder}</td>
                      <td>{r.minKg}</td>
                      <td>{r.maxKg}</td>
                      <td>{r.label}</td>
                      <td>{r.requiresTwoOperators ? '⚠️ Sí' : 'No'}</td>
                      <td>
                        <button className="btn-sm" onClick={() => {
                          setEditingPackaging(r);
                          setPackagingForm({ minKg: r.minKg, maxKg: r.maxKg, label: r.label, requiresTwoOperators: r.requiresTwoOperators, sortOrder: r.sortOrder });
                          setShowPackagingModal(true);
                        }}>✏️</button>
                        <button className="btn-sm btn-danger-sm" onClick={() => handleDeletePackaging(r.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ==================== MODALS ==================== */}

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Nueva Orden de Cremación</h3>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Pet search */}
              <div className="pet-search-section">
                <h4>🔍 Buscar Paciente Registrado</h4>
                <div className="pet-search-container">
                  <input
                    className="form-control"
                    placeholder="Buscar por nombre de mascota, ficha, dueño o teléfono..."
                    value={petSearchTerm}
                    onChange={e => handlePetSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowPetResults(false), 200)}
                    onFocus={() => petSearchResults.length > 0 && setShowPetResults(true)}
                  />
                  {petSearching && <span className="pet-search-loading">Buscando...</span>}
                  {showPetResults && petSearchResults.length > 0 && (
                    <div className="pet-search-results">
                      {petSearchResults.map(pet => (
                        <div key={pet.id} className="pet-search-item" onMouseDown={() => handleSelectPet(pet)}>
                          <span className="pet-search-icon">{pet.especie === 'GATO' ? '🐈' : '🐕'}</span>
                          <div className="pet-search-info">
                            <strong>{pet.nombre}</strong> <small>({pet.numeroFicha})</small>
                            <div className="pet-search-detail">
                              {pet.especie} • {pet.raza || '-'} {pet.peso ? `• ${pet.peso}kg` : ''}
                              {pet.owner && <> — 👤 {pet.owner.nombre} ({pet.owner.telefono})</>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPetResults && petSearchResults.length === 0 && petSearchTerm.length >= 2 && !petSearching && (
                    <div className="pet-search-results">
                      <div className="pet-search-empty">No se encontraron pacientes</div>
                    </div>
                  )}
                </div>
                <p className="pet-search-hint">Selecciona un paciente para llenar automáticamente, o llena manualmente abajo.</p>
              </div>

              <h4>🐾 Datos de la Mascota</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input className="form-control" value={orderForm.petName} onChange={e => setOrderForm(p => ({ ...p, petName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Especie *</label>
                  <select className="form-control" value={orderForm.species} onChange={e => setOrderForm(p => ({ ...p, species: e.target.value }))}>
                    <option>Canino</option>
                    <option>Felino</option>
                    <option>Ave</option>
                    <option>Reptil</option>
                    <option>Roedor</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Raza</label>
                  <input className="form-control" value={orderForm.breed} onChange={e => setOrderForm(p => ({ ...p, breed: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Sexo</label>
                  <select className="form-control" value={orderForm.sex} onChange={e => setOrderForm(p => ({ ...p, sex: e.target.value }))}>
                    <option value="">-</option>
                    <option>Macho</option>
                    <option>Hembra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Edad</label>
                  <input className="form-control" value={orderForm.age} onChange={e => setOrderForm(p => ({ ...p, age: e.target.value }))} placeholder="Ej: 8 años" />
                </div>
                <div className="form-group">
                  <label>Peso (kg) *</label>
                  <input className="form-control" type="number" step="0.1" value={orderForm.weightKg} onChange={e => setOrderForm(p => ({ ...p, weightKg: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input className="form-control" value={orderForm.color} onChange={e => setOrderForm(p => ({ ...p, color: e.target.value }))} />
                </div>
                <div className="form-group full-width">
                  <label>Características</label>
                  <textarea className="form-control" value={orderForm.characteristics} onChange={e => setOrderForm(p => ({ ...p, characteristics: e.target.value }))} rows="2" />
                </div>
              </div>

              <h4>👤 Datos del Solicitante</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input className="form-control" value={orderForm.clientName} onChange={e => setOrderForm(p => ({ ...p, clientName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Teléfono *</label>
                  <input className="form-control" value={orderForm.clientPhone} onChange={e => setOrderForm(p => ({ ...p, clientPhone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" value={orderForm.clientEmail} onChange={e => setOrderForm(p => ({ ...p, clientEmail: e.target.value }))} />
                </div>
              </div>

              <h4>🏥 Origen</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de Origen</label>
                  <select className="form-control" value={orderForm.originType} onChange={e => setOrderForm(p => ({ ...p, originType: e.target.value }))}>
                    <option value="DIRECTO">Directo</option>
                    <option value="CLINICA">Clínica</option>
                    <option value="ALIADO">Aliado Comercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre Clínica/Aliado</label>
                  <input className="form-control" value={orderForm.originName} onChange={e => setOrderForm(p => ({ ...p, originName: e.target.value }))} />
                </div>
              </div>

              <h4>🚗 Recolección</h4>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Dirección de Recolección *</label>
                  <input className="form-control" value={orderForm.pickupAddress} onChange={e => setOrderForm(p => ({ ...p, pickupAddress: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Fecha de Recolección</label>
                  <input className="form-control" type="date" value={orderForm.pickupDate} onChange={e => setOrderForm(p => ({ ...p, pickupDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Horario</label>
                  <input className="form-control" value={orderForm.pickupTimeSlot} onChange={e => setOrderForm(p => ({ ...p, pickupTimeSlot: e.target.value }))} placeholder="Ej: 10:00-12:00" />
                </div>
                <div className="form-group full-width">
                  <label>Notas de Recolección</label>
                  <textarea className="form-control" value={orderForm.pickupNotes} onChange={e => setOrderForm(p => ({ ...p, pickupNotes: e.target.value }))} rows="2" />
                </div>
              </div>

              <h4>⚱️ Urna</h4>
              <div className="form-group">
                <label>Seleccionar Urna</label>
                <select className="form-control" value={orderForm.urnId} onChange={e => setOrderForm(p => ({ ...p, urnId: e.target.value }))}>
                  <option value="">Sin urna</option>
                  {urns.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - ${parseFloat(u.price).toLocaleString()} ({u.size})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notas generales</label>
                <textarea className="form-control" value={orderForm.notes} onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))} rows="2" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowOrderModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateOrder}
                disabled={!orderForm.petName || !orderForm.clientName || !orderForm.clientPhone || !orderForm.weightKg || submitting}>
                {submitting ? '⏳ Creando...' : '📋 Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Orden {selectedOrder.folio}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-status">
                <span className="status-badge large" style={{ backgroundColor: STATUS_CONFIG[selectedOrder.status]?.color + '20', color: STATUS_CONFIG[selectedOrder.status]?.color }}>
                  {STATUS_CONFIG[selectedOrder.status]?.emoji} {STATUS_CONFIG[selectedOrder.status]?.label}
                </span>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4>🐾 Mascota</h4>
                  <p><strong>{selectedOrder.petName}</strong></p>
                  <p>{selectedOrder.species} {selectedOrder.breed ? `- ${selectedOrder.breed}` : ''}</p>
                  <p>Sexo: {selectedOrder.sex || '-'} • Edad: {selectedOrder.age || '-'}</p>
                  <p>Color: {selectedOrder.color || '-'}</p>
                  <p>Peso: <strong>{selectedOrder.weightKg} kg</strong> • Empaque: <strong>{selectedOrder.packagingLabel}</strong></p>
                  {selectedOrder.characteristics && <p>{selectedOrder.characteristics}</p>}
                </div>

                <div className="detail-section">
                  <h4>👤 Solicitante</h4>
                  <p><strong>{selectedOrder.clientName}</strong></p>
                  <p>📞 {selectedOrder.clientPhone}</p>
                  {selectedOrder.clientEmail && <p>📧 {selectedOrder.clientEmail}</p>}
                  <p>Origen: {selectedOrder.originName || selectedOrder.originType}</p>
                </div>

                <div className="detail-section">
                  <h4>🚗 Recolección</h4>
                  <p>📍 {selectedOrder.pickupAddress}</p>
                  <p>📅 {formatDate(selectedOrder.pickupDate)} {selectedOrder.pickupTimeSlot ? `• ${selectedOrder.pickupTimeSlot}` : ''}</p>
                  {selectedOrder.assignedTo && <p>👷 {selectedOrder.assignedTo.nombre}</p>}
                  {selectedOrder.pickedUpAt && <p>✅ Recolectada: {formatDateTime(selectedOrder.pickedUpAt)}</p>}
                </div>

                <div className="detail-section">
                  <h4>⚱️ Urna & Cremación</h4>
                  <p>Urna: {selectedOrder.urn?.name || 'Sin urna'}</p>
                  {selectedOrder.receivedAt && <p>Recibido: {formatDateTime(selectedOrder.receivedAt)}</p>}
                  {selectedOrder.cremationStartAt && <p>Inicio: {formatDateTime(selectedOrder.cremationStartAt)}</p>}
                  {selectedOrder.cremationEndAt && <p>Fin: {formatDateTime(selectedOrder.cremationEndAt)}</p>}
                  {selectedOrder.deliveryDate && <p>📅 Entrega: {formatDate(selectedOrder.deliveryDate)}</p>}
                  {selectedOrder.deliveredAt && <p>🕊️ Entregada: {formatDateTime(selectedOrder.deliveredAt)}</p>}
                  {selectedOrder.receiverName && <p>Recibió: {selectedOrder.receiverName} {selectedOrder.receiverPhone ? `• 📞 ${selectedOrder.receiverPhone}` : ''}</p>}
                </div>
              </div>

              {/* Payments */}
              {selectedOrder.payments?.length > 0 && (
                <div className="detail-section">
                  <h4>💰 Pagos</h4>
                  {selectedOrder.payments.map(p => (
                    <div key={p.id} className="payment-row">
                      <span>${parseFloat(p.amount).toLocaleString()}</span>
                      <span>{p.method}</span>
                      <span className="status-badge" style={{ backgroundColor: PAYMENT_STATUS[p.status]?.color + '20', color: PAYMENT_STATUS[p.status]?.color }}>
                        {PAYMENT_STATUS[p.status]?.label}
                      </span>
                      <span>{formatDateTime(p.paidAt || p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status log */}
              {selectedOrder.statusLogs?.length > 0 && (
                <div className="detail-section">
                  <h4>📜 Historial</h4>
                  <div className="status-timeline">
                    {selectedOrder.statusLogs.map(log => (
                      <div key={log.id} className="timeline-item">
                        <span className="timeline-dot" style={{ backgroundColor: STATUS_CONFIG[log.newStatus]?.color || '#999' }} />
                        <div className="timeline-content">
                          <span>{STATUS_CONFIG[log.newStatus]?.emoji} {STATUS_CONFIG[log.newStatus]?.label}</span>
                          <span className="timeline-meta">
                            {formatDateTime(log.createdAt)} {log.changedBy ? `• ${log.changedBy.nombre}` : ''}
                          </span>
                          {log.notes && <span className="timeline-notes">{log.notes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Cerrar</button>
              {selectedOrder.status !== 'ENTREGADA' && selectedOrder.status !== 'CANCELADA' && (
                <>
                  <button className="btn-sm btn-pay" onClick={() => { setShowDetailModal(false); openPaymentModal(selectedOrder); }}>💰 Pago</button>
                  <button className="btn-primary" onClick={() => {
                    setShowDetailModal(false);
                    openStatusModal(selectedOrder, NEXT_STATUS_MAP[selectedOrder.status] || '');
                  }}>➡️ Avanzar Estado</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cambiar Estado — {selectedOrder.folio}</h3>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="status-change-info">
                <span className="status-badge" style={{ backgroundColor: STATUS_CONFIG[selectedOrder.status]?.color + '20', color: STATUS_CONFIG[selectedOrder.status]?.color }}>
                  {STATUS_CONFIG[selectedOrder.status]?.label}
                </span>
                <span className="status-arrow">→</span>
                <span className="status-badge" style={{ backgroundColor: STATUS_CONFIG[statusForm.status]?.color + '20', color: STATUS_CONFIG[statusForm.status]?.color }}>
                  {STATUS_CONFIG[statusForm.status]?.label}
                </span>
              </div>

              {/* Extra fields for RECOLECCION_PROGRAMADA */}
              {statusForm.status === 'RECOLECCION_PROGRAMADA' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fecha de Recolección</label>
                    <input className="form-control" type="date" value={statusForm.pickupDate} onChange={e => setStatusForm(p => ({ ...p, pickupDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Horario</label>
                    <input className="form-control" value={statusForm.pickupTimeSlot} onChange={e => setStatusForm(p => ({ ...p, pickupTimeSlot: e.target.value }))} placeholder="Ej: 10:00-12:00" />
                  </div>
                </div>
              )}

              {/* Extra fields for LISTA_PARA_ENTREGA */}
              {statusForm.status === 'LISTA_PARA_ENTREGA' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Fecha Programada de Entrega</label>
                    <input className="form-control" type="date" value={statusForm.deliveryDate} onChange={e => setStatusForm(p => ({ ...p, deliveryDate: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Extra fields for ENTREGADA */}
              {statusForm.status === 'ENTREGADA' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre de quien recibe</label>
                    <input className="form-control" value={statusForm.receiverName} onChange={e => setStatusForm(p => ({ ...p, receiverName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Teléfono de quien recibe</label>
                    <input className="form-control" value={statusForm.receiverPhone} onChange={e => setStatusForm(p => ({ ...p, receiverPhone: e.target.value }))} />
                  </div>
                  <div className="form-group full-width">
                    <label>Notas de entrega</label>
                    <textarea className="form-control" value={statusForm.deliveryNotes} onChange={e => setStatusForm(p => ({ ...p, deliveryNotes: e.target.value }))} rows="2" />
                  </div>
                </div>
              )}

              {/* Cancel option */}
              {statusForm.status !== 'CANCELADA' && selectedOrder.status !== 'ENTREGADA' && selectedOrder.status !== 'CANCELADA' && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn-sm btn-danger-sm" style={{ width: '100%' }} onClick={() => setStatusForm(p => ({ ...p, status: 'CANCELADA' }))}>
                    ❌ Cancelar Orden
                  </button>
                </div>
              )}

              <div className="form-group">
                <label>Notas</label>
                <textarea className="form-control" value={statusForm.notes} onChange={e => setStatusForm(p => ({ ...p, notes: e.target.value }))} rows="2" placeholder="Notas opcionales..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleStatusChange} disabled={submitting}>
                {submitting ? '⏳ ...' : `${STATUS_CONFIG[statusForm.status]?.emoji} Confirmar`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Registrar Pago — {selectedOrder.folio}</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Monto *</label>
                  <input className="form-control" type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Método de Pago</label>
                  <select className="form-control" value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}>
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TARJETA">💳 Tarjeta</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Referencia</label>
                  <input className="form-control" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea className="form-control" value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} rows="2" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreatePayment} disabled={!paymentForm.amount || submitting}>
                {submitting ? '⏳ ...' : '💰 Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Urn Modal */}
      {showUrnModal && (
        <div className="modal-overlay" onClick={() => setShowUrnModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUrn ? '✏️ Editar Urna' : '⚱️ Nueva Urna'}</h3>
              <button className="modal-close" onClick={() => setShowUrnModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input className="form-control" value={urnForm.name} onChange={e => setUrnForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Precio *</label>
                  <input className="form-control" type="number" step="0.01" value={urnForm.price} onChange={e => setUrnForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Tamaño</label>
                  <select className="form-control" value={urnForm.size} onChange={e => setUrnForm(p => ({ ...p, size: e.target.value }))}>
                    <option value="CHICA">Chica</option>
                    <option value="MEDIANA">Mediana</option>
                    <option value="GRANDE">Grande</option>
                    <option value="EXTRA_GRANDE">Extra Grande</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={urnForm.active} onChange={e => setUrnForm(p => ({ ...p, active: e.target.checked }))} />
                    Activa (visible en catálogo)
                  </label>
                </div>
                <div className="form-group full-width">
                  <label>Descripción</label>
                  <textarea className="form-control" value={urnForm.description} onChange={e => setUrnForm(p => ({ ...p, description: e.target.value }))} rows="2" />
                </div>
                <div className="form-group full-width">
                  <label>URL de Imagen</label>
                  <input className="form-control" value={urnForm.imageUrl} onChange={e => setUrnForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowUrnModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveUrn} disabled={!urnForm.name || !urnForm.price || submitting}>
                {submitting ? '⏳ ...' : editingUrn ? '✏️ Guardar' : '⚱️ Crear Urna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packaging Range Modal */}
      {showPackagingModal && (
        <div className="modal-overlay" onClick={() => setShowPackagingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPackaging ? '✏️ Editar Rango' : '📦 Nuevo Rango de Empaque'}</h3>
              <button className="modal-close" onClick={() => setShowPackagingModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Peso Mínimo (kg) *</label>
                  <input className="form-control" type="number" step="0.1" value={packagingForm.minKg} onChange={e => setPackagingForm(p => ({ ...p, minKg: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Peso Máximo (kg) *</label>
                  <input className="form-control" type="number" step="0.1" value={packagingForm.maxKg} onChange={e => setPackagingForm(p => ({ ...p, maxKg: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Etiqueta *</label>
                  <input className="form-control" value={packagingForm.label} onChange={e => setPackagingForm(p => ({ ...p, label: e.target.value }))} placeholder="Ej: Bolsa chica" />
                </div>
                <div className="form-group">
                  <label>Orden de Sorteo</label>
                  <input className="form-control" type="number" value={packagingForm.sortOrder} onChange={e => setPackagingForm(p => ({ ...p, sortOrder: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={packagingForm.requiresTwoOperators} onChange={e => setPackagingForm(p => ({ ...p, requiresTwoOperators: e.target.checked }))} />
                    Requiere 2 operadores
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPackagingModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSavePackaging} disabled={!packagingForm.label || !packagingForm.maxKg || submitting}>
                {submitting ? '⏳ ...' : editingPackaging ? '✏️ Guardar' : '📦 Crear Rango'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
