import { useState } from 'react';

function WorkflowNode({ node, onNavigate, onGoBack, onReset, canGoBack, selectedStudies, setSelectedStudies }) {
  const [localStudies, setLocalStudies] = useState([]);

  if (!node) {
    return <div className="node-container">Nodo no encontrado</div>;
  }

  const getNodeTypeIcon = () => {
    if (node.tipo === 'decision') return '❓';
    if (node.tipo === 'seleccion_multiple') return '📋';
    if (node.tipo === 'bucle') return '🔄';
    if (node.final) return '✅';
    return '📍';
  };

  const getEtapaColor = () => {
    const colors = {
      'RECEPCION': '#4CAF50',
      'TRIAGE': '#FF9800',
      'ADMISION': '#2196F3',
      'ASIGNACION': '#9C27B0',
      'REGISTRO': '#00BCD4',
      'CONSULTA': '#3F51B5',
      'INTERCONSULTA': '#673AB7',
      'DIAGNOSTICO': '#E91E63',
      'AUTORIZACION': '#FF5722',
      'PROCESO_ESTUDIO': '#795548',
      'CIRUGIA_PREP': '#F44336',
      'CIRUGIA_ACTO': '#D32F2F',
      'HOSPITALIZACION': '#607D8B',
      'FARMACIA_INTERNA': '#009688',
      'FARMACIA_SALIDA': '#4DB6AC',
      'SALIDA': '#8BC34A'
    };
    return colors[node.etapa] || '#757575';
  };

  const handleStudyToggle = (study) => {
    const newStudies = localStudies.includes(study)
      ? localStudies.filter(s => s !== study)
      : [...localStudies, study];
    setLocalStudies(newStudies);
  };

  const handleContinueWithStudies = () => {
    setSelectedStudies(localStudies);
    if (node.siguiente_paso) {
      onNavigate(node.siguiente_paso);
    }
  };

  const renderActions = () => {
    if (node.acciones && Array.isArray(node.acciones)) {
      return (
        <div className="actions-list">
          <h4>Acciones a realizar:</h4>
          <ul>
            {node.acciones.map((accion, index) => (
              <li key={index}>
                <span className="check-icon">✓</span>
                {accion}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (node.accion) {
      return (
        <div className="action-single">
          <p>{node.accion}</p>
        </div>
      );
    }
    return null;
  };

  const renderDecisionOptions = () => {
    if (node.tipo === 'decision' && node.opciones) {
      return (
        <div className="decision-options">
          <h4>{node.pregunta}</h4>
          <div className="options-grid">
            {Object.entries(node.opciones).map(([key, targetNode]) => (
              <button
                key={key}
                className="option-button"
                onClick={() => onNavigate(targetNode)}
              >
                {key.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderStudiesSelection = () => {
    if (node.tipo === 'seleccion_multiple' && node.opciones_estudios) {
      return (
        <div className="studies-selection">
          <h4>Selecciona los estudios complementarios:</h4>
          <div className="studies-grid">
            {node.opciones_estudios.map((study, index) => (
              <label key={index} className="study-checkbox">
                <input
                  type="checkbox"
                  checked={localStudies.includes(study)}
                  onChange={() => handleStudyToggle(study)}
                />
                <span>{study}</span>
              </label>
            ))}
          </div>
          <button
            className="continue-button"
            onClick={handleContinueWithStudies}
            disabled={localStudies.length === 0}
          >
            Continuar con estudios seleccionados
          </button>
        </div>
      );
    }
    return null;
  };

  const renderNavigationButtons = () => {
    if (node.final) {
      return (
        <div className="navigation-buttons">
          <button className="reset-button" onClick={onReset}>
            🔄 Reiniciar Flujo
          </button>
        </div>
      );
    }

    if (node.tipo === 'decision' || node.tipo === 'seleccion_multiple') {
      return null;
    }

    if (node.siguiente_paso) {
      return (
        <div className="navigation-buttons">
          <button className="next-button" onClick={() => onNavigate(node.siguiente_paso)}>
            Siguiente →
          </button>
        </div>
      );
    }

    return null;
  };

  const renderBucleInfo = () => {
    if (node.tipo === 'bucle') {
      return (
        <div className="bucle-info">
          <div className="info-badge">
            <strong>🔄 Proceso Repetitivo</strong>
          </div>
          {node.condicion_salida && (
            <p className="exit-condition">
              <strong>Condición de salida:</strong> {node.condicion_salida}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="node-container">
      <div className="node-header" style={{ borderLeftColor: getEtapaColor() }}>
        <div className="node-icon">{getNodeTypeIcon()}</div>
        <div className="node-title">
          <h2>{node.etapa || node.tipo || 'Nodo'}</h2>
          <span className="node-id">{node.id}</span>
        </div>
      </div>

      <div className="node-content">
        {renderBucleInfo()}
        {renderActions()}
        {renderDecisionOptions()}
        {renderStudiesSelection()}

        {node.condicion && (
          <div className="condition-note">
            <strong>Condición:</strong> {node.condicion}
          </div>
        )}

        {node.logica && (
          <div className="logic-note">
            <strong>Lógica:</strong> {node.logica}
          </div>
        )}

        {selectedStudies.length > 0 && (
          <div className="selected-studies">
            <h4>Estudios solicitados:</h4>
            <div className="studies-tags">
              {selectedStudies.map((study, index) => (
                <span key={index} className="study-tag">{study}</span>
              ))}
            </div>
          </div>
        )}

        {node.final && (
          <div className="final-message">
            <h3>✅ Flujo Completado</h3>
            <p>El paciente ha finalizado su atención en el hospital veterinario.</p>
          </div>
        )}
      </div>

      <div className="node-footer">
        {canGoBack && (
          <button className="back-button" onClick={onGoBack}>
            ← Atrás
          </button>
        )}
        {renderNavigationButtons()}
      </div>
    </div>
  );
}

export default WorkflowNode;
