import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import './MedicoDashboard.css';

function MedicoDashboard() {
  const { 
    currentUser, 
    systemState, 
    updatePatientState, 
    completeTask, 
    requestStudies, 
    prescribeMedication, 
    addToHistory,
    scheduleSurgery,
    startSurgery,
    completeSurgery,
    hospitalize,
    addMonitoring
  } = useApp();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showExpediente, setShowExpediente] = useState(false);
  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [showSurgeryReportModal, setShowSurgeryReportModal] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [medications, setMedications] = useState('');
  const [diagnosticNotes, setDiagnosticNotes] = useState('');
  const [surgeryForm, setSurgeryForm] = useState({
    tipo: '',
    fecha: '',
    hora: '',
    prequirurgicos: [],
    observaciones: '',
    prioridad: 'ALTA'
  });
  const [surgeryReport, setSurgeryReport] = useState({
    procedimiento: '',
    anestesia: '',
    complicaciones: '',
    pronostico: '',
    cuidadosPostOperatorios: ''
  });
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [monitoringForm, setMonitoringForm] = useState({
    temperatura: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    presionArterial: '',
    nivelConciencia: 'Alerta',
    escalaDolor: '0',
    observaciones: ''
  });

  const myTasks = systemState.tareasPendientes.MEDICO || [];
  const myPatients = systemState.pacientes.filter(p => p.estado === 'EN_CONSULTA');
  const waitingPatients = systemState.pacientes.filter(p => p.estado === 'EN_ESPERA');
  const inStudies = systemState.pacientes.filter(p => p.estado === 'EN_ESTUDIOS');
  const scheduledSurgeries = systemState.pacientes.filter(p => p.estado === 'CIRUGIA_PROGRAMADA');
  const inSurgery = systemState.pacientes.filter(p => p.estado === 'EN_CIRUGIA');
  const hospitalized = systemState.pacientes.filter(p => p.estado === 'HOSPITALIZADO');
  const readyForDischarge = systemState.pacientes.filter(p => p.estado === 'LISTO_PARA_ALTA');
  const allPatients = systemState.pacientes;

  // Búsqueda de pacientes
  const filteredPatients = searchQuery
    ? allPatients.filter(p => 
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.numeroFicha.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propietario.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPatients;

  const studiesOptions = [
    'Hematológicos',
    'Coproparasitoscópicos',
    'Uroanálisis',
    'Radiográficos',
    'Ecográficos',
    'Electrocardiográficos'
  ];

  const commonMedications = [
    'Amoxicilina 500mg',
    'Carprofeno 75mg',
    'Metronidazol 250mg',
    'Prednisona 5mg',
    'Tramadol 50mg'
  ];

  const handleStartConsultation = (patient) => {
    setSelectedPatient(patient);
    setShowDiagnostic(true);
  };

  const handleRequestStudies = () => {
    if (selectedStudies.length === 0) {
      alert('Selecciona al menos un estudio');
      return;
    }
    requestStudies(selectedPatient.id, selectedStudies);
    addToHistory(selectedPatient.id, {
      accion: `Examen físico realizado. Estudios solicitados.`,
      usuario: currentUser.nombre,
      timestamp: new Date().toISOString()
    });
    alert('Estudios solicitados exitosamente');
    setShowDiagnostic(false);
    setSelectedStudies([]);
  };

  const handlePrescribe = () => {
    if (!medications.trim()) {
      alert('Ingresa los medicamentos a prescribir');
      return;
    }

    const medsList = medications.split(',').map(m => m.trim());
    prescribeMedication(selectedPatient.id, medsList);

    if (diagnosticNotes) {
      addToHistory(selectedPatient.id, {
        accion: `Diagnóstico: ${diagnosticNotes}`,
        usuario: currentUser.nombre,
        timestamp: new Date().toISOString()
      });
    }

    alert('Receta generada y enviada a farmacia');
    setShowDiagnostic(false);
    setMedications('');
    setDiagnosticNotes('');
  };

  const handleCompleteConsultation = () => {
    updatePatientState(selectedPatient.id, 'LISTO_PARA_ALTA', currentUser.nombre);
    addToHistory(selectedPatient.id, {
      accion: 'Consulta completada',
      usuario: currentUser.nombre,
      timestamp: new Date().toISOString()
    });
    alert('Consulta completada exitosamente');
    setShowDiagnostic(false);
  };

  const handleScheduleSurgery = (patient) => {
    setSelectedPatient(patient);
    setSurgeryForm({
      tipo: '',
      fecha: '',
      hora: '',
      prequirurgicos: [],
      observaciones: '',
      prioridad: 'ALTA'
    });
    setShowSurgeryModal(true);
  };

  const handleConfirmSurgery = () => {
    if (!surgeryForm.tipo || !surgeryForm.fecha || !surgeryForm.hora) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    scheduleSurgery(selectedPatient.id, {
      tipo: surgeryForm.tipo,
      fecha: surgeryForm.fecha,
      hora: surgeryForm.hora,
      prequirurgicos: surgeryForm.prequirurgicos,
      observaciones: surgeryForm.observaciones,
      prioridad: surgeryForm.prioridad,
      programadoPor: currentUser?.nombre
    });

    setShowSurgeryModal(false);
    setSelectedPatient(null);
  };

  const handleStartSurgery = (patient) => {
    if (confirm(`¿Iniciar cirugía para ${patient.nombre}?`)) {
      startSurgery(patient.id);
    }
  };

  const handleCompleteSurgery = (patient) => {
    setSelectedPatient(patient);
    setSurgeryReport({
      procedimiento: '',
      anestesia: '',
      complicaciones: '',
      pronostico: '',
      cuidadosPostOperatorios: ''
    });
    setShowSurgeryReportModal(true);
  };

  const handleSubmitSurgeryReport = () => {
    if (!surgeryReport.procedimiento || !surgeryReport.anestesia) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    completeSurgery(selectedPatient.id, {
      ...surgeryReport,
      cirujano: currentUser?.nombre,
      fechaRealizacion: new Date().toISOString()
    });

    // Preguntar si requiere hospitalización
    if (confirm('¿El paciente requiere hospitalización post-operatoria?')) {
      hospitalize(selectedPatient.id, {
        motivo: 'Post-operatorio',
        frecuenciaMonitoreo: '2h',
        cuidadosEspeciales: surgeryReport.cuidadosPostOperatorios
      });
    } else {
      updatePatientState(selectedPatient.id, 'LISTO_PARA_ALTA', currentUser?.nombre);
    }

    setShowSurgeryReportModal(false);
    setSelectedPatient(null);
  };

  const handleOpenMonitoring = (patient) => {
    setSelectedPatient(patient);
    setMonitoringForm({
      temperatura: '',
      frecuenciaCardiaca: '',
      frecuenciaRespiratoria: '',
      presionArterial: '',
      nivelConciencia: 'Alerta',
      escalaDolor: '0',
      observaciones: ''
    });
    setShowMonitoringModal(true);
  };

  const handleSubmitMonitoring = () => {
    if (!monitoringForm.temperatura || !monitoringForm.frecuenciaCardiaca) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    addMonitoring(selectedPatient.id, {
      ...monitoringForm,
      registradoPor: currentUser?.nombre
    });

    setShowMonitoringModal(false);
    setSelectedPatient(null);
  };

  const handleViewExpediente = (patient) => {
    setSelectedPatient(patient);
    setShowExpediente(true);
  };

  const toggleStudy = (study) => {
    setSelectedStudies(prev =>
      prev.includes(study) ? prev.filter(s => s !== study) : [...prev, study]
    );
  };

  return (
    <div className="dashboard medico-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>👨‍⚕️ Médico</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'consultas' ? 'active' : ''}`}
            onClick={() => setActiveSection('consultas')}
          >
            <span className="nav-icon">🏥</span>
            <span>Mis Consultas</span>
            {myPatients.length > 0 && (
              <span className="nav-badge">{myPatients.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'estudios' ? 'active' : ''}`}
            onClick={() => setActiveSection('estudios')}
          >
            <span className="nav-icon">🔬</span>
            <span>En Estudios</span>
            {inStudies.length > 0 && (
              <span className="nav-badge warning">{inStudies.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'hospitalizados' ? 'active' : ''}`}
            onClick={() => setActiveSection('hospitalizados')}
          >
            <span className="nav-icon">🏥</span>
            <span>Hospitalizados</span>
            {hospitalized.length > 0 && (
              <span className="nav-badge urgent">{hospitalized.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveSection('todos')}
          >
            <span className="nav-icon">📋</span>
            <span>Todos los Pacientes</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {activeSection === 'dashboard' && 'Dashboard Médico'}
              {activeSection === 'consultas' && 'Mis Consultas'}
              {activeSection === 'estudios' && 'Pacientes en Estudios'}
              {activeSection === 'hospitalizados' && 'Pacientes Hospitalizados'}
              {activeSection === 'todos' && 'Todos los Pacientes'}
            </h1>
            <p>Dr. {currentUser.nombre} - {currentUser.especialidad}</p>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeSection === 'dashboard' && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#2196f3'}}>🏥</div>
                <div className="stat-content">
                  <h3>{myPatients.length}</h3>
                  <p>Pacientes en Consulta</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#ff9800'}}>📋</div>
                <div className="stat-content">
                  <h3>{myTasks.length}</h3>
                  <p>Tareas Pendientes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#9c27b0'}}>🔪</div>
                <div className="stat-content">
                  <h3>{scheduledSurgeries.length}</h3>
                  <p>Cirugías Programadas</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background: '#4caf50'}}>🏨</div>
                <div className="stat-content">
                  <h3>{hospitalized.length}</h3>
                  <p>Hospitalizados</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              {/* Cirugías del Día */}
              {(scheduledSurgeries.length > 0 || inSurgery.length > 0) && (
                <div className="content-section full-width">
                  <h2>🔪 Cirugías del Día</h2>
                  <div className="surgery-grid">
                    {scheduledSurgeries.map(patient => (
                      <div key={patient.id} className="surgery-card scheduled">
                        <div className="surgery-header">
                          <h3>{patient.nombre}</h3>
                          <span className="surgery-status scheduled">Programada</span>
                        </div>
                        <div className="surgery-info">
                          <p><strong>Tipo:</strong> {patient.cirugiaProgramada?.tipo}</p>
                          <p><strong>Hora:</strong> {patient.cirugiaProgramada?.hora}</p>
                          <p><strong>Prioridad:</strong> <span className={`priority-badge ${patient.cirugiaProgramada?.prioridad?.toLowerCase()}`}>{patient.cirugiaProgramada?.prioridad}</span></p>
                          {patient.cirugiaProgramada?.observaciones && (
                            <p><strong>Notas:</strong> {patient.cirugiaProgramada.observaciones}</p>
                          )}
                        </div>
                        <div className="surgery-actions">
                          <button 
                            className="btn-start-surgery"
                            onClick={() => handleStartSurgery(patient)}
                          >
                            Iniciar Cirugía
                          </button>
                          <button 
                            className="btn-view"
                            onClick={() => handleViewExpediente(patient)}
                          >
                            Ver Expediente
                          </button>
                        </div>
                      </div>
                    ))}
                    {inSurgery.map(patient => (
                      <div key={patient.id} className="surgery-card in-progress">
                        <div className="surgery-header">
                          <h3>{patient.nombre}</h3>
                          <span className="surgery-status in-progress">En Progreso</span>
                        </div>
                        <div className="surgery-info">
                          <p><strong>Tipo:</strong> {patient.cirugiaProgramada?.tipo}</p>
                          <p><strong>Inicio:</strong> {new Date(patient.fechaInicioCirugia || Date.now()).toLocaleTimeString()}</p>
                        </div>
                        <div className="surgery-actions">
                          <button 
                            className="btn-complete-surgery"
                            onClick={() => handleCompleteSurgery(patient)}
                          >
                            Completar y Generar Reporte
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="content-section">
                <h2>Tareas Asignadas</h2>
                <div className="tasks-list">
                  {myTasks.length === 0 ? (
                    <div className="empty-state">No hay tareas pendientes</div>
                  ) : (
                    myTasks.map(task => {
                      const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
                      return (
                        <div key={task.id} className="task-card medical">
                          <div className="task-header">
                            <span className="task-priority" style={{background: task.prioridad === 'ALTA' ? '#f44336' : '#ff9800'}}>
                              {task.prioridad}
                            </span>
                            <span className="task-time">{new Date(task.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <h4>{task.titulo}</h4>
                          <p>{task.descripcion}</p>
                          {patient && (
                            <div className="task-patient-info">
                              <span>{patient.especie === 'Perro' ? '🐕' : '🐈'} {patient.nombre}</span>
                              <span className="patient-owner">Prop: {patient.propietario}</span>
                            </div>
                          )}
                          <div className="task-actions">
                            <button 
                              className="btn-action"
                              onClick={() => {
                                if (patient) handleStartConsultation(patient);
                              }}
                            >
                              Iniciar Consulta
                            </button>
                            <button 
                              className="btn-complete"
                              onClick={() => completeTask('MEDICO', task.id)}
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="content-section full-width">
                <h2>Historial de Consultas Hoy</h2>
                <div className="history-timeline">
                  <div className="timeline-item">
                    <div className="timeline-time">09:30</div>
                    <div className="timeline-content">
                      <h4>Max - Labrador</h4>
                      <p>Consulta general completada • Prop: Juan Pérez</p>
                      <span className="timeline-status completed">Completado</span>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-time">10:45</div>
                    <div className="timeline-content">
                      <h4>Miau - Siamés</h4>
                      <p>Vacunación Triple Felina • Prop: Laura Gómez</p>
                      <span className="timeline-status completed">Completado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CONSULTAS VIEW */}
        {activeSection === 'consultas' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Mis Pacientes Actuales</h2>
              <div className="patients-list">
                {myPatients.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay pacientes en consulta</p>
                  </div>
                ) : (
                  myPatients.map(patient => (
                    <div key={patient.id} className="patient-card-medical">
                      <div className="patient-header-medical">
                        <div className="patient-avatar-medical">
                          {patient.especie === 'Perro' ? '🐕' : '🐈'}
                        </div>
                        <div className="patient-info-medical">
                          <h4>{patient.nombre}</h4>
                          <p>{patient.raza} • {patient.edad}</p>
                          <span className="ficha-badge">{patient.numeroFicha}</span>
                        </div>
                      </div>
                      <div className="patient-details-medical">
                        <div className="detail-item">
                          <strong>Propietario:</strong> {patient.propietario}
                        </div>
                        <div className="detail-item">
                          <strong>Motivo:</strong> {patient.motivo}
                        </div>
                        <div className="detail-item">
                          <strong>Peso:</strong> {patient.peso}
                        </div>
                      </div>
                      <button 
                        className="btn-primary-full"
                        onClick={() => handleStartConsultation(patient)}
                      >
                        Realizar Consulta
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ESTUDIOS VIEW */}
        {activeSection === 'estudios' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Pacientes en Estudios</h2>
              <div className="patients-list">
                {inStudies.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay pacientes esperando resultados de estudios</p>
                  </div>
                ) : (
                  inStudies.map(patient => (
                    <div key={patient.id} className="patient-card-medical">
                      <div className="patient-header-medical">
                        <div className="patient-avatar-medical">
                          {patient.especie === 'Perro' ? '🐕' : '🐈'}
                        </div>
                        <div className="patient-info-medical">
                          <h4>{patient.nombre}</h4>
                          <p>{patient.raza} • {patient.edad}</p>
                          <span className="ficha-badge">{patient.numeroFicha}</span>
                        </div>
                        <span className="status-badge warning">🔬 En Estudios</span>
                      </div>
                      <div className="patient-details-medical">
                        <div className="detail-item">
                          <strong>Propietario:</strong> {patient.propietario}
                        </div>
                        <div className="detail-item">
                          <strong>Teléfono:</strong> {patient.telefono}
                        </div>
                      </div>
                      <div className="patient-actions">
                        <button 
                          className="btn-secondary"
                          onClick={() => handleViewExpediente(patient)}
                        >
                          Ver Expediente
                        </button>
                        <button 
                          className="btn-primary"
                          onClick={() => alert('Resultados de estudios')}
                        >
                          Ver Resultados
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* HOSPITALIZADOS VIEW */}
        {activeSection === 'hospitalizados' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <h2>Pacientes Hospitalizados</h2>
              <div className="hospitalized-list">
                {hospitalized.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay pacientes hospitalizados actualmente</p>
                  </div>
                ) : (
                  hospitalized.map(patient => (
                    <div key={patient.id} className="hospitalized-card">
                      <div className="hospitalized-header">
                        <div className="patient-main-info">
                          <div className="patient-avatar-large">
                            {patient.especie === 'Perro' ? '🐕' : '🐈'}
                          </div>
                          <div>
                            <h3>{patient.nombre}</h3>
                            <p>{patient.raza} • {patient.edad} • {patient.sexo}</p>
                            <span className="ficha-badge">{patient.numeroFicha}</span>
                          </div>
                        </div>
                        <span className="status-badge urgent">🏥 Hospitalizado</span>
                      </div>

                      <div className="hospitalized-info">
                        <div className="info-grid">
                          <div className="info-item">
                            <strong>Propietario:</strong>
                            <span>{patient.propietario}</span>
                          </div>
                          <div className="info-item">
                            <strong>Peso:</strong>
                            <span>{patient.peso}</span>
                          </div>
                          <div className="info-item">
                            <strong>Motivo:</strong>
                            <span>{patient.hospitalizacion?.motivo || patient.motivo}</span>
                          </div>
                          <div className="info-item">
                            <strong>Frecuencia Monitoreo:</strong>
                            <span>{patient.hospitalizacion?.frecuenciaMonitoreo || 'Cada 4h'}</span>
                          </div>
                        </div>

                        {patient.hospitalizacion?.cuidadosEspeciales && (
                          <div className="special-care">
                            <strong>⚠️ Cuidados Especiales:</strong>
                            <p>{patient.hospitalizacion.cuidadosEspeciales}</p>
                          </div>
                        )}
                      </div>

                      {/* Historial de Monitoreo */}
                      {patient.hospitalizacion?.monitoreos && patient.hospitalizacion.monitoreos.length > 0 && (
                        <div className="monitoring-history">
                          <h4>📊 Historial de Monitoreo (EFG)</h4>
                          <div className="monitoring-timeline">
                            {patient.hospitalizacion.monitoreos.slice(-3).reverse().map((monitoreo, idx) => (
                              <div key={idx} className="monitoring-entry">
                                <div className="monitoring-time">
                                  {new Date(monitoreo.timestamp).toLocaleString()}
                                </div>
                                <div className="monitoring-data">
                                  <span>🌡️ {monitoreo.temperatura}°C</span>
                                  <span>❤️ {monitoreo.frecuenciaCardiaca} lpm</span>
                                  <span>🫁 {monitoreo.frecuenciaRespiratoria} rpm</span>
                                  {monitoreo.presionArterial && <span>🩺 {monitoreo.presionArterial} mmHg</span>}
                                  <span>🧠 {monitoreo.nivelConciencia}</span>
                                  <span>😣 Dolor: {monitoreo.escalaDolor}/10</span>
                                </div>
                                {monitoreo.observaciones && (
                                  <div className="monitoring-notes">
                                    <em>{monitoreo.observaciones}</em>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="hospitalized-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => handleOpenMonitoring(patient)}
                        >
                          📝 Registrar Monitoreo
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={() => handleViewExpediente(patient)}
                        >
                          📋 Ver Expediente
                        </button>
                        <button 
                          className="btn-success"
                          onClick={() => {
                            if (confirm(`¿Dar de alta a ${patient.nombre}?`)) {
                              updatePatientState(patient.id, 'LISTO_PARA_ALTA', currentUser?.nombre);
                            }
                          }}
                        >
                          ✅ Dar de Alta
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TODOS LOS PACIENTES VIEW */}
        {activeSection === 'todos' && (
          <div className="dashboard-content">
            <div className="content-section full-width">
              <div className="section-header">
                <h2>Todos los Pacientes</h2>
                <div className="search-bar">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar por nombre, ficha, propietario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="btn-clear" onClick={() => setSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
              
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ficha</th>
                      <th>Paciente</th>
                      <th>Especie/Raza</th>
                      <th>Edad</th>
                      <th>Propietario</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-row">
                          {searchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map(patient => (
                        <tr key={patient.id}>
                          <td><span className="ficha-badge">{patient.numeroFicha}</span></td>
                          <td>
                            <div className="patient-cell">
                              <span className="patient-icon">
                                {patient.especie === 'Perro' ? '🐕' : '🐈'}
                              </span>
                              <strong>{patient.nombre}</strong>
                            </div>
                          </td>
                          <td>{patient.especie} • {patient.raza}</td>
                          <td>{patient.edad}</td>
                          <td>{patient.propietario}</td>
                          <td>
                            <a href={`tel:${patient.telefono}`} className="phone-link">
                              {patient.telefono}
                            </a>
                          </td>
                          <td>
                            <span className={`status-badge ${
                              patient.estado === 'CONSULTA' ? '' :
                              patient.estado === 'ESTUDIOS' ? 'warning' :
                              patient.estado === 'HOSPITALIZADO' ? 'urgent' :
                              'success'
                            }`}>
                              {patient.estado}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                title="Ver Expediente"
                                onClick={() => handleViewExpediente(patient)}
                              >
                                📋
                              </button>
                              <button
                                className="btn-icon"
                                title="Iniciar Consulta"
                                onClick={() => handleStartConsultation(patient)}
                              >
                                🏥
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* MODAL DE CONSULTA */}
      {showDiagnostic && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDiagnostic(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>Consulta Médica - {selectedPatient.nombre}</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Paciente:</strong> {selectedPatient.nombre} ({selectedPatient.raza})
              </div>
              <div className="info-row">
                <strong>Propietario:</strong> {selectedPatient.propietario}
              </div>
              <div className="info-row">
                <strong>Motivo:</strong> {selectedPatient.motivo}
              </div>
              <div className="info-row">
                <strong>Peso:</strong> {selectedPatient.peso}
              </div>
            </div>

            <div className="diagnostic-section">
              <h3>Anamnesis y Diagnóstico</h3>
              <textarea
                value={diagnosticNotes}
                onChange={(e) => setDiagnosticNotes(e.target.value)}
                placeholder="Registra la anamnesis, examen físico y diagnóstico presuntivo..."
                rows="4"
              />
            </div>

            <div className="diagnostic-section">
              <h3>Estudios Complementarios</h3>
              <div className="studies-grid">
                {studiesOptions.map(study => (
                  <label key={study} className="study-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedStudies.includes(study)}
                      onChange={() => toggleStudy(study)}
                    />
                    <span>{study}</span>
                  </label>
                ))}
              </div>
              {selectedStudies.length > 0 && (
                <button className="btn-secondary" onClick={handleRequestStudies}>
                  Solicitar Estudios Seleccionados
                </button>
              )}
            </div>

            <div className="diagnostic-section">
              <h3>Prescripción de Medicamentos</h3>
              <div className="medications-quick">
                <p>Medicamentos comunes:</p>
                <div className="med-chips">
                  {commonMedications.map(med => (
                    <button
                      key={med}
                      className="med-chip"
                      onClick={() => setMedications(prev => prev ? `${prev}, ${med}` : med)}
                    >
                      + {med}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="Ingresa medicamentos separados por comas..."
                rows="3"
              />
              {medications && (
                <button className="btn-primary" onClick={handlePrescribe}>
                  Generar Receta y Enviar a Farmacia
                </button>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowDiagnostic(false)}>
                Cancelar
              </button>
              <button className="btn-success" onClick={handleCompleteConsultation}>
                Finalizar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPEDIENTE */}
      {showExpediente && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowExpediente(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>📋 Expediente Clínico - {selectedPatient.nombre}</h2>
            
            <div className="expediente-header">
              <div className="expediente-patient">
                <div className="patient-avatar-large">
                  {selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}
                </div>
                <div className="patient-details">
                  <h3>{selectedPatient.nombre}</h3>
                  <p><strong>Raza:</strong> {selectedPatient.raza}</p>
                  <p><strong>Edad:</strong> {selectedPatient.edad}</p>
                  <p><strong>Peso:</strong> {selectedPatient.peso}</p>
                  <p><strong>Ficha:</strong> {selectedPatient.numeroFicha}</p>
                </div>
              </div>
              <div className="expediente-owner">
                <h4>Propietario</h4>
                <p><strong>{selectedPatient.propietario}</strong></p>
                <p>Tel: <a href={`tel:${selectedPatient.telefono}`}>{selectedPatient.telefono}</a></p>
              </div>
            </div>

            <div className="expediente-tabs">
              <div className="tab-content">
                <h3>Historial de Consultas</h3>
                <div className="history-list">
                  <div className="history-entry">
                    <div className="history-date">15/01/2024 - 10:30</div>
                    <div className="history-details">
                      <p><strong>Diagnóstico:</strong> Control general - Vacunación</p>
                      <p><strong>Medicamentos:</strong> Vacuna Séxtuple, Desparasitante</p>
                      <p><strong>Médico:</strong> Dr. González</p>
                    </div>
                  </div>
                  <div className="history-entry">
                    <div className="history-date">20/12/2023 - 14:15</div>
                    <div className="history-details">
                      <p><strong>Diagnóstico:</strong> Otitis externa</p>
                      <p><strong>Medicamentos:</strong> Ótico antibiótico, Antiinflamatorio</p>
                      <p><strong>Médico:</strong> Dr. González</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tab-content">
                <h3>Vacunas</h3>
                <div className="vaccines-grid">
                  <div className="vaccine-item completed">
                    <span className="vaccine-icon">✅</span>
                    <div>
                      <strong>Séxtuple</strong>
                      <p>Última: 15/01/2024</p>
                      <p>Próxima: 15/01/2025</p>
                    </div>
                  </div>
                  <div className="vaccine-item completed">
                    <span className="vaccine-icon">✅</span>
                    <div>
                      <strong>Rabia</strong>
                      <p>Última: 15/01/2024</p>
                      <p>Próxima: 15/01/2025</p>
                    </div>
                  </div>
                  <div className="vaccine-item pending">
                    <span className="vaccine-icon">⚠️</span>
                    <div>
                      <strong>Tos de las Perreras</strong>
                      <p>Pendiente</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tab-content">
                <h3>Alergias y Observaciones</h3>
                <div className="allergies-section">
                  <p><strong>Alergias conocidas:</strong> Ninguna registrada</p>
                  <p><strong>Observaciones especiales:</strong> Paciente dócil, fácil manejo</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowExpediente(false)}>
                Cerrar
              </button>
              <button className="btn-primary" onClick={() => window.print()}>
                Imprimir Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CIRUGÍA */}
      {showSurgeryModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowSurgeryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🏥 Programar Cirugía</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Paciente:</strong> {selectedPatient.nombre} ({selectedPatient.raza})
              </div>
              <div className="info-row">
                <strong>Propietario:</strong> {selectedPatient.propietario}
              </div>
            </div>

            <div className="form-group">
              <label>Tipo de Cirugía *</label>
              <select 
                className="form-control"
                value={surgeryForm.tipo}
                onChange={(e) => setSurgeryForm({...surgeryForm, tipo: e.target.value})}
              >
                <option value="">Selecciona el tipo de cirugía</option>
                <option value="esterilizacion">Esterilización</option>
                <option value="castracion">Castración</option>
                <option value="limpieza_dental">Limpieza Dental</option>
                <option value="extraccion_dental">Extracción Dental</option>
                <option value="tumor">Remoción de Tumor</option>
                <option value="fractura">Reparación de Fractura</option>
                <option value="cesarea">Cesárea</option>
                <option value="otra">Otra (especificar)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fecha Propuesta *</label>
              <input 
                type="date" 
                className="form-control"
                value={surgeryForm.fecha}
                onChange={(e) => setSurgeryForm({...surgeryForm, fecha: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Hora *</label>
              <input 
                type="time" 
                className="form-control"
                value={surgeryForm.hora}
                onChange={(e) => setSurgeryForm({...surgeryForm, hora: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Prioridad</label>
              <select 
                className="form-control"
                value={surgeryForm.prioridad}
                onChange={(e) => setSurgeryForm({...surgeryForm, prioridad: e.target.value})}
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>

            <div className="form-group">
              <label>Pre-quirúrgicos Requeridos</label>
              <div className="checkbox-group">
                <label>
                  <input 
                    type="checkbox"
                    checked={surgeryForm.prequirurgicos.includes('Hemograma Completo')}
                    onChange={(e) => {
                      const study = 'Hemograma Completo';
                      setSurgeryForm({
                        ...surgeryForm,
                        prequirurgicos: e.target.checked 
                          ? [...surgeryForm.prequirurgicos, study]
                          : surgeryForm.prequirurgicos.filter(s => s !== study)
                      });
                    }}
                  /> Hemograma Completo
                </label>
                <label>
                  <input 
                    type="checkbox"
                    checked={surgeryForm.prequirurgicos.includes('Perfil Renal')}
                    onChange={(e) => {
                      const study = 'Perfil Renal';
                      setSurgeryForm({
                        ...surgeryForm,
                        prequirurgicos: e.target.checked 
                          ? [...surgeryForm.prequirurgicos, study]
                          : surgeryForm.prequirurgicos.filter(s => s !== study)
                      });
                    }}
                  /> Perfil Renal
                </label>
                <label>
                  <input 
                    type="checkbox"
                    checked={surgeryForm.prequirurgicos.includes('Perfil Hepático')}
                    onChange={(e) => {
                      const study = 'Perfil Hepático';
                      setSurgeryForm({
                        ...surgeryForm,
                        prequirurgicos: e.target.checked 
                          ? [...surgeryForm.prequirurgicos, study]
                          : surgeryForm.prequirurgicos.filter(s => s !== study)
                      });
                    }}
                  /> Perfil Hepático
                </label>
                <label>
                  <input 
                    type="checkbox"
                    checked={surgeryForm.prequirurgicos.includes('Radiografía de Tórax')}
                    onChange={(e) => {
                      const study = 'Radiografía de Tórax';
                      setSurgeryForm({
                        ...surgeryForm,
                        prequirurgicos: e.target.checked 
                          ? [...surgeryForm.prequirurgicos, study]
                          : surgeryForm.prequirurgicos.filter(s => s !== study)
                      });
                    }}
                  /> Radiografía de Tórax
                </label>
                <label>
                  <input 
                    type="checkbox"
                    checked={surgeryForm.prequirurgicos.includes('Electrocardiograma')}
                    onChange={(e) => {
                      const study = 'Electrocardiograma';
                      setSurgeryForm({
                        ...surgeryForm,
                        prequirurgicos: e.target.checked 
                          ? [...surgeryForm.prequirurgicos, study]
                          : surgeryForm.prequirurgicos.filter(s => s !== study)
                      });
                    }}
                  /> Electrocardiograma
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Observaciones</label>
              <textarea 
                className="form-control"
                rows="3"
                placeholder="Notas adicionales sobre la cirugía..."
                value={surgeryForm.observaciones}
                onChange={(e) => setSurgeryForm({...surgeryForm, observaciones: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowSurgeryModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-success"
                onClick={handleConfirmSurgery}
                disabled={!surgeryForm.tipo || !surgeryForm.fecha || !surgeryForm.hora}
              >
                Programar Cirugía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE QUIRÚRGICO */}
      {showSurgeryReportModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowSurgeryReportModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>📋 Reporte Quirúrgico</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Paciente:</strong> {selectedPatient.nombre}
              </div>
              <div className="info-row">
                <strong>Cirugía:</strong> {selectedPatient.cirugiaProgramada?.tipo}
              </div>
            </div>

            <div className="form-group">
              <label>Procedimiento Realizado *</label>
              <textarea 
                className="form-control"
                rows="4"
                placeholder="Describa el procedimiento quirúrgico realizado..."
                value={surgeryReport.procedimiento}
                onChange={(e) => setSurgeryReport({...surgeryReport, procedimiento: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Anestesia Utilizada *</label>
              <textarea 
                className="form-control"
                rows="2"
                placeholder="Tipo y dosis de anestesia..."
                value={surgeryReport.anestesia}
                onChange={(e) => setSurgeryReport({...surgeryReport, anestesia: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Complicaciones</label>
              <textarea 
                className="form-control"
                rows="3"
                placeholder="Describir complicaciones si las hubo..."
                value={surgeryReport.complicaciones}
                onChange={(e) => setSurgeryReport({...surgeryReport, complicaciones: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Pronóstico</label>
              <select 
                className="form-control"
                value={surgeryReport.pronostico}
                onChange={(e) => setSurgeryReport({...surgeryReport, pronostico: e.target.value})}
              >
                <option value="">Seleccione...</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Reservado">Reservado</option>
                <option value="Grave">Grave</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cuidados Post-Operatorios</label>
              <textarea 
                className="form-control"
                rows="4"
                placeholder="Instrucciones de cuidados post-operatorios..."
                value={surgeryReport.cuidadosPostOperatorios}
                onChange={(e) => setSurgeryReport({...surgeryReport, cuidadosPostOperatorios: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowSurgeryReportModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-success"
                onClick={handleSubmitSurgeryReport}
                disabled={!surgeryReport.procedimiento || !surgeryReport.anestesia}
              >
                Completar Cirugía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MONITOREO EFG */}
      {showMonitoringModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowMonitoringModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>📝 Registro de Monitoreo - EFG</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Paciente:</strong> {selectedPatient.nombre}
              </div>
              <div className="info-row">
                <strong>Motivo Hospitalización:</strong> {selectedPatient.hospitalizacion?.motivo}
              </div>
            </div>

            <div className="monitoring-form">
              <div className="form-row">
                <div className="form-group">
                  <label>🌡️ Temperatura (°C) *</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="form-control"
                    placeholder="38.5"
                    value={monitoringForm.temperatura}
                    onChange={(e) => setMonitoringForm({...monitoringForm, temperatura: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>❤️ Frecuencia Cardíaca (lpm) *</label>
                  <input 
                    type="number"
                    className="form-control"
                    placeholder="80"
                    value={monitoringForm.frecuenciaCardiaca}
                    onChange={(e) => setMonitoringForm({...monitoringForm, frecuenciaCardiaca: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>🫁 Frecuencia Respiratoria (rpm) *</label>
                  <input 
                    type="number"
                    className="form-control"
                    placeholder="20"
                    value={monitoringForm.frecuenciaRespiratoria}
                    onChange={(e) => setMonitoringForm({...monitoringForm, frecuenciaRespiratoria: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>🩺 Presión Arterial (mmHg)</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="120/80"
                    value={monitoringForm.presionArterial}
                    onChange={(e) => setMonitoringForm({...monitoringForm, presionArterial: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>🧠 Nivel de Conciencia</label>
                  <select 
                    className="form-control"
                    value={monitoringForm.nivelConciencia}
                    onChange={(e) => setMonitoringForm({...monitoringForm, nivelConciencia: e.target.value})}
                  >
                    <option value="Alerta">Alerta</option>
                    <option value="Somnoliento">Somnoliento</option>
                    <option value="Desorientado">Desorientado</option>
                    <option value="Estuporoso">Estuporoso</option>
                    <option value="Inconsciente">Inconsciente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>😣 Escala de Dolor (0-10)</label>
                  <select 
                    className="form-control"
                    value={monitoringForm.escalaDolor}
                    onChange={(e) => setMonitoringForm({...monitoringForm, escalaDolor: e.target.value})}
                  >
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>📋 Observaciones</label>
                <textarea 
                  className="form-control"
                  rows="4"
                  placeholder="Observaciones adicionales sobre el estado del paciente..."
                  value={monitoringForm.observaciones}
                  onChange={(e) => setMonitoringForm({...monitoringForm, observaciones: e.target.value})}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowMonitoringModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-success"
                onClick={handleSubmitMonitoring}
                disabled={!monitoringForm.temperatura || !monitoringForm.frecuenciaCardiaca || !monitoringForm.frecuenciaRespiratoria}
              >
                Guardar Monitoreo
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default MedicoDashboard;
