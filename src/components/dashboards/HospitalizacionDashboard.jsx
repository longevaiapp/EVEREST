import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useHospitalizacion from '../../hooks/useHospitalizacion';
import farmaciaService from '../../services/farmacia.service';
import './HospitalizacionDashboard.css';

// Helper function to calculate time since last monitoring
function getMonitoringStatus(hospitalization) {
  const frecuencia = hospitalization?.frecuenciaMonitoreo;
  // Check multiple possible field names for last monitoring
  const lastMonitoring = hospitalization?.monitorings?.[0]?.recordedAt || 
                         hospitalization?.latestMonitoring?.recordedAt ||
                         hospitalization?.lastMonitoring?.recordedAt;
  
  if (!frecuencia) return { status: 'unknown', message: 'Sin frecuencia definida' };
  
  // Parse frequency (e.g., "4h" -> 4 hours)
  const hoursMatch = frecuencia.match(/(\d+)/);
  if (!hoursMatch) return { status: 'unknown', message: 'Frecuencia inválida' };
  
  const frequencyHours = parseInt(hoursMatch[1]);
  const frequencyMs = frequencyHours * 60 * 60 * 1000;
  
  if (!lastMonitoring) {
    // No monitoring yet - urgent
    return { 
      status: 'urgent', 
      message: 'Sin registros - Requiere chequeo inmediato',
      urgencyLevel: 3 
    };
  }
  
  const lastTime = new Date(lastMonitoring).getTime();
  const now = Date.now();
  const elapsed = now - lastTime;
  const remaining = frequencyMs - elapsed;
  
  if (remaining <= 0) {
    // Past due
    const overdueMins = Math.floor(Math.abs(remaining) / (60 * 1000));
    const overdueHours = Math.floor(overdueMins / 60);
    return {
      status: 'overdue',
      message: `Atrasado ${overdueHours > 0 ? overdueHours + 'h ' : ''}${overdueMins % 60}min`,
      urgencyLevel: 2
    };
  } else if (remaining <= 30 * 60 * 1000) {
    // Due soon (within 30 minutes)
    const remainingMins = Math.floor(remaining / (60 * 1000));
    return {
      status: 'soon',
      message: `Próximo en ${remainingMins} min`,
      urgencyLevel: 1
    };
  } else {
    // On schedule
    const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
    const remainingMins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return {
      status: 'ok',
      message: `Próximo en ${remainingHours > 0 ? remainingHours + 'h ' : ''}${remainingMins}min`,
      urgencyLevel: 0
    };
  }
}

function HospitalizacionDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  
  const {
    loading,
    error,
    hospitalizaciones,
    stats,
    selectedHospitalization,
    vitalSigns,
    therapyPlan,
    pendingMedications,
    neonates,
    costs,
    fetchHospitalizaciones,
    selectHospitalization,
    addVitalSigns,
    addTherapyItem,
    deactivateTherapyItem,
    activateTherapyItem,
    administerMedication,
    generateDailySchedule,
    addNeonate,
    addNeonateRecord,
    dischargePatient,
    clearError,
  } = useHospitalizacion();

  // Filter state
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVO');
  
  // Active tab in detail panel
  const [activeTab, setActiveTab] = useState('info');
  
  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTherapyModal, setShowTherapyModal] = useState(false);
  const [showNeonateModal, setShowNeonateModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  
  // Form states
  const [vitalsForm, setVitalsForm] = useState({
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    temperatura: '',
    trc: '',
    mucosas: 'ROSADAS',
    presionArterial: '',
    peso: '',
    glucosa: '',
    hidratacion: 'NORMAL',
    nivelConciencia: 'ALERTA',
    nivelDolor: '0',
    observaciones: ''
  });

  const [therapyForm, setTherapyForm] = useState({
    medicationId: '',
    medicationName: '',
    presentacion: '',
    concentracion: '',
    stockDisponible: 0,
    dosis: '',
    unidadDosis: 'mg',
    frecuenciaHoras: 8,
    via: 'IV',
    notas: ''
  });

  // Medication search states for therapy plan
  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMedications, setSearchingMedications] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const medicationSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [neonateForm, setNeonateForm] = useState({
    number: 1,
    identificationType: '',
    identification: '',
    sex: 'MACHO'
  });

  // Modal y formulario de monitoreo de neonato
  const [showNeonateRecordModal, setShowNeonateRecordModal] = useState(false);
  const [selectedNeonate, setSelectedNeonate] = useState(null);
  const [neonateRecordForm, setNeonateRecordForm] = useState({
    weight: '',
    temperature: '',
    heartRate: '',
    respiratoryRate: '',
    suction: '',
    activity: '',
    notes: ''
  });

  const [dischargeForm, setDischargeForm] = useState({
    type: 'ALTA_MEDICA',
    notes: ''
  });

  // Track current time for monitoring status updates
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [notificationSound] = useState(() => typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null);

  // Calculate urgent monitoring alerts
  const urgentAlerts = useMemo(() => {
    if (!hospitalizaciones?.length) return [];
    
    return hospitalizaciones
      .map(h => ({
        hospitalization: h,
        status: getMonitoringStatus(h)
      }))
      .filter(item => item.status.status === 'urgent' || item.status.status === 'overdue')
      .sort((a, b) => b.status.urgencyLevel - a.status.urgencyLevel);
  }, [hospitalizaciones, currentTime]);

  // Count patients needing attention soon
  const soonAlerts = useMemo(() => {
    if (!hospitalizaciones?.length) return [];
    
    return hospitalizaciones
      .map(h => ({
        hospitalization: h,
        status: getMonitoringStatus(h)
      }))
      .filter(item => item.status.status === 'soon');
  }, [hospitalizaciones, currentTime]);

  // Load data on mount
  useEffect(() => {
    fetchHospitalizaciones(filterType || null, filterStatus || null);
  }, [filterType, filterStatus, fetchHospitalizaciones]);

  // Auto-refresh for monitoring status (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      // Also refresh data every 5 minutes
      if (Date.now() % (5 * 60 * 1000) < 60000) {
        fetchHospitalizaciones(filterType || null, filterStatus || null);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [filterType, filterStatus, fetchHospitalizaciones]);

  // Play notification sound for urgent alerts
  useEffect(() => {
    if (urgentAlerts.length > 0 && notificationSound) {
      // Only play if there are new urgent alerts
      try {
        notificationSound.play().catch(() => {
          // Audio playback failed (autoplay restrictions)
        });
      } catch (e) {
        // Audio not supported
      }
    }
  }, [urgentAlerts.length]);

  // Medication search effect with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (medicationSearch.length < 2) {
      setMedicationResults([]);
      setShowMedicationDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingMedications(true);
      try {
        const results = await farmaciaService.getMedications({ search: medicationSearch });
        setMedicationResults(results);
        setShowMedicationDropdown(true);
      } catch (err) {
        console.error('[HospitalizacionDashboard] Error searching medications:', err);
        setMedicationResults([]);
      } finally {
        setSearchingMedications(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [medicationSearch]);

  // Close medication dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (medicationSearchRef.current && !medicationSearchRef.current.contains(event.target)) {
        setShowMedicationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select medication from search results
  const handleSelectMedication = useCallback((medication) => {
    const stock = medication.currentStock ?? medication.stockActual ?? 0;
    setTherapyForm(prev => ({
      ...prev,
      medicationId: medication.id,
      medicationName: medication.name || medication.nombre,
      presentacion: medication.presentation || medication.presentacion || '',
      concentracion: medication.concentration || medication.concentracion || '',
      stockDisponible: stock
    }));
    setMedicationSearch('');
    setShowMedicationDropdown(false);
    setMedicationResults([]);
  }, []);

  // Filter change handler
  const handleFilterChange = useCallback((type, status) => {
    setFilterType(type);
    setFilterStatus(status);
  }, []);

  // Select patient
  const handleSelectPatient = useCallback((hospitalization) => {
    selectHospitalization(hospitalization);
    // Si es NEONATOS, ir directo al panel de neonatos
    if (hospitalization.type === 'NEONATOS') {
      setActiveTab('neonates');
    } else {
      setActiveTab('info');
    }
  }, [selectHospitalization]);

  // Vitals form handlers
  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm(prev => ({ ...prev, [name]: value }));
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
    
    const success = await addVitalSigns(selectedHospitalization.id, data);
    if (success) {
      setShowVitalsModal(false);
      setVitalsForm({
        frecuenciaCardiaca: '',
        frecuenciaRespiratoria: '',
        temperatura: '',
        trc: '',
        mucosas: 'ROSADAS',
        presionArterial: '',
        peso: '',
        glucosa: '',
        hidratacion: 'NORMAL',
        nivelConciencia: 'ALERTA',
        nivelDolor: '0',
        observaciones: ''
      });
    }
  };

  // Therapy form handlers
  const handleTherapyChange = (e) => {
    const { name, value } = e.target;
    setTherapyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTherapySubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    
    // Map to backend field names
    const data = {
      medicationId: therapyForm.medicationId || undefined, // Don't send null
      medicationName: therapyForm.medicationName,
      dose: `${therapyForm.dosis} ${therapyForm.unidadDosis}`, // Backend expects "dose" as string e.g. "5 mg"
      frequency: `cada ${therapyForm.frecuenciaHoras} horas`, // Backend expects "frequency" as string
      route: therapyForm.via, // Backend expects "route"
      notes: therapyForm.notas
    };
    
    const success = await addTherapyItem(selectedHospitalization.id, data);
    if (success) {
      setShowTherapyModal(false);
      setTherapyForm({
        medicationId: '',
        medicationName: '',
        presentacion: '',
        concentracion: '',
        stockDisponible: 0,
        dosis: '',
        unidadDosis: 'mg',
        frecuenciaHoras: 8,
        via: 'IV',
        notas: ''
      });
      setMedicationSearch('');
    }
  };

  // Administer medication
  const handleAdminister = async (administrationId) => {
    if (!selectedHospitalization) return;
    await administerMedication(selectedHospitalization.id, administrationId);
  };

  // Generate schedule
  const handleGenerateSchedule = async () => {
    if (!selectedHospitalization) return;
    await generateDailySchedule(selectedHospitalization.id);
  };

  // Neonate form handlers
  const handleNeonateChange = (e) => {
    const { name, value } = e.target;
    setNeonateForm(prev => ({ ...prev, [name]: value }));
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
    
    const success = await addNeonate(selectedHospitalization.id, data);
    if (success) {
      setShowNeonateModal(false);
      // Incrementar número para el próximo neonato
      setNeonateForm({
        number: (neonates?.length || 0) + 2,
        identificationType: '',
        identification: '',
        sex: 'MACHO'
      });
    }
  };

  // Neonate Record (Monitoreo) handlers
  const handleNeonateRecordChange = (e) => {
    const { name, value } = e.target;
    setNeonateRecordForm(prev => ({ ...prev, [name]: value }));
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
    
    const success = await addNeonateRecord(selectedHospitalization.id, selectedNeonate.id, data);
    if (success) {
      setShowNeonateRecordModal(false);
      setSelectedNeonate(null);
      setNeonateRecordForm({
        weight: '',
        temperature: '',
        heartRate: '',
        respiratoryRate: '',
        suction: '',
        activity: '',
        notes: ''
      });
    }
  };

  const openNeonateRecordModal = (neonate) => {
    setSelectedNeonate(neonate);
    setShowNeonateRecordModal(true);
  };

  // Discharge handlers
  const handleDischargeChange = (e) => {
    const { name, value } = e.target;
    setDischargeForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospitalization) return;
    
    const success = await dischargePatient(selectedHospitalization.id, dischargeForm.type, dischargeForm.notes);
    if (success) {
      setShowDischargeModal(false);
      setDischargeForm({ type: 'ALTA_MEDICA', notes: '' });
      // Refresh list
      fetchHospitalizaciones(filterType || null, filterStatus || null);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  // Calculate days hospitalized
  const getDaysHospitalized = (admission) => {
    if (!admission) return 0;
    const start = new Date(admission);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Get type badge class
  const getTypeBadgeClass = (type) => {
    return type?.toLowerCase() || 'general';
  };

  return (
    <div className="hospitalizacion-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>
          🏥 {t('hospitalizacion.title', 'Hospitalización')}
        </h1>
        <div className="user-info">
          <span>{user?.name || 'Usuario'}</span>
          <button className="btn-logout" onClick={logout}>
            {t('common.logout', 'Cerrar sesión')}
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card general">
          <div className="stat-number">{stats?.general || 0}</div>
          <div className="stat-label">{t('hospitalizacion.general', 'General')}</div>
        </div>
        <div className="stat-card uci">
          <div className="stat-number">{stats?.uci || 0}</div>
          <div className="stat-label">{t('hospitalizacion.uci', 'UCI')}</div>
        </div>
        <div className="stat-card neonatos">
          <div className="stat-number">{stats?.neonatos || 0}</div>
          <div className="stat-label">{t('hospitalizacion.neonatos', 'Neonatos')}</div>
        </div>
        <div className="stat-card infecciosos">
          <div className="stat-number">{stats?.infecciosos || 0}</div>
          <div className="stat-label">{t('hospitalizacion.infecciosos', 'Infecciosos')}</div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button className="error-close" onClick={clearError}>×</button>
        </div>
      )}

      {/* Urgent Monitoring Alerts Banner */}
      {urgentAlerts.length > 0 && (
        <div className="urgent-alerts-banner">
          <div className="urgent-banner-icon">🚨</div>
          <div className="urgent-banner-content">
            <strong>{urgentAlerts.length} paciente{urgentAlerts.length > 1 ? 's' : ''} requiere{urgentAlerts.length > 1 ? 'n' : ''} monitoreo</strong>
            <div className="urgent-list">
              {urgentAlerts.slice(0, 3).map(({ hospitalization, status }) => (
                <button
                  key={hospitalization.id}
                  className="urgent-patient-btn"
                  onClick={() => {
                    handleSelectPatient(hospitalization);
                    setShowVitalsModal(true);
                  }}
                >
                  <span className="urgent-pet-name">{hospitalization.patient?.nombre}</span>
                  <span className={`urgent-status ${status.status}`}>{status.message}</span>
                </button>
              ))}
              {urgentAlerts.length > 3 && (
                <span className="urgent-more">+{urgentAlerts.length - 3} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Soon Alerts (less prominent) */}
      {soonAlerts.length > 0 && urgentAlerts.length === 0 && (
        <div className="soon-alerts-banner">
          <div className="soon-banner-icon">🔔</div>
          <div className="soon-banner-content">
            <span>{soonAlerts.length} paciente{soonAlerts.length > 1 ? 's' : ''} con monitoreo próximo:</span>
            {soonAlerts.slice(0, 3).map(({ hospitalization }) => (
              <span key={hospitalization.id} className="soon-patient">
                {hospitalization.patient?.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Sidebar - Patient List */}
        <aside className="patients-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">
              📋 {t('hospitalizacion.patients', 'Pacientes Hospitalizados')}
            </span>
            <div className="filter-row">
              <div className="filter-group">
                <label className="filter-label">{t('hospitalizacion.type', 'Tipo')}</label>
                <select 
                  value={filterType} 
                  onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
                  className="filter-select"
                >
                  <option value="">{t('hospitalizacion.allTypes', 'Todos')}</option>
                  <option value="GENERAL">General</option>
                  <option value="UCI">UCI</option>
                  <option value="NEONATOS">Neonatos</option>
                  <option value="INFECCIOSOS">Infecciosos</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">{t('hospitalizacion.status', 'Estado')}</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => handleFilterChange(filterType, e.target.value)}
                  className="filter-select"
                >
                  <option value="ACTIVO">{t('hospitalizacion.active', 'Activos')}</option>
                  <option value="">{t('hospitalizacion.all', 'Todos')}</option>
                  <option value="ALTA_PENDIENTE">Alta Pendiente</option>
                  <option value="DADO_DE_ALTA">Dados de Alta</option>
                </select>
              </div>
            </div>
          </div>

            <div className="patients-list">
            {loading && !hospitalizaciones.length ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>{t('common.loading', 'Cargando...')}</span>
              </div>
            ) : hospitalizaciones.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🛏️</div>
                <span>{t('hospitalizacion.noPatients', 'No hay pacientes hospitalizados')}</span>
              </div>
            ) : (
              hospitalizaciones.map((h) => {
                const monitoringStatus = getMonitoringStatus(h);
                return (
                <div 
                  key={h.id}
                  className={`patient-card ${getTypeBadgeClass(h.type)} ${selectedHospitalization?.id === h.id ? 'selected' : ''} ${monitoringStatus.status === 'urgent' || monitoringStatus.status === 'overdue' ? 'needs-monitoring' : ''}`}
                  onClick={() => handleSelectPatient(h)}
                >
                  {/* Monitoring Alert Badge */}
                  {(monitoringStatus.status === 'urgent' || monitoringStatus.status === 'overdue') && (
                    <div className={`monitoring-alert ${monitoringStatus.status}`}>
                      <span className="alert-icon">⏰</span>
                      <span className="alert-text">{monitoringStatus.message}</span>
                    </div>
                  )}
                  {monitoringStatus.status === 'soon' && (
                    <div className="monitoring-alert soon">
                      <span className="alert-icon">🔔</span>
                      <span className="alert-text">{monitoringStatus.message}</span>
                    </div>
                  )}
                  <div className="patient-card-header">
                    <div>
                      <div className="patient-name">{h.patient?.nombre || 'Sin nombre'}</div>
                      <div className="patient-species">{h.patient?.especie} - {h.patient?.raza}</div>
                    </div>
                    <span className={`type-badge ${getTypeBadgeClass(h.type)}`}>
                      {h.type}
                    </span>
                  </div>
                  <div className="patient-owner">
                    {t('hospitalizacion.owner', 'Dueño')}: {h.patient?.owner?.nombre || '-'}
                  </div>
                  <div className="patient-meta">
                    <span>📅 {getDaysHospitalized(h.fechaIngreso)} días</span>
                    <span>🩺 {h.attendingVet?.nombre || 'Sin asignar'}</span>
                  </div>
                  {h.frecuenciaMonitoreo && (
                    <div className="patient-frequency">
                      <span>🔄 Monitoreo c/{h.frecuenciaMonitoreo}</span>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
        </aside>

        {/* Detail Panel */}
        <main className="detail-panel">
          {!selectedHospitalization ? (
            <div className="detail-empty">
              <div className="icon">👆</div>
              <span>{t('hospitalizacion.selectPatient', 'Selecciona un paciente para ver detalles')}</span>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="detail-header">
                <div className="detail-header-row">
                  <div className="detail-title">
                    <div className="detail-avatar">
                      {selectedHospitalization.patient?.especie === 'Canino' ? '🐕' : '🐈'}
                    </div>
                    <div className="detail-info">
                      <h2>{selectedHospitalization.patient?.nombre}</h2>
                      <p>
                        {selectedHospitalization.patient?.especie} | {selectedHospitalization.patient?.raza} | 
                        {selectedHospitalization.patient?.edad} | {selectedHospitalization.patient?.genero}
                        {selectedHospitalization.patient?.peso && ` | ${selectedHospitalization.patient.peso}kg`}
                      </p>
                      <p>
                        <strong>{t('hospitalizacion.diagnosis', 'Diagnóstico')}:</strong> {selectedHospitalization.diagnosis || '-'}
                      </p>
                      <p>
                        <strong>{t('hospitalizacion.reason', 'Motivo hospitalización')}:</strong> {selectedHospitalization.reason || '-'}
                      </p>
                      {selectedHospitalization.cuidadosEspeciales && (
                        <p>
                          <strong>⚠️ {t('hospitalizacion.specialCare', 'Cuidados especiales')}:</strong> {selectedHospitalization.cuidadosEspeciales}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button 
                      className="btn-action btn-primary"
                      onClick={() => setShowVitalsModal(true)}
                    >
                      ❤️ {t('hospitalizacion.addVitals', 'Registrar Signos')}
                    </button>
                    {selectedHospitalization.status === 'ACTIVO' && (
                      <button 
                        className="btn-action btn-danger"
                        onClick={() => setShowDischargeModal(true)}
                      >
                        🏠 {t('hospitalizacion.discharge', 'Dar de Alta')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button 
                  className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  📋 {t('hospitalizacion.consultation', 'Consulta Médica')}
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('vitals')}
                >
                  ❤️ {t('hospitalizacion.vitalSigns', 'Signos Vitales')}
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'therapy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('therapy')}
                >
                  💊 {t('hospitalizacion.therapyPlan', 'Plan Terapéutico')}
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'medications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('medications')}
                >
                  💉 {t('hospitalizacion.medications', 'Medicamentos')}
                </button>
                {selectedHospitalization.type === 'NEONATOS' && (
                  <button 
                    className={`tab-btn ${activeTab === 'neonates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('neonates')}
                  >
                    🍼 {t('hospitalizacion.neonatos', 'Neonatos')}
                  </button>
                )}
                <button 
                  className={`tab-btn ${activeTab === 'costs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('costs')}
                >
                  💰 {t('hospitalizacion.costs', 'Costos')}
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Consultation Info Tab */}
                {activeTab === 'info' && (
                  <div className="info-tab">
                    {/* Hospitalization Details */}
                    <div className="section-card">
                      <h3 className="section-title">🏥 {t('hospitalizacion.hospInfo', 'Información de Hospitalización')}</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <label>{t('hospitalizacion.admissionDate', 'Fecha Ingreso')}:</label>
                          <span>{formatDate(selectedHospitalization.fechaIngreso)}</span>
                        </div>
                        <div className="info-item">
                          <label>{t('hospitalizacion.type', 'Tipo')}:</label>
                          <span className={`type-badge ${getTypeBadgeClass(selectedHospitalization.type)}`}>
                            {selectedHospitalization.type}
                          </span>
                        </div>
                        <div className="info-item">
                          <label>{t('hospitalizacion.location', 'Ubicación')}:</label>
                          <span>{selectedHospitalization.location || 'No asignada'}</span>
                        </div>
                        <div className="info-item">
                          <label>{t('hospitalizacion.monitoringFreq', 'Frecuencia Monitoreo')}:</label>
                          <span>{selectedHospitalization.frecuenciaMonitoreo || 'No especificada'}</span>
                        </div>
                        <div className="info-item">
                          <label>{t('hospitalizacion.attendingVet', 'Médico Responsable')}:</label>
                          <span>{selectedHospitalization.attendingVet?.nombre || 'No asignado'}</span>
                        </div>
                        <div className="info-item">
                          <label>{t('hospitalizacion.estimatedDays', 'Días Estimados')}:</label>
                          <span>{selectedHospitalization.estimacionDias || 'No especificado'}</span>
                        </div>
                      </div>
                      {selectedHospitalization.admissionNotes && (
                        <div className="info-notes">
                          <label>{t('hospitalizacion.admissionNotes', 'Notas de Admisión')}:</label>
                          <p>{selectedHospitalization.admissionNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Consultation Data from Doctor */}
                    {selectedHospitalization.consultation && (
                      <div className="section-card">
                        <h3 className="section-title">👨‍⚕️ {t('hospitalizacion.doctorNotes', 'Notas del Médico (Consulta)')}</h3>
                        
                        {selectedHospitalization.consultation.motivoConsulta && (
                          <div className="info-notes">
                            <label>{t('hospitalizacion.consultReason', 'Motivo de Consulta')}:</label>
                            <p>{selectedHospitalization.consultation.motivoConsulta}</p>
                          </div>
                        )}
                        
                        {/* SOAP Notes */}
                        <div className="soap-notes">
                          {selectedHospitalization.consultation.soapSubjetivo && (
                            <div className="soap-section">
                              <strong>S - Subjetivo:</strong>
                              <p>{selectedHospitalization.consultation.soapSubjetivo}</p>
                            </div>
                          )}
                          {selectedHospitalization.consultation.soapObjetivo && (
                            <div className="soap-section">
                              <strong>O - Objetivo:</strong>
                              <p>{selectedHospitalization.consultation.soapObjetivo}</p>
                            </div>
                          )}
                          {selectedHospitalization.consultation.soapAnalisis && (
                            <div className="soap-section">
                              <strong>A - Análisis:</strong>
                              <p>{selectedHospitalization.consultation.soapAnalisis}</p>
                            </div>
                          )}
                          {selectedHospitalization.consultation.soapPlan && (
                            <div className="soap-section">
                              <strong>P - Plan:</strong>
                              <p>{selectedHospitalization.consultation.soapPlan}</p>
                            </div>
                          )}
                        </div>

                        {/* Diagnoses */}
                        {selectedHospitalization.consultation.diagnosticos?.length > 0 && (
                          <div className="info-notes">
                            <label>{t('hospitalizacion.diagnoses', 'Diagnósticos')}:</label>
                            <ul className="diagnoses-list">
                              {selectedHospitalization.consultation.diagnosticos.map((dx, idx) => (
                                <li key={idx}>
                                  <strong>{dx.codigo}:</strong> {dx.descripcion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Consultation Vital Signs */}
                        {selectedHospitalization.consultation.signosVitales && (
                          <div className="info-notes">
                            <label>{t('hospitalizacion.consultVitals', 'Signos Vitales (Consulta)')}:</label>
                            <div className="vitals-summary">
                              <span>FC: {selectedHospitalization.consultation.signosVitales.frecuenciaCardiaca || '-'} bpm</span>
                              <span>FR: {selectedHospitalization.consultation.signosVitales.frecuenciaRespiratoria || '-'} rpm</span>
                              <span>T°: {selectedHospitalization.consultation.signosVitales.temperatura || '-'}°C</span>
                              <span>Peso: {selectedHospitalization.consultation.signosVitales.peso || '-'} kg</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Studies Requested */}
                    {(selectedHospitalization.studyBH || selectedHospitalization.studyQS || selectedHospitalization.studyRX || 
                      selectedHospitalization.studyUS || selectedHospitalization.studyEGO || selectedHospitalization.studyECG ||
                      selectedHospitalization.studyElectrolitos || selectedHospitalization.studySNAP) && (
                      <div className="section-card">
                        <h3 className="section-title">🔬 {t('hospitalizacion.studiesRequested', 'Estudios Solicitados')}</h3>
                        <div className="studies-grid">
                          {selectedHospitalization.studyBH && <span className="study-badge">BH</span>}
                          {selectedHospitalization.studyQS && <span className="study-badge">QS</span>}
                          {selectedHospitalization.studyRX && <span className="study-badge">RX</span>}
                          {selectedHospitalization.studyUS && <span className="study-badge">US</span>}
                          {selectedHospitalization.studyEGO && <span className="study-badge">EGO</span>}
                          {selectedHospitalization.studyECG && <span className="study-badge">ECG</span>}
                          {selectedHospitalization.studyElectrolitos && <span className="study-badge">Electrolitos</span>}
                          {selectedHospitalization.studySNAP && <span className="study-badge">SNAP</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vitals Tab */}
                {activeTab === 'vitals' && (
                  <div className="vitals-tab">
                    <div className="section-card">
                      <h3 className="section-title">
                        📊 {t('hospitalizacion.latestVitals', 'Últimos Signos Vitales')}
                      </h3>
                      {vitalSigns.length === 0 ? (
                        <div className="empty-state">
                          <span>{t('hospitalizacion.noVitals', 'No hay registros de signos vitales')}</span>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('hospitalizacion.datetime', 'Fecha/Hora')}</th>
                              <th>FC</th>
                              <th>FR</th>
                              <th>T°</th>
                              <th>{t('hospitalizacion.consciousness', 'Conciencia')}</th>
                              <th>{t('hospitalizacion.pain', 'Dolor')}</th>
                              <th>{t('hospitalizacion.notes', 'Observaciones')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vitalSigns.slice(0, 10).map((v) => (
                              <tr key={v.id}>
                                <td>{formatDate(v.recordedAt)}</td>
                                <td>{v.frecuenciaCardiaca || '-'}</td>
                                <td>{v.frecuenciaRespiratoria || '-'}</td>
                                <td>{v.temperatura ? `${v.temperatura}°C` : '-'}</td>
                                <td>{v.nivelConciencia || '-'}</td>
                                <td>{v.escalaDolor !== null ? `${v.escalaDolor}/10` : '-'}</td>
                                <td>{v.observaciones || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Therapy Tab */}
                {activeTab === 'therapy' && (
                  <div className="therapy-tab">
                    <div className="section-card">
                      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📋 {t('hospitalizacion.currentTherapy', 'Plan Terapéutico Actual')}</span>
                        <button 
                          className="btn-action btn-primary"
                          onClick={() => setShowTherapyModal(true)}
                        >
                          + {t('hospitalizacion.addTherapy', 'Agregar Medicamento')}
                        </button>
                      </div>
                      {therapyPlan.length === 0 ? (
                        <div className="empty-state">
                          <span>{t('hospitalizacion.noTherapy', 'No hay medicamentos en el plan terapéutico')}</span>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('hospitalizacion.medication', 'Medicamento')}</th>
                              <th>{t('hospitalizacion.dose', 'Dosis')}</th>
                              <th>{t('hospitalizacion.frequency', 'Frecuencia')}</th>
                              <th>{t('hospitalizacion.route', 'Vía')}</th>
                              <th>{t('hospitalizacion.status', 'Estado')}</th>
                              <th>{t('hospitalizacion.actions', 'Acciones')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {therapyPlan.map((item) => (
                              <tr key={item.id}>
                                <td>{item.medication?.nombre || item.medicationName || '-'}</td>
                                <td>{item.dosis}</td>
                                <td>{item.frecuenciaHoras}</td>
                                <td>{item.via}</td>
                                <td>
                                  <span className={`type-badge ${item.activo ? 'general' : 'infecciosos'}`}>
                                    {item.activo ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  {item.activo ? (
                                    <button 
                                      className="btn-action btn-secondary"
                                      onClick={() => deactivateTherapyItem(selectedHospitalization.id, item.id)}
                                    >
                                      Suspender
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn-action btn-primary"
                                      onClick={() => activateTherapyItem(selectedHospitalization.id, item.id)}
                                    >
                                      Activar
                                    </button>
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

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                  <div className="medications-tab">
                    <div className="section-card">
                      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>💉 {t('hospitalizacion.pendingMeds', 'Medicamentos Pendientes')}</span>
                        <button 
                          className="btn-action btn-secondary"
                          onClick={handleGenerateSchedule}
                        >
                          🔄 {t('hospitalizacion.generateSchedule', 'Generar Horario del Día')}
                        </button>
                      </div>
                      {pendingMedications.length === 0 ? (
                        <div className="empty-state">
                          <span>{t('hospitalizacion.noPendingMeds', 'No hay medicamentos pendientes')}</span>
                        </div>
                      ) : (
                        <div className="medications-list">
                          {pendingMedications.map((med) => {
                            const scheduledTime = new Date(med.horaPrograma);
                            const isOverdue = scheduledTime < new Date();
                            const statusClass = med.status === 'ADMINISTRADO' ? 'administered' 
                              : med.status === 'RETRASADO' ? 'late'
                              : med.status === 'OMITIDO' ? 'omitted'
                              : isOverdue ? 'overdue' : 'pending';
                            return (
                              <div 
                                key={med.id} 
                                className={`medication-item ${statusClass}`}
                              >
                                <div className="medication-info">
                                  <h4>{med.therapyItem?.medication?.nombre || med.therapyItem?.medicationName || '-'}</h4>
                                  <div className="medication-details">
                                    {med.therapyItem?.dosis} - {med.therapyItem?.via}
                                  </div>
                                  <div className="scheduled-time">
                                    🕐 {formatDate(med.horaPrograma)}
                                    {isOverdue && med.status === 'PENDIENTE' && ' ⚠️ ATRASADO'}
                                  </div>
                                </div>
                                {med.status === 'PENDIENTE' && (
                                  <button 
                                    className="btn-administer"
                                    onClick={() => handleAdminister(med.id)}
                                  >
                                    ✓ Administrar
                                  </button>
                                )}
                                {med.status === 'ADMINISTRADO' && (
                                  <span className="type-badge general">✓ Administrado</span>
                                )}
                                {med.status === 'RETRASADO' && (
                                  <span className="type-badge uci">⏱ Retrasado</span>
                                )}
                                {med.status === 'OMITIDO' && (
                                  <span className="type-badge infecciosos">✗ Omitido</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="important-note">
                      ⚠️ {t('hospitalizacion.pharmacyNote', 'Los medicamentos se solicitan a Farmacia. Farmacia NUNCA entrega al dueño, solo al personal clínico.')}
                    </div>
                  </div>
                )}

                {/* Neonates Tab */}
                {activeTab === 'neonates' && selectedHospitalization.type === 'NEONATOS' && (
                  <div className="neonates-tab">
                    {/* Datos Generales de la Camada */}
                    <div className="section-card neonate-general-data">
                      <h3 className="section-title">📋 {t('hospitalizacion.generalData', 'DATOS GENERALES')}</h3>
                      <div className="neonate-info-grid">
                        <div className="neonate-info-item">
                          <strong>Madre:</strong>
                          <span>{selectedHospitalization.pet?.name || 'N/A'}</span>
                        </div>
                        <div className="neonate-info-item">
                          <strong>Fecha de nacimiento:</strong>
                          <span>{formatDate(selectedHospitalization.fechaIngreso)}</span>
                        </div>
                        <div className="neonate-info-item">
                          <strong>Edad actual:</strong>
                          <span>{getDaysHospitalized(selectedHospitalization.fechaIngreso)} días</span>
                        </div>
                        <div className="neonate-info-item">
                          <strong>Número de neonatos en la camada:</strong>
                          <span>{neonates?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Neonatos */}
                    <div className="section-card">
                      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🍼 {t('hospitalizacion.neonateList', 'Lista de Neonatos')}</span>
                        <button 
                          className="btn-action btn-primary"
                          onClick={() => {
                            setNeonateForm(prev => ({ ...prev, number: (neonates?.length || 0) + 1 }));
                            setShowNeonateModal(true);
                          }}
                        >
                          + {t('hospitalizacion.addNeonate', 'Registrar Neonato')}
                        </button>
                      </div>
                      {neonates.length === 0 ? (
                        <div className="empty-state">
                          <span>{t('hospitalizacion.noNeonates', 'No hay neonatos registrados. Registra cada cachorro/gatito de la camada.')}</span>
                        </div>
                      ) : (
                        <div className="neonates-list">
                          {neonates.map((neo, idx) => (
                            <div key={neo.id} className="neonate-card">
                              <div className="neonate-header">
                                <div className="neonate-number">
                                  <strong>Neonato No. {neo.number || idx + 1}</strong>
                                  {neo.sex && <span className={`sex-badge ${neo.sex.toLowerCase()}`}>{neo.sex === 'MACHO' ? '♂' : '♀'} {neo.sex}</span>}
                                </div>
                                <button 
                                  className="btn-action btn-secondary btn-small"
                                  onClick={() => openNeonateRecordModal(neo)}
                                >
                                  + Registrar Monitoreo
                                </button>
                              </div>
                              <div className="neonate-identification">
                                <span className="id-label">Identificación:</span>
                                {neo.identificationType && <span className="id-type">☑ {neo.identificationType}</span>}
                                {neo.identification && <span className="id-value">{neo.identification}</span>}
                                {!neo.identificationType && !neo.identification && <span className="id-none">Sin identificación</span>}
                              </div>
                              
                              {/* Tabla de Monitoreo del Neonato */}
                              {neo.records && neo.records.length > 0 ? (
                                <div className="neonate-records">
                                  <table className="data-table neonate-monitoring-table">
                                    <thead>
                                      <tr>
                                        <th>Fecha</th>
                                        <th>Hora</th>
                                        <th>Peso (g)</th>
                                        <th>Temp. (°C)</th>
                                        <th>FC (lpm)</th>
                                        <th>FR (rpm)</th>
                                        <th>Succión</th>
                                        <th>Actividad</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {neo.records.slice(0, 5).map((record) => (
                                        <tr key={record.id}>
                                          <td>{new Date(record.recordedAt).toLocaleDateString()}</td>
                                          <td>{new Date(record.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                          <td>{record.weight || '-'}</td>
                                          <td>{record.temperature || '-'}</td>
                                          <td>{record.heartRate || '-'}</td>
                                          <td>{record.respiratoryRate || '-'}</td>
                                          <td>
                                            {record.suction && (
                                              <span className={`suction-badge ${record.suction.toLowerCase()}`}>
                                                {record.suction === 'ADECUADA' ? '☑ Adecuada' : '☐ Débil'}
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            {record.activity && (
                                              <span className={`activity-badge ${record.activity.toLowerCase()}`}>
                                                {record.activity === 'ACTIVO' ? '☑ Activo' : '☐ Letárgico'}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {neo.records.length > 5 && (
                                    <div className="records-overflow">+{neo.records.length - 5} registros más</div>
                                  )}
                                </div>
                              ) : (
                                <div className="no-records">
                                  Sin registros de monitoreo
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Costs Tab */}
                {activeTab === 'costs' && (
                  <div className="costs-tab">
                    <div className="costs-total">
                      <span className="costs-total-label">{t('hospitalizacion.totalCosts', 'Costo Total Acumulado')}</span>
                      <span className="costs-total-amount">{formatCurrency(costs?.total)}</span>
                    </div>
                    <div className="section-card">
                      <h3 className="section-title">📊 {t('hospitalizacion.costBreakdown', 'Desglose de Costos')}</h3>
                      
                      {/* Hospitalization Cost */}
                      <div className="cost-item">
                        <div>
                          <span className="cost-item-label">{t('hospitalizacion.dailyRate', 'Estancia Diaria')}</span>
                          <div className="cost-item-details">
                            {costs?.days || getDaysHospitalized(selectedHospitalization.fechaIngreso)} días × {formatCurrency(costs?.dailyRate)} ({costs?.hospitalizationType || selectedHospitalization.type || 'GENERAL'})
                          </div>
                        </div>
                        <span className="cost-item-amount">{formatCurrency(costs?.hospitalizationCost)}</span>
                      </div>
                      
                      {/* Medications Cost */}
                      <div className="cost-item">
                        <div>
                          <span className="cost-item-label">{t('hospitalizacion.medications', 'Medicamentos')}</span>
                          {costs?.medicationCount > 0 && (
                            <div className="cost-item-details">{costs?.medicationCount} administraciones</div>
                          )}
                        </div>
                        <span className="cost-item-amount">{formatCurrency(costs?.medicationCost)}</span>
                      </div>
                      
                      {/* Lab/Studies Cost */}
                      <div className="cost-item">
                        <div>
                          <span className="cost-item-label">{t('hospitalizacion.labwork', 'Estudios de Laboratorio')}</span>
                          {costs?.labCount > 0 && (
                            <div className="cost-item-details">{costs?.labCount} estudios solicitados</div>
                          )}
                        </div>
                        <span className="cost-item-amount">{formatCurrency(costs?.labCost)}</span>
                      </div>
                      
                      {/* Studies Breakdown */}
                      {costs?.breakdown?.studies?.length > 0 && (
                        <div className="cost-breakdown-detail">
                          <h4>Detalle de Estudios:</h4>
                          <ul>
                            {costs.breakdown.studies.map((study, idx) => (
                              <li key={idx}>
                                {study.name}: {formatCurrency(study.price)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Other Costs */}
                      {(costs?.otherCosts > 0) && (
                        <div className="cost-item">
                          <div>
                            <span className="cost-item-label">{t('hospitalizacion.other', 'Otros')}</span>
                          </div>
                          <span className="cost-item-amount">{formatCurrency(costs?.otherCosts)}</span>
                        </div>
                      )}
                    </div>
                    <div className="important-note">
                      ⚠️ {t('hospitalizacion.billingNote', 'Recepción cobra TODO al final de la hospitalización. No se realizan cobros parciales.')}
                    </div>
                    <div className="important-note" style={{ marginTop: '0.5rem', background: '#e8f5e9' }}>
                      💡 Las tarifas se configuran en el panel de Administración (BusinessInfo).
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal-content vitals-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>❤️ {t('hospitalizacion.recordVitals', 'Registrar Signos Vitales')}</h2>
              <button className="modal-close" onClick={() => setShowVitalsModal(false)}>×</button>
            </div>
            <form onSubmit={handleVitalsSubmit} className="vitals-form">
              {/* Sección: Signos Vitales Básicos */}
              <div className="vitals-section">
                <h3 className="section-title">📊 Signos Vitales Básicos</h3>
                <div className="vitals-grid four-cols">
                  <div className="vitals-input-group">
                    <label>FC (bpm)</label>
                    <input 
                      type="number" 
                      name="frecuenciaCardiaca"
                      value={vitalsForm.frecuenciaCardiaca}
                      onChange={handleVitalsChange}
                      placeholder="60-200"
                      className="vitals-input"
                    />
                    <span className="input-hint">Frecuencia Cardíaca</span>
                  </div>
                  <div className="vitals-input-group">
                    <label>FR (rpm)</label>
                    <input 
                      type="number" 
                      name="frecuenciaRespiratoria"
                      value={vitalsForm.frecuenciaRespiratoria}
                      onChange={handleVitalsChange}
                      placeholder="10-40"
                      className="vitals-input"
                    />
                    <span className="input-hint">Frecuencia Respiratoria</span>
                  </div>
                  <div className="vitals-input-group">
                    <label>T° (°C)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      name="temperatura"
                      value={vitalsForm.temperatura}
                      onChange={handleVitalsChange}
                      placeholder="38.0-39.5"
                      className="vitals-input"
                    />
                    <span className="input-hint">Temperatura</span>
                  </div>
                  <div className="vitals-input-group">
                    <label>Peso (kg)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      name="peso"
                      value={vitalsForm.peso}
                      onChange={handleVitalsChange}
                      className="vitals-input"
                    />
                    <span className="input-hint">Peso actual</span>
                  </div>
                </div>
              </div>

              {/* Sección: Perfusión y Mucosas */}
              <div className="vitals-section">
                <h3 className="section-title">💧 Perfusión y Estado</h3>
                <div className="vitals-grid three-cols">
                  <div className="vitals-input-group">
                    <label>TRC (seg)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      name="trc"
                      value={vitalsForm.trc}
                      onChange={handleVitalsChange}
                      placeholder="<2"
                      className="vitals-input"
                    />
                    <span className="input-hint">Tiempo Relleno Capilar</span>
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

              {/* Sección: Estado Neurológico */}
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
                      <input 
                        type="range" 
                        min="0" 
                        max="10"
                        name="nivelDolor"
                        value={vitalsForm.nivelDolor}
                        onChange={handleVitalsChange}
                        className="pain-slider"
                      />
                      <span className="pain-label">😣</span>
                    </div>
                    <div className="pain-scale">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                        <span key={n} className={vitalsForm.nivelDolor >= n ? 'active' : ''}>{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Laboratorio */}
              <div className="vitals-section">
                <h3 className="section-title">🔬 Valores de Laboratorio</h3>
                <div className="vitals-grid two-cols">
                  <div className="vitals-input-group">
                    <label>Glucosa (mg/dL)</label>
                    <input 
                      type="number" 
                      name="glucosa"
                      value={vitalsForm.glucosa}
                      onChange={handleVitalsChange}
                      placeholder="70-120"
                      className="vitals-input"
                    />
                    <span className="input-hint">Normal: 70-120 mg/dL</span>
                  </div>
                  <div className="vitals-input-group">
                    <label>Otros valores</label>
                    <input 
                      type="text" 
                      name="otrosValores"
                      placeholder="Ej: Lactato 2.5, Hcto 35%"
                      className="vitals-input"
                    />
                    <span className="input-hint">Valores adicionales</span>
                  </div>
                </div>
              </div>

              {/* Sección: Observaciones */}
              <div className="vitals-section">
                <h3 className="section-title">📝 Observaciones</h3>
                <textarea 
                  name="observaciones"
                  value={vitalsForm.observaciones}
                  onChange={handleVitalsChange}
                  rows={3}
                  placeholder="Notas adicionales sobre el estado del paciente, cambios observados, respuesta al tratamiento..."
                  className="vitals-textarea"
                />
              </div>

              <div className="vitals-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowVitalsModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? '⏳ Guardando...' : '💾 Guardar Signos Vitales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Therapy Modal */}
      {showTherapyModal && (
        <div className="modal-overlay" onClick={() => setShowTherapyModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💊 {t('hospitalizacion.addMedication', 'Agregar Medicamento al Plan')}</h2>
              <button className="modal-close" onClick={() => setShowTherapyModal(false)}>×</button>
            </div>
            <form onSubmit={handleTherapySubmit}>
              {/* Medication Search Section */}
              <div className="medication-search-section">
                <label>{t('hospitalizacion.searchMedication', 'Buscar medicamento en inventario')}</label>
                <div className="medication-search-container" ref={medicationSearchRef}>
                  <div className="search-input-wrapper">
                    <input 
                      type="text" 
                      className="form-control search-medication-input" 
                      placeholder={t('hospitalizacion.searchMedicationPlaceholder', 'Escriba para buscar medicamentos...')} 
                      value={therapyForm.medicationId ? therapyForm.medicationName : medicationSearch}
                      onChange={(e) => {
                        if (therapyForm.medicationId) {
                          // Clear selected medication and start new search
                          setTherapyForm(prev => ({
                            ...prev,
                            medicationId: '',
                            medicationName: '',
                            presentacion: '',
                            concentracion: '',
                            stockDisponible: 0
                          }));
                        }
                        setMedicationSearch(e.target.value);
                      }}
                    />
                    {searchingMedications && <span className="search-spinner">⏳</span>}
                    {therapyForm.medicationId && (
                      <button 
                        type="button"
                        className="clear-selection-btn" 
                        onClick={() => {
                          setTherapyForm(prev => ({
                            ...prev,
                            medicationId: '',
                            medicationName: '',
                            presentacion: '',
                            concentracion: '',
                            stockDisponible: 0
                          }));
                          setMedicationSearch('');
                        }}
                      >✕</button>
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showMedicationDropdown && medicationResults.length > 0 && (
                    <div className="medication-search-dropdown">
                      {medicationResults.map(med => {
                        const stock = med.currentStock ?? med.stockActual ?? 0;
                        return (
                          <div 
                            key={med.id} 
                            className={`medication-search-item ${stock === 0 ? 'out-of-stock' : ''}`}
                            onClick={() => stock > 0 && handleSelectMedication(med)}
                          >
                            <div className="med-search-info">
                              <strong>{med.name || med.nombre}</strong>
                              <span className="med-details">
                                {med.presentation || med.presentacion} {(med.concentration || med.concentracion) && `- ${med.concentration || med.concentracion}`}
                              </span>
                            </div>
                            <div className="med-stock-badge">
                              <span className={`stock-indicator ${stock > 10 ? 'high' : stock > 0 ? 'low' : 'empty'}`}>
                                {stock > 0 ? `${stock} disponibles` : 'Sin stock'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {showMedicationDropdown && medicationResults.length === 0 && medicationSearch.length >= 2 && !searchingMedications && (
                    <div className="medication-search-dropdown">
                      <div className="no-results">{t('hospitalizacion.noMedicationsFound', 'No se encontraron medicamentos')}</div>
                    </div>
                  )}
                </div>
                
                {/* Selected Medication Info */}
                {therapyForm.medicationId && (
                  <div className="selected-medication-info">
                    <div className="med-selected-badge">✓ {t('hospitalizacion.medicationSelected', 'Seleccionado')}</div>
                    <div className="med-selected-details">
                      <strong>{therapyForm.medicationName}</strong>
                      {therapyForm.presentacion && <span> • {therapyForm.presentacion}</span>}
                      {therapyForm.concentracion && <span> • {therapyForm.concentracion}</span>}
                      <span className="stock-available"> • Stock: {therapyForm.stockDisponible}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>{t('hospitalizacion.dose', 'Dosis')} *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="dosis"
                    value={therapyForm.dosis}
                    onChange={handleTherapyChange}
                    required
                    placeholder="Ej: 5"
                  />
                </div>
                <div className="form-group">
                  <label>{t('hospitalizacion.unit', 'Unidad')}</label>
                  <select name="unidadDosis" value={therapyForm.unidadDosis} onChange={handleTherapyChange}>
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="UI">UI</option>
                    <option value="gotas">gotas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('hospitalizacion.frequencyHours', 'Frecuencia')}</label>
                  <select name="frecuenciaHoras" value={therapyForm.frecuenciaHoras} onChange={handleTherapyChange}>
                    <option value={4}>Cada 4 horas</option>
                    <option value={6}>Cada 6 horas</option>
                    <option value={8}>Cada 8 horas</option>
                    <option value={12}>Cada 12 horas</option>
                    <option value={24}>Cada 24 horas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('hospitalizacion.route', 'Vía')}</label>
                  <select name="via" value={therapyForm.via} onChange={handleTherapyChange}>
                    <option value="IV">Intravenosa (IV)</option>
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutánea (SC)</option>
                    <option value="PO">Oral (PO)</option>
                    <option value="TOPICA">Tópica</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>{t('hospitalizacion.notes', 'Notas')}</label>
                  <textarea 
                    name="notas"
                    value={therapyForm.notas}
                    onChange={handleTherapyChange}
                    rows={2}
                    placeholder="Instrucciones adicionales..."
                  />
                </div>
              </div>
              
              <div className="pharmacy-note">
                ⚠️ {t('hospitalizacion.pharmacyFlowNote', 'Al agregar, el medicamento se solicitará a Farmacia. Farmacia entrega SOLO al personal de hospitalización.')}
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowTherapyModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading || !therapyForm.medicationId}>
                  {loading ? '⏳ Guardando...' : '💊 Agregar al Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Neonate Modal - Registro de Neonato */}
      {showNeonateModal && (
        <div className="modal-overlay" onClick={() => setShowNeonateModal(false)}>
          <div className="modal-content modal-neonate" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🍼 Registrar Neonato</h2>
              <button className="modal-close" onClick={() => setShowNeonateModal(false)}>×</button>
            </div>
            <form onSubmit={handleNeonateSubmit}>
              <div className="neonate-form-grid">
                {/* Fila superior: Número y Sexo */}
                <div className="neonate-row-top">
                  <div className="neonate-field neonate-number-field">
                    <label>Neonato No. *</label>
                    <input 
                      type="number" 
                      name="number"
                      value={neonateForm.number}
                      onChange={handleNeonateChange}
                      required
                      min="1"
                    />
                  </div>
                  <div className="neonate-field neonate-sex-field">
                    <label>Sexo</label>
                    <div className="radio-inline-group">
                      <label className={`radio-box ${neonateForm.sex === 'MACHO' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="sex" 
                          value="MACHO"
                          checked={neonateForm.sex === 'MACHO'}
                          onChange={handleNeonateChange}
                        />
                        <span>♂ Macho</span>
                      </label>
                      <label className={`radio-box ${neonateForm.sex === 'HEMBRA' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="sex" 
                          value="HEMBRA"
                          checked={neonateForm.sex === 'HEMBRA'}
                          onChange={handleNeonateChange}
                        />
                        <span>♀ Hembra</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Sección de Identificación */}
                <div className="neonate-identification-section">
                  <label>Identificación</label>
                  <div className="id-type-row">
                    {['COLLAR', 'MARCA', 'COLOR', 'OTRO'].map(type => (
                      <label key={type} className={`id-type-box ${neonateForm.identificationType === type ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="identificationType" 
                          value={type}
                          checked={neonateForm.identificationType === type}
                          onChange={handleNeonateChange}
                        />
                        <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    name="identification"
                    value={neonateForm.identification}
                    onChange={handleNeonateChange}
                    placeholder="Descripción: Collar rojo, mancha blanca en frente, etc."
                    className="id-description-input"
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNeonateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? '⏳ Guardando...' : '✓ Registrar Neonato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Neonate Record Modal - Registro de Monitoreo Periódico */}
      {showNeonateRecordModal && selectedNeonate && (
        <div className="modal-overlay" onClick={() => setShowNeonateRecordModal(false)}>
          <div className="modal-content modal-neonate-record" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Monitoreo - Neonato #{selectedNeonate.number || '?'} 
                {selectedNeonate.sex && <span className="sex-indicator">{selectedNeonate.sex === 'MACHO' ? '♂' : '♀'}</span>}
              </h2>
              <button className="modal-close" onClick={() => setShowNeonateRecordModal(false)}>×</button>
            </div>
            <form onSubmit={handleNeonateRecordSubmit}>
              <div className="monitoring-grid">
                <div className="monitoring-vitals-row">
                  <div className="monitoring-field">
                    <label>Peso (g)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      name="weight"
                      value={neonateRecordForm.weight}
                      onChange={handleNeonateRecordChange}
                      placeholder="350"
                    />
                  </div>
                  <div className="monitoring-field">
                    <label>Temp. (°C)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      name="temperature"
                      value={neonateRecordForm.temperature}
                      onChange={handleNeonateRecordChange}
                      placeholder="38.5"
                    />
                  </div>
                  <div className="monitoring-field">
                    <label>FC (lpm)</label>
                    <input 
                      type="number" 
                      name="heartRate"
                      value={neonateRecordForm.heartRate}
                      onChange={handleNeonateRecordChange}
                      placeholder="180"
                    />
                  </div>
                  <div className="monitoring-field">
                    <label>FR (rpm)</label>
                    <input 
                      type="number" 
                      name="respiratoryRate"
                      value={neonateRecordForm.respiratoryRate}
                      onChange={handleNeonateRecordChange}
                      placeholder="30"
                    />
                  </div>
                </div>
                
                <div className="monitoring-status-row">
                  <div className="monitoring-status-field">
                    <label>Succión</label>
                    <div className="status-toggle-group">
                      <label className={`status-toggle ${neonateRecordForm.suction === 'ADECUADA' ? 'selected good' : ''}`}>
                        <input 
                          type="radio" 
                          name="suction" 
                          value="ADECUADA"
                          checked={neonateRecordForm.suction === 'ADECUADA'}
                          onChange={handleNeonateRecordChange}
                        />
                        <span>✓ Adecuada</span>
                      </label>
                      <label className={`status-toggle ${neonateRecordForm.suction === 'DEBIL' ? 'selected warning' : ''}`}>
                        <input 
                          type="radio" 
                          name="suction" 
                          value="DEBIL"
                          checked={neonateRecordForm.suction === 'DEBIL'}
                          onChange={handleNeonateRecordChange}
                        />
                        <span>⚠ Débil</span>
                      </label>
                    </div>
                  </div>
                  <div className="monitoring-status-field">
                    <label>Actividad</label>
                    <div className="status-toggle-group">
                      <label className={`status-toggle ${neonateRecordForm.activity === 'ACTIVO' ? 'selected good' : ''}`}>
                        <input 
                          type="radio" 
                          name="activity" 
                          value="ACTIVO"
                          checked={neonateRecordForm.activity === 'ACTIVO'}
                          onChange={handleNeonateRecordChange}
                        />
                        <span>✓ Activo</span>
                      </label>
                      <label className={`status-toggle ${neonateRecordForm.activity === 'LETARGICO' ? 'selected warning' : ''}`}>
                        <input 
                          type="radio" 
                          name="activity" 
                          value="LETARGICO"
                          checked={neonateRecordForm.activity === 'LETARGICO'}
                          onChange={handleNeonateRecordChange}
                        />
                        <span>⚠ Letárgico</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="monitoring-notes-field">
                  <label>Notas</label>
                  <textarea 
                    name="notes"
                    value={neonateRecordForm.notes}
                    onChange={handleNeonateRecordChange}
                    rows={2}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowNeonateRecordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? '⏳ Guardando...' : '✓ Registrar Monitoreo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 {t('hospitalizacion.dischargePatient', 'Dar de Alta')}</h2>
              <button className="modal-close" onClick={() => setShowDischargeModal(false)}>×</button>
            </div>
            <form onSubmit={handleDischargeSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>{t('hospitalizacion.dischargeType', 'Tipo de Alta')}</label>
                  <select name="type" value={dischargeForm.type} onChange={handleDischargeChange}>
                    <option value="ALTA_MEDICA">Alta Médica</option>
                    <option value="ALTA_VOLUNTARIA">Alta Voluntaria (contra indicación médica)</option>
                    <option value="TRANSFERIDO">Transferido a otra institución</option>
                    <option value="FALLECIDO">Fallecido</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>{t('hospitalizacion.dischargeNotes', 'Notas de Alta')}</label>
                  <textarea 
                    name="notes"
                    value={dischargeForm.notes}
                    onChange={handleDischargeChange}
                    rows={4}
                    placeholder="Indicaciones post-hospitalización, medicamentos a continuar en casa, citas de seguimiento..."
                  />
                </div>
              </div>
              <div className="important-note">
                ⚠️ {t('hospitalizacion.dischargeWarning', 'Al dar de alta, se notificará a Recepción para el cobro final de la hospitalización.')}
              </div>
              <button type="submit" className="btn-submit btn-danger" disabled={loading}>
                {loading ? t('common.processing', 'Procesando...') : t('hospitalizacion.confirmDischarge', 'Confirmar Alta')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalizacionDashboard;
