import { useState, useCallback, useEffect } from 'react';
import hospitalizacionService from '../../services/hospitalizacion.service';

const SOLUTION_TYPES = [
  'NaCl 0.9% (Solución Salina)',
  'Ringer Lactato (Hartmann)',
  'Dextrosa 5%',
  'NaCl 0.45% + Dextrosa 2.5%',
  'Solución Mixta (Salina/Dextrosa)',
  'Coloides (Hetastarch)',
];

function FluidTherapyCalculator({ hospitalization, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTherapy, setActiveTherapy] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    pesoKg: hospitalization?.pet?.peso || hospitalization?.patient?.peso || '',
    especie: hospitalization?.pet?.especie?.toUpperCase() === 'GATO' ? 'GATO' : 'PERRO',
    esCachorro: false,
    porcentajeDeshidratacion: 0,
    vomitoPequeno: 0,
    vomitoAbundante: 0,
    diarreaLeve: 0,
    diarreaAbundante: 0,
    ajusteGeriatrico: false,
    ajusteCardiaco: false,
    ajusteRenal: false,
    porcentajeReduccion: 25,
    tipoSolucion: 'Ringer Lactato (Hartmann)',
    notas: '',
  });

  const [result, setResult] = useState(null);

  // Load existing fluid therapies
  useEffect(() => {
    if (hospitalization?.id) {
      hospitalizacionService.getFluidTherapies(hospitalization.id)
        .then(res => {
          const data = res?.data || res;
          if (data?.active) setActiveTherapy(data.active);
          if (data?.fluidTherapies) setHistory(data.fluidTherapies);
        })
        .catch(err => console.error('Error loading fluid therapies:', err));
    }
  }, [hospitalization?.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSaved(false);
  };

  const handleNumberChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  // Calculate in real time
  const calculate = useCallback(() => {
    const peso = parseFloat(form.pesoKg) || 0;
    if (peso <= 0) return null;

    // 1. Mantenimiento
    let factor;
    if (form.esCachorro) factor = 80;
    else if (form.especie === 'GATO') factor = 50;
    else factor = 60;
    
    const mlMantenimiento = peso * factor;

    // 2. Déficit
    const pctDeshid = parseFloat(form.porcentajeDeshidratacion) || 0;
    const mlDeficit = peso * pctDeshid * 10;

    // 3. Pérdidas
    const mlPerdidas =
      (parseInt(form.vomitoPequeno) || 0) * 2 * peso +
      (parseInt(form.vomitoAbundante) || 0) * 4 * peso +
      (parseInt(form.diarreaLeve) || 0) * 3 * peso +
      (parseInt(form.diarreaAbundante) || 0) * 5 * peso;

    // 4. Total
    const mlTotal24h = mlMantenimiento + mlDeficit + mlPerdidas;
    const mlPorHora = mlTotal24h / 24;

    // 5. Ajustes
    const necesitaAjuste = form.ajusteGeriatrico || form.ajusteCardiaco || form.ajusteRenal;
    const pctReduccion = necesitaAjuste ? (parseFloat(form.porcentajeReduccion) || 25) : 0;
    const mlAjustado24h = necesitaAjuste ? mlTotal24h * (1 - pctReduccion / 100) : null;
    const mlAjustadoPorHora = mlAjustado24h ? mlAjustado24h / 24 : null;

    // Goteo por minuto (macro = 20 gotas/ml, micro = 60 gotas/ml)
    const finalMlHr = mlAjustadoPorHora || mlPorHora;
    const goteoMacro = (finalMlHr * 20) / 60; // gotas/min macro
    const goteoMicro = finalMlHr; // microgotas/min = ml/hr

    return {
      factorMantenimiento: factor,
      mlMantenimiento: Math.round(mlMantenimiento * 100) / 100,
      mlDeficit: Math.round(mlDeficit * 100) / 100,
      mlPerdidas: Math.round(mlPerdidas * 100) / 100,
      mlTotal24h: Math.round(mlTotal24h * 100) / 100,
      mlPorHora: Math.round(mlPorHora * 100) / 100,
      necesitaAjuste,
      pctReduccion,
      mlAjustado24h: mlAjustado24h ? Math.round(mlAjustado24h * 100) / 100 : null,
      mlAjustadoPorHora: mlAjustadoPorHora ? Math.round(mlAjustadoPorHora * 100) / 100 : null,
      goteoMacro: Math.round(goteoMacro * 10) / 10,
      goteoMicro: Math.round(goteoMicro * 10) / 10,
      finalMlHr: Math.round(finalMlHr * 100) / 100,
    };
  }, [form]);

  useEffect(() => {
    setResult(calculate());
  }, [calculate]);

  const handleSave = async () => {
    if (!hospitalization?.id || !result) return;
    setLoading(true);
    try {
      const payload = {
        pesoKg: parseFloat(form.pesoKg),
        especie: form.especie,
        esCachorro: form.esCachorro,
        porcentajeDeshidratacion: parseFloat(form.porcentajeDeshidratacion) || 0,
        vomitoPequeno: parseInt(form.vomitoPequeno) || 0,
        vomitoAbundante: parseInt(form.vomitoAbundante) || 0,
        diarreaLeve: parseInt(form.diarreaLeve) || 0,
        diarreaAbundante: parseInt(form.diarreaAbundante) || 0,
        ajusteGeriatrico: form.ajusteGeriatrico,
        ajusteCardiaco: form.ajusteCardiaco,
        ajusteRenal: form.ajusteRenal,
        porcentajeReduccion: parseFloat(form.porcentajeReduccion) || 25,
        tipoSolucion: form.tipoSolucion,
        notas: form.notas,
      };
      await hospitalizacionService.calculateFluidTherapy(hospitalization.id, payload);
      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error saving fluid therapy:', err);
      alert('Error al guardar terapia de fluidos');
    } finally {
      setLoading(false);
    }
  };

  const dehydrationLevels = [
    { value: 0, label: 'Sin deshidratación', desc: 'Paciente hidratado' },
    { value: 3, label: 'Leve (3%)', desc: 'Mucosas algo secas' },
    { value: 5, label: 'Moderada (5%)', desc: 'Pliegue cutáneo lento, mucosas secas' },
    { value: 7, label: 'Severa (7%)', desc: 'Pliegue persistente, ojos hundidos' },
    { value: 10, label: 'Muy severa (10%)', desc: 'Shock inminente, TRC >3s' },
    { value: 12, label: 'Crítica (12%)', desc: 'Shock establecido' },
  ];

  return (
    <div className="fluid-therapy-calculator">
      <div className="ftc-header">
        <h3>💧 Calculadora de Terapia de Fluidos</h3>
        <div className="ftc-header-actions">
          {history.length > 0 && (
            <button 
              className="btn-secondary btn-sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              📋 Historial ({history.length})
            </button>
          )}
          {onClose && (
            <button className="btn-close" onClick={onClose}>×</button>
          )}
        </div>
      </div>

      {/* Active Therapy Banner */}
      {activeTherapy && !saved && (
        <div className="ftc-active-banner">
          <span className="pulse-dot"></span>
          <strong>Terapia activa:</strong> {activeTherapy.mlAjustadoPorHora || activeTherapy.mlPorHora} ml/hr 
          ({activeTherapy.tipoSolucion || 'Sin tipo'})
          <span className="active-since">
            desde {new Date(activeTherapy.createdAt).toLocaleString('es-MX', { 
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
            })}
          </span>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="ftc-history">
          <h4>Historial de Terapias de Fluidos</h4>
          <div className="ftc-history-list">
            {history.map((t, i) => (
              <div key={t.id} className={`ftc-history-item ${t.isActive ? 'active' : ''}`}>
                <div className="ftc-hist-row">
                  <span className="ftc-hist-date">
                    {new Date(t.createdAt).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  {t.isActive && <span className="badge-active">Activa</span>}
                </div>
                <div className="ftc-hist-details">
                  <span>{t.pesoKg}kg • {t.especie}</span>
                  <span>{t.mlAjustadoPorHora || t.mlPorHora} ml/hr</span>
                  <span>{t.tipoSolucion || '-'}</span>
                </div>
                {t.prescribedBy && (
                  <div className="ftc-hist-by">Por: {t.prescribedBy.nombre}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ftc-body">
        {/* Step 1: Patient Data */}
        <div className="ftc-section">
          <div className="ftc-section-header">
            <span className="ftc-step">1</span>
            <h4>Datos del Paciente</h4>
          </div>
          <div className="ftc-grid-3">
            <div className="ftc-field">
              <label>Peso (kg)</label>
              <input
                type="number"
                name="pesoKg"
                value={form.pesoKg}
                onChange={handleChange}
                step="0.1"
                min="0.1"
                placeholder="Ej: 15.5"
                className="ftc-input"
              />
            </div>
            <div className="ftc-field">
              <label>Especie</label>
              <div className="ftc-toggle-group">
                <button
                  type="button"
                  className={`ftc-toggle ${form.especie === 'PERRO' ? 'active' : ''}`}
                  onClick={() => handleNumberChange('especie', 'PERRO')}
                >
                  🐕 Perro
                </button>
                <button
                  type="button"
                  className={`ftc-toggle ${form.especie === 'GATO' ? 'active' : ''}`}
                  onClick={() => handleNumberChange('especie', 'GATO')}
                >
                  🐈 Gato
                </button>
              </div>
            </div>
            <div className="ftc-field">
              <label>Edad</label>
              <label className="ftc-checkbox">
                <input
                  type="checkbox"
                  name="esCachorro"
                  checked={form.esCachorro}
                  onChange={handleChange}
                />
                <span>Cachorro/Gatito (&lt;6 meses)</span>
              </label>
            </div>
          </div>
          {form.pesoKg && result && (
            <div className="ftc-result-inline">
              <strong>Mantenimiento:</strong> {result.mlMantenimiento} ml/24h
              <span className="ftc-formula">
                ({form.pesoKg} kg × {result.factorMantenimiento} ml/kg/día
                {form.esCachorro ? ' — cachorro' : form.especie === 'GATO' ? ' — gato' : ' — perro'})
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Dehydration */}
        <div className="ftc-section">
          <div className="ftc-section-header">
            <span className="ftc-step">2</span>
            <h4>Déficit por Deshidratación</h4>
          </div>
          <div className="ftc-dehydration-grid">
            {dehydrationLevels.map(level => (
              <button
                key={level.value}
                type="button"
                className={`ftc-dehyd-btn ${parseFloat(form.porcentajeDeshidratacion) === level.value ? 'active' : ''} ${level.value >= 10 ? 'critical' : level.value >= 7 ? 'severe' : level.value >= 5 ? 'moderate' : ''}`}
                onClick={() => handleNumberChange('porcentajeDeshidratacion', level.value)}
              >
                <span className="dehyd-pct">{level.value}%</span>
                <span className="dehyd-label">{level.label.split('(')[0].trim()}</span>
                <span className="dehyd-desc">{level.desc}</span>
              </button>
            ))}
          </div>
          {result && result.mlDeficit > 0 && (
            <div className="ftc-result-inline warning">
              <strong>Déficit:</strong> {result.mlDeficit} ml
              <span className="ftc-formula">
                ({form.pesoKg} kg × {form.porcentajeDeshidratacion}% × 10)
              </span>
            </div>
          )}
        </div>

        {/* Step 3: Ongoing Losses */}
        <div className="ftc-section">
          <div className="ftc-section-header">
            <span className="ftc-step">3</span>
            <h4>Pérdidas Continuas</h4>
          </div>
          <div className="ftc-losses-grid">
            <div className="ftc-loss-item">
              <div className="ftc-loss-header">🤮 Vómito Pequeño</div>
              <div className="ftc-loss-detail">2 ml/kg por episodio</div>
              <div className="ftc-counter">
                <button type="button" onClick={() => handleNumberChange('vomitoPequeno', Math.max(0, (parseInt(form.vomitoPequeno) || 0) - 1))}>−</button>
                <span>{form.vomitoPequeno || 0}</span>
                <button type="button" onClick={() => handleNumberChange('vomitoPequeno', (parseInt(form.vomitoPequeno) || 0) + 1)}>+</button>
              </div>
            </div>
            <div className="ftc-loss-item">
              <div className="ftc-loss-header">🤮 Vómito Abundante</div>
              <div className="ftc-loss-detail">4 ml/kg por episodio</div>
              <div className="ftc-counter">
                <button type="button" onClick={() => handleNumberChange('vomitoAbundante', Math.max(0, (parseInt(form.vomitoAbundante) || 0) - 1))}>−</button>
                <span>{form.vomitoAbundante || 0}</span>
                <button type="button" onClick={() => handleNumberChange('vomitoAbundante', (parseInt(form.vomitoAbundante) || 0) + 1)}>+</button>
              </div>
            </div>
            <div className="ftc-loss-item">
              <div className="ftc-loss-header">💩 Diarrea Leve</div>
              <div className="ftc-loss-detail">3 ml/kg por episodio</div>
              <div className="ftc-counter">
                <button type="button" onClick={() => handleNumberChange('diarreaLeve', Math.max(0, (parseInt(form.diarreaLeve) || 0) - 1))}>−</button>
                <span>{form.diarreaLeve || 0}</span>
                <button type="button" onClick={() => handleNumberChange('diarreaLeve', (parseInt(form.diarreaLeve) || 0) + 1)}>+</button>
              </div>
            </div>
            <div className="ftc-loss-item">
              <div className="ftc-loss-header">💩 Diarrea Abundante</div>
              <div className="ftc-loss-detail">5 ml/kg por episodio</div>
              <div className="ftc-counter">
                <button type="button" onClick={() => handleNumberChange('diarreaAbundante', Math.max(0, (parseInt(form.diarreaAbundante) || 0) - 1))}>−</button>
                <span>{form.diarreaAbundante || 0}</span>
                <button type="button" onClick={() => handleNumberChange('diarreaAbundante', (parseInt(form.diarreaAbundante) || 0) + 1)}>+</button>
              </div>
            </div>
          </div>
          {result && result.mlPerdidas > 0 && (
            <div className="ftc-result-inline">
              <strong>Pérdidas:</strong> {result.mlPerdidas} ml
            </div>
          )}
        </div>

        {/* Step 4: Adjustments */}
        <div className="ftc-section">
          <div className="ftc-section-header">
            <span className="ftc-step">4</span>
            <h4>Ajustes por Condición</h4>
          </div>
          <div className="ftc-adjustments">
            <label className="ftc-checkbox">
              <input type="checkbox" name="ajusteGeriatrico" checked={form.ajusteGeriatrico} onChange={handleChange} />
              <span>🧓 Paciente Geriátrico</span>
            </label>
            <label className="ftc-checkbox">
              <input type="checkbox" name="ajusteCardiaco" checked={form.ajusteCardiaco} onChange={handleChange} />
              <span>❤️ Enfermedad Cardíaca</span>
            </label>
            <label className="ftc-checkbox">
              <input type="checkbox" name="ajusteRenal" checked={form.ajusteRenal} onChange={handleChange} />
              <span>🫘 Enfermedad Renal</span>
            </label>
            {(form.ajusteGeriatrico || form.ajusteCardiaco || form.ajusteRenal) && (
              <div className="ftc-field" style={{ marginTop: 8 }}>
                <label>Reducción (%)</label>
                <div className="ftc-slider-row">
                  <input
                    type="range"
                    name="porcentajeReduccion"
                    min="10"
                    max="50"
                    step="5"
                    value={form.porcentajeReduccion}
                    onChange={handleChange}
                    className="ftc-slider"
                  />
                  <span className="ftc-slider-value">{form.porcentajeReduccion}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 5: Solution Type */}
        <div className="ftc-section">
          <div className="ftc-section-header">
            <span className="ftc-step">5</span>
            <h4>Tipo de Solución</h4>
          </div>
          <div className="ftc-grid-2">
            <div className="ftc-field">
              <select
                name="tipoSolucion"
                value={form.tipoSolucion}
                onChange={handleChange}
                className="ftc-input"
              >
                {SOLUTION_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="ftc-field">
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows={2}
                placeholder="Notas adicionales..."
                className="ftc-input"
              />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        {result && (
          <div className="ftc-results">
            <h4>📊 Resultados del Cálculo</h4>
            <div className="ftc-results-grid">
              <div className="ftc-result-card blue">
                <div className="ftc-result-label">Mantenimiento</div>
                <div className="ftc-result-value">{result.mlMantenimiento} ml</div>
                <div className="ftc-result-sub">Factor: {result.factorMantenimiento} ml/kg/día</div>
              </div>
              {result.mlDeficit > 0 && (
                <div className="ftc-result-card orange">
                  <div className="ftc-result-label">Déficit</div>
                  <div className="ftc-result-value">{result.mlDeficit} ml</div>
                  <div className="ftc-result-sub">{form.porcentajeDeshidratacion}% deshidratación</div>
                </div>
              )}
              {result.mlPerdidas > 0 && (
                <div className="ftc-result-card yellow">
                  <div className="ftc-result-label">Pérdidas</div>
                  <div className="ftc-result-value">{result.mlPerdidas} ml</div>
                  <div className="ftc-result-sub">Vómito + Diarrea</div>
                </div>
              )}
              <div className="ftc-result-card green total">
                <div className="ftc-result-label">Total 24 horas</div>
                <div className="ftc-result-value">{result.mlTotal24h} ml</div>
                <div className="ftc-result-sub">{result.mlPorHora} ml/hr</div>
              </div>
              {result.necesitaAjuste && (
                <div className="ftc-result-card purple adjusted">
                  <div className="ftc-result-label">Total Ajustado (-{result.pctReduccion}%)</div>
                  <div className="ftc-result-value">{result.mlAjustado24h} ml</div>
                  <div className="ftc-result-sub">{result.mlAjustadoPorHora} ml/hr</div>
                </div>
              )}
            </div>

            {/* Drip Rate Summary */}
            <div className="ftc-drip-summary">
              <div className="ftc-drip-card">
                <div className="ftc-drip-icon">💧</div>
                <div>
                  <div className="ftc-drip-label">Velocidad de Infusión</div>
                  <div className="ftc-drip-value">{result.finalMlHr} ml/hr</div>
                </div>
              </div>
              <div className="ftc-drip-card">
                <div className="ftc-drip-icon">⏱️</div>
                <div>
                  <div className="ftc-drip-label">Goteo Macro (20 gtt/ml)</div>
                  <div className="ftc-drip-value">{result.goteoMacro} gotas/min</div>
                </div>
              </div>
              <div className="ftc-drip-card">
                <div className="ftc-drip-icon">💉</div>
                <div>
                  <div className="ftc-drip-label">Microgoteo (60 gtt/ml)</div>
                  <div className="ftc-drip-value">{result.goteoMicro} microgotas/min</div>
                </div>
              </div>
            </div>

            <div className="ftc-actions">
              <button
                className={`btn-submit ${saved ? 'btn-saved' : ''}`}
                onClick={handleSave}
                disabled={loading || saved}
              >
                {loading ? '⏳ Guardando...' : saved ? '✓ Guardado' : '💾 Guardar y Aplicar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FluidTherapyCalculator;
