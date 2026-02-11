// src/components/dashboards/LaboratorioDashboard.jsx
// Dashboard de Laboratorio - Conectado a API real

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useLaboratorio from '../../hooks/useLaboratorio';
import './LaboratorioDashboard.css';

const LaboratorioDashboard = () => {
  const { t } = useTranslation();
  const {
    estudios,
    stats,
    loading,
    error,
    loadEstudios,
    iniciarEstudio,
    subirResultados,
    filterEstudios,
    sortByUrgency,
    tipoToLabel,
    requiereSedacion,
    statusToClass,
    urgencyToClass,
  } = useLaboratorio();

  const [currentSection, setCurrentSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showSedationModal, setShowSedationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resultsForm, setResultsForm] = useState({
    resultados: '',
    observaciones: '',
    archivos: [],
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Mostrar toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Iniciar estudio (con verificación de sedación)
  const handleStartStudy = (estudio) => {
    if (requiereSedacion(estudio.type)) {
      setSelectedStudy(estudio);
      setShowSedationModal(true);
    } else {
      confirmStartStudy(estudio.id);
    }
  };

  const confirmStartStudy = async (estudioId) => {
    console.log('[LaboratorioDashboard] confirmStartStudy - estudioId:', estudioId);
    setActionLoading(true);
    const result = await iniciarEstudio(estudioId);
    console.log('[LaboratorioDashboard] confirmStartStudy - result:', result);
    setActionLoading(false);

    if (result.success) {
      showToast(t('laboratorio.studyStarted') || 'Estudio iniciado correctamente');
      setShowSedationModal(false);
      setSelectedStudy(null);
    } else {
      showToast(result.error || 'Error al iniciar estudio', 'error');
    }
  };

  const handleConfirmSedation = () => {
    if (selectedStudy) {
      confirmStartStudy(selectedStudy.id);
    }
  };

  // Subir resultados
  const handleUploadResults = (estudio) => {
    setSelectedStudy(estudio);
    setResultsForm({
      resultados: '',
      observaciones: '',
      archivos: [],
    });
    setShowResultsModal(true);
  };

  const handleSubmitResults = async () => {
    if (!selectedStudy || !resultsForm.resultados.trim()) {
      showToast('Por favor ingresa los resultados', 'error');
      return;
    }

    setActionLoading(true);
    const result = await subirResultados(selectedStudy.id, {
      results: resultsForm.resultados,
      observaciones: resultsForm.observaciones,
      resultFiles: resultsForm.archivos,
    });
    setActionLoading(false);

    if (result.success) {
      showToast(t('laboratorio.resultsUploaded') || 'Resultados guardados y notificados');
      setShowResultsModal(false);
      setSelectedStudy(null);
      setResultsForm({ resultados: '', observaciones: '', archivos: [] });
    } else {
      showToast(result.error || 'Error al guardar resultados', 'error');
    }
  };

  // Ver detalle de estudio
  const handleViewDetail = (estudio) => {
    setSelectedStudy(estudio);
    setShowDetailModal(true);
  };

  // Convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Convertir cada archivo a base64 para poder mostrarlo
    const filePromises = files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        name: file.name,
        type: file.type,
        data: base64
      };
    });
    
    const processedFiles = await Promise.all(filePromises);
    
    setResultsForm(prev => ({
      ...prev,
      archivos: [...prev.archivos, ...processedFiles],
    }));
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Obtener datos filtrados y ordenados
  const getFilteredStudies = (estudiosArray) => {
    const filtered = filterEstudios(estudiosArray, searchTerm);
    return sortByUrgency(filtered);
  };

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderDashboard = () => (
    <div className="lab-dashboard-content">
      <h2>📊 {t('laboratorio.title') || 'Panel de Laboratorio'}</h2>
      
      <div className="stats-grid">
        <div className="stat-card pending" onClick={() => setCurrentSection('pendientes')}>
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pendientes}</div>
            <div className="stat-label">{t('laboratorio.pendingTests') || 'Pendientes'}</div>
          </div>
        </div>
        
        <div className="stat-card processing" onClick={() => setCurrentSection('en-proceso')}>
          <div className="stat-icon">🔬</div>
          <div className="stat-info">
            <div className="stat-value">{stats.enProceso}</div>
            <div className="stat-label">{t('laboratorio.inProgress') || 'En Proceso'}</div>
          </div>
        </div>
        
        <div className="stat-card completed" onClick={() => setCurrentSection('completados')}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.completadosHoy}</div>
            <div className="stat-label">{t('laboratorio.completedToday') || 'Completados Hoy'}</div>
          </div>
        </div>
      </div>

      <div className="recent-studies">
        <h3>📋 {t('laboratorio.recentStudies') || 'Estudios Recientes'}</h3>
        {loading ? (
          <div className="loading-spinner">Cargando...</div>
        ) : estudios.pendientes.length > 0 ? (
          getFilteredStudies(estudios.pendientes).slice(0, 5).map(estudio => (
            <div key={estudio.id} className="study-item">
              <div className="study-info">
                <div className="study-patient">
                  <strong>{estudio.pet?.nombre || 'Paciente'}</strong>
                  <span className="study-type">{tipoToLabel(estudio.type)}</span>
                </div>
                <div className="study-meta">
                  <span className={`priority-badge ${urgencyToClass(estudio.urgency)}`}>
                    {estudio.urgency}
                  </span>
                  <span className="study-time">
                    {formatDate(estudio.requestedAt)}
                  </span>
                </div>
              </div>
              <button 
                className="btn-start-study"
                onClick={() => handleStartStudy(estudio)}
                disabled={actionLoading}
              >
                {t('laboratorio.start') || 'Iniciar'}
              </button>
            </div>
          ))
        ) : (
          <p className="empty-message">{t('laboratorio.noPending') || 'No hay estudios pendientes'}</p>
        )}
      </div>
    </div>
  );

  const renderPendingStudies = () => {
    const filtered = getFilteredStudies(estudios.pendientes);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>⏳ {t('laboratorio.pendingTests') || 'Estudios Pendientes'}</h2>
          <div className="header-actions">
            <button className="btn-refresh" onClick={loadEstudios} disabled={loading}>
              🔄 {loading ? 'Cargando...' : 'Actualizar'}
            </button>
            <div className="search-bar">
              <input
                type="text"
                placeholder={t('laboratorio.searchPlaceholder') || 'Buscar paciente o estudio...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>
          </div>
        </div>

        <div className="studies-list">
          {filtered.map(estudio => (
            <div key={estudio.id} className="study-card">
              <div className="study-card-header">
                <div className="patient-info">
                  <h3>{estudio.pet?.nombre || 'Paciente'}</h3>
                  <p>{estudio.pet?.especie} - {estudio.pet?.raza || 'Sin raza'}</p>
                </div>
                <span className={`priority-badge ${urgencyToClass(estudio.urgency)}`}>
                  {estudio.urgency}
                </span>
              </div>
              <div className="study-card-body">
                <div className="study-detail">
                  <span className="label">{t('laboratorio.studyType') || 'Tipo'}:</span>
                  <span className="value">{tipoToLabel(estudio.type)}</span>
                </div>
                <div className="study-detail">
                  <span className="label">{t('laboratorio.requested') || 'Solicitado'}:</span>
                  <span className="value">{formatDate(estudio.requestedAt)}</span>
                </div>
                <div className="study-detail">
                  <span className="label">{t('recepcion.patient.owner') || 'Propietario'}:</span>
                  <span className="value">{estudio.pet?.owner?.nombre || '-'}</span>
                </div>
                {estudio.notes && (
                  <div className="study-detail">
                    <span className="label">Notas:</span>
                    <span className="value">{estudio.notes}</span>
                  </div>
                )}
              </div>
              <div className="study-card-footer">
                <button 
                  className="btn-primary"
                  onClick={() => handleStartStudy(estudio)}
                  disabled={actionLoading}
                >
                  {t('laboratorio.startStudy') || 'Iniciar Estudio'}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="empty-message">{t('laboratorio.noStudiesFound') || 'No se encontraron estudios'}</p>
          )}
        </div>
      </div>
    );
  };

  const renderInProgressStudies = () => {
    const filtered = getFilteredStudies(estudios.enProceso);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>🔬 {t('laboratorio.inProgress') || 'En Proceso'}</h2>
          <div className="header-actions">
            <button className="btn-refresh" onClick={loadEstudios} disabled={loading}>
              🔄 {loading ? 'Cargando...' : 'Actualizar'}
            </button>
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
        </div>

        <div className="studies-list">
          {filtered.map(estudio => (
            <div key={estudio.id} className="study-card processing">
              <div className="study-card-header">
                <div className="patient-info">
                  <h3>{estudio.pet?.nombre || 'Paciente'}</h3>
                  <p>{estudio.pet?.especie} - {estudio.pet?.raza || 'Sin raza'}</p>
                </div>
                <span className="status-badge processing">En Proceso</span>
              </div>
              <div className="study-card-body">
                <div className="study-detail">
                  <span className="label">Tipo:</span>
                  <span className="value">{tipoToLabel(estudio.type)}</span>
                </div>
                <div className="study-detail">
                  <span className="label">Iniciado:</span>
                  <span className="value">{formatDate(estudio.updatedAt)}</span>
                </div>
                {estudio.notes && (
                  <div className="study-detail">
                    <span className="label">Notas del médico:</span>
                    <span className="value">{estudio.notes}</span>
                  </div>
                )}
              </div>
              <div className="study-card-footer">
                <button 
                  className="btn-success"
                  onClick={() => handleUploadResults(estudio)}
                  disabled={actionLoading}
                >
                  {t('laboratorio.uploadResults') || 'Subir Resultados'}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="empty-message">No hay estudios en proceso</p>
          )}
        </div>
      </div>
    );
  };

  const renderCompletedStudies = () => {
    const filtered = getFilteredStudies(estudios.completados);
    
    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>✅ {t('laboratorio.completed') || 'Completados'}</h2>
          <div className="header-actions">
            <button className="btn-refresh" onClick={loadEstudios} disabled={loading}>
              🔄 {loading ? 'Cargando...' : 'Actualizar'}
            </button>
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
        </div>

        <div className="studies-list">
          {filtered.map(estudio => (
            <div key={estudio.id} className="study-card completed">
              <div className="study-card-header">
                <div className="patient-info">
                  <h3>{estudio.pet?.nombre || 'Paciente'}</h3>
                  <p>{estudio.pet?.especie} - {estudio.pet?.raza || 'Sin raza'}</p>
                </div>
                <span className="status-badge completed">Completado</span>
              </div>
              <div className="study-card-body">
                <div className="study-detail">
                  <span className="label">Tipo:</span>
                  <span className="value">{tipoToLabel(estudio.type)}</span>
                </div>
                <div className="study-detail">
                  <span className="label">Completado:</span>
                  <span className="value">{formatDate(estudio.completedAt)}</span>
                </div>
                {estudio.results && (
                  <div className="study-results">
                    <strong>Resultados:</strong>
                    <p>{estudio.results.substring(0, 150)}{estudio.results.length > 150 ? '...' : ''}</p>
                  </div>
                )}
              </div>
              <div className="study-card-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => handleViewDetail(estudio)}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="empty-message">No hay estudios completados</p>
          )}
        </div>
      </div>
    );
  };

  const renderHistorySection = () => {
    const allSorted = [...estudios.todos].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    const filtered = filterEstudios(allSorted, searchTerm);

    return (
      <div className="lab-section-content">
        <div className="section-header">
          <h2>📚 {t('laboratorio.history') || 'Historial'}</h2>
          <div className="header-actions">
            <button className="btn-refresh" onClick={loadEstudios} disabled={loading}>
              🔄 {loading ? 'Cargando...' : 'Actualizar'}
            </button>
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
        </div>

        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Propietario</th>
                <th>Tipo de Estudio</th>
                <th>Urgencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(estudio => (
                <tr key={estudio.id}>
                  <td>{formatDate(estudio.updatedAt)}</td>
                  <td>{estudio.pet?.nombre || '-'}</td>
                  <td>{estudio.pet?.owner?.nombre || '-'}</td>
                  <td>{tipoToLabel(estudio.type)}</td>
                  <td>
                    <span className={`priority-badge ${urgencyToClass(estudio.urgency)}`}>
                      {estudio.urgency}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${statusToClass(estudio.status)}`}>
                      {estudio.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-small"
                      onClick={() => handleViewDetail(estudio)}
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="empty-message">{t('laboratorio.noStudiesFound') || 'No se encontraron estudios'}</p>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MODALS
  // ============================================================================

  const renderSedationModal = () => (
    <div className="modal-overlay" onClick={() => setShowSedationModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ {t('laboratorio.sedationAuth') || 'Autorización de Sedación'}</h2>
        <p>{t('laboratorio.sedationRequired') || 'Este estudio puede requerir sedación del paciente.'}</p>
        <div className="sedation-info">
          <p><strong>Paciente:</strong> {selectedStudy?.pet?.nombre}</p>
          <p><strong>Tipo de estudio:</strong> {tipoToLabel(selectedStudy?.type)}</p>
          <p className="warning-text">
            ⚠️ {t('laboratorio.consentWarning') || 'Confirme que tiene el consentimiento del propietario.'}
          </p>
        </div>
        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={() => setShowSedationModal(false)}
            disabled={actionLoading}
          >
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirmSedation}
            disabled={actionLoading}
          >
            {actionLoading ? 'Procesando...' : t('common.confirm') || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderResultsModal = () => (
    <div className="modal-overlay" onClick={() => setShowResultsModal(false)}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <h2>📋 {t('laboratorio.uploadResults') || 'Subir Resultados'}</h2>
        <div className="results-form">
          <div className="form-group">
            <label>Paciente:</label>
            <p className="readonly">{selectedStudy?.pet?.nombre}</p>
          </div>
          <div className="form-group">
            <label>Tipo de Estudio:</label>
            <p className="readonly">{tipoToLabel(selectedStudy?.type)}</p>
          </div>
          <div className="form-group">
            <label>{t('laboratorio.results') || 'Resultados'}: *</label>
            <textarea
              value={resultsForm.resultados}
              onChange={(e) => setResultsForm({...resultsForm, resultados: e.target.value})}
              placeholder={t('laboratorio.enterResults') || 'Ingrese los resultados del estudio...'}
              rows={6}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('laboratorio.observations') || 'Observaciones'}:</label>
            <textarea
              value={resultsForm.observaciones}
              onChange={(e) => setResultsForm({...resultsForm, observaciones: e.target.value})}
              placeholder={t('laboratorio.observationsPlaceholder') || 'Observaciones adicionales...'}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>{t('laboratorio.attachFiles') || 'Adjuntar Archivos'}:</label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
            {resultsForm.archivos.length > 0 && (
              <div className="uploaded-files-preview">
                {resultsForm.archivos.map((file, idx) => {
                  const isImage = file.type?.startsWith('image/') || (file.data && file.data.startsWith('data:image/'));
                  return (
                    <div key={idx} className="uploaded-file-item">
                      {isImage && file.data ? (
                        <img src={file.data} alt={file.name} className="file-thumb" />
                      ) : (
                        <span className="file-icon-small">📎</span>
                      )}
                      <span className="file-name-small">{file.name || `Archivo ${idx + 1}`}</span>
                      <button 
                        type="button"
                        className="remove-file-btn"
                        onClick={() => {
                          setResultsForm(prev => ({
                            ...prev,
                            archivos: prev.archivos.filter((_, i) => i !== idx)
                          }));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={() => setShowResultsModal(false)}
            disabled={actionLoading}
          >
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button 
            className="btn-success" 
            onClick={handleSubmitResults}
            disabled={!resultsForm.resultados.trim() || actionLoading}
          >
            {actionLoading ? 'Guardando...' : t('laboratorio.saveAndNotify') || 'Guardar y Notificar'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailModal = () => (
    <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
      <div className="modal-content large study-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-detail">
          <h2>🔍 Detalle del Estudio</h2>
          <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
        </div>
        
        <div className="detail-content">
          {/* Información del Paciente */}
          <div className="detail-section patient-section">
            <div className="section-title">
              <span className="section-icon">🐾</span>
              <h3>Información del Paciente</h3>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Nombre</span>
                <span className="value">{selectedStudy?.pet?.nombre || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Especie</span>
                <span className="value">{selectedStudy?.pet?.especie || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Raza</span>
                <span className="value">{selectedStudy?.pet?.raza || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Propietario</span>
                <span className="value">{selectedStudy?.pet?.owner?.nombre || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Teléfono</span>
                <span className="value">{selectedStudy?.pet?.owner?.telefono || '-'}</span>
              </div>
            </div>
          </div>
          
          {/* Información del Estudio */}
          <div className="detail-section study-section">
            <div className="section-title">
              <span className="section-icon">🔬</span>
              <h3>Información del Estudio</h3>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Tipo de Estudio</span>
                <span className="value type-value">{tipoToLabel(selectedStudy?.type)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Urgencia</span>
                <span className={`priority-badge large ${urgencyToClass(selectedStudy?.urgency)}`}>
                  {selectedStudy?.urgency === 'URGENTE' ? '⚡ URGENTE' : '📋 NORMAL'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Estado</span>
                <span className={`status-badge large ${statusToClass(selectedStudy?.status)}`}>
                  {selectedStudy?.status === 'COMPLETADO' ? '✅ Completado' : 
                   selectedStudy?.status === 'EN_PROCESO' ? '🔄 En Proceso' : '⏳ Pendiente'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Solicitado</span>
                <span className="value">{formatDate(selectedStudy?.requestedAt)}</span>
              </div>
              {selectedStudy?.completedAt && (
                <div className="detail-item">
                  <span className="label">Completado</span>
                  <span className="value">{formatDate(selectedStudy?.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notas del Médico */}
          {selectedStudy?.notes && (
            <div className="detail-section notes-section">
              <div className="section-title">
                <span className="section-icon">📝</span>
                <h3>Notas del Médico</h3>
              </div>
              <div className="notes-content">
                <p>{selectedStudy.notes}</p>
              </div>
            </div>
          )}

          {/* Resultados */}
          {selectedStudy?.results && (
            <div className="detail-section results-section">
              <div className="section-title">
                <span className="section-icon">📊</span>
                <h3>Resultados</h3>
              </div>
              <div className="results-content">
                <pre>{selectedStudy.results}</pre>
              </div>
            </div>
          )}

          {/* Archivos Adjuntos */}
          {selectedStudy?.resultFiles && selectedStudy.resultFiles.length > 0 && (
            <div className="detail-section files-section">
              <div className="section-title">
                <span className="section-icon">📁</span>
                <h3>Archivos Adjuntos</h3>
              </div>
              <div className="files-gallery">
                {selectedStudy.resultFiles.map((file, idx) => {
                  // Detectar si es base64 data URI
                  const isBase64 = typeof file === 'string' && file.startsWith('data:');
                  const isBase64Image = isBase64 && file.startsWith('data:image/');
                  const isBase64PDF = isBase64 && file.startsWith('data:application/pdf');
                  
                  // Para URLs normales
                  const isImageUrl = !isBase64 && /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
                  const isPDFUrl = !isBase64 && /\.pdf$/i.test(file);
                  
                  const isImage = isBase64Image || isImageUrl;
                  const isPDF = isBase64PDF || isPDFUrl;
                  
                  // Nombre del archivo para mostrar
                  const fileName = isBase64 
                    ? `Archivo ${idx + 1}` 
                    : (file.split('/').pop() || `Archivo ${idx + 1}`);
                  
                  return (
                    <div key={idx} className="file-card">
                      {isImage ? (
                        <a href={file} target="_blank" rel="noopener noreferrer" className="file-preview image-preview">
                          <img src={file} alt={`Archivo ${idx + 1}`} />
                          <div className="file-overlay">
                            <span>🔍 Ver imagen</span>
                          </div>
                        </a>
                      ) : isPDF ? (
                        <a href={file} target="_blank" rel="noopener noreferrer" className="file-preview pdf-preview">
                          <div className="pdf-icon">📄</div>
                          <span className="file-name">{fileName}</span>
                          <div className="file-overlay">
                            <span>📥 Ver PDF</span>
                          </div>
                        </a>
                      ) : (
                        <a href={file} target="_blank" rel="noopener noreferrer" className="file-preview generic-preview">
                          <div className="file-icon">📎</div>
                          <span className="file-name">{fileName}</span>
                          <div className="file-overlay">
                            <span>📥 Descargar</span>
                          </div>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
            Cerrar
          </button>
          {selectedStudy?.status === 'COMPLETADO' && (
            <button className="btn-primary" onClick={() => window.print()}>
              🖨️ Imprimir
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="laboratorio-dashboard">
      {/* Toast notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="lab-sidebar">
        <div className="sidebar-header">
          <h2>🔬 {t('roles.LABORATORIO') || 'Laboratorio'}</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={currentSection === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">{t('recepcion.dashboard') || 'Dashboard'}</span>
          </button>
          
          <button
            className={currentSection === 'pendientes' ? 'active' : ''}
            onClick={() => setCurrentSection('pendientes')}
          >
            <span className="nav-icon">⏳</span>
            <span className="nav-text">{t('laboratorio.pendingTests') || 'Pendientes'}</span>
            {stats.pendientes > 0 && (
              <span className="nav-badge">{stats.pendientes}</span>
            )}
          </button>
          
          <button
            className={currentSection === 'en-proceso' ? 'active' : ''}
            onClick={() => setCurrentSection('en-proceso')}
          >
            <span className="nav-icon">🔬</span>
            <span className="nav-text">{t('laboratorio.inProgress') || 'En Proceso'}</span>
            {stats.enProceso > 0 && (
              <span className="nav-badge">{stats.enProceso}</span>
            )}
          </button>
          
          <button
            className={currentSection === 'completados' ? 'active' : ''}
            onClick={() => setCurrentSection('completados')}
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">{t('laboratorio.completed') || 'Completados'}</span>
          </button>
          
          <button
            className={currentSection === 'historial' ? 'active' : ''}
            onClick={() => setCurrentSection('historial')}
          >
            <span className="nav-icon">📚</span>
            <span className="nav-text">{t('laboratorio.history') || 'Historial'}</span>
          </button>
        </nav>
      </div>

      <div className="lab-main">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
            <button onClick={loadEstudios}>Reintentar</button>
          </div>
        )}

        {currentSection === 'dashboard' && renderDashboard()}
        {currentSection === 'pendientes' && renderPendingStudies()}
        {currentSection === 'en-proceso' && renderInProgressStudies()}
        {currentSection === 'completados' && renderCompletedStudies()}
        {currentSection === 'historial' && renderHistorySection()}
      </div>

      {/* Modals */}
      {showSedationModal && renderSedationModal()}
      {showResultsModal && renderResultsModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default LaboratorioDashboard;
