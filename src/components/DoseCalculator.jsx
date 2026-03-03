import React, { useState, useEffect, useCallback, useMemo } from 'react';
import farmaciaService from '../services/farmacia.service';
import './DoseCalculator.css';

/**
 * DoseCalculator - Inline dose calculation panel
 * 
 * Integrates directly into medication prescription/therapy forms.
 * Auto-fills from patient data, calculates doses, shows warnings.
 * 
 * Props:
 *   - patient: { peso, especie, raza, edad, fechaNacimiento, enfermedadesCronicas, alergias, condicionCorporal }
 *   - medication: { id, name, concentration, presentation, unit } (selected medication from inventory)
 *   - onDoseCalculated: (result) => void — callback with calculated dose data
 *   - onWeightUpdate: (weightKg) => void — callback when weight is entered/changed
 *   - currentWeight: number — weight from vitals/triage (most recent)
 *   - compact: boolean — smaller layout for hospitalization
 */
const DoseCalculator = ({ 
  patient, 
  medication, 
  onDoseCalculated, 
  onWeightUpdate,
  currentWeight,
  compact = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [dosingData, setDosingData] = useState(null);
  const [weightKg, setWeightKg] = useState('');
  const [selectedDosePerKg, setSelectedDosePerKg] = useState('');
  const [overrideSpecies, setOverrideSpecies] = useState('');

  // Effective species: override > patient.especie (skip OTRO)
  const needsSpeciesSelect = !patient?.especie || patient.especie === 'OTRO' || patient.especie === 'otro';
  const effectiveSpecies = overrideSpecies || (needsSpeciesSelect ? '' : patient?.especie) || '';
  const [adjustments, setAdjustments] = useState({
    geriatric: false,
    pediatric: false,
    pregnant: false,
    lactating: false,
    neonatal: false,
    renal: false,
    hepatic: false,
    cardiac: false,
  });
  const [bodyCondition, setBodyCondition] = useState('');
  const [calculationResult, setCalculationResult] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [isNTI, setIsNTI] = useState(false);

  // Determine best weight: currentWeight > patient.peso
  const bestWeight = useMemo(() => {
    return currentWeight || patient?.peso || null;
  }, [currentWeight, patient?.peso]);

  // Set initial weight
  useEffect(() => {
    if (bestWeight && !weightKg) {
      setWeightKg(String(bestWeight));
    }
  }, [bestWeight]);

  // Auto-detect adjustments from patient data
  useEffect(() => {
    if (!patient) return;
    const newAdj = { ...adjustments };
    
    // Geriatric: dogs >7y, cats >10y
    if (patient.fechaNacimiento) {
      const ageMs = Date.now() - new Date(patient.fechaNacimiento).getTime();
      const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
      const isCat = patient.especie === 'GATO';
      if (ageYears > (isCat ? 10 : 7)) {
        newAdj.geriatric = true;
      }
      if (ageYears < 0.5) {
        newAdj.pediatric = true;
      }
      // Neonatal: <8 weeks
      if (ageYears < (8 / 52)) {
        newAdj.neonatal = true;
      }
    }

    // Parse chronic diseases
    if (patient.enfermedadesCronicas) {
      const conds = patient.enfermedadesCronicas.toLowerCase();
      if (conds.includes('renal') || conds.includes('riñon') || conds.includes('riñón')) newAdj.renal = true;
      if (conds.includes('hep') || conds.includes('higado') || conds.includes('hígado')) newAdj.hepatic = true;
      if (conds.includes('cardi') || conds.includes('coraz')) newAdj.cardiac = true;
    }

    setAdjustments(newAdj);

    // Body condition from patient record
    if (patient.condicionCorporal && !bodyCondition) {
      setBodyCondition(patient.condicionCorporal);
    }
  }, [patient]);

  // Fetch dosing data when medication or species changes
  useEffect(() => {
    if (!medication?.id || !effectiveSpecies) {
      setDosingData(null);
      setCalculationResult(null);
      return;
    }

    const fetchDosing = async () => {
      setLoading(true);
      try {
        const response = await farmaciaService.calculateDose(medication.id, {
          petId: patient?.id,
          weightKg: parseFloat(weightKg) || undefined,
          species: effectiveSpecies,
          bodyCondition: bodyCondition || undefined,
          adjustments,
        });
        
        if (response?.data) {
          setDosingData(response.data);
          setWarnings(response.data.warnings || []);
          setInteractions(response.data.interactions || []);
          setIsNTI(response.data.narrowTherapeuticIndex || false);
          
          if (response.data.dosing && !response.data.dosing.needsWeight) {
            setCalculationResult(response.data.dosing);
            // Auto-select midpoint dose
            if (!selectedDosePerKg && response.data.dosing.doseMinMgKg) {
              const mid = (response.data.dosing.doseMinMgKg + response.data.dosing.doseMaxMgKg) / 2;
              setSelectedDosePerKg(String(mid));
            }
          } else if (response.data.dosing) {
            setCalculationResult(response.data.dosing);
          }
        }
      } catch (err) {
        console.error('Error fetching dosing:', err);
        setDosingData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDosing();
  }, [medication?.id, effectiveSpecies, patient?.id, bodyCondition]);

  // Recalculate when weight or adjustments change (locally, no API call)
  const localCalc = useMemo(() => {
    if (!dosingData?.dosing || !weightKg) return null;
    const w = parseFloat(weightKg);
    if (!w || w <= 0) return null;

    const d = dosingData.dosing;
    const doseMin = d.doseMinMgKg;
    const doseMax = d.doseMaxMgKg;
    if (!doseMin || !doseMax) return null;

    const rangeMinMg = w * doseMin;
    const rangeMaxMg = w * doseMax;
    const dosePerKg = parseFloat(selectedDosePerKg) || ((doseMin + doseMax) / 2);
    const selectedMg = w * dosePerKg;

    // Apply adjustments
    let factor = 1.0;
    const reasons = [];
    if (adjustments.geriatric) { factor *= 0.75; reasons.push('Geriátrico -25%'); }
    if (adjustments.pediatric) { factor *= 0.75; reasons.push('Pediátrico -25%'); }
    if (adjustments.neonatal) { factor *= 0.5; reasons.push('Neonato -50%'); }
    if (adjustments.renal) { factor *= 0.5; reasons.push('Renal -50%'); }
    if (adjustments.hepatic) { factor *= 0.7; reasons.push('Hepático -30%'); }
    if (adjustments.cardiac) { factor *= 0.8; reasons.push('Cardíaco -20%'); }

    // Body condition adjustment (local calc)
    if (bodyCondition === 'OBESO') { factor *= 0.85; reasons.push('Obeso -15%'); }
    else if (bodyCondition === 'SOBREPESO') { factor *= 0.9; reasons.push('Sobrepeso -10%'); }

    const adjustedMg = selectedMg * factor;

    // Parse concentration for volume calc
    let volumeMl = null;
    let concValue = null;
    const concentration = medication?.concentration || medication?.concentracion || '';
    if (concentration) {
      const match = concentration.match(/([\d.]+)\s*(mg|mcg|g|UI)\s*\/\s*(ml|cc)/i);
      if (match) {
        concValue = parseFloat(match[1]);
        volumeMl = Math.round((adjustedMg / concValue) * 100) / 100;
      }
    }

    // Parse tablet mg
    let tabletCount = null;
    let tabletMg = null;
    const presentation = medication?.presentation || medication?.presentacion || '';
    if (presentation) {
      const match = presentation.match(/([\d.]+)\s*(mg|g)/i);
      if (match) {
        tabletMg = parseFloat(match[1]);
        if (match[2].toLowerCase() === 'g') tabletMg *= 1000;
        tabletCount = Math.round((adjustedMg / tabletMg) * 100) / 100;
      }
    }

    // Quantity estimation
    let estimatedQty = null;
    if (d.frequencyHours && d.durationDays) {
      const dosesPerDay = Math.ceil(24 / d.frequencyHours);
      estimatedQty = dosesPerDay * d.durationDays;
    }

    return {
      dosePerKg,
      rangeMinMg: Math.round(rangeMinMg * 100) / 100,
      rangeMaxMg: Math.round(rangeMaxMg * 100) / 100,
      selectedMg: Math.round(selectedMg * 100) / 100,
      adjustedMg: factor < 1 ? Math.round(adjustedMg * 100) / 100 : null,
      factor,
      reasons,
      volumeMl,
      concValue,
      tabletCount,
      tabletMg,
      frequencyHours: d.frequencyHours,
      durationDays: d.durationDays,
      routes: d.routes || [],
      estimatedQty,
    };
  }, [dosingData, weightKg, selectedDosePerKg, adjustments, bodyCondition, medication]);

  // Notify parent of calculated dose
  useEffect(() => {
    if (!localCalc || !onDoseCalculated) return;
    const finalMg = localCalc.adjustedMg || localCalc.selectedMg;
    onDoseCalculated({
      dosis: String(Math.round(finalMg * 100) / 100),
      unidadDosis: 'mg',
      volumeMl: localCalc.volumeMl,
      tabletCount: localCalc.tabletCount,
      tabletMg: localCalc.tabletMg,
      frequencyHours: localCalc.frequencyHours,
      durationDays: localCalc.durationDays,
      routes: localCalc.routes,
      estimatedQty: localCalc.estimatedQty,
      // Traceability fields for DB
      patientWeightKg: parseFloat(weightKg),
      dosePerKg: localCalc.dosePerKg,
      calculatedDoseMg: finalMg,
      concentrationUsed: medication?.concentration || medication?.concentracion || null,
    });
  }, [localCalc]);

  // Handle weight change
  const handleWeightChange = (val) => {
    setWeightKg(val);
    if (onWeightUpdate && val && parseFloat(val) > 0) {
      onWeightUpdate(parseFloat(val));
    }
  };

  // Toggle adjustment
  const toggleAdj = (key) => {
    setAdjustments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Don't render if no medication selected from inventory
  if (!medication?.id) return null;

  const species = effectiveSpecies || patient?.especie || '';
  const hasDosingRecord = dosingData?.dosing && dosingData.dosing.doseMinMgKg;
  const w = parseFloat(weightKg);
  const weightSource = currentWeight ? 'triage/vitals' : patient?.peso ? 'registro' : null;

  return (
    <div className={`dose-calc ${compact ? 'dose-calc-compact' : ''} ${isNTI ? 'dose-calc-nti' : ''}`}>
      <div className="dose-calc-header">
        <span className="dose-calc-icon">⚖️</span>
        <span className="dose-calc-title">Calculadora de Dosis</span>
        {isNTI && <span className="dose-calc-nti-badge">🚨 Margen Estrecho</span>}
        {loading && <span className="dose-calc-loading">Cargando...</span>}
      </div>

      {/* Patient Info Row */}
      <div className="dose-calc-patient">
        <div className="dose-calc-field">
          <label>Paciente</label>
          <span>{patient?.nombre || '—'} ({species || 'Sin especie'}{patient?.raza ? ` • ${patient.raza}` : ''}{patient?.edad ? ` • ${patient.edad}` : ''})</span>
        </div>
        {needsSpeciesSelect && (
          <div className="dose-calc-field dose-calc-species">
            <label>Especie (para dosis) *</label>
            <select
              className={`form-control ${!overrideSpecies ? 'dose-calc-missing' : ''}`}
              value={overrideSpecies}
              onChange={(e) => setOverrideSpecies(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="PERRO">🐕 Perro</option>
              <option value="GATO">🐈 Gato</option>
              <option value="AVE">🐦 Ave</option>
              <option value="REPTIL">🦎 Reptil</option>
              <option value="CONEJO">🐰 Conejo</option>
              <option value="HAMSTER">🐹 Hámster</option>
            </select>
          </div>
        )}
        <div className="dose-calc-field dose-calc-weight">
          <label>Peso (kg) *</label>
          <div className="dose-calc-weight-input">
            <input
              type="number"
              value={weightKg}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder="Ingrese peso"
              min="0.1"
              step="0.1"
              className={!weightKg ? 'dose-calc-missing' : ''}
            />
            {weightSource && <span className="dose-calc-weight-src">de {weightSource}</span>}
            {!weightKg && <span className="dose-calc-alert">⚠️ Requerido</span>}
          </div>
        </div>
      </div>

      {/* Clinical Adjustments */}
      <div className="dose-calc-adjustments">
        <label>Ajustes clínicos</label>
        <div className="dose-calc-checks">
          {[
            { key: 'geriatric', label: 'Geriátrico', icon: '👴' },
            { key: 'pediatric', label: 'Pediátrico', icon: '🍼' },
            { key: 'neonatal', label: 'Neonato', icon: '👶' },
            { key: 'pregnant', label: 'Gestante', icon: '🤰' },
            { key: 'lactating', label: 'Lactante', icon: '🤱' },
            { key: 'renal', label: 'Insuf. Renal', icon: '🫘' },
            { key: 'hepatic', label: 'Insuf. Hepática', icon: '🫁' },
            { key: 'cardiac', label: 'Cardiopatía', icon: '❤️' },
          ].map(adj => (
            <label key={adj.key} className={`dose-calc-check ${adjustments[adj.key] ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={adjustments[adj.key]}
                onChange={() => toggleAdj(adj.key)}
              />
              <span>{adj.icon} {adj.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Body Condition */}
      <div className="dose-calc-body-condition">
        <label>Condición corporal</label>
        <select
          className="form-control"
          value={bodyCondition}
          onChange={(e) => setBodyCondition(e.target.value)}
        >
          <option value="">No especificada</option>
          <option value="MUY_DELGADO">🦴 Muy delgado / Emaciado</option>
          <option value="DELGADO">Delgado</option>
          <option value="IDEAL">✅ Ideal</option>
          <option value="SOBREPESO">Sobrepeso</option>
          <option value="OBESO">⚠️ Obeso</option>
        </select>
        {bodyCondition === 'OBESO' && <span className="dose-calc-bcs-note">⚠️ Dosis ajustada -15% (peso magro)</span>}
        {bodyCondition === 'SOBREPESO' && <span className="dose-calc-bcs-note">⚠️ Dosis ajustada -10%</span>}
        {bodyCondition === 'MUY_DELGADO' && <span className="dose-calc-bcs-note">⚠️ Verificar hidratación</span>}
      </div>

      {/* Drug Interactions */}
      {interactions.length > 0 && (
        <div className="dose-calc-interactions">
          <div className="dose-calc-interactions-header">🚨 Interacciones medicamentosas detectadas</div>
          {interactions.map((inter, i) => (
            <div key={i} className={`dose-calc-interaction dose-calc-interaction-${inter.severity}`}>
              <span className="dose-calc-interaction-severity">
                {inter.severity === 'alta' ? '🔴' : inter.severity === 'media' ? '🟡' : '🟢'} {inter.severity.toUpperCase()}
              </span>
              <span className="dose-calc-interaction-msg">{inter.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dosing Reference */}
      {hasDosingRecord && (
        <div className="dose-calc-reference">
          <div className="dose-calc-ref-header">
            <span>📋 Referencia de dosificación ({species})</span>
            <span className="dose-calc-ref-range">
              {dosingData.dosing.doseMinMgKg}–{dosingData.dosing.doseMaxMgKg} {dosingData.dosing.doseUnit || 'mg/kg'}
            </span>
          </div>

          {w > 0 && localCalc && (
            <div className="dose-calc-result">
              <div className="dose-calc-range-bar">
                <div className="dose-calc-range-label">
                  <span>Mín: {localCalc.rangeMinMg} mg</span>
                  <span>Máx: {localCalc.rangeMaxMg} mg</span>
                </div>
                <div className="dose-calc-slider-wrap">
                  <input
                    type="range"
                    min={dosingData.dosing.doseMinMgKg}
                    max={dosingData.dosing.doseMaxMgKg}
                    step={0.1}
                    value={selectedDosePerKg || ((dosingData.dosing.doseMinMgKg + dosingData.dosing.doseMaxMgKg) / 2)}
                    onChange={(e) => setSelectedDosePerKg(e.target.value)}
                    className="dose-calc-slider"
                  />
                  <span className="dose-calc-slider-val">
                    {selectedDosePerKg || ((dosingData.dosing.doseMinMgKg + dosingData.dosing.doseMaxMgKg) / 2)} mg/kg
                  </span>
                </div>
              </div>

              <div className="dose-calc-cards">
                <div className="dose-calc-card dose-calc-card-primary">
                  <span className="dose-calc-card-label">Dosis total</span>
                  <span className="dose-calc-card-value">
                    {localCalc.adjustedMg || localCalc.selectedMg} mg
                  </span>
                  {localCalc.adjustedMg && (
                    <span className="dose-calc-card-adj">
                      ({localCalc.selectedMg} mg → ajustado {localCalc.reasons.join(', ')})
                    </span>
                  )}
                </div>

                {localCalc.volumeMl && (
                  <div className="dose-calc-card dose-calc-card-volume">
                    <span className="dose-calc-card-label">Volumen</span>
                    <span className="dose-calc-card-value">{localCalc.volumeMl} ml</span>
                    <span className="dose-calc-card-sub">({medication.concentration || medication.concentracion})</span>
                  </div>
                )}

                {localCalc.tabletCount && (
                  <div className="dose-calc-card dose-calc-card-tablet">
                    <span className="dose-calc-card-label">Tabletas</span>
                    <span className="dose-calc-card-value">
                      {localCalc.tabletCount <= 1 ? `${localCalc.tabletCount}` : Math.ceil(localCalc.tabletCount)} 
                      {' '}tab{localCalc.tabletCount > 1 ? 's' : ''}
                    </span>
                    <span className="dose-calc-card-sub">de {localCalc.tabletMg} mg</span>
                  </div>
                )}

                {localCalc.estimatedQty && (
                  <div className="dose-calc-card dose-calc-card-qty">
                    <span className="dose-calc-card-label">Cantidad total</span>
                    <span className="dose-calc-card-value">{localCalc.estimatedQty} dosis</span>
                    <span className="dose-calc-card-sub">
                      ({Math.ceil(24 / localCalc.frequencyHours)}/día × {localCalc.durationDays} días)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!w && (
            <div className="dose-calc-no-weight">
              Ingrese el peso del paciente para ver el cálculo
            </div>
          )}
        </div>
      )}

      {/* No dosing record */}
      {!hasDosingRecord && !loading && dosingData && (
        <div className="dose-calc-no-record">
          <span>ℹ️</span>
          <span>Sin ficha de dosificación para {species}. Ingrese la dosis manualmente.</span>
        </div>
      )}

      {/* Warnings - filter out duplicate no-dosing message when we already show dose-calc-no-record */}
      {warnings.length > 0 && (
        <div className="dose-calc-warnings">
          {warnings
            .filter(w => !(!hasDosingRecord && (w.includes('No hay ficha') || w.includes('Sin ficha'))))
            .map((w, i) => (
            <div key={i} className={`dose-calc-warning ${w.includes('⚠️') || w.includes('CONTRAINDICADO') ? 'severe' : ''}`}>
              {w.includes('⚠️') ? '' : '⚠️ '}{w}
            </div>
          ))}
        </div>
      )}

      {/* Allergy check */}
      {patient?.alergias && medication?.name && (
        (() => {
          const allergyLower = patient.alergias.toLowerCase();
          const medLower = (medication.name || '').toLowerCase();
          const genericLower = (medication.genericName || '').toLowerCase();
          if (allergyLower.includes(medLower) || (genericLower && allergyLower.includes(genericLower))) {
            return (
              <div className="dose-calc-warning severe">
                🚨 ALERGIA REGISTRADA: El paciente tiene alergia a "{patient.alergias}" — este medicamento podría estar contraindicado
              </div>
            );
          }
          return null;
        })()
      )}
    </div>
  );
};

export default DoseCalculator;
