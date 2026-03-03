import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useHospitalizacion from '../../hooks/useHospitalizacion';
import farmaciaService from '../../services/farmacia.service';
import FluidTherapyCalculator from './FluidTherapyCalculator';
import HospitalBoard from './HospitalBoard';
import RondaRapida from './RondaRapida';
import './HospitalizacionDashboard.css';

// ═══════════════════════════════════════════════════════════════
// HELPER: Monitoring status calculator
// ═══════════════════════════════════════════════════════════════
function getMonitoringStatus(hospitalization) {
  const frecuencia = hospitalization?.frecuenciaMonitoreo;
  const lastMonitoring = hospitalization?.monitorings?.[0]?.recordedAt ||
    hospitalization?.latestMonitoring?.recordedAt ||
    hospitalization?.lastMonitoring?.recordedAt;

  if (!frecuencia) return { status: 'unknown', message: 'Sin frecuencia', urgencyLevel: -1 };

  const hoursMatch = frecuencia.match(/(\d+)/);
  if (!hoursMatch) return { status: 'unknown', message: 'Frecuencia inválida', urgencyLevel: -1 };

  const frequencyHours = parseInt(hoursMatch[1]);
  const frequencyMs = frequencyHours * 60 * 60 * 1000;

  if (!lastMonitoring) {
    return { status: 'urgent', message: 'Requiere chequeo', urgencyLevel: 3 };
  }

  const elapsed = Date.now() - new Date(lastMonitoring).getTime();
  const remaining = frequencyMs - elapsed;

  if (remaining <= 0) {
    const overdueMins = Math.floor(Math.abs(remaining) / 60000);
    const h = Math.floor(overdueMins / 60);
    return { status: 'overdue', message: `Atrasado ${h > 0 ? h + 'h ' : ''}${overdueMins % 60}m`, urgencyLevel: 2 };
  } else if (remaining <= 30 * 60 * 1000) {
    return { status: 'soon', message: `En ${Math.floor(remaining / 60000)} min`, urgencyLevel: 1 };
  }
  const rh = Math.floor(remaining / 3600000);
  const rm = Math.floor((remaining % 3600000) / 60000);
  return { status: 'ok', message: `En ${rh > 0 ? rh + 'h ' : ''}${rm}m`, urgencyLevel: 0 };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
function HospitalizacionDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const {
    loading, error, hospitalizaciones, stats,
    selectedHospitalization, vitalSigns, therapyPlan,
    pendingMedications, neonates, costs,
    fetchHospitalizaciones, selectHospitalization,
    addVitalSigns, addTherapyItem, deactivateTherapyItem,
    activateTherapyItem, administerMedication, generateDailySchedule,
    addNeonate, addNeonateRecord, dischargePatient, clearError,
  } = useHospitalizacion();

  // ═══════ FILTER STATE ═══════
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVO');

  // ═══════ SECTION COLLAPSE STATE ═══════
  const [expandedSections, setExpandedSections] = useState({
    upcoming: true,
    timeline: true,
    therapy: true,
    costs: false,
    consultation: false,
    neonates: true,
    studies: false,
  });

  // ═══════ MODALS ═══════
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTherapyModal, setShowTherapyModal] = useState(false);
  const [showNeonateModal, setShowNeonateModal] = useState(false);
  const [showNeonateRecordModal, setShowNeonateRecordModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showRondaRapida, setShowRondaRapida] = useState(false);
  const [showBoardView, setShowBoardView] = useState(false);
  const [fluidCalcTarget, setFluidCalcTarget] = useState(null);

  // ═══════ EVOLUTION NOTE ═══════
  const [evolutionNote, setEvolutionNote] = useState('');

  // ═══════ FORM STATES (same as before) ═══════
  const [vitalsForm, setVitalsForm] = useState({
    frecuenciaCardiaca: '', frecuenciaRespiratoria: '', temperatura: '',
    trc: '', mucosas: 'ROSADAS', presionArterial: '', peso: '', glucosa: '',
    hidratacion: 'NORMAL', nivelConciencia: 'ALERTA', nivelDolor: '0', observaciones: ''
  });

  const [therapyForm, setTherapyForm] = useState({
    medicationId: '', medicationName: '', presentacion: '', concentracion: '',
    stockDisponible: 0, dosis: '', unidadDosis: 'mg', frecuenciaHoras: 8,
    via: 'IV', notas: ''
  });

  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMedications, setSearchingMedications] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const medicationSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [neonateForm, setNeonateForm] = useState({
    number: 1, identificationType: '', identification: '', sex: 'MACHO'
  });

  const [selectedNeonate, setSelectedNeonate] = useState(null);
  const [neonateRecordForm, setNeonateRecordForm] = useState({
    weight: '', temperature: '', heartRate: '', respiratoryRate: '',
    suction: '', activity: '', notes: ''
  });

  const [dischargeForm, setDischargeForm] = useState({ type: 'ALTA_MEDICA', notes: '' });

  // ═══════ TIME TRACKING ═══════
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ═══════ COMPUTED: Sorted patients by urgency ═══════
  const sortedHospitalizaciones = useMemo(() => {
    return [...hospitalizaciones].sort((a, b) => {
      const sa = getMonitoringStatus(a);
      const sb = getMonitoringStatus(b);
      return (sb.urgencyLevel || 0) - (sa.urgencyLevel || 0);
    });
  }, [hospitalizaciones, currentTime]);

  // ═══════ COMPUTED: Patient timeline (vitals + meds, desc) ═══════
  const timeline = useMemo(() => {
    const entries = [];
    vitalSigns.forEach(v => {
      entries.push({ type: 'vitals', time: new Date(v.recordedAt), data: v, id: `v-${v.id}` });
    });
    pendingMedications.filter(m => m.status === 'ADMINISTRADO').forEach(m => {
      entries.push({
        type: 'medication_done', time: new Date(m.horaAdministrado || m.horaPrograma),
        data: m, id: `md-${m.id}`
      });
    });
    entries.sort((a, b) => b.time - a.time);
    return entries.slice(0, 30);
  }, [vitalSigns, pendingMedications]);

  // ═══════ COMPUTED: Upcoming actions ═══════
  const upcomingActions = useMemo(() => {
    const now = new Date();
    const actions = [];
    pendingMedications
      .filter(m => m.status === 'PENDIENTE')
      .forEach(m => {
        const scheduled = new Date(m.horaPrograma);
        actions.push({
          type: 'medication', time: scheduled,
          isOverdue: scheduled < now, data: m, id: `um-${m.id}`
        });
      });
    // Next monitoring as an action
    if (selectedHospitalization?.frecuenciaMonitoreo) {
      const monSt = getMonitoringStatus(selectedHospitalization);
      if (monSt.status !== 'unknown') {
        actions.push({
          type: 'monitoring', time: now,
          isOverdue: monSt.status === 'overdue' || monSt.status === 'urgent',
          data: { statusInfo: monSt }, id: 'next-mon'
        });
      }
    }
    actions.sort((a, b) => {
      // Overdue first, then by time
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.time - b.time;
    });
    return actions;
  }, [pendingMedications, selectedHospitalization, currentTime]);

  // ═══════ LOAD DATA ═══════
  useEffect(() => {
    fetchHospitalizaciones(filterType || null, filterStatus || null);
  }, [filterType, filterStatus, fetchHospitalizaciones]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      if (Date.now() % (5 * 60 * 1000) < 60000) {
        fetchHospitalizaciones(filterType || null, filterStatus || null);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [filterType, filterStatus, fetchHospitalizaciones]);

  // Medication search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (medicationSearch.length < 2) {
      setMedicationResults([]); setShowMedicationDropdown(false); return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingMedications(true);
      try {
        const results = await farmaciaService.getMedications({ search: medicationSearch });
        setMedicationResults(results); setShowMedicationDropdown(true);
      } catch (err) { setMedicationResults([]); }
      finally { setSearchingMedications(false); }
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [medicationSearch]);

  // Close medication dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (medicationSearchRef.current && !medicationSearchRef.current.contains(e.target)) {
        setShowMedicationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectPatient = useCallback((h) => {
    selectHospitalization(h);
  }, [selectHospitalization]);

  const handleSelectMedication = useCallback((medication) => {
    const stock = medication.currentStock ?? medication.stockActual ?? 0;
    setTherapyForm(prev => ({
      ...prev, medicationId: medication.id,
      medicationName: medication.name || medication.nombre,
      presentacion: medication.presentation || medication.presentacion || '',
      concentracion: medication.concentration || medication.concentracion || '',
      stockDisponible: stock
    }));
    setMedicationSearch(''); setShowMedicationDropdown(false); setMedicationResults([]);
  }, []);

  // Vitals
  const handleVitalsChange = (e) => {
    setVitalsForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    const data = {
      frecuenciaCardiaca: parseFloat(vitalsForm.frecuenciaCardiaca) || null,
      frecuenciaRespiratoria: parseFloat(vitalsForm.frecuenciaRespiratoria) || null,
      temperatura: parseFloat(vitalsForm.temperatura) || null,
      trc: parseFloat(vitalsForm.trc) || null,
      mucosas: vitalsForm.mucosas,
      presionArterial: vitalsForm.presionArterial || null,
      peso: parseFloat(vitalsForm.peso) || null,
      glucosa: parseFloat(vitalsForm.glucosa) || null,
      hidratacion: vitalsForm.hidratacion,
      nivelConciencia: vitalsForm.nivelConciencia,
      nivelDolor: parseInt(vitalsForm.nivelDolor) || 0,
      observaciones: vitalsForm.observaciones
    };
    const ok = await addVitalSigns(selectedHospitalization.id, data);
    if (ok) {
      setShowVitalsModal(false);
      setVitalsForm({
        frecuenciaCardiaca: '', frecuenciaRespiratoria: '', temperatura: '',
        trc: '', mucosas: 'ROSADAS', presionArterial: '', peso: '', glucosa: '',
        hidratacion: 'NORMAL', nivelConciencia: 'ALERTA', nivelDolor: '0', observaciones: ''
      });
    }
  };

  // Therapy
  const handleTherapyChange = (e) => {
    setTherapyForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleTherapySubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    const data = {
      medicationId: therapyForm.medicationId || undefined,
      medicationName: therapyForm.medicationName,
      dose: `${therapyForm.dosis} ${therapyForm.unidadDosis}`,
      frequency: `cada ${therapyForm.frecuenciaHoras} horas`,
      route: therapyForm.via,
      notes: therapyForm.notas
    };
    const ok = await addTherapyItem(selectedHospitalization.id, data);
    if (ok) {
      setShowTherapyModal(false);
      setTherapyForm({
        medicationId: '', medicationName: '', presentacion: '', concentracion: '',
        stockDisponible: 0, dosis: '', unidadDosis: 'mg', frecuenciaHoras: 8,
        via: 'IV', notas: ''
      });
      setMedicationSearch('');
    }
  };

  // Administer medication
  const handleAdminister = async (adminId) => {
    if (!selectedHospitalization) return;
    await administerMedication(selectedHospitalization.id, adminId);
  };

  // Generate schedule
  const handleGenerateSchedule = async () => {
    if (!selectedHospitalization) return;
    await generateDailySchedule(selectedHospitalization.id);
  };

  // Neonate
  const handleNeonateChange = (e) => {
    setNeonateForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleNeonateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    const data = {
      number: parseInt(neonateForm.number),
      identificationType: neonateForm.identificationType || null,
      identification: neonateForm.identification || null,
      sex: neonateForm.sex || null
    };
    const ok = await addNeonate(selectedHospitalization.id, data);
    if (ok) {
      setShowNeonateModal(false);
      setNeonateForm({ number: (neonates?.length || 0) + 2, identificationType: '', identification: '', sex: 'MACHO' });
    }
  };

  // Neonate Record
  const handleNeonateRecordChange = (e) => {
    setNeonateRecordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleNeonateRecordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization || !selectedNeonate) return;
    const data = {
      weight: neonateRecordForm.weight ? parseFloat(neonateRecordForm.weight) : null,
      temperature: neonateRecordForm.temperature ? parseFloat(neonateRecordForm.temperature) : null,
      heartRate: neonateRecordForm.heartRate ? parseInt(neonateRecordForm.heartRate) : null,
      respiratoryRate: neonateRecordForm.respiratoryRate ? parseInt(neonateRecordForm.respiratoryRate) : null,
      suction: neonateRecordForm.suction || null,
      activity: neonateRecordForm.activity || null,
      notes: neonateRecordForm.notes || null
    };
    const ok = await addNeonateRecord(selectedHospitalization.id, selectedNeonate.id, data);
    if (ok) {
      setShowNeonateRecordModal(false); setSelectedNeonate(null);
      setNeonateRecordForm({ weight: '', temperature: '', heartRate: '', respiratoryRate: '', suction: '', activity: '', notes: '' });
    }
  };

  // Discharge
  const handleDischargeChange = (e) => {
    setDischargeForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    const ok = await dischargePatient(selectedHospitalization.id, dischargeForm.type, dischargeForm.notes);
    if (ok) {
      setShowDischargeModal(false);
      setDischargeForm({ type: 'ALTA_MEDICA', notes: '' });
      fetchHospitalizaciones(filterType || null, filterStatus || null);
    }
  };

  // Evolution note (saves as monitoring with just observations)
  const handleAddEvolutionNote = async () => {
    if (!selectedHospitalization || !evolutionNote.trim()) return;
    const data = {
      observaciones: evolutionNote.trim(),
      frecuenciaCardiaca: null, frecuenciaRespiratoria: null, temperatura: null,
      trc: null, mucosas: null, presionArterial: null, peso: null, glucosa: null,
      hidratacion: null, nivelConciencia: null, nivelDolor: null,
    };
    const ok = await addVitalSigns(selectedHospitalization.id, data);
    if (ok) setEvolutionNote('');
  };

  // Open fluids calculator for selected patient
  const handleOpenFluids = () => {
    if (!selectedHospitalization) return;
    setFluidCalcTarget({
      hospitalizationId: selectedHospitalization.id,
      pet: selectedHospitalization.patient,
    });
  };

  // ═══════ FORMATTERS ═══════
  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const formatTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };
  const formatCurrency = (a) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(a || 0);
  const getDaysHospitalized = (a) => {
    if (!a) return 0;
    return Math.floor((Date.now() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  const sel = selectedHospitalization;
  const patient = sel?.patient || {};

  return (
    <div className="hosp-dashboard">
      {/* ─── HEADER ─── */}
      <header className="hosp-header">
        <h1>🏥 Hospitalización</h1>
        <div className="hosp-header-right">
          <span className="hosp-user-name">{user?.name || 'Usuario'}</span>
          <button className="hosp-btn-logout" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      {/* ─── TOOLBAR ─── */}
      <div className="hosp-toolbar">
        <div className="hosp-filters">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="hosp-filter-select">
            <option value="">🏥 Todas las áreas</option>
            <option value="PERROS_NO_INFECCIOSOS">🐕 Hosp. Perros</option>
            <option value="PERROS_INFECCIOSOS">🐕‍🦺 Infec. Perros</option>
            <option value="GATOS_NO_INFECCIOSOS">🐈 Hosp. Gatos</option>
            <option value="GATOS_INFECCIOSOS">🐈‍⬛ Infec. Gatos</option>
            <option value="MATERNIDAD">🤱 Maternidad</option>
            <option value="UCI">🚨 UCI</option>
            <option value="NEONATOS">🍼 Neonatos</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="hosp-filter-select">
            <option value="ACTIVO">Activos</option>
            <option value="">Todos</option>
            <option value="ALTA_PENDIENTE">Alta Pendiente</option>
            <option value="DADO_DE_ALTA">Dados de Alta</option>
          </select>
          <span className="hosp-patient-count">
            {hospitalizaciones.length} paciente{hospitalizaciones.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="hosp-toolbar-actions">
          <button className="hosp-btn-ronda" onClick={() => setShowRondaRapida(true)} disabled={!hospitalizaciones.length}>
            🩺 Ronda Rápida
          </button>
          <button className="hosp-btn-board" onClick={() => setShowBoardView(true)}>
            📊 Tablero
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="hosp-error">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="hosp-main">
        {/* ─── SIDEBAR: Patient List ─── */}
        <aside className="hosp-sidebar">
          {loading && !hospitalizaciones.length ? (
            <div className="hosp-sidebar-empty"><div className="spinner" /><span>Cargando...</span></div>
          ) : hospitalizaciones.length === 0 ? (
            <div className="hosp-sidebar-empty"><span className="empty-icon">🛏️</span><span>No hay pacientes</span></div>
          ) : (
            sortedHospitalizaciones.map(h => {
              const ms = getMonitoringStatus(h);
              const days = getDaysHospitalized(h.fechaIngreso);
              return (
                <div
                  key={h.id}
                  className={`hosp-card ${sel?.id === h.id ? 'selected' : ''} urgency-${ms.status}`}
                  onClick={() => handleSelectPatient(h)}
                >
                  <div className={`hosp-card-dot ${ms.status}`} title={ms.message} />
                  <div className="hosp-card-body">
                    <div className="hosp-card-name">{h.patient?.nombre || 'Sin nombre'}</div>
                    <div className="hosp-card-meta">
                      {h.patient?.especie} • {h.type?.replace(/_/g, ' ')}
                    </div>
                    <div className="hosp-card-bottom">
                      <span className="hosp-card-days">{days}d</span>
                      <span className={`hosp-card-alert ${ms.status}`}>
                        {ms.status === 'urgent' && '⚠️ '}
                        {ms.status === 'overdue' && '⏰ '}
                        {ms.status === 'soon' && '🔔 '}
                        {ms.message}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* ─── DETAIL PANEL ─── */}
        <main className="hosp-detail">
          {!sel ? (
            <div className="hosp-detail-empty">
              <div className="empty-icon">👆</div>
              <span>Selecciona un paciente para ver detalles</span>
            </div>
          ) : (
            <div className="hosp-detail-scroll">
              {/* ══ PATIENT HEADER ══ */}
              <div className="hosp-patient-header">
                <div className="hosp-patient-main">
                  <div className="hosp-patient-avatar">
                    {patient.especie?.toLowerCase().includes('gato') ? '🐈' : '🐕'}
                  </div>
                  <div className="hosp-patient-info">
                    <h2>{patient.nombre}</h2>
                    <p className="hosp-patient-species">
                      {patient.especie} • {patient.raza} • {patient.edad}
                      {patient.peso && ` • ${patient.peso}kg`}
                    </p>
                    <p className="hosp-patient-dx">
                      <strong>Dx:</strong> {sel.diagnosis || '-'} &nbsp;|&nbsp;
                      <strong>Motivo:</strong> {sel.reason || '-'}
                    </p>
                    {sel.cuidadosEspeciales && (
                      <p className="hosp-patient-care">⚠️ {sel.cuidadosEspeciales}</p>
                    )}
                  </div>
                </div>
                <div className="hosp-quick-actions">
                  <button className="hosp-action-btn primary" onClick={() => setShowVitalsModal(true)}>
                    ❤️ Signos Vitales
                  </button>
                  <button className="hosp-action-btn secondary" onClick={() => setShowTherapyModal(true)}>
                    💊 Agregar Medicamento
                  </button>
                  <button className="hosp-action-btn secondary" onClick={handleOpenFluids}>
                    💧 Fluidos
                  </button>
                  {sel.status === 'ACTIVO' && (
                    <button className="hosp-action-btn danger" onClick={() => setShowDischargeModal(true)}>
                      🏠 Dar de Alta
                    </button>
                  )}
                </div>
              </div>

              {/* Hospitalization meta */}
              <div className="hosp-meta-bar">
                <span>📅 Ingreso: {formatDate(sel.fechaIngreso)}</span>
                <span>📍 {sel.location || 'Sin ubicación'}</span>
                <span>🔄 Monitoreo c/{sel.frecuenciaMonitoreo || '?'}</span>
                <span>🩺 Dr. {sel.attendingVet?.nombre || 'No asignado'}</span>
                <span>📆 Est. {sel.estimacionDias || '?'} días</span>
              </div>

              {/* ══ UPCOMING ACTIONS ══ */}
              <section className="hosp-section">
                <div className="hosp-section-header" onClick={() => toggleSection('upcoming')}>
                  <h3>⏰ Próximas Acciones <span className="hosp-section-count">{upcomingActions.length}</span></h3>
                  <span className={`hosp-chevron ${expandedSections.upcoming ? 'open' : ''}`}>▾</span>
                </div>
                {expandedSections.upcoming && (
                  <div className="hosp-upcoming-list">
                    {upcomingActions.length === 0 ? (
                      <div className="hosp-empty-section">Sin acciones pendientes</div>
                    ) : (
                      upcomingActions.map(action => (
                        <div key={action.id} className={`hosp-upcoming-item ${action.isOverdue ? 'overdue' : ''}`}>
                          <span className="upcoming-time">
                            {action.type === 'medication' ? formatTime(action.time) : '—'}
                          </span>
                          <span className="upcoming-icon">
                            {action.type === 'medication' ? '💊' : '🩺'}
                          </span>
                          <span className="upcoming-name">
                            {action.type === 'medication'
                              ? `${action.data.therapyItem?.medication?.nombre || action.data.therapyItem?.medicationName || '?'} ${action.data.therapyItem?.dosis || ''} ${action.data.therapyItem?.via || ''}`
                              : `Monitoreo: ${action.data.statusInfo?.message}`
                            }
                          </span>
                          {action.type === 'medication' && action.data.status === 'PENDIENTE' && (
                            <button className="upcoming-action-btn" onClick={() => handleAdminister(action.data.id)}>
                              ✓ Administrar
                            </button>
                          )}
                          {action.type === 'monitoring' && action.isOverdue && (
                            <button className="upcoming-action-btn" onClick={() => setShowVitalsModal(true)}>
                              ✓ Registrar
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    {therapyPlan.filter(t => t.activo).length > 0 && pendingMedications.filter(m => m.status === 'PENDIENTE').length === 0 && (
                      <button className="hosp-generate-btn" onClick={handleGenerateSchedule}>
                        🔄 Generar Horario del Día
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* ══ TIMELINE ══ */}
              <section className="hosp-section">
                <div className="hosp-section-header" onClick={() => toggleSection('timeline')}>
                  <h3>📋 Línea de Tiempo</h3>
                  <span className={`hosp-chevron ${expandedSections.timeline ? 'open' : ''}`}>▾</span>
                </div>
                {expandedSections.timeline && (
                  <div className="hosp-timeline">
                    {/* Add evolution note */}
                    <div className="hosp-add-note">
                      <textarea
                        value={evolutionNote}
                        onChange={e => setEvolutionNote(e.target.value)}
                        placeholder="📝 Nota de evolución..."
                        rows={2}
                      />
                      <button onClick={handleAddEvolutionNote} disabled={!evolutionNote.trim() || loading}>
                        + Nota
                      </button>
                    </div>

                    {timeline.length === 0 ? (
                      <div className="hosp-empty-section">Sin registros aún</div>
                    ) : (
                      <div className="hosp-timeline-entries">
                        {timeline.map(entry => (
                          <div key={entry.id} className={`hosp-timeline-entry ${entry.type}`}>
                            <div className="timeline-time">{formatTime(entry.time)}</div>
                            <div className="timeline-dot-line">
                              <div className={`timeline-dot ${entry.type}`} />
                              <div className="timeline-line" />
                            </div>
                            <div className="timeline-content">
                              {entry.type === 'vitals' && (
                                <>
                                  <div className="timeline-label">
                                    ❤️ Signos Vitales
                                    <span className="timeline-date">{formatDate(entry.time)}</span>
                                  </div>
                                  <div className="timeline-vitals-grid">
                                    {entry.data.frecuenciaCardiaca && <span>FC: {entry.data.frecuenciaCardiaca}</span>}
                                    {entry.data.frecuenciaRespiratoria && <span>FR: {entry.data.frecuenciaRespiratoria}</span>}
                                    {entry.data.temperatura && <span>T°: {entry.data.temperatura}°C</span>}
                                    {entry.data.nivelConciencia && <span>{entry.data.nivelConciencia}</span>}
                                    {entry.data.escalaDolor != null && <span>Dolor: {entry.data.escalaDolor}/10</span>}
                                  </div>
                                  {entry.data.observaciones && (
                                    <div className="timeline-note">📝 {entry.data.observaciones}</div>
                                  )}
                                </>
                              )}
                              {entry.type === 'medication_done' && (
                                <>
                                  <div className="timeline-label">
                                    💊 {entry.data.therapyItem?.medication?.nombre || entry.data.therapyItem?.medicationName || 'Medicamento'}
                                    <span className="timeline-date">{formatDate(entry.time)}</span>
                                  </div>
                                  <div className="timeline-med-info">
                                    {entry.data.therapyItem?.dosis} • {entry.data.therapyItem?.via} • ✓ Administrado
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ══ THERAPY PLAN ══ */}
              <section className="hosp-section">
                <div className="hosp-section-header" onClick={() => toggleSection('therapy')}>
                  <h3>
                    💊 Plan Terapéutico
                    <span className="hosp-section-count">{therapyPlan.filter(t => t.activo).length} activos</span>
                  </h3>
                  <span className={`hosp-chevron ${expandedSections.therapy ? 'open' : ''}`}>▾</span>
                </div>
                {expandedSections.therapy && (
                  <div className="hosp-therapy-content">
                    {therapyPlan.length === 0 ? (
                      <div className="hosp-empty-section">Sin medicamentos en el plan</div>
                    ) : (
                      <div className="hosp-therapy-list">
                        {therapyPlan.map(item => (
                          <div key={item.id} className={`hosp-therapy-item ${item.activo ? 'active' : 'inactive'}`}>
                            <div className="therapy-item-info">
                              <strong>{item.medication?.nombre || item.medicationName || '-'}</strong>
                              <span>{item.dosis} • {item.via} • {item.frecuenciaHoras}</span>
                              {item.notas && <span className="therapy-notes">{item.notas}</span>}
                            </div>
                            <div className="therapy-item-actions">
                              <span className={`therapy-status ${item.activo ? 'active' : 'inactive'}`}>
                                {item.activo ? '✓ Activo' : '✗ Suspendido'}
                              </span>
                              {item.activo ? (
                                <button className="hosp-btn-sm danger" onClick={() => deactivateTherapyItem(sel.id, item.id)}>
                                  Suspender
                                </button>
                              ) : (
                                <button className="hosp-btn-sm primary" onClick={() => activateTherapyItem(sel.id, item.id)}>
                                  Activar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="hosp-add-btn" onClick={() => setShowTherapyModal(true)}>
                      + Agregar Medicamento
                    </button>
                  </div>
                )}
              </section>

              {/* ══ NEONATES (conditional) ══ */}
              {(sel.type === 'NEONATOS' || sel.type === 'MATERNIDAD') && (
                <section className="hosp-section">
                  <div className="hosp-section-header" onClick={() => toggleSection('neonates')}>
                    <h3>🍼 Neonatos <span className="hosp-section-count">{neonates?.length || 0}</span></h3>
                    <span className={`hosp-chevron ${expandedSections.neonates ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.neonates && (
                    <div className="hosp-neonates-content">
                      <div className="hosp-neonates-meta">
                        <span>Madre: {patient.nombre}</span>
                        <span>Nacimiento: {formatDate(sel.fechaIngreso)}</span>
                        <span>Edad: {getDaysHospitalized(sel.fechaIngreso)} días</span>
                      </div>
                      {neonates.length === 0 ? (
                        <div className="hosp-empty-section">No hay neonatos registrados</div>
                      ) : (
                        <div className="hosp-neonates-list">
                          {neonates.map((neo, idx) => (
                            <div key={neo.id} className="hosp-neo-card">
                              <div className="neo-card-header">
                                <strong>Neonato #{neo.number || idx + 1}</strong>
                                {neo.sex && <span className={`neo-sex ${neo.sex.toLowerCase()}`}>{neo.sex === 'MACHO' ? '♂' : '♀'}</span>}
                                {neo.identificationType && <span className="neo-id">{neo.identificationType}: {neo.identification}</span>}
                                <button className="hosp-btn-sm secondary" onClick={() => { setSelectedNeonate(neo); setShowNeonateRecordModal(true); }}>
                                  + Monitoreo
                                </button>
                              </div>
                              {neo.records?.length > 0 && (
                                <table className="neo-records-table">
                                  <thead><tr>
                                    <th>Hora</th><th>Peso(g)</th><th>T°</th><th>FC</th><th>FR</th><th>Succión</th><th>Act.</th>
                                  </tr></thead>
                                  <tbody>
                                    {neo.records.slice(0, 3).map(r => (
                                      <tr key={r.id}>
                                        <td>{formatTime(r.recordedAt)}</td>
                                        <td>{r.weight || '-'}</td>
                                        <td>{r.temperature || '-'}</td>
                                        <td>{r.heartRate || '-'}</td>
                                        <td>{r.respiratoryRate || '-'}</td>
                                        <td>{r.suction === 'ADECUADA' ? '✓' : r.suction === 'DEBIL' ? '⚠' : '-'}</td>
                                        <td>{r.activity === 'ACTIVO' ? '✓' : r.activity === 'LETARGICO' ? '⚠' : '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="hosp-add-btn" onClick={() => { setNeonateForm(prev => ({ ...prev, number: (neonates?.length || 0) + 1 })); setShowNeonateModal(true); }}>
                        + Registrar Neonato
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* ══ COSTS (collapsed by default) ══ */}
              <section className="hosp-section">
                <div className="hosp-section-header" onClick={() => toggleSection('costs')}>
                  <h3>
                    💰 Costos Acumulados
                    <span className="hosp-section-value">{formatCurrency(costs?.total)}</span>
                  </h3>
                  <span className={`hosp-chevron ${expandedSections.costs ? 'open' : ''}`}>▾</span>
                </div>
                {expandedSections.costs && (
                  <div className="hosp-costs-content">
                    <div className="hosp-cost-row">
                      <span>🏥 Estancia ({costs?.days || getDaysHospitalized(sel.fechaIngreso)} días × {formatCurrency(costs?.dailyRate)})</span>
                      <strong>{formatCurrency(costs?.hospitalizationCost)}</strong>
                    </div>
                    <div className="hosp-cost-row">
                      <span>💊 Medicamentos ({costs?.medicationCount || 0} admin.)</span>
                      <strong>{formatCurrency(costs?.medicationCost)}</strong>
                    </div>
                    <div className="hosp-cost-row">
                      <span>🔬 Estudios ({costs?.labCount || 0})</span>
                      <strong>{formatCurrency(costs?.labCost)}</strong>
                    </div>
                    {costs?.otherCosts > 0 && (
                      <div className="hosp-cost-row">
                        <span>📋 Otros</span>
                        <strong>{formatCurrency(costs?.otherCosts)}</strong>
                      </div>
                    )}
                    <div className="hosp-cost-total">
                      <span>Total</span>
                      <strong>{formatCurrency(costs?.total)}</strong>
                    </div>
                    <div className="hosp-cost-note">
                      ⚠️ Recepción cobra al final de la hospitalización.
                    </div>
                  </div>
                )}
              </section>

              {/* ══ CONSULTATION / DOCTOR NOTES (collapsed) ══ */}
              <section className="hosp-section">
                <div className="hosp-section-header" onClick={() => toggleSection('consultation')}>
                  <h3>👨‍⚕️ Notas del Médico (Consulta)</h3>
                  <span className={`hosp-chevron ${expandedSections.consultation ? 'open' : ''}`}>▾</span>
                </div>
                {expandedSections.consultation && sel.consultation && (
                  <div className="hosp-consultation-content">
                    {sel.consultation.motivoConsulta && (
                      <div className="consult-row">
                        <label>Motivo:</label>
                        <p>{sel.consultation.motivoConsulta}</p>
                      </div>
                    )}
                    <div className="hosp-soap">
                      {sel.consultation.soapSubjetivo && <div className="soap-item"><strong>S:</strong> {sel.consultation.soapSubjetivo}</div>}
                      {sel.consultation.soapObjetivo && <div className="soap-item"><strong>O:</strong> {sel.consultation.soapObjetivo}</div>}
                      {sel.consultation.soapAnalisis && <div className="soap-item"><strong>A:</strong> {sel.consultation.soapAnalisis}</div>}
                      {sel.consultation.soapPlan && <div className="soap-item"><strong>P:</strong> {sel.consultation.soapPlan}</div>}
                    </div>
                    {sel.consultation.diagnosticos?.length > 0 && (
                      <div className="consult-row">
                        <label>Diagnósticos:</label>
                        <ul>{sel.consultation.diagnosticos.map((dx, i) => <li key={i}><strong>{dx.codigo}:</strong> {dx.descripcion}</li>)}</ul>
                      </div>
                    )}
                    {sel.consultation.signosVitales && (
                      <div className="consult-vitals">
                        <label>Signos en consulta:</label>
                        <span>FC: {sel.consultation.signosVitales.frecuenciaCardiaca || '-'}</span>
                        <span>FR: {sel.consultation.signosVitales.frecuenciaRespiratoria || '-'}</span>
                        <span>T°: {sel.consultation.signosVitales.temperatura || '-'}°C</span>
                        <span>Peso: {sel.consultation.signosVitales.peso || '-'}kg</span>
                      </div>
                    )}
                  </div>
                )}
                {expandedSections.consultation && !sel.consultation && (
                  <div className="hosp-empty-section">Sin consulta de referencia</div>
                )}
              </section>

              {/* ══ STUDIES ══ */}
              {(sel.studyBH || sel.studyQS || sel.studyRX || sel.studyUS || sel.studyEGO || sel.studyECG || sel.studyElectrolitos || sel.studySNAP) && (
                <section className="hosp-section">
                  <div className="hosp-section-header" onClick={() => toggleSection('studies')}>
                    <h3>🔬 Estudios Solicitados</h3>
                    <span className={`hosp-chevron ${expandedSections.studies ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.studies && (
                    <div className="hosp-studies-grid">
                      {sel.studyBH && <span className="study-badge">BH</span>}
                      {sel.studyQS && <span className="study-badge">QS</span>}
                      {sel.studyRX && <span className="study-badge">RX</span>}
                      {sel.studyUS && <span className="study-badge">US</span>}
                      {sel.studyEGO && <span className="study-badge">EGO</span>}
                      {sel.studyECG && <span className="study-badge">ECG</span>}
                      {sel.studyElectrolitos && <span className="study-badge">Electrolitos</span>}
                      {sel.studySNAP && <span className="study-badge">SNAP</span>}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Vitals Modal ─── */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal-content vitals-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>❤️ Registrar Signos Vitales</h2>
              <button className="modal-close" onClick={() => setShowVitalsModal(false)}>×</button>
            </div>
            <form onSubmit={handleVitalsSubmit} className="vitals-form">
              <div className="vitals-section">
                <h3 className="section-title">📊 Signos Vitales Básicos</h3>
                <div className="vitals-grid four-cols">
                  <div className="vitals-input-group">
                    <label>FC (bpm)</label>
                    <input type="number" name="frecuenciaCardiaca" value={vitalsForm.frecuenciaCardiaca} onChange={handleVitalsChange} placeholder="60-200" className="vitals-input" />
                  </div>
                  <div className="vitals-input-group">
                    <label>FR (rpm)</label>
                    <input type="number" name="frecuenciaRespiratoria" value={vitalsForm.frecuenciaRespiratoria} onChange={handleVitalsChange} placeholder="10-40" className="vitals-input" />
                  </div>
                  <div className="vitals-input-group">
                    <label>T° (°C)</label>
                    <input type="number" step="0.1" name="temperatura" value={vitalsForm.temperatura} onChange={handleVitalsChange} placeholder="38.0-39.5" className="vitals-input" />
                  </div>
                  <div className="vitals-input-group">
                    <label>Peso (kg)</label>
                    <input type="number" step="0.01" name="peso" value={vitalsForm.peso} onChange={handleVitalsChange} className="vitals-input" />
                  </div>
                </div>
              </div>
              <div className="vitals-section">
                <h3 className="section-title">💧 Perfusión y Estado</h3>
                <div className="vitals-grid three-cols">
                  <div className="vitals-input-group">
                    <label>TRC (seg)</label>
                    <input type="number" step="0.1" name="trc" value={vitalsForm.trc} onChange={handleVitalsChange} placeholder="<2" className="vitals-input" />
                  </div>
                  <div className="vitals-input-group">
                    <label>Mucosas</label>
                    <select name="mucosas" value={vitalsForm.mucosas} onChange={handleVitalsChange} className="vitals-select">
                      <option value="ROSADAS">🟢 Rosadas</option>
                      <option value="PALIDAS">⚪ Pálidas</option>
                      <option value="CIANOTICAS">🔵 Cianóticas</option>
                      <option value="ICTERICAS">🟡 Ictéricas</option>
                      <option value="CONGESTIVAS">🔴 Congestivas</option>
                    </select>
                  </div>
                  <div className="vitals-input-group">
                    <label>Hidratación</label>
                    <select name="hidratacion" value={vitalsForm.hidratacion} onChange={handleVitalsChange} className="vitals-select">
                      <option value="NORMAL">✅ Normal</option>
                      <option value="LEVE">⚠️ Leve (5%)</option>
                      <option value="MODERADA">🔶 Moderada (7%)</option>
                      <option value="SEVERA">🔴 Severa (10%+)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="vitals-section">
                <h3 className="section-title">🧠 Estado Neurológico</h3>
                <div className="vitals-grid two-cols">
                  <div className="vitals-input-group">
                    <label>Nivel de Conciencia</label>
                    <select name="nivelConciencia" value={vitalsForm.nivelConciencia} onChange={handleVitalsChange} className="vitals-select">
                      <option value="ALERTA">✅ Alerta</option>
                      <option value="SOMNOLIENTO">😴 Somnoliento</option>
                      <option value="DESORIENTADO">😵 Desorientado</option>
                      <option value="ESTUPOROSO">😶 Estuporoso</option>
                      <option value="COMA">🚨 Coma</option>
                    </select>
                  </div>
                  <div className="vitals-input-group pain-group">
                    <label>Nivel de Dolor: <strong>{vitalsForm.nivelDolor}/10</strong></label>
                    <div className="pain-slider-container">
                      <span className="pain-label">😊</span>
                      <input type="range" min="0" max="10" name="nivelDolor" value={vitalsForm.nivelDolor} onChange={handleVitalsChange} className="pain-slider" />
                      <span className="pain-label">😣</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="vitals-section">
                <h3 className="section-title">🔬 Laboratorio</h3>
                <div className="vitals-grid two-cols">
                  <div className="vitals-input-group">
                    <label>Glucosa (mg/dL)</label>
                    <input type="number" name="glucosa" value={vitalsForm.glucosa} onChange={handleVitalsChange} placeholder="70-120" className="vitals-input" />
                  </div>
                  <div className="vitals-input-group">
                    <label>Presión Arterial</label>
                    <input type="text" name="presionArterial" value={vitalsForm.presionArterial} onChange={handleVitalsChange} placeholder="120/80" className="vitals-input" />
                  </div>
                </div>
              </div>
              <div className="vitals-section">
                <h3 className="section-title">📝 Observaciones</h3>
                <textarea name="observaciones" value={vitalsForm.observaciones} onChange={handleVitalsChange} rows={3} placeholder="Notas sobre el estado del paciente..." className="vitals-textarea" />
              </div>
              <div className="vitals-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowVitalsModal(false)}>Cancelar</button>
                <button type="submit" className="btn-submit" disabled={loading}>{loading ? '⏳ Guardando...' : '💾 Guardar Signos Vitales'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Therapy Modal ─── */}
      {showTherapyModal && (
        <div className="modal-overlay" onClick={() => setShowTherapyModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💊 Agregar Medicamento al Plan</h2>
              <button className="modal-close" onClick={() => setShowTherapyModal(false)}>×</button>
            </div>
            <form onSubmit={handleTherapySubmit}>
              <div className="medication-search-section">
                <label>Buscar medicamento</label>
                <div className="medication-search-container" ref={medicationSearchRef}>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="form-control search-medication-input"
                      placeholder="Escriba para buscar..."
                      value={therapyForm.medicationId ? therapyForm.medicationName : medicationSearch}
                      onChange={e => {
                        if (therapyForm.medicationId) {
                          setTherapyForm(prev => ({ ...prev, medicationId: '', medicationName: '', presentacion: '', concentracion: '', stockDisponible: 0 }));
                        }
                        setMedicationSearch(e.target.value);
                      }}
                    />
                    {searchingMedications && <span className="search-spinner">⏳</span>}
                    {therapyForm.medicationId && (
                      <button type="button" className="clear-selection-btn" onClick={() => {
                        setTherapyForm(prev => ({ ...prev, medicationId: '', medicationName: '', presentacion: '', concentracion: '', stockDisponible: 0 }));
                        setMedicationSearch('');
                      }}>✕</button>
                    )}
                  </div>
                  {showMedicationDropdown && medicationResults.length > 0 && (
                    <div className="medication-search-dropdown">
                      {medicationResults.map(med => {
                        const stock = med.currentStock ?? med.stockActual ?? 0;
                        return (
                          <div key={med.id} className={`medication-search-item ${stock === 0 ? 'out-of-stock' : ''}`}
                            onClick={() => stock > 0 && handleSelectMedication(med)}>
                            <div className="med-search-info">
                              <strong>{med.name || med.nombre}</strong>
                              <span className="med-details">{med.presentation || med.presentacion} {(med.concentration || med.concentracion) && `- ${med.concentration || med.concentracion}`}</span>
                            </div>
                            <span className={`stock-indicator ${stock > 10 ? 'high' : stock > 0 ? 'low' : 'empty'}`}>
                              {stock > 0 ? `${stock} disp.` : 'Sin stock'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {showMedicationDropdown && medicationResults.length === 0 && medicationSearch.length >= 2 && !searchingMedications && (
                    <div className="medication-search-dropdown"><div className="no-results">No se encontraron medicamentos</div></div>
                  )}
                </div>
                {therapyForm.medicationId && (
                  <div className="selected-medication-info">
                    <span className="med-selected-badge">✓ Seleccionado</span>
                    <strong>{therapyForm.medicationName}</strong>
                    {therapyForm.presentacion && <span> • {therapyForm.presentacion}</span>}
                    {therapyForm.concentracion && <span> • {therapyForm.concentracion}</span>}
                    <span> • Stock: {therapyForm.stockDisponible}</span>
                  </div>
                )}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Dosis *</label>
                  <input type="number" step="0.01" name="dosis" value={therapyForm.dosis} onChange={handleTherapyChange} required placeholder="5" />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <select name="unidadDosis" value={therapyForm.unidadDosis} onChange={handleTherapyChange}>
                    <option value="mg">mg</option><option value="ml">ml</option><option value="g">g</option><option value="UI">UI</option><option value="gotas">gotas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Frecuencia</label>
                  <select name="frecuenciaHoras" value={therapyForm.frecuenciaHoras} onChange={handleTherapyChange}>
                    <option value={4}>Cada 4h</option><option value={6}>Cada 6h</option><option value={8}>Cada 8h</option><option value={12}>Cada 12h</option><option value={24}>Cada 24h</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Vía</label>
                  <select name="via" value={therapyForm.via} onChange={handleTherapyChange}>
                    <option value="IV">IV</option><option value="IM">IM</option><option value="SC">SC</option><option value="PO">Oral</option><option value="TOPICA">Tópica</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea name="notas" value={therapyForm.notas} onChange={handleTherapyChange} rows={2} placeholder="Instrucciones adicionales..." />
                </div>
              </div>
              <div className="pharmacy-note">⚠️ El medicamento se solicitará a Farmacia.</div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowTherapyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-submit" disabled={loading || !therapyForm.medicationId}>{loading ? '⏳...' : '💊 Agregar al Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Neonate Modal ─── */}
      {showNeonateModal && (
        <div className="modal-overlay" onClick={() => setShowNeonateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🍼 Registrar Neonato</h2>
              <button className="modal-close" onClick={() => setShowNeonateModal(false)}>×</button>
            </div>
            <form onSubmit={handleNeonateSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Neonato No. *</label>
                  <input type="number" name="number" value={neonateForm.number} onChange={handleNeonateChange} required min="1" />
                </div>
                <div className="form-group">
                  <label>Sexo</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input type="radio" name="sex" value="MACHO" checked={neonateForm.sex === 'MACHO'} onChange={handleNeonateChange} /> ♂ Macho
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input type="radio" name="sex" value="HEMBRA" checked={neonateForm.sex === 'HEMBRA'} onChange={handleNeonateChange} /> ♀ Hembra
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tipo de Identificación</label>
                  <select name="identificationType" value={neonateForm.identificationType} onChange={handleNeonateChange}>
                    <option value="">Seleccionar...</option>
                    <option value="COLLAR">Collar</option><option value="MARCA">Marca</option><option value="COLOR">Color</option><option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input type="text" name="identification" value={neonateForm.identification} onChange={handleNeonateChange} placeholder="Collar rojo, mancha blanca..." />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNeonateModal(false)}>Cancelar</button>
                <button type="submit" className="btn-submit" disabled={loading}>{loading ? '⏳...' : '✓ Registrar Neonato'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Neonate Record Modal ─── */}
      {showNeonateRecordModal && selectedNeonate && (
        <div className="modal-overlay" onClick={() => setShowNeonateRecordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Monitoreo - Neonato #{selectedNeonate.number || '?'} {selectedNeonate.sex === 'MACHO' ? '♂' : '♀'}</h2>
              <button className="modal-close" onClick={() => setShowNeonateRecordModal(false)}>×</button>
            </div>
            <form onSubmit={handleNeonateRecordSubmit}>
              <div className="form-grid">
                <div className="form-group"><label>Peso (g)</label><input type="number" step="0.1" name="weight" value={neonateRecordForm.weight} onChange={handleNeonateRecordChange} placeholder="350" /></div>
                <div className="form-group"><label>T° (°C)</label><input type="number" step="0.1" name="temperature" value={neonateRecordForm.temperature} onChange={handleNeonateRecordChange} placeholder="38.5" /></div>
                <div className="form-group"><label>FC (lpm)</label><input type="number" name="heartRate" value={neonateRecordForm.heartRate} onChange={handleNeonateRecordChange} placeholder="180" /></div>
                <div className="form-group"><label>FR (rpm)</label><input type="number" name="respiratoryRate" value={neonateRecordForm.respiratoryRate} onChange={handleNeonateRecordChange} placeholder="30" /></div>
                <div className="form-group">
                  <label>Succión</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ cursor: 'pointer' }}><input type="radio" name="suction" value="ADECUADA" checked={neonateRecordForm.suction === 'ADECUADA'} onChange={handleNeonateRecordChange} /> ✓ Adecuada</label>
                    <label style={{ cursor: 'pointer' }}><input type="radio" name="suction" value="DEBIL" checked={neonateRecordForm.suction === 'DEBIL'} onChange={handleNeonateRecordChange} /> ⚠ Débil</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Actividad</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ cursor: 'pointer' }}><input type="radio" name="activity" value="ACTIVO" checked={neonateRecordForm.activity === 'ACTIVO'} onChange={handleNeonateRecordChange} /> ✓ Activo</label>
                    <label style={{ cursor: 'pointer' }}><input type="radio" name="activity" value="LETARGICO" checked={neonateRecordForm.activity === 'LETARGICO'} onChange={handleNeonateRecordChange} /> ⚠ Letárgico</label>
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea name="notes" value={neonateRecordForm.notes} onChange={handleNeonateRecordChange} rows={2} placeholder="Observaciones..." />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNeonateRecordModal(false)}>Cancelar</button>
                <button type="submit" className="btn-submit" disabled={loading}>{loading ? '⏳...' : '✓ Registrar Monitoreo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Discharge Modal ─── */}
      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 Dar de Alta</h2>
              <button className="modal-close" onClick={() => setShowDischargeModal(false)}>×</button>
            </div>
            <form onSubmit={handleDischargeSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tipo de Alta</label>
                  <select name="type" value={dischargeForm.type} onChange={handleDischargeChange}>
                    <option value="ALTA_MEDICA">Alta Médica</option>
                    <option value="ALTA_VOLUNTARIA">Alta Voluntaria</option>
                    <option value="TRANSFERIDO">Transferido</option>
                    <option value="FALLECIDO">Fallecido</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Notas de Alta</label>
                  <textarea name="notes" value={dischargeForm.notes} onChange={handleDischargeChange} rows={4} placeholder="Indicaciones, medicamentos, citas..." />
                </div>
              </div>
              <div className="pharmacy-note">⚠️ Se notificará a Recepción para el cobro final.</div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowDischargeModal(false)}>Cancelar</button>
                <button type="submit" className="btn-submit btn-danger" disabled={loading}>{loading ? '⏳...' : '✓ Confirmar Alta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Fluid Therapy Modal ─── */}
      {fluidCalcTarget && (
        <div className="modal-overlay" onClick={() => setFluidCalcTarget(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <FluidTherapyCalculator
              hospitalization={{
                id: fluidCalcTarget.hospitalizationId || sel?.id,
                pet: fluidCalcTarget.pet || patient,
              }}
              onClose={() => setFluidCalcTarget(null)}
              onSaved={() => { if (sel) selectHospitalization(sel); }}
            />
          </div>
        </div>
      )}

      {/* ─── Ronda Rápida Modal ─── */}
      {showRondaRapida && (
        <RondaRapida
          patients={sortedHospitalizaciones.filter(h => h.status === 'ACTIVO' || !h.status)}
          onSaveVitals={addVitalSigns}
          onClose={() => {
            setShowRondaRapida(false);
            fetchHospitalizaciones(filterType || null, filterStatus || null);
          }}
        />
      )}

      {/* ─── Board View Modal ─── */}
      {showBoardView && (
        <div className="modal-overlay fullscreen" onClick={() => setShowBoardView(false)}>
          <div className="modal-content modal-fullscreen" onClick={e => e.stopPropagation()}>
            <div className="board-modal-header">
              <h2>📊 Tablero por Áreas</h2>
              <button className="modal-close" onClick={() => setShowBoardView(false)}>×</button>
            </div>
            <HospitalBoard
              onSelectPatient={(row) => {
                setShowBoardView(false);
                const found = hospitalizaciones.find(h => h.id === row.hospitalizationId);
                if (found) handleSelectPatient(found);
              }}
              onOpenFluidCalc={(row) => {
                setFluidCalcTarget(row);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalizacionDashboard;
