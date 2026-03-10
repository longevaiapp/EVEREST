import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import useBancoSangre from '../../hooks/useBancoSangre';
import './BancoSangreDashboard.css';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'donadores', label: 'Donadores', icon: '🐾' },
  { id: 'inventario', label: 'Inventario', icon: '🩸' },
  { id: 'transfusiones', label: 'Transfusiones', icon: '💉' },
  { id: 'alertas', label: 'Alertas', icon: '🔔' },
  { id: 'config', label: 'Configuración', icon: '⚙️' },
];

const PRODUCT_LABELS = {
  SANGRE_TOTAL: 'Sangre Total',
  CONCENTRADO_ERITROCITARIO: 'Concentrado Eritrocitario',
  PLASMA: 'Plasma',
};

const STATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  RESERVADA: 'Reservada',
  UTILIZADA: 'Utilizada',
  CADUCADA: 'Caducada',
  DESCARTADA: 'Descartada',
};

const STATUS_COLORS = {
  DISPONIBLE: '#28a745',
  RESERVADA: '#ffc107',
  UTILIZADA: '#17a2b8',
  CADUCADA: '#dc3545',
  DESCARTADA: '#6c757d',
};

const DONOR_STATUS_LABELS = {
  ACTIVO: 'Activo',
  TEMPORALMENTE_NO_APTO: 'Temp. No Apto',
  RETIRADO: 'Retirado',
};

