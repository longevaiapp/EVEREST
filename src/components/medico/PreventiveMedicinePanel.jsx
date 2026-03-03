// src/components/medico/PreventiveMedicinePanel.jsx
// Panel de atención de medicina preventiva - Vacunas y Desparasitación

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { preventivaService, formatearIntervalo, getEspecieColor } from '../../services/preventiva.service';
import './PreventiveMedicinePanel.css';

function PreventiveMedicinePanel({ 
  patient, 
  visit, 
  onComplete, 
  onCancel 
}) {
  const { t } = useTranslation();
  
  // State for available products from inventory
  const [vaccines, setVaccines] = useState([]);
  const [dewormers, setDewormers] = useState([]);
  const [petHistory, setPetHistory] = useState({ vaccineRecords: [], dewormingRecords: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Selected products
  const [selectedVaccines, setSelectedVaccines] = useState([]);
  const [selectedDewormers, setSelectedDewormers] = useState([]);
  
  // Physical exam form
  const [examForm, setExamForm] = useState({
    temperatura: '',
    peso: patient?.peso || '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    condicionGeneral: 'Normal',
    observaciones: ''
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [patient?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const especie = patient?.especie?.toUpperCase() || undefined;
      
      const [vaccinesData, dewormersData, historyData] = await Promise.all([
        preventivaService.getVaccines(especie),
        preventivaService.getDewormers(especie),
        patient?.id ? preventivaService.getPetHistory(patient.id) : null
      ]);
      
      setVaccines(vaccinesData || []);
      setDewormers(dewormersData || []);
      if (historyData) {
        setPetHistory(historyData);
      }
    } catch (err) {
      console.error('Error loading preventive medicine data:', err);
      setError('Error al cargar datos de medicina preventiva');
    } finally {
      setLoading(false);
    }
  };

  // Handle vaccine selection
  const handleSelectVaccine = (vaccine) => {
    const isSelected = selectedVaccines.find(v => v.id === vaccine.id);
    
    if (isSelected) {
      setSelectedVaccines(selectedVaccines.filter(v => v.id !== vaccine.id));
    } else {
      // Add with default values
      const daysUntilNext = parseInt(vaccine.intervaloRefuerzo) || 365;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysUntilNext);
      
      setSelectedVaccines([...selectedVaccines, {
        ...vaccine,
        medicationId: vaccine.id,
        proximaDosis: nextDate.toISOString().split('T')[0],
        viaAdministracion: vaccine.viaAdministracion || 'SC',
        notas: ''
      }]);
    }
  };

  // Handle dewormer selection
  const handleSelectDewormer = (dewormer) => {
    const isSelected = selectedDewormers.find(d => d.id === dewormer.id);
    
    if (isSelected) {
      setSelectedDewormers(selectedDewormers.filter(d => d.id !== dewormer.id));
    } else {
      const daysUntilNext = parseInt(dewormer.intervaloRefuerzo) || 90;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysUntilNext);
      
      setSelectedDewormers([...selectedDewormers, {
        ...dewormer,
        medicationId: dewormer.id,
        tipo: 'Externa', // Default
        proximaAplicacion: nextDate.toISOString().split('T')[0],
        notas: ''
      }]);
    }
  };

  // Update selected vaccine details
  const updateVaccineDetails = (vaccineId, field, value) => {
    setSelectedVaccines(selectedVaccines.map(v => 
      v.id === vaccineId ? { ...v, [field]: value } : v
    ));
  };

  // Update selected dewormer details
  const updateDewormerDetails = (dewormerId, field, value) => {
    setSelectedDewormers(selectedDewormers.map(d => 
      d.id === dewormerId ? { ...d, [field]: value } : d
    ));
  };

  // Calculate total cost
  const totalCost = [...selectedVaccines, ...selectedDewormers].reduce(
    (sum, item) => sum + (parseFloat(item.salePrice) || 0), 
    0
  );

  // Submit handler
  const handleSubmit = async () => {
    if (!visit?.id || !patient?.id) {
      setError('Datos de visita incompletos');
      return;
    }

    if (selectedVaccines.length === 0 && selectedDewormers.length === 0) {
      setError('Selecciona al menos una vacuna o desparasitante');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data = {
        visitId: visit.id,
        petId: patient.id,
        temperatura: examForm.temperatura ? parseFloat(examForm.temperatura) : undefined,
        peso: examForm.peso ? parseFloat(examForm.peso) : undefined,
        frecuenciaCardiaca: examForm.frecuenciaCardiaca ? parseInt(examForm.frecuenciaCardiaca) : undefined,
        frecuenciaRespiratoria: examForm.frecuenciaRespiratoria ? parseInt(examForm.frecuenciaRespiratoria) : undefined,
        condicionGeneral: examForm.condicionGeneral,
        observaciones: examForm.observaciones,
        vaccines: selectedVaccines.map(v => ({
          medicationId: v.medicationId,
          marca: v.marca || v.supplier,
          nombreComercial: v.nombreComercial,
          lote: v.lote,
          fechaCaducidad: v.expirationDate ? new Date(v.expirationDate).toISOString() : undefined,
          proximaDosis: v.proximaDosis ? new Date(v.proximaDosis).toISOString() : undefined,
          viaAdministracion: v.viaAdministracion,
          notas: v.notas
        })),
        dewormings: selectedDewormers.map(d => ({
          medicationId: d.medicationId,
          marca: d.marca || d.supplier,
          nombreComercial: d.nombreComercial,
          tipo: d.tipo,
          lote: d.lote,
          proximaAplicacion: new Date(d.proximaAplicacion).toISOString(),
          notas: d.notas
        }))
      };

      const result = await preventivaService.attendPreventive(data);
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      console.error('Error completing preventive medicine:', err);
      setError(err.message || 'Error al completar medicina preventiva');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="preventive-medicine-panel loading">
        <div className="loading-spinner"></div>
        <p>Cargando medicina preventiva...</p>
      </div>
    );
  }

  return (
    <div className="preventive-medicine-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="patient-info">
          <span className="pet-icon">
            {patient?.especie === 'PERRO' || patient?.especie === 'Perro' ? '🐕' : '🐈'}
          </span>
          <div>
            <h2>{patient?.nombre}</h2>
            <p>{patient?.raza} • {patient?.especie}</p>
          </div>
        </div>
        <div className="header-badge">
          💉 Medicina Preventiva
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="panel-content">
        {/* Physical Exam Section */}
        <section className="preventive-exam-section">
          <h3>📋 Examen Físico Rápido</h3>
          <div className="preventive-exam-grid">
            <div className="form-group">
              <label>🌡️ Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={examForm.temperatura}
                onChange={(e) => setExamForm({...examForm, temperatura: e.target.value})}
                placeholder="38.5"
              />
            </div>
            <div className="form-group">
              <label>⚖️ Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="200"
                value={examForm.peso}
                onChange={(e) => setExamForm({...examForm, peso: e.target.value})}
                placeholder="10.5"
              />
            </div>
            <div className="form-group">
              <label>❤️ FC (lpm)</label>
              <input
                type="number"
                min="30"
                max="300"
                value={examForm.frecuenciaCardiaca}
                onChange={(e) => setExamForm({...examForm, frecuenciaCardiaca: e.target.value})}
                placeholder="90"
              />
            </div>
            <div className="form-group">
              <label>🌬️ FR (rpm)</label>
              <input
                type="number"
                min="5"
                max="100"
                value={examForm.frecuenciaRespiratoria}
                onChange={(e) => setExamForm({...examForm, frecuenciaRespiratoria: e.target.value})}
                placeholder="25"
              />
            </div>
            <div className="form-group full-width">
              <label>Estado General</label>
              <select 
                value={examForm.condicionGeneral}
                onChange={(e) => setExamForm({...examForm, condicionGeneral: e.target.value})}
              >
                <option value="Normal">✅ Normal - Apto para vacunación</option>
                <option value="Requiere atención">⚠️ Requiere atención médica</option>
              </select>
            </div>
          </div>
        </section>

        {/* Vaccines Section */}
        <section className="vaccines-section">
          <h3>💉 Vacunas Disponibles ({vaccines.length})</h3>
          
          {vaccines.length === 0 ? (
            <div className="empty-state">
              <p>No hay vacunas disponibles en inventario para {patient?.especie}</p>
            </div>
          ) : (
            <div className="products-grid">
              {vaccines.map(vaccine => {
                const isSelected = selectedVaccines.find(v => v.id === vaccine.id);
                const lastApplied = petHistory.vaccineRecords?.find(
                  r => r.medicationId === vaccine.id || r.nombre === vaccine.name
                );
                
                return (
                  <div 
                    key={vaccine.id}
                    className={`product-card ${isSelected ? 'selected' : ''} ${vaccine.currentStock < 3 ? 'low-stock' : ''}`}
                    onClick={() => handleSelectVaccine(vaccine)}
                  >
                    <div className="product-header">
                      <span className="product-name">{vaccine.name}</span>
                      {isSelected && <span className="check-mark">✓</span>}
                    </div>
                    <div className="product-details">
                      <span className="comercial-name">{vaccine.nombreComercial}</span>
                      <div className="product-meta">
                        <span className="stock">Stock: {vaccine.currentStock}</span>
                        <span className="price">${parseFloat(vaccine.salePrice).toFixed(2)}</span>
                      </div>
                      {vaccine.intervaloRefuerzo && (
                        <span className="interval">
                          🔄 Refuerzo: {formatearIntervalo(vaccine.intervaloRefuerzo)}
                        </span>
                      )}
                      {lastApplied && (
                        <span className="last-applied">
                          Última: {new Date(lastApplied.fecha).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected vaccines details */}
          {selectedVaccines.length > 0 && (
            <div className="selected-products">
              <h4>Vacunas Seleccionadas ({selectedVaccines.length})</h4>
              {selectedVaccines.map(vaccine => (
                <div key={vaccine.id} className="selected-product-detail">
                  <div className="product-title">
                    <strong>{vaccine.name}</strong>
                    <button 
                      className="btn-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectVaccine(vaccine);
                      }}
                    >✕</button>
                  </div>
                  <div className="detail-grid expanded">
                    <div className="form-group">
                      <label>Marca</label>
                      <input
                        type="text"
                        value={vaccine.marca || vaccine.supplier || ''}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'marca', e.target.value)}
                        placeholder="Ej: Zoetis"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre Comercial</label>
                      <input
                        type="text"
                        value={vaccine.nombreComercial || ''}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'nombreComercial', e.target.value)}
                        placeholder="Ej: Vanguard Plus"
                      />
                    </div>
                    <div className="form-group">
                      <label>Lote</label>
                      <input
                        type="text"
                        value={vaccine.lote || ''}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'lote', e.target.value)}
                        placeholder={vaccine.lote || 'N/A'}
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha Caducidad</label>
                      <input
                        type="date"
                        value={vaccine.expirationDate ? new Date(vaccine.expirationDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'expirationDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Vía</label>
                      <select
                        value={vaccine.viaAdministracion}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'viaAdministracion', e.target.value)}
                      >
                        <option value="SC">Subcutánea (SC)</option>
                        <option value="IM">Intramuscular (IM)</option>
                        <option value="Intranasal">Intranasal</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Próximo Refuerzo</label>
                      <input
                        type="date"
                        value={vaccine.proximaDosis}
                        onChange={(e) => updateVaccineDetails(vaccine.id, 'proximaDosis', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dewormers Section */}
        <section className="dewormers-section">
          <h3>💊 Desparasitantes Disponibles ({dewormers.length})</h3>
          
          {dewormers.length === 0 ? (
            <div className="empty-state">
              <p>No hay desparasitantes disponibles en inventario para {patient?.especie}</p>
            </div>
          ) : (
            <div className="products-grid">
              {dewormers.map(dewormer => {
                const isSelected = selectedDewormers.find(d => d.id === dewormer.id);
                const lastApplied = petHistory.dewormingRecords?.find(
                  r => r.medicationId === dewormer.id
                );
                
                return (
                  <div 
                    key={dewormer.id}
                    className={`product-card dewormer ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectDewormer(dewormer)}
                  >
                    <div className="product-header">
                      <span className="product-name">{dewormer.name}</span>
                      {isSelected && <span className="check-mark">✓</span>}
                    </div>
                    <div className="product-details">
                      <span className="comercial-name">{dewormer.nombreComercial}</span>
                      <div className="product-meta">
                        <span className="stock">Stock: {dewormer.currentStock}</span>
                        <span className="price">${parseFloat(dewormer.salePrice).toFixed(2)}</span>
                      </div>
                      {dewormer.pesoMinimo && dewormer.pesoMaximo && (
                        <span className="weight-range">
                          ⚖️ {dewormer.pesoMinimo}-{dewormer.pesoMaximo}kg
                        </span>
                      )}
                      {dewormer.intervaloRefuerzo && (
                        <span className="interval">
                          🔄 Refuerzo: {formatearIntervalo(dewormer.intervaloRefuerzo)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected dewormers details */}
          {selectedDewormers.length > 0 && (
            <div className="selected-products">
              <h4>Desparasitantes Seleccionados ({selectedDewormers.length})</h4>
              {selectedDewormers.map(dewormer => (
                <div key={dewormer.id} className="selected-product-detail">
                  <div className="product-title">
                    <strong>{dewormer.name}</strong>
                    <button 
                      className="btn-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDewormer(dewormer);
                      }}
                    >✕</button>
                  </div>
                  <div className="detail-grid expanded">
                    <div className="form-group">
                      <label>Marca</label>
                      <input
                        type="text"
                        value={dewormer.marca || dewormer.supplier || ''}
                        onChange={(e) => updateDewormerDetails(dewormer.id, 'marca', e.target.value)}
                        placeholder="Ej: Bayer"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre Comercial</label>
                      <input
                        type="text"
                        value={dewormer.nombreComercial || ''}
                        onChange={(e) => updateDewormerDetails(dewormer.id, 'nombreComercial', e.target.value)}
                        placeholder="Ej: Drontal Plus"
                      />
                    </div>
                    <div className="form-group">
                      <label>Lote</label>
                      <input
                        type="text"
                        value={dewormer.lote || ''}
                        onChange={(e) => updateDewormerDetails(dewormer.id, 'lote', e.target.value)}
                        placeholder="N/A"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select
                        value={dewormer.tipo}
                        onChange={(e) => updateDewormerDetails(dewormer.id, 'tipo', e.target.value)}
                      >
                        <option value="Interna">Interna</option>
                        <option value="Externa">Externa</option>
                        <option value="Ambas">Ambas</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Próxima Aplicación</label>
                      <input
                        type="date"
                        value={dewormer.proximaAplicacion}
                        onChange={(e) => updateDewormerDetails(dewormer.id, 'proximaAplicacion', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Observations */}
        <section className="observations-section">
          <h3>💬 Observaciones</h3>
          <textarea
            value={examForm.observaciones}
            onChange={(e) => setExamForm({...examForm, observaciones: e.target.value})}
            placeholder="Observaciones adicionales..."
            rows={3}
          />
        </section>
      </div>

      {/* Footer with totals and actions */}
      <div className="panel-footer">
        <div className="totals">
          <div className="total-items">
            <span>💉 {selectedVaccines.length} vacunas</span>
            <span>💊 {selectedDewormers.length} desparasitantes</span>
          </div>
          <div className="total-cost">
            <strong>Total: ${totalCost.toFixed(2)}</strong>
          </div>
        </div>
        <div className="actions">
          <button 
            className="btn-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            ❌ Cancelar
          </button>
          <button 
            className="btn-complete"
            onClick={handleSubmit}
            disabled={saving || (selectedVaccines.length === 0 && selectedDewormers.length === 0)}
          >
            {saving ? '⏳ Guardando...' : '✅ Completar y Enviar a Caja'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreventiveMedicinePanel;
