import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import './LaboratorioDashboard.css';

const LaboratorioDashboard = () => {
  const { t } = useTranslation();
  const { systemState, currentUser, completeTask, addToHistory, updatePatientState, addNotification } = useApp();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showSedationModal, setShowSedationModal] = useState(false);
  const [resultsForm, setResultsForm] = useState({
    resultados: '',
    observaciones: '',
    archivos: []
  });

  // Obtener tareas del laboratorio
  const labTasks = systemState.tareasPendientes?.LABORATORIO || [];

  // Función para procesar estudios (guardar en localStorage)
  const processStudy = (taskId, status, data = {}) => {
    const studies = JSON.parse(localStorage.getItem('labStudies') || '[]');
    const task = labTasks.find(t => t.id === taskId);
    
    if (!task) return;

    const study = {
      id: taskId,
      pacienteId: task.pacienteId,
      tipo: task.descripcion,
      solicitadoPor: task.titulo.includes('Dr.') ? task.titulo.split('Dr.')[1]?.split(' ')[0] : 'Médico',
      fechaSolicitud: task.timestamp,
      estado: status,
      ...data,
      fechaActualizacion: new Date().toISOString()
    };

    const existingIndex = studies.findIndex(s => s.id === taskId);
    if (existingIndex >= 0) {
      studies[existingIndex] = study;
    } else {
      studies.push(study);
    }

    localStorage.setItem('labStudies', JSON.stringify(studies));

    // Si se completó, actualizar historial y notificar
    if (status === 'COMPLETADO') {
      const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
      if (patient) {
        addToHistory(task.pacienteId, {
          accion: `Estudio completado: ${task.descripcion}`,
          detalles: data,
          usuario: currentUser?.nombre,
          timestamp: new Date().toISOString()
        });

        addNotification({
          para: 'MEDICO',
          tipo: 'RESULTADOS_LISTOS',
          titulo: 'Resultados de estudios listos',
          mensaje: `Paciente: ${patient.nombre} - ${task.descripcion}`,
          prioridad: 'ALTA'
        });

        // Si el paciente está EN_ESTUDIOS, cambiar a EN_ESPERA
        if (patient.estado === 'EN_ESTUDIOS') {
          updatePatientState(task.pacienteId, 'EN_ESPERA', currentUser?.nombre);
        }
      }
      completeTask('LABORATORIO', taskId);
    }
  };

  // Obtener estudios del localStorage
  const getLabStudies = () => {
    return JSON.parse(localStorage.getItem('labStudies') || '[]');
  };

  const allStudies = getLabStudies();
  const pendingStudies = labTasks;
  const inProgressStudies = allStudies.filter(s => s.estado === 'EN_PROCESO');
  const completedStudies = allStudies.filter(s => s.estado === 'COMPLETADO');

  // Filtrar por búsqueda
  const filterStudies = (studies) => {
    if (!searchTerm) return studies;
    return studies.filter(s => {
      const patient = systemState.pacientes.find(p => p.id === s.pacienteId);
      return patient?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.tipo?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const handleStartStudy = (taskId) => {
    const task = labTasks.find(t => t.id === taskId);
    if (!task) return;

    // Verificar si requiere sedación
    const requiresSedation = ['Radiográficos', 'Ecográficos', 'Electrocardiográficos'].some(type => 
      task.descripcion.includes(type)
    );

    if (requiresSedation) {
      setSelectedStudy(task);
      setShowSedationModal(true);
    } else {
      processStudy(taskId, 'EN_PROCESO');
      setCurrentSection('en-proceso');
    }
  };

  const handleConfirmSedation = () => {
    if (selectedStudy) {
      processStudy(selectedStudy.id, 'EN_PROCESO', {
        sedacionAutorizada: true,
        autorizadoPor: currentUser?.nombre
      });
      setShowSedationModal(false);
      setSelectedStudy(null);
      setCurrentSection('en-proceso');
    }
  };

  const handleUploadResults = (study) => {
    setSelectedStudy(study);
    setResultsForm({
      resultados: '',
      observaciones: '',
      archivos: []
    });
    setShowResultsModal(true);
  };

  const handleSubmitResults = () => {
    if (!selectedStudy || !resultsForm.resultados) return;

    processStudy(selectedStudy.id, 'COMPLETADO', {
      resultados: resultsForm.resultados,
      observaciones: resultsForm.observaciones,
      archivos: resultsForm.archivos,
      procesadoPor: currentUser?.nombre
    });

    setShowResultsModal(false);
    setSelectedStudy(null);
    setResultsForm({ resultados: '', observaciones: '', archivos: [] });
    setCurrentSection('completados');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setResultsForm(prev => ({
      ...prev,
      archivos: [...prev.archivos, ...files.map(f => f.name)]
    }));
  };

  const renderDashboard = () => {
    const pendingCount = pendingStudies.length;
    const inProgressCount = inProgressStudies.length;
    const completedTodayCount = completedStudies.filter(s => {
      const studyDate = new Date(s.fechaActualizacion);
      const today = new Date();
      return studyDate.toDateString() === today.toDateString();
    }).length;

    return (
      <div className="lab-dashboard-content">
        <h2>📊 {t('laboratorio.title')}</h2>
        
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">{t('laboratorio.pendingTests')}</div>
            </div>
          </div>
          
          <div className="stat-card processing">
            <div className="stat-icon">🔬</div>
            <div className="stat-info">
              <div className="stat-value">{inProgressCount}</div>
              <div className="stat-label">{t('laboratorio.inProgress')}</div>
            </div>
          </div>
          
          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{completedTodayCount}</div>
              <div className="stat-label">{t('laboratorio.completedToday')}</div>
            </div>
          </div>
        </div>

        <div className="recent-studies">
          <h3>📋 {t('laboratorio.recentStudies')}</h3>
          {pendingStudies.slice(0, 5).map(task => {
            const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
            return (
              <div key={task.id} className="study-item">
                <div className="study-info">
                  <div className="study-patient">
                    <strong>{patient?.nombre}</strong>
                    <span className="study-type">{task.descripcion}</span>
                  </div>
                  <div className="study-meta">
                    <span className={`priority-badge ${task.prioridad?.toLowerCase()}`}>
                      {task.prioridad}
                    </span>
                    <span className="study-time">
                      {new Date(task.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button 
                  className="btn-start-study"
                  onClick={() => handleStartStudy(task.id)}
                >
                  {t('laboratorio.start')}
                </button>
              </div>
            );
          })}
          {pendingStudies.length === 0 && (
            <p className="empty-message">{t('laboratorio.noPending')}</p>
          )}
        </div>
      </div>
    );
  };

  const renderPendingStudies = () => {
    const filtered = filterStudies(pendingStudies);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>⏳ {t('laboratorio.pendingTests')}</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder={t('laboratorio.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
        </div>

        <div className="studies-list">
          {filtered.map(task => {
            const patient = systemState.pacientes.find(p => p.id === task.pacienteId);
            return (
              <div key={task.id} className="study-card">
                <div className="study-card-header">
                  <div className="patient-info">
                    <h3>{patient?.nombre}</h3>
                    <p>{patient?.especie} - {patient?.raza}</p>
                  </div>
                  <span className={`priority-badge ${task.prioridad?.toLowerCase()}`}>
                    {task.prioridad}
                  </span>
                </div>
                <div className="study-card-body">
                  <div className="study-detail">
                    <span className="label">{t('laboratorio.studyType')}:</span>
                    <span className="value">{task.descripcion}</span>
                  </div>
                  <div className="study-detail">
                    <span className="label">{t('laboratorio.requested')}:</span>
                    <span className="value">{new Date(task.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="study-detail">
                    <span className="label">{t('recepcion.patient.owner')}:</span>
                    <span className="value">{patient?.propietario}</span>
                  </div>
                </div>
                <div className="study-card-footer">
                  <button 
                    className="btn-primary"
                    onClick={() => handleStartStudy(task.id)}
                  >
                    {t('laboratorio.startStudy')}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="empty-message">{t('laboratorio.noStudiesFound')}</p>
          )}
        </div>
      </div>
    );
  };

  const renderInProgressStudies = () => {
    const filtered = filterStudies(inProgressStudies);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>🔬 Estudios en Proceso</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
        </div>

        <div className="studies-list">
          {filtered.map(study => {
            const patient = systemState.pacientes.find(p => p.id === study.pacienteId);
            return (
              <div key={study.id} className="study-card processing">
                <div className="study-card-header">
                  <div className="patient-info">
                    <h3>{patient?.nombre}</h3>
                    <p>{patient?.especie} - {patient?.raza}</p>
                  </div>
                  <span className="status-badge processing">En Proceso</span>
                </div>
                <div className="study-card-body">
                  <div className="study-detail">
                    <span className="label">Tipo:</span>
                    <span className="value">{study.tipo}</span>
                  </div>
                  <div className="study-detail">
                    <span className="label">Iniciado:</span>
                    <span className="value">{new Date(study.fechaActualizacion).toLocaleString()}</span>
                  </div>
                  {study.sedacionAutorizada && (
                    <div className="study-detail">
                      <span className="label">⚠️ Sedación Autorizada</span>
                    </div>
                  )}
                </div>
                <div className="study-card-footer">
                  <button 
                    className="btn-success"
                    onClick={() => handleUploadResults(study)}
                  >
                    Subir Resultados
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="empty-message">No hay estudios en proceso</p>
          )}
        </div>
      </div>
    );
  };

  const renderCompletedStudies = () => {
    const filtered = filterStudies(completedStudies);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>✅ Estudios Completados</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
        </div>

        <div className="studies-list">
          {filtered.map(study => {
            const patient = systemState.pacientes.find(p => p.id === study.pacienteId);
            return (
              <div key={study.id} className="study-card completed">
                <div className="study-card-header">
                  <div className="patient-info">
                    <h3>{patient?.nombre}</h3>
                    <p>{patient?.especie} - {patient?.raza}</p>
                  </div>
                  <span className="status-badge completed">Completado</span>
                </div>
                <div className="study-card-body">
                  <div className="study-detail">
                    <span className="label">Tipo:</span>
                    <span className="value">{study.tipo}</span>
                  </div>
                  <div className="study-detail">
                    <span className="label">Completado:</span>
                    <span className="value">{new Date(study.fechaActualizacion).toLocaleString()}</span>
                  </div>
                  <div className="study-detail">
                    <span className="label">Procesado por:</span>
                    <span className="value">{study.procesadoPor}</span>
                  </div>
                  {study.resultados && (
                    <div className="study-results">
                      <strong>Resultados:</strong>
                      <p>{study.resultados}</p>
                    </div>
                  )}
                  {study.observaciones && (
                    <div className="study-observations">
                      <strong>Observaciones:</strong>
                      <p>{study.observaciones}</p>
                    </div>
                  )}
                  {study.archivos && study.archivos.length > 0 && (
                    <div className="study-files">
                      <strong>Archivos:</strong>
                      <ul>
                        {study.archivos.map((file, idx) => (
                          <li key={idx}>📎 {file}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="empty-message">No hay estudios completados</p>
          )}
        </div>
      </div>
    );
  };

  const renderHistorySection = () => {
    const allStudiesHistory = [...allStudies].sort((a, b) => 
      new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion)
    );
    const filtered = filterStudies(allStudiesHistory);

    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>📚 Historial Completo</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
            )}
          </div>
        </div>

        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Tipo de Estudio</th>
                <th>Estado</th>
                <th>Procesado por</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(study => {
                const patient = systemState.pacientes.find(p => p.id === study.pacienteId);
                return (
                  <tr key={study.id}>
                    <td>{new Date(study.fechaActualizacion).toLocaleString()}</td>
                    <td>{patient?.nombre}</td>
                    <td>{study.tipo}</td>
                    <td>
                      <span className={`status-badge ${study.estado.toLowerCase()}`}>
                        {study.estado}
                      </span>
                    </td>
                    <td>{study.procesadoPor || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="empty-message">{t('laboratorio.noStudiesFound')}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="laboratorio-dashboard">
      <div className="lab-sidebar">
        <div className="sidebar-header">
          <h2>🔬 {t('roles.LABORATORIO')}</h2>
          <p>{currentUser?.nombre}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={currentSection === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">{t('recepcion.dashboard')}</span>
          </button>
          
          <button
            className={currentSection === 'pendientes' ? 'active' : ''}
            onClick={() => setCurrentSection('pendientes')}
          >
            <span className="nav-icon">⏳</span>
            <span className="nav-text">{t('laboratorio.pendingTests')}</span>
            {pendingStudies.length > 0 && (
              <span className="nav-badge">{pendingStudies.length}</span>
            )}
          </button>
          
          <button
            className={currentSection === 'en-proceso' ? 'active' : ''}
            onClick={() => setCurrentSection('en-proceso')}
          >
            <span className="nav-icon">🔬</span>
            <span className="nav-text">{t('laboratorio.inProgress')}</span>
            {inProgressStudies.length > 0 && (
              <span className="nav-badge">{inProgressStudies.length}</span>
            )}
          </button>
          
          <button
            className={currentSection === 'completados' ? 'active' : ''}
            onClick={() => setCurrentSection('completados')}
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">{t('laboratorio.completed')}</span>
          </button>
          
          <button
            className={currentSection === 'historial' ? 'active' : ''}
            onClick={() => setCurrentSection('historial')}
          >
            <span className="nav-icon">📚</span>
            <span className="nav-text">{t('laboratorio.history')}</span>
          </button>
        </nav>
      </div>

      <div className="lab-main">
        {currentSection === 'dashboard' && renderDashboard()}
        {currentSection === 'pendientes' && renderPendingStudies()}
        {currentSection === 'en-proceso' && renderInProgressStudies()}
        {currentSection === 'completados' && renderCompletedStudies()}
        {currentSection === 'historial' && renderHistorySection()}
      </div>

      {/* Modal de Autorización de Sedación */}
      {showSedationModal && (
        <div className="modal-overlay" onClick={() => setShowSedationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ {t('laboratorio.sedationAuth')}</h2>
            <p>{t('laboratorio.sedationRequired')}</p>
            <div className="sedation-info">
              <p><strong>{t('recepcion.patient.name')}:</strong> {systemState.pacientes.find(p => p.id === selectedStudy?.pacienteId)?.nombre}</p>
              <p><strong>{t('laboratorio.studyType')}:</strong> {selectedStudy?.descripcion}</p>
              <p className="warning-text">
                ⚠️ {t('laboratorio.consentWarning')}
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSedationModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn-primary" onClick={handleConfirmSedation}>
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Subir Resultados */}
      {showResultsModal && (
        <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>📋 {t('laboratorio.uploadResults')}</h2>
            <div className="results-form">
              <div className="form-group">
                <label>{t('recepcion.patient.name')}:</label>
                <p className="readonly">{systemState.pacientes.find(p => p.id === selectedStudy?.pacienteId)?.nombre}</p>
              </div>
              <div className="form-group">
                <label>{t('laboratorio.studyType')}:</label>
                <p className="readonly">{selectedStudy?.tipo}</p>
              </div>
              <div className="form-group">
                <label>{t('laboratorio.results')}: *</label>
                <textarea
                  value={resultsForm.resultados}
                  onChange={(e) => setResultsForm({...resultsForm, resultados: e.target.value})}
                  placeholder={t('laboratorio.enterResults')}
                  rows={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('laboratorio.observations')}:</label>
                <textarea
                  value={resultsForm.observaciones}
                  onChange={(e) => setResultsForm({...resultsForm, observaciones: e.target.value})}
                  placeholder={t('laboratorio.observationsPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>{t('laboratorio.attachFiles')}:</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
                {resultsForm.archivos.length > 0 && (
                  <ul className="file-list">
                    {resultsForm.archivos.map((file, idx) => (
                      <li key={idx}>📎 {file}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowResultsModal(false)}>
                {t('common.cancel')}
              </button>
              <button 
                className="btn-success" 
                onClick={handleSubmitResults}
                disabled={!resultsForm.resultados}
              >
                {t('laboratorio.saveAndNotify')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratorioDashboard;