export default function BancoSangreDashboard() {
  const { user } = useAuth();
  const {
    stats, donors, selectedDonor, units, transfusions, alerts, config,
    loading,
    setSelectedDonor,
    fetchDashboard, fetchDonors, fetchDonor, createDonor, updateDonor,
    createEvaluation, createTest,
    createDonation,
    fetchUnits, updateUnitStatus, checkExpiry,
    fetchTransfusions, createTransfusion,
    fetchAlerts, resolveAlert,
    fetchConfig, updateConfig,
    searchPet,
  } = useBancoSangre();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modals
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showTransfusionModal, setShowTransfusionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Forms
  const [donorForm, setDonorForm] = useState({ isExternal: false, petId: null });
  const [evalForm, setEvalForm] = useState({ resultado: 'APTO' });
  const [testForm, setTestForm] = useState({});
  const [donationForm, setDonationForm] = useState({ metodoContencion: 'FISICA', tipoProducto: 'SANGRE_TOTAL' });
  const [transfusionForm, setTransfusionForm] = useState({ isExternalRecipient: false });
  const [configForm, setConfigForm] = useState({});

  // Pet search
  const [petSearchQuery, setPetSearchQuery] = useState('');
  const [petSearchResults, setPetSearchResults] = useState([]);

  // Filters
  const [donorFilter, setDonorFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Pet search effect
  useEffect(() => {
    const t = setTimeout(async () => {
      if (petSearchQuery.length >= 2) {
        const results = await searchPet(petSearchQuery);
        setPetSearchResults(results);
      } else {
        setPetSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [petSearchQuery, searchPet]);

  const getDonorDisplayName = (donor) => {
    if (donor.pet) return donor.pet.nombre;
    return donor.nombre || 'Sin nombre';
  };

  const getDonorOwner = (donor) => {
    if (donor.pet?.owner) return donor.pet.owner;
    return { nombre: donor.ownerName, telefono: donor.ownerPhone, email: donor.ownerEmail };
  };

  const getDonorSpecies = (donor) => {
    if (donor.pet) return donor.pet.especie;
    return donor.especie;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateDonor = async () => {
    try {
      await createDonor(donorForm);
      setShowDonorModal(false);
      setDonorForm({ isExternal: false, petId: null });
      showToast('Donador registrado exitosamente');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al crear donador', 'error');
    }
  };

  const handleCreateEvaluation = async () => {
    if (!selectedDonor) return;
    try {
      await createEvaluation(selectedDonor.id, evalForm);
      setShowEvalModal(false);
      setEvalForm({ resultado: 'APTO' });
      showToast('Evaluación registrada');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error', 'error');
    }
  };

  const handleCreateTest = async () => {
    if (!selectedDonor) return;
    try {
      await createTest(selectedDonor.id, testForm);
      setShowTestModal(false);
      setTestForm({});
      showToast('Prueba diagnóstica registrada');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error', 'error');
    }
  };

  const handleCreateDonation = async () => {
    if (!selectedDonor) return;
    try {
      await createDonation({ ...donationForm, donorId: selectedDonor.id });
      setShowDonationModal(false);
      setDonationForm({ metodoContencion: 'FISICA', tipoProducto: 'SANGRE_TOTAL' });
      showToast('Donación registrada y unidad sanguínea generada');
      await fetchDonor(selectedDonor.id);
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al registrar donación', 'error');
    }
  };

  const handleCreateTransfusion = async () => {
    try {
      await createTransfusion(transfusionForm);
      setShowTransfusionModal(false);
      setTransfusionForm({ isExternalRecipient: false });
      showToast('Transfusión registrada exitosamente');
    } catch (e) {
      showToast(e.response?.data?.error || 'Error al registrar transfusión', 'error');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateConfig(configForm);
      showToast('Configuración guardada');
    } catch (e) {
      showToast('Error al guardar configuración', 'error');
    }
  };

  const handleCheckExpiry = async () => {
    try {
      const result = await checkExpiry();
      showToast(`Verificación completada: ${result.expiredMarked} expiradas, ${result.expiringSoonAlerts} alertas`);
    } catch (e) {
      showToast('Error en verificación', 'error');
    }
  };

  // Filter donors
  const filteredDonors = donors.filter(d => {
    if (donorFilter && d.estado !== donorFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = getDonorDisplayName(d).toLowerCase();
      const owner = getDonorOwner(d)?.nombre?.toLowerCase() || '';
      return name.includes(s) || owner.includes(s) || (d.tipoSanguineo || '').toLowerCase().includes(s);
    }
    return true;
  });

  const filteredUnits = units.filter(u => {
    if (unitFilter && u.status !== unitFilter) return false;
    return true;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-MX') : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-MX') : '—';

  const daysUntilExpiry = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bb-dashboard">
      {/* Sidebar */}
      <div className="bb-sidebar">
        <div className="bb-sidebar-header">
          <span className="bb-sidebar-icon">🩸</span>
          <h2>Banco de Sangre</h2>
        </div>
        <nav className="bb-nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`bb-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(s.id);
                setSelectedDonor(null);
                if (s.id === 'transfusiones') fetchTransfusions();
                if (s.id === 'alertas') fetchAlerts({ resuelta: false });
                if (s.id === 'config') fetchConfig();
              }}
            >
              <span>{s.icon}</span> {s.label}
              {s.id === 'alertas' && alerts.filter(a => !a.resuelta).length > 0 && (
                <span className="bb-badge-alert">{alerts.filter(a => !a.resuelta).length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="bb-content">
        {toast && (
          <div className={`bb-toast bb-toast-${toast.type}`}>
            {toast.message}
          </div>
        )}

        {/* DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="bb-section">
            <h2>Dashboard — Banco de Sangre</h2>
            {stats ? (
              <>
                <div className="bb-stats-grid">
                  <div className="bb-stat-card bb-stat-primary">
                    <div className="bb-stat-value">{stats.totalUnitsAvailable}</div>
                    <div className="bb-stat-label">Unidades Disponibles</div>
                  </div>
                  <div className="bb-stat-card bb-stat-warning">
                    <div className="bb-stat-value">{stats.expiringUnits}</div>
                    <div className="bb-stat-label">Próximas a Caducar</div>
                  </div>
                  <div className="bb-stat-card bb-stat-success">
                    <div className="bb-stat-value">{stats.activeDonors}</div>
                    <div className="bb-stat-label">Donadores Activos</div>
                  </div>
                  <div className="bb-stat-card bb-stat-info">
                    <div className="bb-stat-value">{stats.eligibleDonors}</div>
                    <div className="bb-stat-label">Elegibles para Donar</div>
                  </div>
                  <div className="bb-stat-card">
                    <div className="bb-stat-value">{stats.recentTransfusions}</div>
                    <div className="bb-stat-label">Transfusiones este Mes</div>
                  </div>
                  <div className="bb-stat-card bb-stat-danger">
                    <div className="bb-stat-value">{stats.unresolvedAlerts}</div>
                    <div className="bb-stat-label">Alertas Activas</div>
                  </div>
                </div>

                <div className="bb-dashboard-grid">
                  <div className="bb-dashboard-card">
                    <h3>Unidades por Tipo de Producto</h3>
                    <div className="bb-chart-list">
                      {stats.unitsByType?.map(u => (
                        <div key={u.tipo} className="bb-chart-item">
                          <span className="bb-chart-label">{PRODUCT_LABELS[u.tipo] || u.tipo}</span>
                          <span className="bb-chart-value">{u.count}</span>
                        </div>
                      ))}
                      {(!stats.unitsByType || stats.unitsByType.length === 0) && (
                        <p className="bb-empty">Sin unidades disponibles</p>
                      )}
                    </div>
                  </div>
                  <div className="bb-dashboard-card">
                    <h3>Unidades por Tipo Sanguíneo</h3>
                    <div className="bb-chart-list">
                      {stats.unitsByBloodType?.map(u => (
                        <div key={u.tipo} className="bb-chart-item">
                          <span className="bb-chart-label">{u.tipo}</span>
                          <span className="bb-chart-value">{u.count}</span>
                        </div>
                      ))}
                      {(!stats.unitsByBloodType || stats.unitsByBloodType.length === 0) && (
                        <p className="bb-empty">Sin datos de tipo sanguíneo</p>
                      )}
                    </div>
                  </div>
                </div>

                <button className="bb-btn bb-btn-secondary" onClick={handleCheckExpiry} style={{ marginTop: 16 }}>
                  🔄 Verificar Caducidad y Elegibilidad
                </button>
              </>
            ) : (
              <div className="bb-loading">Cargando...</div>
            )}
          </div>
        )}

        {/* DONADORES */}
        {activeSection === 'donadores' && !selectedDonor && (
          <div className="bb-section">
            <div className="bb-section-header">
              <h2>Donadores</h2>
              <button className="bb-btn bb-btn-primary" onClick={() => {
                setDonorForm({ isExternal: false, petId: null });
                setPetSearchQuery('');
                setPetSearchResults([]);
                setShowDonorModal(true);
              }}>
                + Nuevo Donador
              </button>
            </div>

            <div className="bb-filters">
              <input
                className="bb-search"
                placeholder="Buscar donador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="bb-select" value={donorFilter} onChange={e => setDonorFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="TEMPORALMENTE_NO_APTO">Temp. No Apto</option>
                <option value="RETIRADO">Retirado</option>
              </select>
            </div>

            <div className="bb-table-wrapper">
              <table className="bb-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Especie</th>
                    <th>Tipo Sanguíneo</th>
                    <th>Propietario</th>
                    <th>Estado</th>
                    <th>Donaciones</th>
                    <th>Última Donación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map(d => {
                    const owner = getDonorOwner(d);
                    return (
                      <tr key={d.id} className={d.petId ? '' : 'bb-row-external'}>
                        <td>
                          <strong>{getDonorDisplayName(d)}</strong>
                          {!d.petId && <span className="bb-badge-ext" title="No registrado en sistema">EXT</span>}
                        </td>
                        <td>{getDonorSpecies(d) || '—'}</td>
                        <td><span className="bb-blood-type">{d.tipoSanguineo || '—'}</span></td>
                        <td>{owner?.nombre || '—'}</td>
                        <td>
                          <span className={`bb-status bb-status-${d.estado.toLowerCase()}`}>
                            {DONOR_STATUS_LABELS[d.estado]}
                          </span>
                        </td>
                        <td>{d.totalDonaciones}</td>
                        <td>{formatDate(d.fechaUltimaDonacion)}</td>
                        <td>
                          <button className="bb-btn-sm" onClick={() => fetchDonor(d.id)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDonors.length === 0 && (
                    <tr><td colSpan={8} className="bb-empty">No hay donadores registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DONOR DETAIL */}
        {activeSection === 'donadores' && selectedDonor && (
          <div className="bb-section">
            <button className="bb-btn-back" onClick={() => setSelectedDonor(null)}>
              ← Volver a Donadores
            </button>

            <div className="bb-donor-header">
              <div className="bb-donor-info">
                <h2>{getDonorDisplayName(selectedDonor)}
                  {!selectedDonor.petId && <span className="bb-badge-ext">EXTERNO</span>}
                </h2>
                <div className="bb-donor-meta">
                  <span>Especie: <strong>{getDonorSpecies(selectedDonor) || '—'}</strong></span>
                  <span>Raza: <strong>{selectedDonor.pet?.raza || selectedDonor.raza || '—'}</strong></span>
                  <span>Peso: <strong>{selectedDonor.pet?.peso || selectedDonor.peso || '—'} kg</strong></span>
                  <span>Tipo Sanguíneo: <strong className="bb-blood-type">{selectedDonor.tipoSanguineo || 'Sin tipificar'}</strong></span>
                </div>
                <div className="bb-donor-meta">
                  <span>Propietario: <strong>{getDonorOwner(selectedDonor)?.nombre || '—'}</strong></span>
                  <span>Teléfono: <strong>{getDonorOwner(selectedDonor)?.telefono || '—'}</strong></span>
                  <span>Total donaciones: <strong>{selectedDonor.totalDonaciones}</strong></span>
                  <span>Última donación: <strong>{formatDate(selectedDonor.fechaUltimaDonacion)}</strong></span>
                </div>
              </div>
              <div className="bb-donor-actions">
                <span className={`bb-status bb-status-${selectedDonor.estado.toLowerCase()}`}>
                  {DONOR_STATUS_LABELS[selectedDonor.estado]}
                </span>
                <select
                  className="bb-select-sm"
                  value={selectedDonor.estado}
                  onChange={e => updateDonor(selectedDonor.id, { estado: e.target.value })}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="TEMPORALMENTE_NO_APTO">Temp. No Apto</option>
                  <option value="RETIRADO">Retirado</option>
                </select>
              </div>
            </div>

            <div className="bb-donor-sections">
              <div className="bb-donor-section-actions">
                <button className="bb-btn bb-btn-primary" onClick={() => { setEvalForm({ resultado: 'APTO' }); setShowEvalModal(true); }}>
                  + Evaluación Médica
                </button>
                <button className="bb-btn bb-btn-secondary" onClick={() => { setTestForm({}); setShowTestModal(true); }}>
                  + Prueba Diagnóstica
                </button>
                <button className="bb-btn bb-btn-success" onClick={() => { setDonationForm({ metodoContencion: 'FISICA', tipoProducto: 'SANGRE_TOTAL' }); setShowDonationModal(true); }}
                  disabled={selectedDonor.estado !== 'ACTIVO'}
                >
                  + Registrar Donación
                </button>
              </div>

              {/* Evaluations History */}
              <div className="bb-history-card">
                <h3>📋 Evaluaciones Médicas ({selectedDonor.evaluations?.length || 0})</h3>
                {selectedDonor.evaluations?.length > 0 ? (
                  <div className="bb-history-list">
                    {selectedDonor.evaluations.map(ev => (
                      <div key={ev.id} className={`bb-history-item bb-eval-${ev.resultado.toLowerCase()}`}>
                        <div className="bb-history-date">{formatDateTime(ev.fecha)}</div>
                        <div className="bb-history-body">
                          <span className={`bb-badge bb-badge-${ev.resultado === 'APTO' ? 'success' : 'danger'}`}>
                            {ev.resultado}
                          </span>
                          <span>T: {ev.temperatura || '—'}°C</span>
                          <span>FC: {ev.frecuenciaCardiaca || '—'}</span>
                          <span>FR: {ev.frecuenciaRespiratoria || '—'}</span>
                          <span>Mucosas: {ev.mucosas || '—'}</span>
                          <span>TRC: {ev.tiempoLlenadoCapilar || '—'}</span>
                          {ev.observaciones && <p className="bb-obs">{ev.observaciones}</p>}
                        </div>
                        <div className="bb-history-by">Dr. {ev.evaluator?.nombre}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="bb-empty">Sin evaluaciones registradas</p>}
              </div>

              {/* Diagnostic Tests History */}
              <div className="bb-history-card">
                <h3>🔬 Pruebas Diagnósticas ({selectedDonor.diagnosticTests?.length || 0})</h3>
                {selectedDonor.diagnosticTests?.length > 0 ? (
                  <div className="bb-history-list">
                    {selectedDonor.diagnosticTests.map(t => (
                      <div key={t.id} className="bb-history-item">
                        <div className="bb-history-date">{formatDateTime(t.fecha)}</div>
                        <div className="bb-history-body bb-test-results">
                          <div className="bb-test-group">
                            <strong>Hematología</strong>
                            <span>Hto: {t.hematocrito ?? '—'}%</span>
                            <span>Hb: {t.hemoglobina ?? '—'}</span>
                            <span>Eritro: {t.eritrocitos ?? '—'}</span>
                            <span>Leuco: {t.leucocitos ?? '—'}</span>
                            <span>Plaq: {t.plaquetas ?? '—'}</span>
                          </div>
                          {(t.ehrlichia || t.anaplasma || t.babesia || t.dirofilaria || t.brucella) && (
                            <div className="bb-test-group">
                              <strong>Infecciosas (Perro)</strong>
                              {t.ehrlichia && <span>Ehrlichia: {t.ehrlichia}</span>}
                              {t.anaplasma && <span>Anaplasma: {t.anaplasma}</span>}
                              {t.babesia && <span>Babesia: {t.babesia}</span>}
                              {t.dirofilaria && <span>Dirofilaria: {t.dirofilaria}</span>}
                              {t.brucella && <span>Brucella: {t.brucella}</span>}
                            </div>
                          )}
                          {(t.felv || t.fiv || t.hemoplasmas) && (
                            <div className="bb-test-group">
                              <strong>Infecciosas (Gato)</strong>
                              {t.felv && <span>FeLV: {t.felv}</span>}
                              {t.fiv && <span>FIV: {t.fiv}</span>}
                              {t.hemoplasmas && <span>Hemoplasmas: {t.hemoplasmas}</span>}
                            </div>
                          )}
                          {t.tipificacionSanguinea && (
                            <div className="bb-test-group">
                              <strong>Tipificación:</strong> <span className="bb-blood-type">{t.tipificacionSanguinea}</span>
                            </div>
                          )}
                          {t.observaciones && <p className="bb-obs">{t.observaciones}</p>}
                        </div>
                        <div className="bb-history-by">{t.registeredBy?.nombre}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="bb-empty">Sin pruebas diagnósticas</p>}
              </div>

              {/* Donations History */}
              <div className="bb-history-card">
                <h3>🩸 Historial de Donaciones ({selectedDonor.donations?.length || 0})</h3>
                {selectedDonor.donations?.length > 0 ? (
                  <div className="bb-history-list">
                    {selectedDonor.donations.map(don => (
                      <div key={don.id} className="bb-history-item">
                        <div className="bb-history-date">{formatDateTime(don.fecha)}</div>
                        <div className="bb-history-body">
                          <span>Volumen: <strong>{don.volumenMl} ml</strong></span>
                          <span>Peso: {don.pesoDonadorKg} kg</span>
                          <span>Contención: {don.metodoContencion === 'SEDACION' ? 'Sedación' : 'Física'}</span>
                          {don.metodoContencion === 'SEDACION' && (
                            <span>Fármaco: {don.farmacoUtilizado} ({don.dosisMgKg} mg/kg)</span>
                          )}
                          {don.unit && (
                            <span className="bb-unit-badge">
                              Unidad: {don.unit.codigoUnidad} ({PRODUCT_LABELS[don.unit.tipoProducto]})
                              — {STATUS_LABELS[don.unit.status]}
                            </span>
                          )}
                        </div>
                        <div className="bb-history-by">Dr. {don.medico?.nombre}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="bb-empty">Sin donaciones registradas</p>}
              </div>
            </div>
          </div>
        )}

        {/* INVENTARIO */}
        {activeSection === 'inventario' && (
          <div className="bb-section">
            <div className="bb-section-header">
              <h2>Inventario de Unidades Sanguíneas</h2>
              <button className="bb-btn bb-btn-secondary" onClick={handleCheckExpiry}>
                🔄 Verificar Caducidad
              </button>
            </div>

            <div className="bb-filters">
              <select className="bb-select" value={unitFilter} onChange={e => { setUnitFilter(e.target.value); fetchUnits(e.target.value ? { status: e.target.value } : {}); }}>
                <option value="">Todos los estados</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="RESERVADA">Reservada</option>
                <option value="UTILIZADA">Utilizada</option>
                <option value="CADUCADA">Caducada</option>
                <option value="DESCARTADA">Descartada</option>
              </select>
            </div>

            <div className="bb-table-wrapper">
              <table className="bb-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Tipo Sanguíneo</th>
                    <th>Volumen</th>
                    <th>Recolección</th>
                    <th>Caducidad</th>
                    <th>Días Rest.</th>
                    <th>Status</th>
                    <th>Donador</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map(u => {
                    const days = daysUntilExpiry(u.fechaCaducidad);
                    const donorName = u.donation?.donor?.pet?.nombre || u.donation?.donor?.nombre || '—';
                    return (
                      <tr key={u.id} className={days !== null && days <= 7 && u.status === 'DISPONIBLE' ? 'bb-row-warning' : ''}>
                        <td><strong>{u.codigoUnidad}</strong></td>
                        <td>{PRODUCT_LABELS[u.tipoProducto]}</td>
                        <td><span className="bb-blood-type">{u.tipoSanguineo || '—'}</span></td>
                        <td>{u.volumenMl} ml</td>
                        <td>{formatDate(u.fechaRecoleccion)}</td>
                        <td>{formatDate(u.fechaCaducidad)}</td>
                        <td>
                          {days !== null && (
                            <span className={`bb-days ${days <= 0 ? 'bb-days-expired' : days <= 7 ? 'bb-days-warn' : 'bb-days-ok'}`}>
                              {days <= 0 ? 'EXPIRADA' : `${days}d`}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="bb-unit-status" style={{ backgroundColor: STATUS_COLORS[u.status] }}>
                            {STATUS_LABELS[u.status]}
                          </span>
                        </td>
                        <td>{donorName}</td>
                        <td>
                          {u.status === 'DISPONIBLE' && (
                            <>
                              <button className="bb-btn-sm bb-btn-warn" onClick={() => updateUnitStatus(u.id, 'RESERVADA')}>Reservar</button>
                              <button className="bb-btn-sm bb-btn-danger" onClick={() => updateUnitStatus(u.id, 'DESCARTADA')}>Descartar</button>
                            </>
                          )}
                          {u.status === 'RESERVADA' && (
                            <button className="bb-btn-sm" onClick={() => updateUnitStatus(u.id, 'DISPONIBLE')}>Liberar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUnits.length === 0 && (
                    <tr><td colSpan={10} className="bb-empty">No hay unidades en inventario</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRANSFUSIONES */}
        {activeSection === 'transfusiones' && (
          <div className="bb-section">
            <div className="bb-section-header">
              <h2>Transfusiones</h2>
              <button className="bb-btn bb-btn-primary" onClick={() => {
                setTransfusionForm({ isExternalRecipient: false });
                setShowTransfusionModal(true);
              }}>
                + Nueva Transfusión
              </button>
            </div>

            <div className="bb-table-wrapper">
              <table className="bb-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Unidad</th>
                    <th>Tipo Sanguíneo</th>
                    <th>Receptor</th>
                    <th>Volumen</th>
                    <th>Médico</th>
                    <th>Reacciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transfusions.map(t => (
                    <tr key={t.id}>
                      <td>{formatDateTime(t.fechaTransfusion)}</td>
                      <td><strong>{t.unit?.codigoUnidad}</strong></td>
                      <td><span className="bb-blood-type">{t.unit?.tipoSanguineo || '—'}</span></td>
                      <td>
                        {t.recipientPet ? (
                          <span>{t.recipientPet.nombre} <small>({t.recipientPet.owner?.nombre})</small></span>
                        ) : (
                          <span>{t.recipientName || '—'} <span className="bb-badge-ext">EXT</span></span>
                        )}
                      </td>
                      <td>{t.volumenTransfundidoMl} ml</td>
                      <td>{t.medico?.nombre}</td>
                      <td>{t.reacciones || 'Ninguna'}</td>
                    </tr>
                  ))}
                  {transfusions.length === 0 && (
                    <tr><td colSpan={7} className="bb-empty">No hay transfusiones registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALERTAS */}
        {activeSection === 'alertas' && (
          <div className="bb-section">
            <div className="bb-section-header">
              <h2>Alertas</h2>
              <button className="bb-btn bb-btn-secondary" onClick={handleCheckExpiry}>
                🔄 Actualizar Alertas
              </button>
            </div>

            <div className="bb-alerts-list">
              {alerts.filter(a => !a.resuelta).map(a => (
                <div key={a.id} className={`bb-alert-card bb-alert-${a.prioridad.toLowerCase()}`}>
                  <div className="bb-alert-icon">
                    {a.tipo === 'CADUCADA' ? '⛔' : a.tipo === 'PROXIMA_CADUCIDAD' ? '⚠️' : a.tipo === 'DONADOR_ELEGIBLE' ? '✅' : '📢'}
                  </div>
                  <div className="bb-alert-body">
                    <div className="bb-alert-msg">{a.mensaje}</div>
                    <div className="bb-alert-meta">
                      <span>{a.tipo.replace(/_/g, ' ')}</span>
                      <span>{formatDateTime(a.createdAt)}</span>
                      {a.unit && <span>Unidad: {a.unit.codigoUnidad}</span>}
                      {a.donor && <span>Donador: {a.donor.pet?.nombre || a.donor.nombre}</span>}
                    </div>
                  </div>
                  <button className="bb-btn-sm" onClick={() => resolveAlert(a.id)}>
                    Resolver
                  </button>
                </div>
              ))}
              {alerts.filter(a => !a.resuelta).length === 0 && (
                <p className="bb-empty">No hay alertas activas</p>
              )}
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {activeSection === 'config' && (
          <div className="bb-section">
            <h2>Configuración del Banco de Sangre</h2>
            {config && (
              <div className="bb-config-form">
                <div className="bb-config-group">
                  <h3>Caducidad de Productos (días)</h3>
                  <div className="bb-form-row">
                    <label>Sangre Total<input type="number" value={configForm.diasCaducidadSangreTotal ?? config.diasCaducidadSangreTotal} onChange={e => setConfigForm(p => ({ ...p, diasCaducidadSangreTotal: parseInt(e.target.value) || 0 }))} /></label>
                    <label>Concentrado Eritrocitario<input type="number" value={configForm.diasCaducidadConcentrado ?? config.diasCaducidadConcentrado} onChange={e => setConfigForm(p => ({ ...p, diasCaducidadConcentrado: parseInt(e.target.value) || 0 }))} /></label>
                    <label>Plasma<input type="number" value={configForm.diasCaducidadPlasma ?? config.diasCaducidadPlasma} onChange={e => setConfigForm(p => ({ ...p, diasCaducidadPlasma: parseInt(e.target.value) || 0 }))} /></label>
                    <label>Días para Alerta<input type="number" value={configForm.diasAlertaCaducidad ?? config.diasAlertaCaducidad} onChange={e => setConfigForm(p => ({ ...p, diasAlertaCaducidad: parseInt(e.target.value) || 0 }))} /></label>
                  </div>
                </div>
                <div className="bb-config-group">
                  <h3>Intervalos de Elegibilidad (días)</h3>
                  <div className="bb-form-row">
                    <label>Perros (mín entre donaciones)<input type="number" value={configForm.intervaloMinPerros ?? config.intervaloMinPerros} onChange={e => setConfigForm(p => ({ ...p, intervaloMinPerros: parseInt(e.target.value) || 0 }))} /></label>
                    <label>Gatos (mín entre donaciones)<input type="number" value={configForm.intervaloMinGatos ?? config.intervaloMinGatos} onChange={e => setConfigForm(p => ({ ...p, intervaloMinGatos: parseInt(e.target.value) || 0 }))} /></label>
                  </div>
                </div>
                <div className="bb-config-group">
                  <h3>Hematocrito Mínimo (%)</h3>
                  <div className="bb-form-row">
                    <label>Perros<input type="number" step="0.1" value={configForm.hematocritoMinPerros ?? config.hematocritoMinPerros} onChange={e => setConfigForm(p => ({ ...p, hematocritoMinPerros: parseFloat(e.target.value) || 0 }))} /></label>
                    <label>Gatos<input type="number" step="0.1" value={configForm.hematocritoMinGatos ?? config.hematocritoMinGatos} onChange={e => setConfigForm(p => ({ ...p, hematocritoMinGatos: parseFloat(e.target.value) || 0 }))} /></label>
                  </div>
                </div>
                <button className="bb-btn bb-btn-primary" onClick={handleSaveConfig}>
                  💾 Guardar Configuración
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* MODALS */}
      {/* ====================================================================== */}

      {/* NEW DONOR MODAL */}
      {showDonorModal && (
        <div className="bb-modal-overlay" onClick={() => setShowDonorModal(false)}>
          <div className="bb-modal" onClick={e => e.stopPropagation()}>
            <div className="bb-modal-header">
              <h3>Registrar Donador</h3>
              <button className="bb-modal-close" onClick={() => setShowDonorModal(false)}>✕</button>
            </div>
            <div className="bb-modal-body">
              <div className="bb-form-toggle">
                <button className={`bb-toggle-btn ${!donorForm.isExternal ? 'active' : ''}`}
                  onClick={() => setDonorForm(p => ({ ...p, isExternal: false, petId: null }))}>
                  Paciente Registrado
                </button>
                <button className={`bb-toggle-btn ${donorForm.isExternal ? 'active' : ''}`}
                  onClick={() => setDonorForm(p => ({ ...p, isExternal: true, petId: null }))}>
                  Paciente Externo
                </button>
              </div>

              {!donorForm.isExternal ? (
                <div className="bb-pet-search-section">
                  <label>Buscar Paciente</label>
                  <input
                    className="bb-input"
                    placeholder="Nombre, ficha o teléfono del dueño..."
                    value={petSearchQuery}
                    onChange={e => setPetSearchQuery(e.target.value)}
                  />
                  {petSearchResults.length > 0 && (
                    <div className="bb-pet-results">
                      {petSearchResults.map(p => (
                        <div key={p.id}
                          className={`bb-pet-result ${donorForm.petId === p.id ? 'selected' : ''}`}
                          onClick={() => setDonorForm(prev => ({ ...prev, petId: p.id }))}
                        >
                          <strong>{p.nombre}</strong> ({p.especie}) — {p.numeroFicha}
                          <small> Dueño: {p.owner?.nombre} | Tel: {p.owner?.telefono}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  {donorForm.petId && <p className="bb-selected-pet">✅ Paciente seleccionado</p>}
                </div>
              ) : (
                <div className="bb-external-form">
                  <div className="bb-form-row">
                    <label>Nombre *<input className="bb-input" value={donorForm.nombre || ''} onChange={e => setDonorForm(p => ({ ...p, nombre: e.target.value }))} /></label>
                    <label>Especie *
                      <select className="bb-input" value={donorForm.especie || ''} onChange={e => setDonorForm(p => ({ ...p, especie: e.target.value }))}>
                        <option value="">Seleccionar</option>
                        <option value="PERRO">Perro</option>
                        <option value="GATO">Gato</option>
                      </select>
                    </label>
                  </div>
                  <div className="bb-form-row">
                    <label>Raza<input className="bb-input" value={donorForm.raza || ''} onChange={e => setDonorForm(p => ({ ...p, raza: e.target.value }))} /></label>
                    <label>Edad<input className="bb-input" value={donorForm.edad || ''} onChange={e => setDonorForm(p => ({ ...p, edad: e.target.value }))} /></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Sexo
                      <select className="bb-input" value={donorForm.sexo || ''} onChange={e => setDonorForm(p => ({ ...p, sexo: e.target.value }))}>
                        <option value="">Seleccionar</option>
                        <option value="MACHO">Macho</option>
                        <option value="HEMBRA">Hembra</option>
                      </select>
                    </label>
                    <label>Peso (kg)<input type="number" className="bb-input" value={donorForm.peso || ''} onChange={e => setDonorForm(p => ({ ...p, peso: parseFloat(e.target.value) || null }))} /></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Color<input className="bb-input" value={donorForm.color || ''} onChange={e => setDonorForm(p => ({ ...p, color: e.target.value }))} /></label>
                  </div>
                  <h4>Datos del Propietario</h4>
                  <div className="bb-form-row">
                    <label>Nombre Propietario<input className="bb-input" value={donorForm.ownerName || ''} onChange={e => setDonorForm(p => ({ ...p, ownerName: e.target.value }))} /></label>
                    <label>Teléfono<input className="bb-input" value={donorForm.ownerPhone || ''} onChange={e => setDonorForm(p => ({ ...p, ownerPhone: e.target.value }))} /></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Email<input className="bb-input" value={donorForm.ownerEmail || ''} onChange={e => setDonorForm(p => ({ ...p, ownerEmail: e.target.value }))} /></label>
                  </div>
                </div>
              )}

              <label>Tipo Sanguíneo (si se conoce)
                <input className="bb-input" value={donorForm.tipoSanguineo || ''} onChange={e => setDonorForm(p => ({ ...p, tipoSanguineo: e.target.value }))} placeholder="Ej: DEA 1.1+, Tipo A" />
              </label>
              <label>Notas
                <textarea className="bb-textarea" value={donorForm.notas || ''} onChange={e => setDonorForm(p => ({ ...p, notas: e.target.value }))} />
              </label>
            </div>
            <div className="bb-modal-footer">
              <button className="bb-btn" onClick={() => setShowDonorModal(false)}>Cancelar</button>
              <button className="bb-btn bb-btn-primary" onClick={handleCreateDonor}
                disabled={!donorForm.isExternal && !donorForm.petId}>
                Registrar Donador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVALUATION MODAL */}
      {showEvalModal && (
        <div className="bb-modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="bb-modal" onClick={e => e.stopPropagation()}>
            <div className="bb-modal-header">
              <h3>Evaluación Médica — {getDonorDisplayName(selectedDonor)}</h3>
              <button className="bb-modal-close" onClick={() => setShowEvalModal(false)}>✕</button>
            </div>
            <div className="bb-modal-body">
              <div className="bb-form-row">
                <label>Temperatura (°C)<input type="number" step="0.1" className="bb-input" value={evalForm.temperatura || ''} onChange={e => setEvalForm(p => ({ ...p, temperatura: parseFloat(e.target.value) || null }))} /></label>
                <label>Frecuencia Cardiaca<input type="number" className="bb-input" value={evalForm.frecuenciaCardiaca || ''} onChange={e => setEvalForm(p => ({ ...p, frecuenciaCardiaca: parseInt(e.target.value) || null }))} /></label>
              </div>
              <div className="bb-form-row">
                <label>Frecuencia Respiratoria<input type="number" className="bb-input" value={evalForm.frecuenciaRespiratoria || ''} onChange={e => setEvalForm(p => ({ ...p, frecuenciaRespiratoria: parseInt(e.target.value) || null }))} /></label>
                <label>Mucosas<input className="bb-input" value={evalForm.mucosas || ''} onChange={e => setEvalForm(p => ({ ...p, mucosas: e.target.value }))} placeholder="Rosadas, pálidas, etc." /></label>
              </div>
              <div className="bb-form-row">
                <label>Tiempo Llenado Capilar<input className="bb-input" value={evalForm.tiempoLlenadoCapilar || ''} onChange={e => setEvalForm(p => ({ ...p, tiempoLlenadoCapilar: e.target.value }))} placeholder="< 2s" /></label>
                <label>Condición Corporal<input className="bb-input" value={evalForm.condicionCorporal || ''} onChange={e => setEvalForm(p => ({ ...p, condicionCorporal: e.target.value }))} placeholder="1-5" /></label>
              </div>
              <label>Observaciones<textarea className="bb-textarea" value={evalForm.observaciones || ''} onChange={e => setEvalForm(p => ({ ...p, observaciones: e.target.value }))} /></label>
              <label>Resultado *
                <select className="bb-input bb-input-lg" value={evalForm.resultado} onChange={e => setEvalForm(p => ({ ...p, resultado: e.target.value }))}>
                  <option value="APTO">✅ APTO para donación</option>
                  <option value="NO_APTO">❌ NO APTO para donación</option>
                </select>
              </label>
            </div>
            <div className="bb-modal-footer">
              <button className="bb-btn" onClick={() => setShowEvalModal(false)}>Cancelar</button>
              <button className="bb-btn bb-btn-primary" onClick={handleCreateEvaluation}>Guardar Evaluación</button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC TEST MODAL */}
      {showTestModal && (
        <div className="bb-modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="bb-modal bb-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="bb-modal-header">
              <h3>Prueba Diagnóstica — {getDonorDisplayName(selectedDonor)}</h3>
              <button className="bb-modal-close" onClick={() => setShowTestModal(false)}>✕</button>
            </div>
            <div className="bb-modal-body">
              <label>Método<input className="bb-input" value={testForm.metodo || ''} onChange={e => setTestForm(p => ({ ...p, metodo: e.target.value }))} /></label>

              <h4>Hematología</h4>
              <div className="bb-form-row">
                <label>Hematocrito (%)<input type="number" step="0.1" className="bb-input" value={testForm.hematocrito ?? ''} onChange={e => setTestForm(p => ({ ...p, hematocrito: parseFloat(e.target.value) || null }))} /></label>
                <label>Hemoglobina<input type="number" step="0.1" className="bb-input" value={testForm.hemoglobina ?? ''} onChange={e => setTestForm(p => ({ ...p, hemoglobina: parseFloat(e.target.value) || null }))} /></label>
                <label>Eritrocitos<input type="number" step="0.01" className="bb-input" value={testForm.eritrocitos ?? ''} onChange={e => setTestForm(p => ({ ...p, eritrocitos: parseFloat(e.target.value) || null }))} /></label>
              </div>
              <div className="bb-form-row">
                <label>Leucocitos<input type="number" step="0.01" className="bb-input" value={testForm.leucocitos ?? ''} onChange={e => setTestForm(p => ({ ...p, leucocitos: parseFloat(e.target.value) || null }))} /></label>
                <label>Plaquetas<input type="number" step="0.01" className="bb-input" value={testForm.plaquetas ?? ''} onChange={e => setTestForm(p => ({ ...p, plaquetas: parseFloat(e.target.value) || null }))} /></label>
              </div>

              {(getDonorSpecies(selectedDonor) === 'PERRO' || !getDonorSpecies(selectedDonor)) && (
                <>
                  <h4>Pruebas Infecciosas (Perro)</h4>
                  <div className="bb-form-row">
                    <label>Ehrlichia<select className="bb-input" value={testForm.ehrlichia || ''} onChange={e => setTestForm(p => ({ ...p, ehrlichia: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                    <label>Anaplasma<select className="bb-input" value={testForm.anaplasma || ''} onChange={e => setTestForm(p => ({ ...p, anaplasma: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                    <label>Babesia<select className="bb-input" value={testForm.babesia || ''} onChange={e => setTestForm(p => ({ ...p, babesia: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Dirofilaria<select className="bb-input" value={testForm.dirofilaria || ''} onChange={e => setTestForm(p => ({ ...p, dirofilaria: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                    <label>Brucella<select className="bb-input" value={testForm.brucella || ''} onChange={e => setTestForm(p => ({ ...p, brucella: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                  </div>
                </>
              )}

              {(getDonorSpecies(selectedDonor) === 'GATO') && (
                <>
                  <h4>Pruebas Infecciosas (Gato)</h4>
                  <div className="bb-form-row">
                    <label>FeLV<select className="bb-input" value={testForm.felv || ''} onChange={e => setTestForm(p => ({ ...p, felv: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                    <label>FIV<select className="bb-input" value={testForm.fiv || ''} onChange={e => setTestForm(p => ({ ...p, fiv: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                    <label>Hemoplasmas<select className="bb-input" value={testForm.hemoplasmas || ''} onChange={e => setTestForm(p => ({ ...p, hemoplasmas: e.target.value || null }))}><option value="">—</option><option value="Positivo">Positivo</option><option value="Negativo">Negativo</option></select></label>
                  </div>
                </>
              )}

              <h4>Tipificación Sanguínea</h4>
              <label>Tipo Sanguíneo<input className="bb-input" value={testForm.tipificacionSanguinea || ''} onChange={e => setTestForm(p => ({ ...p, tipificacionSanguinea: e.target.value || null }))} placeholder="Ej: DEA 1.1+, Tipo A, AB" /></label>

              <label>Observaciones<textarea className="bb-textarea" value={testForm.observaciones || ''} onChange={e => setTestForm(p => ({ ...p, observaciones: e.target.value }))} /></label>
            </div>
            <div className="bb-modal-footer">
              <button className="bb-btn" onClick={() => setShowTestModal(false)}>Cancelar</button>
              <button className="bb-btn bb-btn-primary" onClick={handleCreateTest}>Guardar Prueba</button>
            </div>
          </div>
        </div>
      )}

      {/* DONATION MODAL */}
      {showDonationModal && (
        <div className="bb-modal-overlay" onClick={() => setShowDonationModal(false)}>
          <div className="bb-modal" onClick={e => e.stopPropagation()}>
            <div className="bb-modal-header">
              <h3>Registrar Donación — {getDonorDisplayName(selectedDonor)}</h3>
              <button className="bb-modal-close" onClick={() => setShowDonationModal(false)}>✕</button>
            </div>
            <div className="bb-modal-body">
              <div className="bb-form-row">
                <label>Volumen Recolectado (ml) *<input type="number" className="bb-input" value={donationForm.volumenMl || ''} onChange={e => setDonationForm(p => ({ ...p, volumenMl: parseFloat(e.target.value) || 0 }))} /></label>
                <label>Peso del Donador (kg) *<input type="number" step="0.1" className="bb-input" value={donationForm.pesoDonadorKg || ''} onChange={e => setDonationForm(p => ({ ...p, pesoDonadorKg: parseFloat(e.target.value) || 0 }))} /></label>
              </div>
              <div className="bb-form-row">
                <label>Tipo de Bolsa<input className="bb-input" value={donationForm.tipoBolsa || ''} onChange={e => setDonationForm(p => ({ ...p, tipoBolsa: e.target.value }))} /></label>
                <label>Tipo de Producto *
                  <select className="bb-input" value={donationForm.tipoProducto} onChange={e => setDonationForm(p => ({ ...p, tipoProducto: e.target.value }))}>
                    <option value="SANGRE_TOTAL">Sangre Total</option>
                    <option value="CONCENTRADO_ERITROCITARIO">Concentrado Eritrocitario</option>
                    <option value="PLASMA">Plasma</option>
                  </select>
                </label>
              </div>
              <label>Método de Contención *
                <select className="bb-input" value={donationForm.metodoContencion} onChange={e => setDonationForm(p => ({ ...p, metodoContencion: e.target.value }))}>
                  <option value="FISICA">Contención Física</option>
                  <option value="SEDACION">Sedación</option>
                </select>
              </label>

              {donationForm.metodoContencion === 'SEDACION' && (
                <div className="bb-sedation-section">
                  <h4>Protocolo de Sedación</h4>
                  <div className="bb-form-row">
                    <label>Fármaco Utilizado<input className="bb-input" value={donationForm.farmacoUtilizado || ''} onChange={e => setDonationForm(p => ({ ...p, farmacoUtilizado: e.target.value }))} /></label>
                    <label>Dosis (mg/kg)<input type="number" step="0.01" className="bb-input" value={donationForm.dosisMgKg || ''} onChange={e => setDonationForm(p => ({ ...p, dosisMgKg: parseFloat(e.target.value) || null }))} /></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Dosis Total (mg)<input type="number" step="0.01" className="bb-input" value={donationForm.dosisTotal || ''} onChange={e => setDonationForm(p => ({ ...p, dosisTotal: parseFloat(e.target.value) || null }))} /></label>
                    <label>¿Reversión aplicada?
                      <select className="bb-input" value={donationForm.reversionAplicada === true ? 'true' : donationForm.reversionAplicada === false ? 'false' : ''} onChange={e => setDonationForm(p => ({ ...p, reversionAplicada: e.target.value === '' ? null : e.target.value === 'true' }))}>
                        <option value="">—</option>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </label>
                  </div>
                  <label>Descripción del Protocolo<textarea className="bb-textarea" value={donationForm.descripcionProtocolo || ''} onChange={e => setDonationForm(p => ({ ...p, descripcionProtocolo: e.target.value }))} /></label>
                </div>
              )}

              <label>Observaciones<textarea className="bb-textarea" value={donationForm.observaciones || ''} onChange={e => setDonationForm(p => ({ ...p, observaciones: e.target.value }))} /></label>
            </div>
            <div className="bb-modal-footer">
              <button className="bb-btn" onClick={() => setShowDonationModal(false)}>Cancelar</button>
              <button className="bb-btn bb-btn-success" onClick={handleCreateDonation}
                disabled={!donationForm.volumenMl || !donationForm.pesoDonadorKg}>
                🩸 Registrar Donación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFUSION MODAL */}
      {showTransfusionModal && (
        <div className="bb-modal-overlay" onClick={() => setShowTransfusionModal(false)}>
          <div className="bb-modal" onClick={e => e.stopPropagation()}>
            <div className="bb-modal-header">
              <h3>Registrar Transfusión</h3>
              <button className="bb-modal-close" onClick={() => setShowTransfusionModal(false)}>✕</button>
            </div>
            <div className="bb-modal-body">
              <label>Unidad Sanguínea *
                <select className="bb-input" value={transfusionForm.unitId || ''} onChange={e => setTransfusionForm(p => ({ ...p, unitId: e.target.value }))}>
                  <option value="">Seleccionar unidad disponible</option>
                  {units.filter(u => u.status === 'DISPONIBLE' || u.status === 'RESERVADA').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.codigoUnidad} — {PRODUCT_LABELS[u.tipoProducto]} — {u.tipoSanguineo || 'Sin tipo'} — {u.volumenMl}ml
                    </option>
                  ))}
                </select>
              </label>

              <div className="bb-form-toggle">
                <button className={`bb-toggle-btn ${!transfusionForm.isExternalRecipient ? 'active' : ''}`}
                  onClick={() => setTransfusionForm(p => ({ ...p, isExternalRecipient: false, recipientPetId: null }))}>
                  Receptor Registrado
                </button>
                <button className={`bb-toggle-btn ${transfusionForm.isExternalRecipient ? 'active' : ''}`}
                  onClick={() => setTransfusionForm(p => ({ ...p, isExternalRecipient: true, recipientPetId: null }))}>
                  Receptor Externo
                </button>
              </div>

              {!transfusionForm.isExternalRecipient ? (
                <div className="bb-pet-search-section">
                  <label>Buscar Paciente Receptor</label>
                  <input className="bb-input" placeholder="Nombre, ficha o teléfono..." value={petSearchQuery} onChange={e => setPetSearchQuery(e.target.value)} />
                  {petSearchResults.length > 0 && (
                    <div className="bb-pet-results">
                      {petSearchResults.map(p => (
                        <div key={p.id}
                          className={`bb-pet-result ${transfusionForm.recipientPetId === p.id ? 'selected' : ''}`}
                          onClick={() => setTransfusionForm(prev => ({ ...prev, recipientPetId: p.id }))}
                        >
                          <strong>{p.nombre}</strong> ({p.especie}) — {p.numeroFicha}
                          <small> Dueño: {p.owner?.nombre}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bb-external-form">
                  <div className="bb-form-row">
                    <label>Nombre Receptor<input className="bb-input" value={transfusionForm.recipientName || ''} onChange={e => setTransfusionForm(p => ({ ...p, recipientName: e.target.value }))} /></label>
                    <label>Especie<input className="bb-input" value={transfusionForm.recipientSpecies || ''} onChange={e => setTransfusionForm(p => ({ ...p, recipientSpecies: e.target.value }))} /></label>
                  </div>
                  <div className="bb-form-row">
                    <label>Raza<input className="bb-input" value={transfusionForm.recipientBreed || ''} onChange={e => setTransfusionForm(p => ({ ...p, recipientBreed: e.target.value }))} /></label>
                    <label>Propietario<input className="bb-input" value={transfusionForm.recipientOwnerName || ''} onChange={e => setTransfusionForm(p => ({ ...p, recipientOwnerName: e.target.value }))} /></label>
                  </div>
                  <label>Teléfono Propietario<input className="bb-input" value={transfusionForm.recipientOwnerPhone || ''} onChange={e => setTransfusionForm(p => ({ ...p, recipientOwnerPhone: e.target.value }))} /></label>
                </div>
              )}

              <label>Volumen Transfundido (ml) *<input type="number" className="bb-input" value={transfusionForm.volumenTransfundidoMl || ''} onChange={e => setTransfusionForm(p => ({ ...p, volumenTransfundidoMl: parseFloat(e.target.value) || 0 }))} /></label>
              <label>Reacciones<textarea className="bb-textarea" value={transfusionForm.reacciones || ''} onChange={e => setTransfusionForm(p => ({ ...p, reacciones: e.target.value }))} placeholder="Describir reacciones adversas, si hubo" /></label>
              <label>Observaciones<textarea className="bb-textarea" value={transfusionForm.observaciones || ''} onChange={e => setTransfusionForm(p => ({ ...p, observaciones: e.target.value }))} /></label>
            </div>
            <div className="bb-modal-footer">
              <button className="bb-btn" onClick={() => setShowTransfusionModal(false)}>Cancelar</button>
              <button className="bb-btn bb-btn-primary" onClick={handleCreateTransfusion}
                disabled={!transfusionForm.unitId || !transfusionForm.volumenTransfundidoMl}>
                💉 Registrar Transfusión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
