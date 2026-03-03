import { useState, useCallback } from 'react';

const INITIAL_FORM = {
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  temperatura: '',
  trc: '',
  mucosas: 'ROSADAS',
  peso: '',
  hidratacion: 'NORMAL',
  nivelConciencia: 'ALERTA',
  nivelDolor: '0',
  observaciones: ''
};

function getDaysHosp(admission) {
  if (!admission) return 0;
  return Math.floor((Date.now() - new Date(admission).getTime()) / (1000 * 60 * 60 * 24));
}

function RondaRapida({ patients, onSaveVitals, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState([]);

  const current = patients[currentIndex];
  const total = patients.length;
  const progress = total > 0 ? ((completed.length) / total) * 100 : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = useCallback(async () => {
    if (!current) return;
    setSaving(true);
    try {
      const data = {
        frecuenciaCardiaca: parseFloat(form.frecuenciaCardiaca) || null,
        frecuenciaRespiratoria: parseFloat(form.frecuenciaRespiratoria) || null,
        temperatura: parseFloat(form.temperatura) || null,
        trc: parseFloat(form.trc) || null,
        mucosas: form.mucosas,
        peso: parseFloat(form.peso) || null,
        hidratacion: form.hidratacion,
        nivelConciencia: form.nivelConciencia,
        nivelDolor: parseInt(form.nivelDolor) || 0,
        observaciones: form.observaciones || null
      };
      await onSaveVitals(current.id, data);
      setCompleted(prev => [...prev, current.id]);
    } catch (err) {
      console.error('Error saving vitals in ronda:', err);
    } finally {
      setSaving(false);
    }

    // Reset form and advance
    setForm({ ...INITIAL_FORM });
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last patient done
      setTimeout(() => onClose(), 500);
    }
  }, [current, form, currentIndex, total, onSaveVitals, onClose]);

  const handleSkip = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, total, onClose]);

  if (!current) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="ronda-modal" onClick={e => e.stopPropagation()}>
          <div className="ronda-done">
            <div className="ronda-done-icon">✅</div>
            <h2>Ronda completada</h2>
            <p>{completed.length} pacientes registrados</p>
            <button className="btn-submit" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const patient = current.patient || {};
  const days = getDaysHosp(current.fechaIngreso);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ronda-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ronda-header">
          <div className="ronda-title">
            <h2>🩺 Ronda Rápida</h2>
            <span className="ronda-counter">
              Paciente {currentIndex + 1} de {total}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Progress bar */}
        <div className="ronda-progress-bar">
          <div className="ronda-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Patient info */}
        <div className="ronda-patient-info">
          <div className="ronda-patient-avatar">
            {patient.especie?.toLowerCase().includes('gato') ? '🐈' : '🐕'}
          </div>
          <div className="ronda-patient-details">
            <h3>{patient.nombre || 'Sin nombre'}</h3>
            <span>{patient.especie} • {patient.raza} • {current.type}</span>
            <span>Día {days} de hospitalización</span>
          </div>
          {current.frecuenciaMonitoreo && (
            <div className="ronda-freq-badge">
              🔄 c/{current.frecuenciaMonitoreo}
            </div>
          )}
        </div>

        {/* Quick vitals form */}
        <div className="ronda-form">
          <div className="ronda-vitals-row">
            <div className="ronda-field">
              <label>FC <span className="field-unit">bpm</span></label>
              <input
                type="number"
                name="frecuenciaCardiaca"
                value={form.frecuenciaCardiaca}
                onChange={handleChange}
                placeholder="60-200"
                autoFocus
              />
            </div>
            <div className="ronda-field">
              <label>FR <span className="field-unit">rpm</span></label>
              <input
                type="number"
                name="frecuenciaRespiratoria"
                value={form.frecuenciaRespiratoria}
                onChange={handleChange}
                placeholder="10-40"
              />
            </div>
            <div className="ronda-field">
              <label>T° <span className="field-unit">°C</span></label>
              <input
                type="number"
                step="0.1"
                name="temperatura"
                value={form.temperatura}
                onChange={handleChange}
                placeholder="38.0"
              />
            </div>
            <div className="ronda-field">
              <label>Peso <span className="field-unit">kg</span></label>
              <input
                type="number"
                step="0.01"
                name="peso"
                value={form.peso}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="ronda-vitals-row">
            <div className="ronda-field">
              <label>TRC <span className="field-unit">seg</span></label>
              <input
                type="number"
                step="0.1"
                name="trc"
                value={form.trc}
                onChange={handleChange}
                placeholder="<2"
              />
            </div>
            <div className="ronda-field">
              <label>Mucosas</label>
              <select name="mucosas" value={form.mucosas} onChange={handleChange}>
                <option value="ROSADAS">🟢 Rosadas</option>
                <option value="PALIDAS">⚪ Pálidas</option>
                <option value="CIANOTICAS">🔵 Cianóticas</option>
                <option value="ICTERICAS">🟡 Ictéricas</option>
                <option value="CONGESTIVAS">🔴 Congestivas</option>
              </select>
            </div>
            <div className="ronda-field">
              <label>Conciencia</label>
              <select name="nivelConciencia" value={form.nivelConciencia} onChange={handleChange}>
                <option value="ALERTA">✅ Alerta</option>
                <option value="SOMNOLIENTO">😴 Somnoliento</option>
                <option value="DESORIENTADO">😵 Desorientado</option>
                <option value="ESTUPOROSO">😶 Estuporoso</option>
                <option value="COMA">🚨 Coma</option>
              </select>
            </div>
            <div className="ronda-field">
              <label>Dolor: {form.nivelDolor}/10</label>
              <input
                type="range"
                min="0"
                max="10"
                name="nivelDolor"
                value={form.nivelDolor}
                onChange={handleChange}
                className="ronda-pain-slider"
              />
            </div>
          </div>

          <div className="ronda-notes-row">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={2}
              placeholder="Notas rápidas sobre el paciente..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="ronda-actions">
          <button className="btn-ronda-skip" onClick={handleSkip}>
            Saltar ⏭
          </button>
          <button className="btn-ronda-save" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Guardando...' : currentIndex < total - 1 ? '✓ Guardar y Siguiente' : '✓ Guardar y Finalizar'}
          </button>
        </div>

        {/* Patient dots */}
        <div className="ronda-dots">
          {patients.map((p, i) => (
            <span
              key={p.id}
              className={`ronda-dot ${i === currentIndex ? 'current' : ''} ${completed.includes(p.id) ? 'done' : ''}`}
              title={p.patient?.nombre}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default RondaRapida;
