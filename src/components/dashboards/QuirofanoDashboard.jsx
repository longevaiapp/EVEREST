import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useQuirofano from '../../hooks/useQuirofano';
import Toast from '../Toast';
import './QuirofanoDashboard.css';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—';
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + hoy.getMonth() - nac.getMonth();
  if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
  const años = Math.floor(meses / 12);
  const m = meses % 12;
  return m > 0 ? `${años} año${años !== 1 ? 's' : ''} ${m}m` : `${años} año${años !== 1 ? 's' : ''}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function calcDuration(start, end) {
  if (!start) return '—';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const mins = Math.floor((e - s) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_COLORS = {
  PROGRAMADA: '#3498db',
  EN_PREPARACION: '#f39c12',
  EN_CURSO: '#e74c3c',
  COMPLETADA: '#27ae60',
  CANCELADA: '#95a5a6',
};

const STATUS_ICONS = {
  PROGRAMADA: '📋',
  EN_PREPARACION: '⚙️',
  EN_CURSO: '🔪',
  COMPLETADA: '✅',
  CANCELADA: '❌',
};

const PROGNOSIS_COLORS = {
  EXCELENTE: '#27ae60',
  BUENO: '#2ecc71',
  RESERVADO: '#f39c12',
  GRAVE: '#e74c3c',
};

const ANESTHESIA_TYPES = [
  'General inhalatoria',
  'General inyectable',
  'Local',
  'Regional',
  'Sedación',
  'Epidural',
];

const HOSP_TYPES = [
  'GENERAL', 'UCI', 'PERROS_NO_INFECCIOSOS', 'PERROS_INFECCIOSOS',
  'GATOS_NO_INFECCIOSOS', 'GATOS_INFECCIOSOS', 'NEONATOS', 'MATERNIDAD', 'INFECCIOSOS',
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function QuirofanoDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    surgeries, stats, selectedSurgery, loading,
    fetchToday, fetchStats, selectSurgery,
    prepare, startSurgery, completeSurgery, cancelSurgery,
    addVitals, addPreMed, removePreMed,
  } = useQuirofano();

  // ═══════ UI STATE ═══════
  const [toast, setToast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    preOp: true, transOp: true, postOp: true, vitals: true, preMeds: true,
  });
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showPreMedModal, setShowPreMedModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ═══════ FORM STATE ═══════
  const [vitalsForm, setVitalsForm] = useState({
    frecuenciaCardiaca: '', frecuenciaRespiratoria: '', temperatura: '',
    presionArterial: '', saturacionOxigeno: '', etCO2: '',
    planoAnestesico: '', observaciones: '',
  });
  const [preMedForm, setPreMedForm] = useState({
    medicamento: '', dosis: '', via: 'IV', observaciones: '',
  });
  const [completeForm, setCompleteForm] = useState({
    procedure: '', complications: '', postOpNotes: '', postOpCare: '',
    prognosis: '', hospitalizationRequired: false, hospitalizationType: 'GENERAL',
  });
  const [startForm, setStartForm] = useState({ anesthesiaType: '' });
  const [cancelReason, setCancelReason] = useState('');

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // ═══════ CATEGORIZED SURGERIES ═══════
  const categorized = useMemo(() => {
    const programadas = surgeries.filter(s => s.status === 'PROGRAMADA');
    const enPreparacion = surgeries.filter(s => s.status === 'EN_PREPARACION');
    const enCurso = surgeries.filter(s => s.status === 'EN_CURSO');
    const completadas = surgeries.filter(s => s.status === 'COMPLETADA');
    return { programadas, enPreparacion, enCurso, completadas };
  }, [surgeries]);

  // ═══════ HANDLERS ═══════
  const handlePrepare = async (field, value) => {
    if (!selectedSurgery) return;
    try {
      await prepare(selectedSurgery.id, { [field]: value });
      showToast('Pre-operatorio actualizado');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleStart = async () => {
    if (!selectedSurgery) return;
    try {
      await startSurgery(selectedSurgery.id, startForm);
      setShowStartModal(false);
      setStartForm({ anesthesiaType: '' });
      showToast('Cirugía iniciada');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleComplete = async () => {
    if (!selectedSurgery || !completeForm.procedure) {
      showToast('Procedimiento es requerido', 'error');
      return;
    }
    try {
      await completeSurgery(selectedSurgery.id, completeForm);
      setShowCompleteModal(false);
      setCompleteForm({
        procedure: '', complications: '', postOpNotes: '', postOpCare: '',
        prognosis: '', hospitalizationRequired: false, hospitalizationType: 'GENERAL',
      });
      showToast(completeForm.hospitalizationRequired
        ? 'Cirugía completada — paciente hospitalizado'
        : 'Cirugía completada — listo para alta');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleCancel = async () => {
    if (!selectedSurgery) return;
    try {
      await cancelSurgery(selectedSurgery.id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      showToast('Cirugía cancelada');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleAddVitals = async () => {
    if (!selectedSurgery) return;
    try {
      const payload = {};
      if (vitalsForm.frecuenciaCardiaca) payload.frecuenciaCardiaca = parseInt(vitalsForm.frecuenciaCardiaca);
      if (vitalsForm.frecuenciaRespiratoria) payload.frecuenciaRespiratoria = parseInt(vitalsForm.frecuenciaRespiratoria);
      if (vitalsForm.temperatura) payload.temperatura = parseFloat(vitalsForm.temperatura);
      if (vitalsForm.presionArterial) payload.presionArterial = vitalsForm.presionArterial;
      if (vitalsForm.saturacionOxigeno) payload.saturacionOxigeno = parseFloat(vitalsForm.saturacionOxigeno);
      if (vitalsForm.etCO2) payload.etCO2 = parseFloat(vitalsForm.etCO2);
      if (vitalsForm.planoAnestesico) payload.planoAnestesico = vitalsForm.planoAnestesico;
      if (vitalsForm.observaciones) payload.observaciones = vitalsForm.observaciones;
      await addVitals(selectedSurgery.id, payload);
      setShowVitalsModal(false);
      setVitalsForm({
        frecuenciaCardiaca: '', frecuenciaRespiratoria: '', temperatura: '',
        presionArterial: '', saturacionOxigeno: '', etCO2: '',
        planoAnestesico: '', observaciones: '',
      });
      showToast('Signos vitales registrados');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleAddPreMed = async () => {
    if (!selectedSurgery || !preMedForm.medicamento || !preMedForm.dosis) {
      showToast('Medicamento y dosis son requeridos', 'error');
      return;
    }
    try {
      await addPreMed(selectedSurgery.id, preMedForm);
      setShowPreMedModal(false);
      setPreMedForm({ medicamento: '', dosis: '', via: 'IV', observaciones: '' });
      showToast('Pre-medicación agregada');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  const handleRemovePreMed = async (preMedId) => {
    if (!selectedSurgery) return;
    try {
      await removePreMed(selectedSurgery.id, preMedId);
      showToast('Pre-medicación eliminada');
    } catch (err) {
      showToast(err.message || 'Error', 'error');
    }
  };

  // ═══════ AUTO-REFRESH for EN_CURSO ═══════
  // Refresh every 30 seconds when a surgery is in progress
  const hasActiveSurgery = surgeries.some(s => s.status === 'EN_CURSO');

  // ═══════ RENDER HELPERS ═══════
  const renderSurgeryCard = (surgery) => {
    const pet = surgery.pet;
    const isSelected = selectedSurgery?.id === surgery.id;
    return (
      <div
        key={surgery.id}
        className={`surgery-card ${isSelected ? 'selected' : ''}`}
        style={{ borderLeft: `4px solid ${STATUS_COLORS[surgery.status]}` }}
        onClick={() => selectSurgery(surgery)}
      >
        <div className="surgery-card-header">
          <span className="surgery-time">{surgery.scheduledTime}</span>
          <span className="surgery-status-badge" style={{ background: STATUS_COLORS[surgery.status] }}>
            {STATUS_ICONS[surgery.status]} {surgery.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="surgery-card-body">
          <strong>{pet?.nombre}</strong>
          <span className="surgery-type">{surgery.type}</span>
          <span className="surgery-pet-info">
            {pet?.especie} · {pet?.raza} · {calcEdad(pet?.fechaNacimiento)}
          </span>
          {surgery.prioridad === 'ALTA' && <span className="priority-badge alta">🔴 Alta</span>}
        </div>
      </div>
    );
  };

  // ═══════ MAIN RENDER ═══════
  return (
    <div className="quirofano-dashboard">
      {/* ─── HEADER ─── */}
      <header className="quirofano-header">
        <div className="header-left">
          <h1>🔪 Quirófano</h1>
          <span className="header-date">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="header-stats">
          <div className="stat-pill" style={{ background: '#3498db20', color: '#3498db' }}>
            📋 {stats.programadas} Programadas
          </div>
          <div className="stat-pill" style={{ background: '#f39c1220', color: '#f39c12' }}>
            ⚙️ {stats.enPreparacion} En Prep.
          </div>
          <div className="stat-pill" style={{ background: '#e74c3c20', color: '#e74c3c' }}>
            🔪 {stats.enCurso} En Curso
          </div>
          <div className="stat-pill" style={{ background: '#27ae6020', color: '#27ae60' }}>
            ✅ {stats.completadas} Completadas
          </div>
        </div>
        <button className="refresh-btn" onClick={() => { fetchToday(); fetchStats(); }} title="Actualizar">
          🔄
        </button>
      </header>

      <div className="quirofano-layout">
        {/* ─── LEFT: Surgery List ─── */}
        <aside className="surgery-list-panel">
          {loading && <div className="loading-spinner">Cargando...</div>}

          {categorized.enCurso.length > 0 && (
            <div className="surgery-group">
              <h3 className="group-title en-curso">🔪 En Curso ({categorized.enCurso.length})</h3>
              {categorized.enCurso.map(renderSurgeryCard)}
            </div>
          )}

          {categorized.enPreparacion.length > 0 && (
            <div className="surgery-group">
              <h3 className="group-title en-preparacion">⚙️ En Preparación ({categorized.enPreparacion.length})</h3>
              {categorized.enPreparacion.map(renderSurgeryCard)}
            </div>
          )}

          {categorized.programadas.length > 0 && (
            <div className="surgery-group">
              <h3 className="group-title programadas">📋 Programadas ({categorized.programadas.length})</h3>
              {categorized.programadas.map(renderSurgeryCard)}
            </div>
          )}

          {categorized.completadas.length > 0 && (
            <div className="surgery-group">
              <h3 className="group-title completadas">✅ Completadas ({categorized.completadas.length})</h3>
              {categorized.completadas.map(renderSurgeryCard)}
            </div>
          )}

          {surgeries.length === 0 && !loading && (
            <div className="empty-state">
              <span className="empty-icon">🔪</span>
              <p>No hay cirugías programadas para hoy</p>
            </div>
          )}
        </aside>

        {/* ─── CENTER: Surgery Detail ─── */}
        <main className="surgery-detail-panel">
          {!selectedSurgery ? (
            <div className="empty-detail">
              <span className="empty-icon">🏥</span>
              <h2>Selecciona una cirugía</h2>
              <p>Haz clic en una cirugía de la lista para ver los detalles</p>
            </div>
          ) : (
            <div className="surgery-detail">
              {/* Patient Header */}
              <div className="detail-header" style={{ borderBottom: `3px solid ${STATUS_COLORS[selectedSurgery.status]}` }}>
                <div className="patient-info-row">
                  <h2>{selectedSurgery.pet?.nombre}</h2>
                  <span className="surgery-status-badge large" style={{ background: STATUS_COLORS[selectedSurgery.status] }}>
                    {STATUS_ICONS[selectedSurgery.status]} {selectedSurgery.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="patient-meta">
                  <span>🐾 {selectedSurgery.pet?.especie} · {selectedSurgery.pet?.raza}</span>
                  <span>📅 {calcEdad(selectedSurgery.pet?.fechaNacimiento)}</span>
                  <span>⚖️ {selectedSurgery.pet?.peso ? `${selectedSurgery.pet.peso} kg` : '—'}</span>
                  <span>👤 {selectedSurgery.pet?.owner?.nombre}</span>
                  <span>📞 {selectedSurgery.pet?.owner?.telefono || '—'}</span>
                </div>
                <div className="surgery-meta">
                  <span>🏷️ <strong>{selectedSurgery.type}</strong></span>
                  <span>🕐 {selectedSurgery.scheduledTime} · {selectedSurgery.estimatedDuration ? `~${selectedSurgery.estimatedDuration} min` : '—'}</span>
                  {selectedSurgery.prioridad === 'ALTA' && <span className="priority-badge alta">🔴 Prioridad Alta</span>}
                  {selectedSurgery.prioridad === 'BAJA' && <span className="priority-badge baja">🟢 Prioridad Baja</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="surgery-actions">
                {selectedSurgery.status === 'PROGRAMADA' && (
                  <button className="action-btn prepare" onClick={() => handlePrepare('status', 'EN_PREPARACION')}>
                    ⚙️ Iniciar Preparación
                  </button>
                )}
                {(selectedSurgery.status === 'EN_PREPARACION') && (
                  <button className="action-btn start" onClick={() => setShowStartModal(true)}>
                    🔪 Iniciar Cirugía
                  </button>
                )}
                {selectedSurgery.status === 'EN_CURSO' && (
                  <>
                    <button className="action-btn vitals" onClick={() => setShowVitalsModal(true)}>
                      🌡️ Registrar Vitales
                    </button>
                    <button className="action-btn complete" onClick={() => setShowCompleteModal(true)}>
                      ✅ Finalizar Cirugía
                    </button>
                  </>
                )}
                {(selectedSurgery.status === 'PROGRAMADA' || selectedSurgery.status === 'EN_PREPARACION') && (
                  <>
                    <button className="action-btn premed" onClick={() => setShowPreMedModal(true)}>
                      💊 Pre-Medicación
                    </button>
                    <button className="action-btn cancel" onClick={() => setShowCancelModal(true)}>
                      ❌ Cancelar
                    </button>
                  </>
                )}
              </div>

              {/* ═══ PRE-OPERATORIO ═══ */}
              <div className="collapsible-section">
                <div className="section-header" onClick={() => toggleSection('preOp')}>
                  <h3>⚙️ Pre-Operatorio</h3>
                  <span>{expandedSections.preOp ? '▼' : '▶'}</span>
                </div>
                {expandedSections.preOp && (
                  <div className="section-body">
                    <div className="checklist-grid">
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={selectedSurgery.consentSigned || false}
                          onChange={(e) => handlePrepare('consentSigned', e.target.checked)}
                          disabled={selectedSurgery.status === 'EN_CURSO' || selectedSurgery.status === 'COMPLETADA'}
                        />
                        <span>Consentimiento firmado</span>
                        {selectedSurgery.consentSignedBy && (
                          <small> — por {selectedSurgery.consentSignedBy}</small>
                        )}
                      </label>
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={selectedSurgery.fastingConfirmed || false}
                          onChange={(e) => handlePrepare('fastingConfirmed', e.target.checked)}
                          disabled={selectedSurgery.status === 'EN_CURSO' || selectedSurgery.status === 'COMPLETADA'}
                        />
                        <span>Ayuno confirmado</span>
                      </label>
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={selectedSurgery.sedationAuthorized || false}
                          onChange={(e) => handlePrepare('sedationAuthorized', e.target.checked)}
                          disabled={selectedSurgery.status === 'EN_CURSO' || selectedSurgery.status === 'COMPLETADA'}
                        />
                        <span>Sedación autorizada</span>
                      </label>
                    </div>
                    {selectedSurgery.preOpNotes && (
                      <div className="notes-block">
                        <strong>Notas pre-op:</strong> {selectedSurgery.preOpNotes}
                      </div>
                    )}

                    {/* Pre-Medication List */}
                    <div className="premed-section">
                      <h4>💊 Pre-Medicación</h4>
                      {(selectedSurgery.surgeryPreMeds || []).length === 0 ? (
                        <p className="empty-text">Sin pre-medicación registrada</p>
                      ) : (
                        <table className="mini-table">
                          <thead>
                            <tr><th>Medicamento</th><th>Dosis</th><th>Vía</th><th>Hora</th><th></th></tr>
                          </thead>
                          <tbody>
                            {(selectedSurgery.surgeryPreMeds || []).map(pm => (
                              <tr key={pm.id}>
                                <td>{pm.medicamento}</td>
                                <td>{pm.dosis}</td>
                                <td>{pm.via}</td>
                                <td>{pm.horaAplicacion ? formatTime(pm.horaAplicacion) : '—'}</td>
                                <td>
                                  {selectedSurgery.status !== 'COMPLETADA' && (
                                    <button className="remove-btn" onClick={() => handleRemovePreMed(pm.id)}>🗑️</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ TRANS-OPERATORIO ═══ */}
              {(selectedSurgery.status === 'EN_CURSO' || selectedSurgery.status === 'COMPLETADA') && (
                <div className="collapsible-section">
                  <div className="section-header" onClick={() => toggleSection('transOp')}>
                    <h3>🔪 Trans-Operatorio</h3>
                    <span>{expandedSections.transOp ? '▼' : '▶'}</span>
                  </div>
                  {expandedSections.transOp && (
                    <div className="section-body">
                      <div className="trans-info-grid">
                        <div className="info-item">
                          <label>Inicio</label>
                          <span>{formatTime(selectedSurgery.startTime)}</span>
                        </div>
                        <div className="info-item">
                          <label>Duración</label>
                          <span>{calcDuration(selectedSurgery.startTime, selectedSurgery.endTime)}</span>
                        </div>
                        <div className="info-item">
                          <label>Anestesia</label>
                          <span>{selectedSurgery.anesthesiaType || '—'}</span>
                        </div>
                        {selectedSurgery.endTime && (
                          <div className="info-item">
                            <label>Fin</label>
                            <span>{formatTime(selectedSurgery.endTime)}</span>
                          </div>
                        )}
                      </div>
                      {selectedSurgery.complications && (
                        <div className="notes-block alert">
                          <strong>⚠️ Complicaciones:</strong> {selectedSurgery.complications}
                        </div>
                      )}

                      {/* Vitals Timeline */}
                      <div className="vitals-timeline">
                        <h4>🌡️ Signos Vitales Intra-Operatorios ({(selectedSurgery.surgeryVitals || []).length})</h4>
                        {(selectedSurgery.surgeryVitals || []).length === 0 ? (
                          <p className="empty-text">Sin registros aún</p>
                        ) : (
                          <div className="vitals-table-wrapper">
                            <table className="vitals-table">
                              <thead>
                                <tr>
                                  <th>Hora</th><th>FC</th><th>FR</th><th>T°</th><th>PA</th><th>SpO₂</th><th>EtCO₂</th><th>Plano</th><th>Obs</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedSurgery.surgeryVitals || []).map(v => (
                                  <tr key={v.id}>
                                    <td>{formatTime(v.recordedAt)}</td>
                                    <td>{v.frecuenciaCardiaca ?? '—'}</td>
                                    <td>{v.frecuenciaRespiratoria ?? '—'}</td>
                                    <td>{v.temperatura ? `${v.temperatura}°` : '—'}</td>
                                    <td>{v.presionArterial || '—'}</td>
                                    <td>{v.saturacionOxigeno ? `${v.saturacionOxigeno}%` : '—'}</td>
                                    <td>{v.etCO2 ?? '—'}</td>
                                    <td>{v.planoAnestesico || '—'}</td>
                                    <td>{v.observaciones || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ POST-OPERATORIO ═══ */}
              {selectedSurgery.status === 'COMPLETADA' && (
                <div className="collapsible-section">
                  <div className="section-header" onClick={() => toggleSection('postOp')}>
                    <h3>📋 Post-Operatorio</h3>
                    <span>{expandedSections.postOp ? '▼' : '▶'}</span>
                  </div>
                  {expandedSections.postOp && (
                    <div className="section-body">
                      <div className="post-op-grid">
                        <div className="info-item full">
                          <label>Procedimiento</label>
                          <span>{selectedSurgery.procedure || '—'}</span>
                        </div>
                        {selectedSurgery.prognosis && (
                          <div className="info-item">
                            <label>Pronóstico</label>
                            <span className="prognosis-badge" style={{ color: PROGNOSIS_COLORS[selectedSurgery.prognosis] }}>
                              {selectedSurgery.prognosis}
                            </span>
                          </div>
                        )}
                        <div className="info-item">
                          <label>Hospitalización</label>
                          <span>{selectedSurgery.hospitalizationRequired ? '🏥 Sí' : '🏠 No'}</span>
                        </div>
                        {selectedSurgery.postOpNotes && (
                          <div className="info-item full">
                            <label>Notas post-op</label>
                            <span>{selectedSurgery.postOpNotes}</span>
                          </div>
                        )}
                        {selectedSurgery.postOpCare && (
                          <div className="info-item full">
                            <label>Cuidados post-op</label>
                            <span>{selectedSurgery.postOpCare}</span>
                          </div>
                        )}
                        {selectedSurgery.followUpDate && (
                          <div className="info-item">
                            <label>Seguimiento</label>
                            <span>{new Date(selectedSurgery.followUpDate).toLocaleDateString('es-MX')}</span>
                          </div>
                        )}
                        {selectedSurgery.hospitalization && (
                          <div className="info-item">
                            <label>Hospitalización ID</label>
                            <span className="hosp-link">🏥 {selectedSurgery.hospitalization.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Start Surgery Modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔪 Iniciar Cirugía</h3>
            <div className="form-group">
              <label>Tipo de Anestesia</label>
              <select value={startForm.anesthesiaType} onChange={e => setStartForm({ anesthesiaType: e.target.value })}>
                <option value="">Seleccionar...</option>
                {ANESTHESIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowStartModal(false)}>Cancelar</button>
              <button className="btn-confirm start" onClick={handleStart}>🔪 Iniciar</button>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <h3>🌡️ Registrar Signos Vitales</h3>
            <div className="vitals-form-grid">
              <div className="form-group">
                <label>FC (lpm)</label>
                <input type="number" value={vitalsForm.frecuenciaCardiaca}
                  onChange={e => setVitalsForm(p => ({ ...p, frecuenciaCardiaca: e.target.value }))}
                  placeholder="60-180" />
              </div>
              <div className="form-group">
                <label>FR (rpm)</label>
                <input type="number" value={vitalsForm.frecuenciaRespiratoria}
                  onChange={e => setVitalsForm(p => ({ ...p, frecuenciaRespiratoria: e.target.value }))}
                  placeholder="10-40" />
              </div>
              <div className="form-group">
                <label>Temp (°C)</label>
                <input type="number" step="0.1" value={vitalsForm.temperatura}
                  onChange={e => setVitalsForm(p => ({ ...p, temperatura: e.target.value }))}
                  placeholder="36.0-40.0" />
              </div>
              <div className="form-group">
                <label>PA (mmHg)</label>
                <input type="text" value={vitalsForm.presionArterial}
                  onChange={e => setVitalsForm(p => ({ ...p, presionArterial: e.target.value }))}
                  placeholder="120/80" />
              </div>
              <div className="form-group">
                <label>SpO₂ (%)</label>
                <input type="number" step="0.1" value={vitalsForm.saturacionOxigeno}
                  onChange={e => setVitalsForm(p => ({ ...p, saturacionOxigeno: e.target.value }))}
                  placeholder="95-100" />
              </div>
              <div className="form-group">
                <label>EtCO₂ (mmHg)</label>
                <input type="number" step="0.1" value={vitalsForm.etCO2}
                  onChange={e => setVitalsForm(p => ({ ...p, etCO2: e.target.value }))}
                  placeholder="35-45" />
              </div>
              <div className="form-group">
                <label>Plano Anestésico</label>
                <select value={vitalsForm.planoAnestesico}
                  onChange={e => setVitalsForm(p => ({ ...p, planoAnestesico: e.target.value }))}>
                  <option value="">—</option>
                  <option value="Superficial">Superficial</option>
                  <option value="Quirúrgico leve">Quirúrgico leve</option>
                  <option value="Quirúrgico medio">Quirúrgico medio</option>
                  <option value="Quirúrgico profundo">Quirúrgico profundo</option>
                  <option value="Muy profundo">Muy profundo</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Observaciones</label>
                <input type="text" value={vitalsForm.observaciones}
                  onChange={e => setVitalsForm(p => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Notas adicionales..." />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowVitalsModal(false)}>Cancelar</button>
              <button className="btn-confirm" onClick={handleAddVitals}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Medication Modal */}
      {showPreMedModal && (
        <div className="modal-overlay" onClick={() => setShowPreMedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>💊 Agregar Pre-Medicación</h3>
            <div className="form-group">
              <label>Medicamento *</label>
              <input type="text" value={preMedForm.medicamento}
                onChange={e => setPreMedForm(p => ({ ...p, medicamento: e.target.value }))}
                placeholder="Ej: Atropina, Acepromacina..." />
            </div>
            <div className="form-group">
              <label>Dosis *</label>
              <input type="text" value={preMedForm.dosis}
                onChange={e => setPreMedForm(p => ({ ...p, dosis: e.target.value }))}
                placeholder="Ej: 0.04 mg/kg" />
            </div>
            <div className="form-group">
              <label>Vía</label>
              <select value={preMedForm.via} onChange={e => setPreMedForm(p => ({ ...p, via: e.target.value }))}>
                <option value="IV">IV</option>
                <option value="IM">IM</option>
                <option value="SC">SC</option>
                <option value="PO">PO</option>
              </select>
            </div>
            <div className="form-group">
              <label>Observaciones</label>
              <input type="text" value={preMedForm.observaciones}
                onChange={e => setPreMedForm(p => ({ ...p, observaciones: e.target.value }))}
                placeholder="Opcional..." />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPreMedModal(false)}>Cancelar</button>
              <button className="btn-confirm" onClick={handleAddPreMed}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Surgery Modal */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content wide" onClick={e => e.stopPropagation()}>
            <h3>✅ Finalizar Cirugía</h3>
            <div className="form-group">
              <label>Procedimiento realizado *</label>
              <textarea rows={3} value={completeForm.procedure}
                onChange={e => setCompleteForm(p => ({ ...p, procedure: e.target.value }))}
                placeholder="Describir procedimiento..." />
            </div>
            <div className="form-group">
              <label>Complicaciones</label>
              <textarea rows={2} value={completeForm.complications}
                onChange={e => setCompleteForm(p => ({ ...p, complications: e.target.value }))}
                placeholder="Sin complicaciones o describir..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pronóstico</label>
                <select value={completeForm.prognosis}
                  onChange={e => setCompleteForm(p => ({ ...p, prognosis: e.target.value }))}>
                  <option value="">—</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BUENO">Bueno</option>
                  <option value="RESERVADO">Reservado</option>
                  <option value="GRAVE">Grave</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Notas post-operatorias</label>
              <textarea rows={2} value={completeForm.postOpNotes}
                onChange={e => setCompleteForm(p => ({ ...p, postOpNotes: e.target.value }))}
                placeholder="Notas adicionales..." />
            </div>
            <div className="form-group">
              <label>Cuidados post-operatorios</label>
              <textarea rows={2} value={completeForm.postOpCare}
                onChange={e => setCompleteForm(p => ({ ...p, postOpCare: e.target.value }))}
                placeholder="Instrucciones de cuidado..." />
            </div>

            <div className="hospitalization-toggle">
              <label className="checklist-item">
                <input type="checkbox" checked={completeForm.hospitalizationRequired}
                  onChange={e => setCompleteForm(p => ({ ...p, hospitalizationRequired: e.target.checked }))} />
                <span>🏥 Requiere Hospitalización Post-Quirúrgica</span>
              </label>
              {completeForm.hospitalizationRequired && (
                <div className="form-group">
                  <label>Área de hospitalización</label>
                  <select value={completeForm.hospitalizationType}
                    onChange={e => setCompleteForm(p => ({ ...p, hospitalizationType: e.target.value }))}>
                    {HOSP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCompleteModal(false)}>Cancelar</button>
              <button className="btn-confirm complete" onClick={handleComplete}>✅ Finalizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>❌ Cancelar Cirugía</h3>
            <div className="form-group">
              <label>Motivo de cancelación</label>
              <textarea rows={3} value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Razón de la cancelación..." />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCancelModal(false)}>Volver</button>
              <button className="btn-confirm cancel" onClick={handleCancel}>Confirmar Cancelación</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
