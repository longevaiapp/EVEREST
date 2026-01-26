import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import './MedicoDashboard.css';

function MedicoDashboard() {
  const { t } = useTranslation();
  const { 
    currentUser, 
    systemState, 
    updatePatientState, 
    requestStudies, 
    prescribeMedication, 
    addToHistory,
    hospitalize,
    addMonitoring,
    registerConsultation
  } = useApp();

  // State Management
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [showHospitalizationModal, setShowHospitalizationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [consultationNotes, setConsultationNotes] = useState({
    subjetivo: '',
    objetivo: '',
    analisis: '',
    plan: ''
  });

  const [vitalsForm, setVitalsForm] = useState({
    temperatura: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    presionArterial: '',
    peso: '',
    nivelConciencia: 'Alerta',
    escalaDolor: '0'
  });

  const [diagnosisForm, setDiagnosisForm] = useState({
    codigo: '',
    descripcion: '',
    tipo: 'PRESUNTIVO',
    severidad: 'MODERADO',
    notas: ''
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    medicamentos: [],
    instrucciones: '',
    duracion: ''
  });

  const [currentMedication, setCurrentMedication] = useState({
    nombre: '',
    dosis: '',
    frecuencia: '',
    via: 'ORAL',
    duracion: ''
  });

  const [labOrderForm, setLabOrderForm] = useState({
    estudios: [],
    prioridad: 'NORMAL',
    indicaciones: ''
  });

  const [hospitalizationForm, setHospitalizationForm] = useState({
    motivo: '',
    frecuenciaMonitoreo: '4h',
    cuidadosEspeciales: '',
    estimacionDias: ''
  });

  // Derived state
  const todayAppointments = (systemState.citas || []).filter(cita => {
    const today = new Date().toISOString().split('T')[0];
    const citaDate = new Date(cita.fecha).toISOString().split('T')[0];
    return citaDate === today && !cita.cancelada;
  });

  const myTasks = systemState.tareasPendientes?.MEDICO || [];
  const waitingPatients = systemState.pacientes.filter(p => p.estado === 'EN_ESPERA' || p.estado === 'REGISTRADO');
  const myPatients = systemState.pacientes.filter(p => p.estado === 'EN_CONSULTA');
  const inStudies = systemState.pacientes.filter(p => p.estado === 'EN_ESTUDIOS');
  const hospitalized = systemState.pacientes.filter(p => p.estado === 'HOSPITALIZADO');

  const studiesOptions = [
    { id: 'hemograma', name: t('medico.studies.hemograma', 'Hemograma Completo') },
    { id: 'bioquimica', name: t('medico.studies.bioquimica', 'Bioquímica Sanguínea') },
    { id: 'urinalisis', name: t('medico.studies.urinalisis', 'Uroanálisis') },
    { id: 'coprologico', name: t('medico.studies.coprologico', 'Coproparasitoscópico') },
    { id: 'radiografia', name: t('medico.studies.radiografia', 'Radiografía') },
    { id: 'ecografia', name: t('medico.studies.ecografia', 'Ecografía') },
    { id: 'electrocardiograma', name: t('medico.studies.electrocardiograma', 'Electrocardiograma') }
  ];

  const commonMedications = [
    'Amoxicilina 500mg',
    'Carprofeno 75mg',
    'Metronidazol 250mg',
    'Prednisona 5mg',
    'Tramadol 50mg',
    'Meloxicam 7.5mg',
    'Omeprazol 20mg'
  ];

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setError(null);
  }, []);

  const handleStartConsultation = useCallback((patient) => {
    setLoading(true);
    try {
      updatePatientState(patient.id, 'EN_CONSULTA', currentUser?.nombre);
      setActiveConsultation({
        id: Date.now(),
        patientId: patient.id,
        startTime: new Date().toISOString(),
        status: 'IN_PROGRESS'
      });
      setSelectedPatient(patient);
      setConsultationNotes({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
      addToHistory(patient.id, {
        accion: t('medico.consultationStarted', 'Consulta iniciada'),
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(t('medico.errors.startConsultation', 'Error al iniciar consulta'));
    } finally {
      setLoading(false);
    }
  }, [updatePatientState, currentUser, addToHistory, t]);

  const handleEndConsultation = useCallback(() => {
    if (!selectedPatient || !activeConsultation) return;
    
    setLoading(true);
    try {
      if (registerConsultation) {
        registerConsultation(selectedPatient.id, {
          ...consultationNotes,
          medicoId: currentUser?.id,
          fecha: new Date().toISOString()
        });
      }
      
      updatePatientState(selectedPatient.id, 'LISTO_PARA_ALTA', currentUser?.nombre);
      
      addToHistory(selectedPatient.id, {
        accion: t('medico.consultationCompleted', 'Consulta completada'),
        detalles: consultationNotes,
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      setActiveConsultation(null);
      setSelectedPatient(null);
      setConsultationNotes({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
    } catch (err) {
      setError(t('medico.errors.endConsultation', 'Error al finalizar consulta'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, activeConsultation, consultationNotes, currentUser, registerConsultation, updatePatientState, addToHistory, t]);

  const handleSaveVitals = useCallback(() => {
    if (!selectedPatient) return;
    
    setLoading(true);
    try {
      addMonitoring(selectedPatient.id, {
        ...vitalsForm,
        registradoPor: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      addToHistory(selectedPatient.id, {
        accion: t('medico.vitalsRecorded', 'Signos vitales registrados'),
        detalles: vitalsForm,
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      setShowVitalsModal(false);
      setVitalsForm({
        temperatura: '',
        frecuenciaCardiaca: '',
        frecuenciaRespiratoria: '',
        presionArterial: '',
        peso: '',
        nivelConciencia: 'Alerta',
        escalaDolor: '0'
      });
    } catch (err) {
      setError(t('medico.errors.saveVitals', 'Error al guardar signos vitales'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, vitalsForm, currentUser, addMonitoring, addToHistory, t]);

  const handleAddDiagnosis = useCallback(() => {
    if (!selectedPatient || !diagnosisForm.descripcion) return;
    
    setLoading(true);
    try {
      addToHistory(selectedPatient.id, {
        accion: t('medico.diagnosisAdded', 'Diagnóstico agregado'),
        detalles: diagnosisForm,
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      setShowDiagnosisModal(false);
      setDiagnosisForm({
        codigo: '',
        descripcion: '',
        tipo: 'PRESUNTIVO',
        severidad: 'MODERADO',
        notas: ''
      });
    } catch (err) {
      setError(t('medico.errors.addDiagnosis', 'Error al agregar diagnóstico'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, diagnosisForm, currentUser, addToHistory, t]);

  const handleAddMedication = useCallback(() => {
    if (!currentMedication.nombre || !currentMedication.dosis) return;
    
    setPrescriptionForm(prev => ({
      ...prev,
      medicamentos: [...prev.medicamentos, { ...currentMedication, id: Date.now() }]
    }));
    
    setCurrentMedication({
      nombre: '',
      dosis: '',
      frecuencia: '',
      via: 'ORAL',
      duracion: ''
    });
  }, [currentMedication]);

  const handleRemoveMedication = useCallback((medicationId) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter(m => m.id !== medicationId)
    }));
  }, []);

  const handleCreatePrescription = useCallback(() => {
    if (!selectedPatient || prescriptionForm.medicamentos.length === 0) return;
    
    setLoading(true);
    try {
      const medications = prescriptionForm.medicamentos.map(m => 
        `${m.nombre} ${m.dosis} - ${m.frecuencia} (${m.via})`
      );
      
      prescribeMedication(selectedPatient.id, medications);
      
      addToHistory(selectedPatient.id, {
        accion: t('medico.prescriptionCreated', 'Receta creada'),
        detalles: prescriptionForm,
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicamentos: [], instrucciones: '', duracion: '' });
    } catch (err) {
      setError(t('medico.errors.createPrescription', 'Error al crear receta'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, prescriptionForm, currentUser, prescribeMedication, addToHistory, t]);

  const handleToggleStudy = useCallback((studyId) => {
    setLabOrderForm(prev => ({
      ...prev,
      estudios: prev.estudios.includes(studyId)
        ? prev.estudios.filter(s => s !== studyId)
        : [...prev.estudios, studyId]
    }));
  }, []);

  const handleCreateLabOrder = useCallback(() => {
    if (!selectedPatient || labOrderForm.estudios.length === 0) return;
    
    setLoading(true);
    try {
      const studyNames = labOrderForm.estudios.map(id => 
        studiesOptions.find(s => s.id === id)?.name || id
      );
      
      requestStudies(selectedPatient.id, studyNames);
      
      addToHistory(selectedPatient.id, {
        accion: t('medico.labOrderCreated', 'Orden de laboratorio creada'),
        detalles: { estudios: studyNames, ...labOrderForm },
        usuario: currentUser?.nombre,
        timestamp: new Date().toISOString()
      });
      
      setShowLabOrderModal(false);
      setLabOrderForm({ estudios: [], prioridad: 'NORMAL', indicaciones: '' });
    } catch (err) {
      setError(t('medico.errors.createLabOrder', 'Error al crear orden de laboratorio'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, labOrderForm, studiesOptions, currentUser, requestStudies, addToHistory, t]);

  const handleCreateHospitalization = useCallback(() => {
    if (!selectedPatient || !hospitalizationForm.motivo) return;
    
    setLoading(true);
    try {
      hospitalize(selectedPatient.id, hospitalizationForm);
      
      setShowHospitalizationModal(false);
      setHospitalizationForm({
        motivo: '',
        frecuenciaMonitoreo: '4h',
        cuidadosEspeciales: '',
        estimacionDias: ''
      });
      setActiveConsultation(null);
      setSelectedPatient(null);
    } catch (err) {
      setError(t('medico.errors.hospitalize', 'Error al hospitalizar paciente'));
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, hospitalizationForm, hospitalize, t]);

  const getPatientHistory = useCallback((patientId) => {
    return systemState.historiales?.[patientId] || [];
  }, [systemState.historiales]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDIENTE': return 'warning';
      case 'CONFIRMADA': return 'success';
      case 'EN_CONSULTA': return '';
      case 'EN_ESPERA': return 'warning';
      case 'EN_ESTUDIOS': return 'warning';
      case 'HOSPITALIZADO': return 'urgent';
      case 'COMPLETADA': return 'success';
      default: return '';
    }
  };

  const getAppointmentStatusLabel = (status) => {
    const labels = {
      'PENDIENTE': t('medico.status.pending', 'Pendiente'),
      'CONFIRMADA': t('medico.status.confirmed', 'Confirmada'),
      'EN_CONSULTA': t('medico.status.inConsultation', 'En Consulta'),
      'COMPLETADA': t('medico.status.completed', 'Completada'),
      'NO_ASISTIO': t('medico.status.noShow', 'No Asistió'),
      'CANCELADA': t('medico.status.cancelled', 'Cancelada')
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="dashboard medico-dashboard">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('common.loading', 'Cargando...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard medico-dashboard three-panel-layout">
      {error && (
        <div className="error-notification">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* LEFT PANEL - Today's Appointments */}
      <aside className="left-panel">
        <div className="panel-header">
          <h3>📅 {t('medico.todayAppointments', 'Citas de Hoy')}</h3>
          <span className="badge-count">{todayAppointments.length + waitingPatients.length + myPatients.length}</span>
        </div>

        <div className="appointments-list">
          {waitingPatients.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">⏳</span>
                {t('medico.waitingPatients', 'En Espera')}
                <span className="count">{waitingPatients.length}</span>
              </h4>
              {waitingPatients.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card waiting ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="appointment-time">{patient.horaRegistro || '--:--'}</div>
                  <div className="appointment-info">
                    <div className="patient-name">
                      <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      {patient.nombre}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                    <div className="appointment-reason">{patient.motivo}</div>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(patient.estado)}`}>{patient.estado}</span>
                </div>
              ))}
            </div>
          )}

          {myPatients.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">🏥</span>
                {t('medico.inConsultation', 'En Consulta')}
                <span className="count">{myPatients.length}</span>
              </h4>
              {myPatients.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card in-progress ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="appointment-time">{patient.horaConsulta || '--:--'}</div>
                  <div className="appointment-info">
                    <div className="patient-name">
                      <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      {patient.nombre}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                    <div className="appointment-reason">{patient.motivo}</div>
                  </div>
                  <span className="status-badge active">{t('medico.active', 'Activo')}</span>
                </div>
              ))}
            </div>
          )}

          {todayAppointments.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">📋</span>
                {t('medico.scheduledAppointments', 'Programadas')}
                <span className="count">{todayAppointments.length}</span>
              </h4>
              {todayAppointments.map(cita => {
                const patient = systemState.pacientes.find(p => p.id === cita.pacienteId);
                return (
                  <div 
                    key={cita.id}
                    className={`appointment-card scheduled ${selectedPatient?.id === patient?.id ? 'selected' : ''}`}
                    onClick={() => patient && handleSelectPatient(patient)}
                  >
                    <div className="appointment-time">{cita.hora}</div>
                    <div className="appointment-info">
                      <div className="patient-name">
                        <span className="pet-icon">{patient?.especie === 'Perro' ? '🐕' : '🐈'}</span>
                        {patient?.nombre || 'Paciente'}
                      </div>
                      <div className="patient-details-small">{cita.tipo} • {patient?.propietario}</div>
                      <div className="appointment-reason">{cita.motivo}</div>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(cita.estado || 'PENDIENTE')}`}>
                      {getAppointmentStatusLabel(cita.estado || 'PENDIENTE')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {inStudies.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">🔬</span>
                {t('medico.inStudies', 'En Estudios')}
                <span className="count">{inStudies.length}</span>
              </h4>
              {inStudies.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card studies ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="appointment-info">
                    <div className="patient-name">
                      <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      {patient.nombre}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                  </div>
                  <span className="status-badge warning">🔬 {t('medico.pendingResults', 'Pendiente')}</span>
                </div>
              ))}
            </div>
          )}

          {waitingPatients.length === 0 && myPatients.length === 0 && todayAppointments.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>{t('medico.noAppointments', 'No hay citas para hoy')}</p>
            </div>
          )}
        </div>
      </aside>

      {/* CENTER PANEL - Active Consultation Workspace */}
      <main className="center-panel">
        <div className="panel-header">
          <h2>
            {activeConsultation 
              ? `🏥 ${t('medico.activeConsultation', 'Consulta Activa')}`
              : `👨‍⚕️ ${t('medico.consultationWorkspace', 'Área de Consulta')}`
            }
          </h2>
          <p>{t('medico.doctor', 'Dr.')} {currentUser?.nombre} - {currentUser?.especialidad || t('medico.generalPractice', 'Medicina General')}</p>
        </div>

        {!selectedPatient && !activeConsultation && (
          <div className="consultation-empty">
            <div className="empty-consultation-content">
              <span className="empty-icon-large">👨‍⚕️</span>
              <h3>{t('medico.selectPatient', 'Selecciona un paciente')}</h3>
              <p>{t('medico.selectPatientDesc', 'Selecciona un paciente del panel izquierdo para iniciar una consulta')}</p>
            </div>
            
            <div className="consultation-stats">
              <div className="stat-item">
                <span className="stat-value">{waitingPatients.length}</span>
                <span className="stat-label">{t('medico.waiting', 'En Espera')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{myPatients.length}</span>
                <span className="stat-label">{t('medico.inProgress', 'En Progreso')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{hospitalized.length}</span>
                <span className="stat-label">{t('medico.hospitalized', 'Hospitalizados')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{myTasks.length}</span>
                <span className="stat-label">{t('medico.pendingTasks', 'Tareas')}</span>
              </div>
            </div>
          </div>
        )}

        {selectedPatient && !activeConsultation && (
          <div className="consultation-preview">
            <div className="preview-header">
              <div className="patient-avatar-large">{selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}</div>
              <div className="patient-main-info">
                <h3>{selectedPatient.nombre}</h3>
                <p>{selectedPatient.raza} • {selectedPatient.edad} • {selectedPatient.sexo}</p>
                <span className="ficha-badge">{selectedPatient.numeroFicha}</span>
              </div>
            </div>
            
            <div className="preview-details">
              <div className="detail-row">
                <strong>{t('medico.owner', 'Propietario')}:</strong> 
                <span>{selectedPatient.propietario}</span>
              </div>
              <div className="detail-row">
                <strong>{t('medico.reason', 'Motivo')}:</strong> 
                <span>{selectedPatient.motivo}</span>
              </div>
              <div className="detail-row">
                <strong>{t('medico.weight', 'Peso')}:</strong> 
                <span>{selectedPatient.peso}</span>
              </div>
              <div className="detail-row">
                <strong>{t('medico.status', 'Estado')}:</strong> 
                <span className={`status-badge ${getStatusBadgeClass(selectedPatient.estado)}`}>{selectedPatient.estado}</span>
              </div>
            </div>

            <div className="preview-actions">
              <button className="btn-start-consultation" onClick={() => handleStartConsultation(selectedPatient)}>
                🏥 {t('medico.startConsultation', 'Iniciar Consulta')}
              </button>
              <button className="btn-view-history" onClick={() => setShowHistoryModal(true)}>
                📋 {t('medico.viewHistory', 'Ver Historial')}
              </button>
            </div>
          </div>
        )}

        {selectedPatient && activeConsultation && (
          <div className="consultation-active">
            <div className="consultation-header">
              <div className="patient-summary">
                <span className="pet-avatar">{selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                <div>
                  <h3>{selectedPatient.nombre}</h3>
                  <p>{selectedPatient.raza} • {selectedPatient.propietario}</p>
                </div>
              </div>
              <div className="consultation-timer">
                <span className="timer-label">{t('medico.consultationTime', 'Tiempo')}</span>
                <span className="timer-value">{new Date(activeConsultation.startTime).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="soap-notes">
              <div className="soap-section">
                <label><span className="soap-letter">S</span>{t('medico.subjective', 'Subjetivo')}</label>
                <textarea
                  placeholder={t('medico.subjectivePlaceholder', 'Historia clínica, síntomas reportados por el dueño...')}
                  value={consultationNotes.subjetivo}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, subjetivo: e.target.value }))}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <label><span className="soap-letter">O</span>{t('medico.objective', 'Objetivo')}</label>
                <textarea
                  placeholder={t('medico.objectivePlaceholder', 'Hallazgos del examen físico, signos vitales...')}
                  value={consultationNotes.objetivo}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, objetivo: e.target.value }))}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <label><span className="soap-letter">A</span>{t('medico.assessment', 'Análisis')}</label>
                <textarea
                  placeholder={t('medico.assessmentPlaceholder', 'Diagnóstico diferencial, interpretación...')}
                  value={consultationNotes.analisis}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, analisis: e.target.value }))}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <label><span className="soap-letter">P</span>{t('medico.plan', 'Plan')}</label>
                <textarea
                  placeholder={t('medico.planPlaceholder', 'Plan de tratamiento, seguimiento...')}
                  value={consultationNotes.plan}
                  onChange={(e) => setConsultationNotes(prev => ({ ...prev, plan: e.target.value }))}
                  rows="3"
                />
              </div>
            </div>

            <div className="quick-actions">
              <button className="action-btn vitals" onClick={() => setShowVitalsModal(true)}>
                🌡️ {t('medico.recordVitals', 'Signos Vitales')}
              </button>
              <button className="action-btn diagnosis" onClick={() => setShowDiagnosisModal(true)}>
                🔍 {t('medico.addDiagnosis', 'Diagnóstico')}
              </button>
              <button className="action-btn prescription" onClick={() => setShowPrescriptionModal(true)}>
                💊 {t('medico.createPrescription', 'Receta')}
              </button>
              <button className="action-btn lab" onClick={() => setShowLabOrderModal(true)}>
                🔬 {t('medico.orderLabs', 'Laboratorio')}
              </button>
              <button className="action-btn hospital" onClick={() => setShowHospitalizationModal(true)}>
                🏥 {t('medico.hospitalize', 'Hospitalizar')}
              </button>
            </div>

            <div className="consultation-footer">
              <button className="btn-secondary" onClick={() => { setActiveConsultation(null); setSelectedPatient(null); }}>
                {t('common.cancel', 'Cancelar')}
              </button>
              <button className="btn-end-consultation" onClick={handleEndConsultation}>
                ✅ {t('medico.endConsultation', 'Finalizar Consulta')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL - Patient Information */}
      <aside className="right-panel">
        <div className="panel-header">
          <h3>📋 {t('medico.patientInfo', 'Información del Paciente')}</h3>
        </div>

        {!selectedPatient ? (
          <div className="patient-info-empty">
            <span className="empty-icon">🐾</span>
            <p>{t('medico.noPatientSelected', 'Selecciona un paciente para ver su información')}</p>
          </div>
        ) : (
          <div className="patient-info-content">
            <div className="info-card">
              <h4>{t('medico.patientDetails', 'Datos del Paciente')}</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('medico.species', 'Especie')}</span>
                  <span className="info-value">{selectedPatient.especie}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.breed', 'Raza')}</span>
                  <span className="info-value">{selectedPatient.raza}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.age', 'Edad')}</span>
                  <span className="info-value">{selectedPatient.edad}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.sex', 'Sexo')}</span>
                  <span className="info-value">{selectedPatient.sexo}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.weight', 'Peso')}</span>
                  <span className="info-value">{selectedPatient.peso}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.fileNumber', 'Ficha')}</span>
                  <span className="info-value ficha">{selectedPatient.numeroFicha}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.ownerDetails', 'Datos del Propietario')}</h4>
              <div className="owner-info">
                <p className="owner-name">{selectedPatient.propietario}</p>
                <a href={`tel:${selectedPatient.telefono}`} className="owner-phone">📞 {selectedPatient.telefono}</a>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.currentVisit', 'Visita Actual')}</h4>
              <div className="visit-info">
                <div className="visit-item">
                  <span className="visit-label">{t('medico.reason', 'Motivo')}</span>
                  <span className="visit-value">{selectedPatient.motivo || '-'}</span>
                </div>
                <div className="visit-item">
                  <span className="visit-label">{t('medico.priority', 'Prioridad')}</span>
                  <span className={`priority-badge ${selectedPatient.prioridad?.toLowerCase() || 'normal'}`}>
                    {selectedPatient.prioridad || 'Normal'}
                  </span>
                </div>
                {selectedPatient.antecedentes && (
                  <div className="visit-item full">
                    <span className="visit-label">{t('medico.history', 'Antecedentes')}</span>
                    <span className="visit-value">{selectedPatient.antecedentes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card actions">
              <h4>{t('medico.quickActions', 'Acciones Rápidas')}</h4>
              <div className="quick-action-buttons">
                <button className="quick-action-btn" onClick={() => setShowHistoryModal(true)}>
                  📋 {t('medico.viewFullHistory', 'Ver Historial Completo')}
                </button>
                {selectedPatient.estado === 'HOSPITALIZADO' && (
                  <button className="quick-action-btn" onClick={() => setShowVitalsModal(true)}>
                    📝 {t('medico.recordMonitoring', 'Registrar Monitoreo')}
                  </button>
                )}
                {!activeConsultation && selectedPatient.estado !== 'HOSPITALIZADO' && (
                  <button className="quick-action-btn primary" onClick={() => handleStartConsultation(selectedPatient)}>
                    🏥 {t('medico.startConsultation', 'Iniciar Consulta')}
                  </button>
                )}
              </div>
            </div>

            <div className="info-card history">
              <h4>{t('medico.recentHistory', 'Historial Reciente')}</h4>
              <div className="history-timeline-small">
                {getPatientHistory(selectedPatient.id).slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="history-item-small">
                    <span className="history-time">{new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span className="history-action">{entry.accion}</span>
                  </div>
                ))}
                {getPatientHistory(selectedPatient.id).length === 0 && (
                  <p className="no-history">{t('medico.noRecentHistory', 'Sin historial reciente')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🌡️ {t('medico.recordVitalSigns', 'Registrar Signos Vitales')}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>🌡️ {t('medico.temperature', 'Temperatura')} (°C)</label>
                <input type="number" step="0.1" className="form-control" placeholder="38.5" value={vitalsForm.temperatura} onChange={(e) => setVitalsForm(prev => ({ ...prev, temperatura: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>❤️ {t('medico.heartRate', 'Frecuencia Cardíaca')} (lpm)</label>
                <input type="number" className="form-control" placeholder="80" value={vitalsForm.frecuenciaCardiaca} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaCardiaca: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🫁 {t('medico.respiratoryRate', 'Frecuencia Respiratoria')} (rpm)</label>
                <input type="number" className="form-control" placeholder="20" value={vitalsForm.frecuenciaRespiratoria} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaRespiratoria: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🩺 {t('medico.bloodPressure', 'Presión Arterial')} (mmHg)</label>
                <input type="text" className="form-control" placeholder="120/80" value={vitalsForm.presionArterial} onChange={(e) => setVitalsForm(prev => ({ ...prev, presionArterial: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>⚖️ {t('medico.weight', 'Peso')} (kg)</label>
                <input type="number" step="0.1" className="form-control" placeholder="15.5" value={vitalsForm.peso} onChange={(e) => setVitalsForm(prev => ({ ...prev, peso: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🧠 {t('medico.consciousnessLevel', 'Nivel de Conciencia')}</label>
                <select className="form-control" value={vitalsForm.nivelConciencia} onChange={(e) => setVitalsForm(prev => ({ ...prev, nivelConciencia: e.target.value }))}>
                  <option value="Alerta">Alerta</option>
                  <option value="Somnoliento">Somnoliento</option>
                  <option value="Desorientado">Desorientado</option>
                  <option value="Estuporoso">Estuporoso</option>
                  <option value="Inconsciente">Inconsciente</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>😣 {t('medico.painScale', 'Escala de Dolor')} (0-10)</label>
                <input type="range" min="0" max="10" className="pain-scale-input" value={vitalsForm.escalaDolor} onChange={(e) => setVitalsForm(prev => ({ ...prev, escalaDolor: e.target.value }))} />
                <span className="pain-value">{vitalsForm.escalaDolor}/10</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowVitalsModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleSaveVitals} disabled={!vitalsForm.temperatura || !vitalsForm.frecuenciaCardiaca}>{t('common.save', 'Guardar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔍 {t('medico.addDiagnosis', 'Agregar Diagnóstico')}</h2>
            <div className="form-group">
              <label>{t('medico.diagnosisCode', 'Código (CIE-10)')}</label>
              <input type="text" className="form-control" placeholder="Ej: J06.9" value={diagnosisForm.codigo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, codigo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>{t('medico.diagnosisDescription', 'Descripción')} *</label>
              <textarea className="form-control" placeholder={t('medico.diagnosisDescPlaceholder', 'Describa el diagnóstico...')} rows="3" value={diagnosisForm.descripcion} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.diagnosisType', 'Tipo')}</label>
                <select className="form-control" value={diagnosisForm.tipo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, tipo: e.target.value }))}>
                  <option value="PRESUNTIVO">{t('medico.presumptive', 'Presuntivo')}</option>
                  <option value="DEFINITIVO">{t('medico.definitive', 'Definitivo')}</option>
                  <option value="DIFERENCIAL">{t('medico.differential', 'Diferencial')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.severity', 'Severidad')}</label>
                <select className="form-control" value={diagnosisForm.severidad} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, severidad: e.target.value }))}>
                  <option value="LEVE">{t('medico.mild', 'Leve')}</option>
                  <option value="MODERADO">{t('medico.moderate', 'Moderado')}</option>
                  <option value="SEVERO">{t('medico.severe', 'Severo')}</option>
                  <option value="CRITICO">{t('medico.critical', 'Crítico')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.additionalNotes', 'Notas adicionales')}</label>
              <textarea className="form-control" placeholder={t('medico.additionalNotesPlaceholder', 'Observaciones adicionales...')} rows="2" value={diagnosisForm.notas} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, notas: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDiagnosisModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleAddDiagnosis} disabled={!diagnosisForm.descripcion}>{t('medico.addDiagnosis', 'Agregar Diagnóstico')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>💊 {t('medico.createPrescription', 'Crear Receta')}</h2>
            <div className="quick-medications">
              <p>{t('medico.commonMedications', 'Medicamentos comunes')}:</p>
              <div className="med-chips">
                {commonMedications.map(med => (
                  <button key={med} className="med-chip" onClick={() => setCurrentMedication(prev => ({ ...prev, nombre: med }))}>+ {med}</button>
                ))}
              </div>
            </div>
            <div className="add-medication-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('medico.medicationName', 'Medicamento')}</label>
                  <input type="text" className="form-control" placeholder={t('medico.medicationNamePlaceholder', 'Nombre del medicamento')} value={currentMedication.nombre} onChange={(e) => setCurrentMedication(prev => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('medico.dose', 'Dosis')}</label>
                  <input type="text" className="form-control" placeholder="Ej: 500mg" value={currentMedication.dosis} onChange={(e) => setCurrentMedication(prev => ({ ...prev, dosis: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('medico.frequency', 'Frecuencia')}</label>
                  <input type="text" className="form-control" placeholder="Ej: Cada 8 horas" value={currentMedication.frecuencia} onChange={(e) => setCurrentMedication(prev => ({ ...prev, frecuencia: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('medico.route', 'Vía')}</label>
                  <select className="form-control" value={currentMedication.via} onChange={(e) => setCurrentMedication(prev => ({ ...prev, via: e.target.value }))}>
                    <option value="ORAL">Oral</option>
                    <option value="INYECTABLE">Inyectable</option>
                    <option value="TOPICO">Tópico</option>
                    <option value="OFTALMICA">Oftálmica</option>
                    <option value="OTICA">Ótica</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('medico.duration', 'Duración')}</label>
                  <input type="text" className="form-control" placeholder="Ej: 7 días" value={currentMedication.duracion} onChange={(e) => setCurrentMedication(prev => ({ ...prev, duracion: e.target.value }))} />
                </div>
              </div>
              <button className="btn-add-medication" onClick={handleAddMedication} disabled={!currentMedication.nombre || !currentMedication.dosis}>+ {t('medico.addMedication', 'Agregar Medicamento')}</button>
            </div>
            {prescriptionForm.medicamentos.length > 0 && (
              <div className="medications-list">
                <h4>{t('medico.prescribedMedications', 'Medicamentos en la receta')}:</h4>
                {prescriptionForm.medicamentos.map(med => (
                  <div key={med.id} className="medication-item">
                    <div className="medication-info">
                      <strong>{med.nombre}</strong>
                      <span>{med.dosis} - {med.frecuencia} ({med.via})</span>
                      {med.duracion && <span>{t('medico.duration', 'Duración')}: {med.duracion}</span>}
                    </div>
                    <button className="btn-remove" onClick={() => handleRemoveMedication(med.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-group">
              <label>{t('medico.generalInstructions', 'Instrucciones generales')}</label>
              <textarea className="form-control" placeholder={t('medico.instructionsPlaceholder', 'Instrucciones adicionales para el propietario...')} rows="2" value={prescriptionForm.instrucciones} onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instrucciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPrescriptionModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleCreatePrescription} disabled={prescriptionForm.medicamentos.length === 0}>💊 {t('medico.sendToPharmacy', 'Enviar a Farmacia')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Order Modal */}
      {showLabOrderModal && (
        <div className="modal-overlay" onClick={() => setShowLabOrderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔬 {t('medico.createLabOrder', 'Orden de Laboratorio')}</h2>
            <div className="studies-selection">
              <label>{t('medico.selectStudies', 'Selecciona los estudios')}:</label>
              <div className="studies-grid">
                {studiesOptions.map(study => (
                  <label key={study.id} className={`study-checkbox ${labOrderForm.estudios.includes(study.id) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={labOrderForm.estudios.includes(study.id)} onChange={() => handleToggleStudy(study.id)} />
                    <span>{study.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.priority', 'Prioridad')}</label>
              <select className="form-control" value={labOrderForm.prioridad} onChange={(e) => setLabOrderForm(prev => ({ ...prev, prioridad: e.target.value }))}>
                <option value="NORMAL">{t('medico.normal', 'Normal')}</option>
                <option value="URGENTE">{t('medico.urgent', 'Urgente')}</option>
                <option value="STAT">{t('medico.stat', 'STAT')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('medico.clinicalIndications', 'Indicaciones clínicas')}</label>
              <textarea className="form-control" placeholder={t('medico.indicationsPlaceholder', 'Diagnóstico presuntivo, razón del estudio...')} rows="3" value={labOrderForm.indicaciones} onChange={(e) => setLabOrderForm(prev => ({ ...prev, indicaciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLabOrderModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleCreateLabOrder} disabled={labOrderForm.estudios.length === 0}>🔬 {t('medico.sendToLab', 'Enviar a Laboratorio')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hospitalization Modal */}
      {showHospitalizationModal && (
        <div className="modal-overlay" onClick={() => setShowHospitalizationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🏥 {t('medico.hospitalizePatient', 'Hospitalizar Paciente')}</h2>
            <div className="form-group">
              <label>{t('medico.hospitalizationReason', 'Motivo de hospitalización')} *</label>
              <textarea className="form-control" placeholder={t('medico.hospitalizationReasonPlaceholder', 'Razón para hospitalizar al paciente...')} rows="3" value={hospitalizationForm.motivo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, motivo: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.monitoringFrequency', 'Frecuencia de monitoreo')}</label>
                <select className="form-control" value={hospitalizationForm.frecuenciaMonitoreo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, frecuenciaMonitoreo: e.target.value }))}>
                  <option value="1h">{t('medico.every1Hour', 'Cada 1 hora')}</option>
                  <option value="2h">{t('medico.every2Hours', 'Cada 2 horas')}</option>
                  <option value="4h">{t('medico.every4Hours', 'Cada 4 horas')}</option>
                  <option value="6h">{t('medico.every6Hours', 'Cada 6 horas')}</option>
                  <option value="8h">{t('medico.every8Hours', 'Cada 8 horas')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.estimatedDays', 'Días estimados')}</label>
                <input type="number" className="form-control" placeholder="3" min="1" value={hospitalizationForm.estimacionDias} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, estimacionDias: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.specialCare', 'Cuidados especiales')}</label>
              <textarea className="form-control" placeholder={t('medico.specialCarePlaceholder', 'Instrucciones especiales de cuidado...')} rows="3" value={hospitalizationForm.cuidadosEspeciales} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, cuidadosEspeciales: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHospitalizationModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-warning" onClick={handleCreateHospitalization} disabled={!hospitalizationForm.motivo}>🏥 {t('medico.confirmHospitalization', 'Confirmar Hospitalización')}</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>📋 {t('medico.medicalHistory', 'Historial Médico')} - {selectedPatient.nombre}</h2>
            <div className="patient-info-modal">
              <div className="info-row"><strong>{t('medico.patient', 'Paciente')}:</strong> {selectedPatient.nombre} ({selectedPatient.raza})</div>
              <div className="info-row"><strong>{t('medico.owner', 'Propietario')}:</strong> {selectedPatient.propietario}</div>
              <div className="info-row"><strong>{t('medico.fileNumber', 'Ficha')}:</strong> {selectedPatient.numeroFicha}</div>
            </div>
            <div className="history-full-timeline">
              {getPatientHistory(selectedPatient.id).length === 0 ? (
                <div className="empty-state"><p>{t('medico.noHistoryFound', 'No se encontró historial para este paciente')}</p></div>
              ) : (
                getPatientHistory(selectedPatient.id).slice().reverse().map((entry, idx) => (
                  <div key={idx} className="history-entry-full">
                    <div className="history-date-full">{new Date(entry.timestamp).toLocaleString()}</div>
                    <div className="history-content-full">
                      <h4>{entry.accion}</h4>
                      {entry.detalles && <pre className="history-details-full">{typeof entry.detalles === 'object' ? JSON.stringify(entry.detalles, null, 2) : entry.detalles}</pre>}
                      <span className="history-user">{t('medico.by', 'Por')}: {entry.usuario}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setShowHistoryModal(false)}>{t('common.close', 'Cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicoDashboard;
