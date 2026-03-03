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
  const [fluidCalcTarget, setFluidCalcTarget] = useState(null);

  // ═══════ DRAWER STATE ═══════
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ═══════ EVOLUTION NOTE ═══════
  const [evolutionNote, setEvolutionNote] = useState('');

  // ═══════ FORM STATES ═══════
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

  // ═══════ COMPUTED: Patient timeline ═══════
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
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.time - b.time;
    });
    return actions;
  }, [pendingMedications, selectedHospitalization, currentTime]);

  // ═══════ LOAD DATA ═══════
  useEffect(() => {
    fetchHospitalizaciones(filterType || null, filterStatus || null);
  }, [filterType, filterStatus, fetchHospitalizaciones]);

  // Auto-refresh every minute
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
    setDrawerOpen(true);
  }, [selectHospitalization]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

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
    if (e) e.preventDefault();
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
    if (e) e.preventDefault();
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
    if (e) e.preventDefault();
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
    if (e) e.preventDefault();
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
    if (e) e.preventDefault();
    if (!selectedHospitalization) return;
    const ok = await dischargePatient(selectedHospitalization.id, dischargeForm.type, dischargeForm.notes);
    if (ok) {
      setShowDischargeModal(false);
      setDischargeForm({ type: 'ALTA_MEDICA', notes: '' });
      setDrawerOpen(false);
      fetchHospitalizaciones(filterType || null, filterStatus || null);
    }
  };

  // Evolution note
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

  // Open fluids
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
    <div className="hd">
      {/* ─── HEADER ─── */}
      <header className="hd-header">
        <div className="hd-header-left">
          <h1>🏥 Hospitalización</h1>
          <div className="hd-filters">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todas las áreas</option>
              <option value="PERROS_NO_INFECCIOSOS">🐕 Hosp. Perros</option>
              <option value="PERROS_INFECCIOSOS">🐕‍🦺 Infec. Perros</option>
              <option value="GATOS_NO_INFECCIOSOS">🐈 Hosp. Gatos</option>
              <option value="GATOS_INFECCIOSOS">🐈‍⬛ Infec. Gatos</option>
              <option value="MATERNIDAD">🤱 Maternidad</option>
              <option value="UCI">🚨 UCI</option>
              <option value="NEONATOS">🍼 Neonatos</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="ACTIVO">Activos</option>
              <option value="">Todos</option>
              <option value="ALTA_PENDIENTE">Alta Pendiente</option>
              <option value="DADO_DE_ALTA">Dados de Alta</option>
            </select>
            <span className="hd-count">{hospitalizaciones.length} pacientes</span>
          </div>
        </div>
        <div className="hd-header-right">
          <button className="hd-btn-ronda" onClick={() => setShowRondaRapida(true)} disabled={!hospitalizaciones.length}>
            🩺 Ronda Rápida
          </button>
          <span className="hd-user">{user?.name}</span>
          <button className="hd-btn-logout" onClick={logout}>Salir</button>
        </div>
      </header>

      {error && (
        <div className="hd-error">
          <span>⚠️ {error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* ─── MAIN: Board is the center stage ─── */}
      <div className="hd-body">
        {/* CENTER: Hospital Board (the main view) */}
        <main className="hd-center">
          <HospitalBoard
            onSelectPatient={(row) => {
              const found = hospitalizaciones.find(h => h.id === row.hospitalizationId);
              if (found) handleSelectPatient(found);
            }}
            onOpenFluidCalc={(row) => {
              setFluidCalcTarget(row);
            }}
          />
        </main>

        {/* RIGHT PANEL: Patient Detail */}
        {drawerOpen && sel && (
          <aside className="hd-drawer">
              {/* Drawer header */}
              <div className="hd-drawer-header">
                <div className="hd-drawer-patient">
                  <span className="hd-drawer-avatar">
                    {patient.especie?.toLowerCase().includes('gato') ? '🐈' : '🐕'}
                  </span>
                  <div>
                    <h2>{patient.nombre}</h2>
                    <p>{patient.especie} • {patient.raza} • {patient.edad}{patient.peso ? ` • ${patient.peso}kg` : ''}</p>
                  </div>
                </div>
                <button className="hd-drawer-close" onClick={handleCloseDrawer}>×</button>
              </div>

              {/* Dx + meta */}
              <div className="hd-drawer-meta">
                <div className="hd-dx">
                  <strong>Dx:</strong> {sel.diagnosis || '-'} <span className="hd-sep">|</span>
                  <strong>Motivo:</strong> {sel.reason || '-'}
                </div>
                {sel.cuidadosEspeciales && (
                  <div className="hd-care-alert">⚠️ {sel.cuidadosEspeciales}</div>
                )}
                <div className="hd-meta-chips">
                  <span>📅 {formatDate(sel.fechaIngreso)}</span>
                  <span>📍 {sel.location || '-'}</span>
                  <span>🔄 c/{sel.frecuenciaMonitoreo || '?'}</span>
                  <span>🩺 Dr. {sel.attendingVet?.nombre || '-'}</span>
                  <span>📆 Est. {sel.estimacionDias || '?'}d</span>
                </div>
              </div>

              {/* Quick actions bar */}
              <div className="hd-drawer-actions">
                <button className="hd-act primary" onClick={() => setShowVitalsModal(true)}>❤️ Signos</button>
                <button className="hd-act" onClick={() => setShowTherapyModal(true)}>💊 Medicamento</button>
                <button className="hd-act" onClick={handleOpenFluids}>💧 Fluidos</button>
                {sel.status === 'ACTIVO' && (
                  <button className="hd-act danger" onClick={() => setShowDischargeModal(true)}>🏠 Alta</button>
                )}
              </div>

              {/* Scrollable content */}
              <div className="hd-drawer-content">
                {/* ══ UPCOMING ACTIONS ══ */}
                <section className="hd-section">
                  <div className="hd-section-head" onClick={() => toggleSection('upcoming')}>
                    <h3>⏰ Próximas Acciones {upcomingActions.length > 0 && <span className="hd-badge">{upcomingActions.length}</span>}</h3>
                    <span className={`hd-chev ${expandedSections.upcoming ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.upcoming && (
                    <div className="hd-section-body">
                      {upcomingActions.length === 0 ? (
                        <p className="hd-empty">Sin acciones pendientes</p>
                      ) : upcomingActions.map(action => (
                        <div key={action.id} className={`hd-action-item ${action.isOverdue ? 'overdue' : ''}`}>
                          <span className="hd-action-time">
                            {action.type === 'medication' ? formatTime(action.time) : '—'}
                          </span>
                          <span className="hd-action-icon">{action.type === 'medication' ? '💊' : '🩺'}</span>
                          <span className="hd-action-name">
                            {action.type === 'medication'
                              ? `${action.data.therapyItem?.medication?.nombre || action.data.therapyItem?.medicationName || '?'} ${action.data.therapyItem?.dosis || ''} ${action.data.therapyItem?.via || ''}`
                              : `Monitoreo: ${action.data.statusInfo?.message}`}
                          </span>
                          {action.type === 'medication' && action.data.status === 'PENDIENTE' && (
                            <button className="hd-action-do" onClick={() => handleAdminister(action.data.id)}>✓</button>
                          )}
                          {action.type === 'monitoring' && action.isOverdue && (
                            <button className="hd-action-do" onClick={() => setShowVitalsModal(true)}>✓</button>
                          )}
                        </div>
                      ))}
                      {therapyPlan.filter(tp => tp.activo).length > 0 && pendingMedications.filter(m => m.status === 'PENDIENTE').length === 0 && (
                        <button className="hd-gen-btn" onClick={handleGenerateSchedule}>
                          🔄 Generar Horario del Día
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* ══ TIMELINE ══ */}
                <section className="hd-section">
                  <div className="hd-section-head" onClick={() => toggleSection('timeline')}>
                    <h3>📋 Línea de Tiempo</h3>
                    <span className={`hd-chev ${expandedSections.timeline ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.timeline && (
                    <div className="hd-section-body">
                      <div className="hd-note-input">
                        <textarea value={evolutionNote} onChange={e => setEvolutionNote(e.target.value)}
                          placeholder="📝 Nota de evolución..." rows={2} />
                        <button onClick={handleAddEvolutionNote} disabled={!evolutionNote.trim() || loading}>+ Nota</button>
                      </div>
                      {timeline.length === 0 ? (
                        <p className="hd-empty">Sin registros aún</p>
                      ) : (
                        <div className="hd-timeline">
                          {timeline.map(entry => (
                            <div key={entry.id} className={`hd-tl-entry ${entry.type}`}>
                              <div className="hd-tl-time">{formatTime(entry.time)}</div>
                              <div className="hd-tl-dot-wrap">
                                <div className={`hd-tl-dot ${entry.type}`} />
                                <div className="hd-tl-line" />
                              </div>
                              <div className="hd-tl-content">
                                {entry.type === 'vitals' && (
                                  <>
                                    <div className="hd-tl-label">❤️ Signos Vitales <span className="hd-tl-date">{formatDate(entry.time)}</span></div>
                                    <div className="hd-tl-chips">
                                      {entry.data.frecuenciaCardiaca && <span>FC: {entry.data.frecuenciaCardiaca}</span>}
                                      {entry.data.frecuenciaRespiratoria && <span>FR: {entry.data.frecuenciaRespiratoria}</span>}
                                      {entry.data.temperatura && <span>T°: {entry.data.temperatura}°C</span>}
                                      {entry.data.nivelConciencia && <span>{entry.data.nivelConciencia}</span>}
                                      {entry.data.escalaDolor != null && <span>Dolor: {entry.data.escalaDolor}/10</span>}
                                    </div>
                                    {entry.data.observaciones && <div className="hd-tl-note">📝 {entry.data.observaciones}</div>}
                                  </>
                                )}
                                {entry.type === 'medication_done' && (
                                  <>
                                    <div className="hd-tl-label">💊 {entry.data.therapyItem?.medication?.nombre || entry.data.therapyItem?.medicationName || 'Medicamento'} <span className="hd-tl-date">{formatDate(entry.time)}</span></div>
                                    <div className="hd-tl-med">{entry.data.therapyItem?.dosis} • {entry.data.therapyItem?.via} • ✓ Administrado</div>
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
                <section className="hd-section">
                  <div className="hd-section-head" onClick={() => toggleSection('therapy')}>
                    <h3>💊 Plan Terapéutico {therapyPlan.filter(tp => tp.activo).length > 0 && <span className="hd-badge">{therapyPlan.filter(tp => tp.activo).length}</span>}</h3>
                    <span className={`hd-chev ${expandedSections.therapy ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.therapy && (
                    <div className="hd-section-body">
                      {therapyPlan.length === 0 ? (
                        <p className="hd-empty">Sin medicamentos en el plan</p>
                      ) : therapyPlan.map(item => (
                        <div key={item.id} className={`hd-therapy-row ${item.activo ? '' : 'inactive'}`}>
                          <div className="hd-therapy-info">
                            <strong>{item.medication?.nombre || item.medicationName || '-'}</strong>
                            <span>{item.dosis} • {item.via} • {item.frecuenciaHoras}</span>
                            {item.notas && <span className="hd-therapy-notes">{item.notas}</span>}
                          </div>
                          <div className="hd-therapy-btns">
                            <span className={`hd-therapy-badge ${item.activo ? 'on' : 'off'}`}>{item.activo ? 'Activo' : 'Susp.'}</span>
                            {item.activo ? (
                              <button className="hd-sm-btn red" onClick={() => deactivateTherapyItem(sel.id, item.id)}>Suspender</button>
                            ) : (
                              <button className="hd-sm-btn green" onClick={() => activateTherapyItem(sel.id, item.id)}>Activar</button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button className="hd-add-btn" onClick={() => setShowTherapyModal(true)}>+ Agregar Medicamento</button>
                    </div>
                  )}
                </section>

                {/* ══ NEONATES ══ */}
                {(sel.type === 'NEONATOS' || sel.type === 'MATERNIDAD') && (
                  <section className="hd-section">
                    <div className="hd-section-head" onClick={() => toggleSection('neonates')}>
                      <h3>🍼 Neonatos {neonates?.length > 0 && <span className="hd-badge">{neonates.length}</span>}</h3>
                      <span className={`hd-chev ${expandedSections.neonates ? 'open' : ''}`}>▾</span>
                    </div>
                    {expandedSections.neonates && (
                      <div className="hd-section-body">
                        <div className="hd-neo-meta">
                          <span>Madre: {patient.nombre}</span>
                          <span>Día {getDaysHospitalized(sel.fechaIngreso)}</span>
                        </div>
                        {neonates.length === 0 ? (
                          <p className="hd-empty">No hay neonatos registrados</p>
                        ) : neonates.map((neo, idx) => (
                          <div key={neo.id} className="hd-neo-card">
                            <div className="hd-neo-head">
                              <strong>#{neo.number || idx + 1}</strong>
                              {neo.sex && <span className={neo.sex === 'MACHO' ? 'male' : 'female'}>{neo.sex === 'MACHO' ? ' ♂' : ' ♀'}</span>}
                              {neo.identificationType && <span className="hd-neo-id">{neo.identificationType}: {neo.identification}</span>}
                              <button className="hd-sm-btn blue" onClick={() => { setSelectedNeonate(neo); setShowNeonateRecordModal(true); }}>+ Monitor</button>
                            </div>
                            {neo.records?.length > 0 && (
                              <table className="hd-neo-table">
                                <thead><tr><th>Hora</th><th>Peso</th><th>T°</th><th>FC</th><th>FR</th><th>Suc.</th><th>Act.</th></tr></thead>
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
                        <button className="hd-add-btn" onClick={() => { setNeonateForm(prev => ({ ...prev, number: (neonates?.length || 0) + 1 })); setShowNeonateModal(true); }}>+ Registrar Neonato</button>
                      </div>
                    )}
                  </section>
                )}

                {/* ══ COSTS ══ */}
                <section className="hd-section">
                  <div className="hd-section-head" onClick={() => toggleSection('costs')}>
                    <h3>💰 Costos <span className="hd-section-val">{formatCurrency(costs?.total)}</span></h3>
                    <span className={`hd-chev ${expandedSections.costs ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.costs && (
                    <div className="hd-section-body">
                      <div className="hd-cost-line"><span>🏥 Estancia ({costs?.days || getDaysHospitalized(sel.fechaIngreso)}d × {formatCurrency(costs?.dailyRate)})</span><strong>{formatCurrency(costs?.hospitalizationCost)}</strong></div>
                      <div className="hd-cost-line"><span>💊 Medicamentos ({costs?.medicationCount || 0})</span><strong>{formatCurrency(costs?.medicationCost)}</strong></div>
                      <div className="hd-cost-line"><span>🔬 Estudios ({costs?.labCount || 0})</span><strong>{formatCurrency(costs?.labCost)}</strong></div>
                      {costs?.otherCosts > 0 && <div className="hd-cost-line"><span>📋 Otros</span><strong>{formatCurrency(costs?.otherCosts)}</strong></div>}
                      <div className="hd-cost-total"><span>Total</span><strong>{formatCurrency(costs?.total)}</strong></div>
                    </div>
                  )}
                </section>

                {/* ══ CONSULTATION ══ */}
                <section className="hd-section">
                  <div className="hd-section-head" onClick={() => toggleSection('consultation')}>
                    <h3>👨‍⚕️ Notas del Médico</h3>
                    <span className={`hd-chev ${expandedSections.consultation ? 'open' : ''}`}>▾</span>
                  </div>
                  {expandedSections.consultation && (
                    <div className="hd-section-body">
                      {sel.consultation ? (
                        <>
                          {sel.consultation.motivoConsulta && <div className="hd-consult-row"><label>Motivo:</label><p>{sel.consultation.motivoConsulta}</p></div>}
                          <div className="hd-soap">
                            {sel.consultation.soapSubjetivo && <div className="hd-soap-item"><strong>S:</strong> {sel.consultation.soapSubjetivo}</div>}
                            {sel.consultation.soapObjetivo && <div className="hd-soap-item"><strong>O:</strong> {sel.consultation.soapObjetivo}</div>}
                            {sel.consultation.soapAnalisis && <div className="hd-soap-item"><strong>A:</strong> {sel.consultation.soapAnalisis}</div>}
                            {sel.consultation.soapPlan && <div className="hd-soap-item"><strong>P:</strong> {sel.consultation.soapPlan}</div>}
                          </div>
                          {sel.consultation.diagnosticos?.length > 0 && (
                            <div className="hd-consult-row"><label>Diagnósticos:</label>
                              <ul>{sel.consultation.diagnosticos.map((dx, i) => <li key={i}><strong>{dx.codigo}:</strong> {dx.descripcion}</li>)}</ul>
                            </div>
                          )}
                        </>
                      ) : <p className="hd-empty">Sin consulta de referencia</p>}
                    </div>
                  )}
                </section>

                {/* ══ STUDIES ══ */}
                {(sel.studyBH || sel.studyQS || sel.studyRX || sel.studyUS || sel.studyEGO || sel.studyECG || sel.studyElectrolitos || sel.studySNAP) && (
                  <section className="hd-section">
                    <div className="hd-section-head" onClick={() => toggleSection('studies')}>
                      <h3>🔬 Estudios</h3>
                      <span className={`hd-chev ${expandedSections.studies ? 'open' : ''}`}>▾</span>
                    </div>
                    {expandedSections.studies && (
                      <div className="hd-section-body hd-studies">
                        {sel.studyBH && <span>BH</span>}
                        {sel.studyQS && <span>QS</span>}
                        {sel.studyRX && <span>RX</span>}
                        {sel.studyUS && <span>US</span>}
                        {sel.studyEGO && <span>EGO</span>}
                        {sel.studyECG && <span>ECG</span>}
                        {sel.studyElectrolitos && <span>Electrolitos</span>}
                        {sel.studySNAP && <span>SNAP</span>}
                      </div>
                    )}
                  </section>
                )}
              </div>
            </aside>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Vitals Modal ─── */}
      {showVitalsModal && (
        <div className="hd-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="hd-modal hd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h2>❤️ Registrar Signos Vitales</h2>
              <button onClick={() => setShowVitalsModal(false)}>×</button>
            </div>
            <div className="hd-modal-body">
              <fieldset>
                <legend>📊 Signos Vitales Básicos</legend>
                <div className="hd-grid-4">
                  <div className="hd-field"><label>FC (bpm)</label><input type="number" name="frecuenciaCardiaca" value={vitalsForm.frecuenciaCardiaca} onChange={handleVitalsChange} placeholder="60-200" /></div>
                  <div className="hd-field"><label>FR (rpm)</label><input type="number" name="frecuenciaRespiratoria" value={vitalsForm.frecuenciaRespiratoria} onChange={handleVitalsChange} placeholder="10-40" /></div>
                  <div className="hd-field"><label>T° (°C)</label><input type="number" step="0.1" name="temperatura" value={vitalsForm.temperatura} onChange={handleVitalsChange} placeholder="38.0" /></div>
                  <div className="hd-field"><label>Peso (kg)</label><input type="number" step="0.01" name="peso" value={vitalsForm.peso} onChange={handleVitalsChange} /></div>
                </div>
              </fieldset>
              <fieldset>
                <legend>💧 Perfusión y Estado</legend>
                <div className="hd-grid-3">
                  <div className="hd-field"><label>TRC (seg)</label><input type="number" step="0.1" name="trc" value={vitalsForm.trc} onChange={handleVitalsChange} placeholder="<2" /></div>
                  <div className="hd-field"><label>Mucosas</label>
                    <select name="mucosas" value={vitalsForm.mucosas} onChange={handleVitalsChange}>
                      <option value="ROSADAS">🟢 Rosadas</option><option value="PALIDAS">⚪ Pálidas</option><option value="CIANOTICAS">🔵 Cianóticas</option><option value="ICTERICAS">🟡 Ictéricas</option><option value="CONGESTIVAS">🔴 Congestivas</option>
                    </select>
                  </div>
                  <div className="hd-field"><label>Hidratación</label>
                    <select name="hidratacion" value={vitalsForm.hidratacion} onChange={handleVitalsChange}>
                      <option value="NORMAL">✅ Normal</option><option value="LEVE">⚠️ Leve (5%)</option><option value="MODERADA">🔶 Moderada (7%)</option><option value="SEVERA">🔴 Severa (10%+)</option>
                    </select>
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <legend>🧠 Estado Neurológico</legend>
                <div className="hd-grid-2">
                  <div className="hd-field"><label>Conciencia</label>
                    <select name="nivelConciencia" value={vitalsForm.nivelConciencia} onChange={handleVitalsChange}>
                      <option value="ALERTA">✅ Alerta</option><option value="SOMNOLIENTO">😴 Somnoliento</option><option value="DESORIENTADO">😵 Desorientado</option><option value="ESTUPOROSO">😶 Estuporoso</option><option value="COMA">🚨 Coma</option>
                    </select>
                  </div>
                  <div className="hd-field">
                    <label>Dolor: <strong>{vitalsForm.nivelDolor}/10</strong></label>
                    <div className="hd-pain"><span>😊</span><input type="range" min="0" max="10" name="nivelDolor" value={vitalsForm.nivelDolor} onChange={handleVitalsChange} /><span>😣</span></div>
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <legend>🔬 Lab + Notas</legend>
                <div className="hd-grid-2">
                  <div className="hd-field"><label>Glucosa (mg/dL)</label><input type="number" name="glucosa" value={vitalsForm.glucosa} onChange={handleVitalsChange} placeholder="70-120" /></div>
                  <div className="hd-field"><label>Presión Arterial</label><input type="text" name="presionArterial" value={vitalsForm.presionArterial} onChange={handleVitalsChange} placeholder="120/80" /></div>
                </div>
                <div className="hd-field hd-full"><label>Observaciones</label>
                  <textarea name="observaciones" value={vitalsForm.observaciones} onChange={handleVitalsChange} rows={2} placeholder="Notas sobre el estado del paciente..." />
                </div>
              </fieldset>
            </div>
            <div className="hd-modal-foot">
              <button className="hd-btn-cancel" onClick={() => setShowVitalsModal(false)}>Cancelar</button>
              <button className="hd-btn-ok" onClick={handleVitalsSubmit} disabled={loading}>{loading ? '⏳ Guardando...' : '💾 Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Therapy Modal ─── */}
      {showTherapyModal && (
        <div className="hd-overlay" onClick={() => setShowTherapyModal(false)}>
          <div className="hd-modal hd-modal-md" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h2>💊 Agregar Medicamento al Plan</h2>
              <button onClick={() => setShowTherapyModal(false)}>×</button>
            </div>
            <div className="hd-modal-body">
              <div className="hd-med-search" ref={medicationSearchRef}>
                <label>Buscar medicamento</label>
                <div className="hd-med-input-wrap">
                  <input type="text" placeholder="Escriba para buscar..."
                    value={therapyForm.medicationId ? therapyForm.medicationName : medicationSearch}
                    onChange={e => {
                      if (therapyForm.medicationId) {
                        setTherapyForm(prev => ({ ...prev, medicationId: '', medicationName: '', presentacion: '', concentracion: '', stockDisponible: 0 }));
                      }
                      setMedicationSearch(e.target.value);
                    }}
                  />
                  {searchingMedications && <span className="hd-spin">⏳</span>}
                  {therapyForm.medicationId && (
                    <button type="button" className="hd-clear-med" onClick={() => {
                      setTherapyForm(prev => ({ ...prev, medicationId: '', medicationName: '', presentacion: '', concentracion: '', stockDisponible: 0 }));
                      setMedicationSearch('');
                    }}>✕</button>
                  )}
                </div>
                {showMedicationDropdown && medicationResults.length > 0 && (
                  <div className="hd-med-dropdown">
                    {medicationResults.map(med => {
                      const stock = med.currentStock ?? med.stockActual ?? 0;
                      return (
                        <div key={med.id} className={`hd-med-option ${stock === 0 ? 'no-stock' : ''}`}
                          onClick={() => stock > 0 && handleSelectMedication(med)}>
                          <div><strong>{med.name || med.nombre}</strong><br /><small>{med.presentation || med.presentacion} {(med.concentration || med.concentracion) && `- ${med.concentration || med.concentracion}`}</small></div>
                          <span className={`hd-stock ${stock > 10 ? 'hi' : stock > 0 ? 'lo' : 'no'}`}>{stock > 0 ? `${stock} disp.` : 'Sin stock'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showMedicationDropdown && medicationResults.length === 0 && medicationSearch.length >= 2 && !searchingMedications && (
                  <div className="hd-med-dropdown"><div className="hd-med-empty">No se encontraron medicamentos</div></div>
                )}
                {therapyForm.medicationId && (
                  <div className="hd-med-selected">✓ <strong>{therapyForm.medicationName}</strong>
                    {therapyForm.presentacion && <span> • {therapyForm.presentacion}</span>}
                    {therapyForm.concentracion && <span> • {therapyForm.concentracion}</span>}
                    <span> • Stock: {therapyForm.stockDisponible}</span>
                  </div>
                )}
              </div>
              <div className="hd-grid-4">
                <div className="hd-field"><label>Dosis *</label><input type="number" step="0.01" name="dosis" value={therapyForm.dosis} onChange={handleTherapyChange} required placeholder="5" /></div>
                <div className="hd-field"><label>Unidad</label>
                  <select name="unidadDosis" value={therapyForm.unidadDosis} onChange={handleTherapyChange}>
                    <option value="mg">mg</option><option value="ml">ml</option><option value="g">g</option><option value="UI">UI</option><option value="gotas">gotas</option>
                  </select>
                </div>
                <div className="hd-field"><label>Frecuencia</label>
                  <select name="frecuenciaHoras" value={therapyForm.frecuenciaHoras} onChange={handleTherapyChange}>
                    <option value={4}>c/4h</option><option value={6}>c/6h</option><option value={8}>c/8h</option><option value={12}>c/12h</option><option value={24}>c/24h</option>
                  </select>
                </div>
                <div className="hd-field"><label>Vía</label>
                  <select name="via" value={therapyForm.via} onChange={handleTherapyChange}>
                    <option value="IV">IV</option><option value="IM">IM</option><option value="SC">SC</option><option value="PO">Oral</option><option value="TOPICA">Tópica</option>
                  </select>
                </div>
              </div>
              <div className="hd-field hd-full"><label>Notas</label>
                <textarea name="notas" value={therapyForm.notas} onChange={handleTherapyChange} rows={2} placeholder="Instrucciones adicionales..." />
              </div>
              <div className="hd-note-box">⚠️ El medicamento se solicitará a Farmacia.</div>
            </div>
            <div className="hd-modal-foot">
              <button className="hd-btn-cancel" onClick={() => setShowTherapyModal(false)}>Cancelar</button>
              <button className="hd-btn-ok" onClick={handleTherapySubmit} disabled={loading || !therapyForm.medicationId}>{loading ? '⏳...' : '💊 Agregar al Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Neonate Modal ─── */}
      {showNeonateModal && (
        <div className="hd-overlay" onClick={() => setShowNeonateModal(false)}>
          <div className="hd-modal hd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h2>🍼 Registrar Neonato</h2>
              <button onClick={() => setShowNeonateModal(false)}>×</button>
            </div>
            <div className="hd-modal-body">
              <div className="hd-grid-2">
                <div className="hd-field"><label>Neonato No. *</label><input type="number" name="number" value={neonateForm.number} onChange={handleNeonateChange} required min="1" /></div>
                <div className="hd-field"><label>Sexo</label>
                  <div className="hd-radio-row">
                    <label><input type="radio" name="sex" value="MACHO" checked={neonateForm.sex === 'MACHO'} onChange={handleNeonateChange} /> ♂ Macho</label>
                    <label><input type="radio" name="sex" value="HEMBRA" checked={neonateForm.sex === 'HEMBRA'} onChange={handleNeonateChange} /> ♀ Hembra</label>
                  </div>
                </div>
                <div className="hd-field"><label>Tipo ID</label>
                  <select name="identificationType" value={neonateForm.identificationType} onChange={handleNeonateChange}>
                    <option value="">Seleccionar...</option><option value="COLLAR">Collar</option><option value="MARCA">Marca</option><option value="COLOR">Color</option><option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="hd-field"><label>Descripción</label><input type="text" name="identification" value={neonateForm.identification} onChange={handleNeonateChange} placeholder="Collar rojo..." /></div>
              </div>
            </div>
            <div className="hd-modal-foot">
              <button className="hd-btn-cancel" onClick={() => setShowNeonateModal(false)}>Cancelar</button>
              <button className="hd-btn-ok" onClick={handleNeonateSubmit} disabled={loading}>{loading ? '⏳...' : '✓ Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Neonate Record Modal ─── */}
      {showNeonateRecordModal && selectedNeonate && (
        <div className="hd-overlay" onClick={() => setShowNeonateRecordModal(false)}>
          <div className="hd-modal hd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h2>📊 Monitoreo Neonato #{selectedNeonate.number || '?'} {selectedNeonate.sex === 'MACHO' ? '♂' : '♀'}</h2>
              <button onClick={() => setShowNeonateRecordModal(false)}>×</button>
            </div>
            <div className="hd-modal-body">
              <div className="hd-grid-2">
                <div className="hd-field"><label>Peso (g)</label><input type="number" step="0.1" name="weight" value={neonateRecordForm.weight} onChange={handleNeonateRecordChange} placeholder="350" /></div>
                <div className="hd-field"><label>T° (°C)</label><input type="number" step="0.1" name="temperature" value={neonateRecordForm.temperature} onChange={handleNeonateRecordChange} placeholder="38.5" /></div>
                <div className="hd-field"><label>FC</label><input type="number" name="heartRate" value={neonateRecordForm.heartRate} onChange={handleNeonateRecordChange} placeholder="180" /></div>
                <div className="hd-field"><label>FR</label><input type="number" name="respiratoryRate" value={neonateRecordForm.respiratoryRate} onChange={handleNeonateRecordChange} placeholder="30" /></div>
                <div className="hd-field"><label>Succión</label>
                  <div className="hd-radio-row">
                    <label><input type="radio" name="suction" value="ADECUADA" checked={neonateRecordForm.suction === 'ADECUADA'} onChange={handleNeonateRecordChange} /> ✓ Adecuada</label>
                    <label><input type="radio" name="suction" value="DEBIL" checked={neonateRecordForm.suction === 'DEBIL'} onChange={handleNeonateRecordChange} /> ⚠ Débil</label>
                  </div>
                </div>
                <div className="hd-field"><label>Actividad</label>
                  <div className="hd-radio-row">
                    <label><input type="radio" name="activity" value="ACTIVO" checked={neonateRecordForm.activity === 'ACTIVO'} onChange={handleNeonateRecordChange} /> ✓ Activo</label>
                    <label><input type="radio" name="activity" value="LETARGICO" checked={neonateRecordForm.activity === 'LETARGICO'} onChange={handleNeonateRecordChange} /> ⚠ Letárgico</label>
                  </div>
                </div>
              </div>
              <div className="hd-field hd-full"><label>Notas</label><textarea name="notes" value={neonateRecordForm.notes} onChange={handleNeonateRecordChange} rows={2} placeholder="Observaciones..." /></div>
            </div>
            <div className="hd-modal-foot">
              <button className="hd-btn-cancel" onClick={() => setShowNeonateRecordModal(false)}>Cancelar</button>
              <button className="hd-btn-ok" onClick={handleNeonateRecordSubmit} disabled={loading}>{loading ? '⏳...' : '✓ Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Discharge Modal ─── */}
      {showDischargeModal && (
        <div className="hd-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="hd-modal hd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="hd-modal-head">
              <h2>🏠 Dar de Alta</h2>
              <button onClick={() => setShowDischargeModal(false)}>×</button>
            </div>
            <div className="hd-modal-body">
              <div className="hd-field hd-full"><label>Tipo de Alta</label>
                <select name="type" value={dischargeForm.type} onChange={handleDischargeChange}>
                  <option value="ALTA_MEDICA">Alta Médica</option><option value="ALTA_VOLUNTARIA">Alta Voluntaria</option><option value="TRANSFERIDO">Transferido</option><option value="FALLECIDO">Fallecido</option>
                </select>
              </div>
              <div className="hd-field hd-full"><label>Notas de Alta</label>
                <textarea name="notes" value={dischargeForm.notes} onChange={handleDischargeChange} rows={4} placeholder="Indicaciones, medicamentos, citas..." />
              </div>
              <div className="hd-note-box">⚠️ Se notificará a Recepción para el cobro final.</div>
            </div>
            <div className="hd-modal-foot">
              <button className="hd-btn-cancel" onClick={() => setShowDischargeModal(false)}>Cancelar</button>
              <button className="hd-btn-ok hd-btn-danger" onClick={handleDischargeSubmit} disabled={loading}>{loading ? '⏳...' : '✓ Confirmar Alta'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Fluid Therapy Modal ─── */}
      {fluidCalcTarget && (
        <div className="hd-overlay" onClick={() => setFluidCalcTarget(null)}>
          <div className="hd-modal hd-modal-xl" onClick={e => e.stopPropagation()}>
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
    </div>
  );
}

export default HospitalizacionDashboard;
