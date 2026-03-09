// src/components/CatalogoAliado.jsx
// Provider/aliado page - urn catalog WITH prices + order form (no auth needed)

import { useState, useEffect } from 'react';
import crematorioService from '../services/crematorio.service';
import './CatalogoUrnas.css';

const SIZE_LABELS = {
  CHICA: 'Chica',
  MEDIANA: 'Mediana',
  GRANDE: 'Grande',
  EXTRA_GRANDE: 'Extra Grande',
};

export default function CatalogoAliado() {
  const [urns, setUrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdFolio, setCreatedFolio] = useState('');
  const [selectedUrnId, setSelectedUrnId] = useState('');
  const [form, setForm] = useState({
    petName: '', species: 'Canino', breed: '', sex: '', age: '',
    color: '', characteristics: '', weightKg: '',
    clientName: '', clientPhone: '', clientEmail: '',
    originType: 'ALIADO', originName: '',
    pickupAddress: '', pickupDate: '', pickupTimeSlot: '', pickupNotes: '',
    notes: '',
  });

  useEffect(() => {
    loadUrns();
  }, []);

  const loadUrns = async () => {
    try {
      const data = await crematorioService.getUrns();
      setUrns(data);
    } catch (err) {
      console.error('Error loading urns:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const orderData = {
        ...form,
        weightKg: parseFloat(form.weightKg) || 0,
        urnId: selectedUrnId || undefined,
      };
      const result = await crematorioService.createOrder(orderData);
      setCreatedFolio(result.folio);
      setSubmitted(true);
    } catch (err) {
      alert('Error al enviar solicitud: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = form.petName && form.clientName && form.clientPhone && form.weightKg && form.pickupAddress && form.originName;

  if (submitted) {
    return (
      <div className="aliado-page">
        <header className="aliado-header">
          <div className="aliado-header-content">
            <img src="/logo.png" alt="Everest Vet" className="aliado-logo" />
            <div>
              <h1>Servicio de Cremación</h1>
              <p>Portal para Clínicas y Aliados Comerciales</p>
            </div>
          </div>
        </header>
        <main className="aliado-main">
          <div className="aliado-success">
            <div className="success-icon">✅</div>
            <h2>¡Solicitud Registrada!</h2>
            <p>Tu orden de cremación ha sido creada exitosamente.</p>
            <div className="folio-display">{createdFolio}</div>
            <p>Guarda este folio para dar seguimiento a tu solicitud.</p>
            <p>Nos pondremos en contacto para coordinar la recolección.</p>
            <br />
            <button className="cta-button" onClick={() => { setSubmitted(false); setCreatedFolio(''); setForm({
              petName: '', species: 'Canino', breed: '', sex: '', age: '',
              color: '', characteristics: '', weightKg: '',
              clientName: '', clientPhone: '', clientEmail: '',
              originType: 'ALIADO', originName: '',
              pickupAddress: '', pickupDate: '', pickupTimeSlot: '', pickupNotes: '',
              notes: '',
            }); setSelectedUrnId(''); }}>
              Nueva Solicitud
            </button>
          </div>
        </main>
        <footer className="aliado-footer">
          <p>© {new Date().getFullYear()} Everest Vet — Crematorio de Mascotas</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="aliado-page">
      <header className="aliado-header">
        <div className="aliado-header-content">
          <img src="/logo.png" alt="Everest Vet" className="aliado-logo" />
          <div>
            <h1>Servicio de Cremación</h1>
            <p>Portal para Clínicas y Aliados Comerciales</p>
          </div>
        </div>
      </header>

      <main className="aliado-main">
        <a href="/crematorio/catalogo" className="aliado-back-link">← Ver catálogo público</a>

        {/* Urn Selection with Prices */}
        <section className="aliado-urns-section">
          <h2>⚱️ Seleccionar Urna (opcional)</h2>
          {loading ? (
            <div className="catalogo-loading">Cargando urnas...</div>
          ) : (
            <div className="aliado-urns-grid">
              <div
                className={`aliado-urn-option ${!selectedUrnId ? 'selected' : ''}`}
                onClick={() => setSelectedUrnId('')}
              >
                <h4>Sin urna</h4>
                <div className="urn-desc">Solo servicio de cremación</div>
                <div className="urn-price-tag">—</div>
              </div>
              {urns.map(urn => (
                <div
                  key={urn.id}
                  className={`aliado-urn-option ${selectedUrnId === urn.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUrnId(urn.id)}
                >
                  <h4>{urn.name}</h4>
                  {urn.description && <div className="urn-desc">{urn.description}</div>}
                  <div className="urn-price-tag">${parseFloat(urn.price).toLocaleString()}</div>
                  <div className="urn-size-small">{SIZE_LABELS[urn.size] || urn.size}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Order Form */}
        <form className="aliado-form" onSubmit={handleSubmit}>
          <h3>🏥 Datos del Aliado / Clínica *</h3>
          <div className="aliado-form-grid">
            <div className="aliado-field">
              <label>Tipo</label>
              <select value={form.originType} onChange={e => updateField('originType', e.target.value)}>
                <option value="ALIADO">Aliado Comercial</option>
                <option value="CLINICA">Clínica Veterinaria</option>
                <option value="DIRECTO">Cliente Directo</option>
              </select>
            </div>
            <div className="aliado-field">
              <label>Nombre de la Clínica / Aliado *</label>
              <input value={form.originName} onChange={e => updateField('originName', e.target.value)} placeholder="Ej: Veterinaria San Pablo" />
            </div>
          </div>

          <h3>🐾 Datos de la Mascota</h3>
          <div className="aliado-form-grid">
            <div className="aliado-field">
              <label>Nombre de la Mascota *</label>
              <input value={form.petName} onChange={e => updateField('petName', e.target.value)} />
            </div>
            <div className="aliado-field">
              <label>Especie *</label>
              <select value={form.species} onChange={e => updateField('species', e.target.value)}>
                <option>Canino</option>
                <option>Felino</option>
                <option>Ave</option>
                <option>Reptil</option>
                <option>Roedor</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="aliado-field">
              <label>Raza</label>
              <input value={form.breed} onChange={e => updateField('breed', e.target.value)} />
            </div>
            <div className="aliado-field">
              <label>Peso (kg) *</label>
              <input type="number" step="0.1" value={form.weightKg} onChange={e => updateField('weightKg', e.target.value)} />
            </div>
            <div className="aliado-field">
              <label>Sexo</label>
              <select value={form.sex} onChange={e => updateField('sex', e.target.value)}>
                <option value="">-</option>
                <option>Macho</option>
                <option>Hembra</option>
              </select>
            </div>
            <div className="aliado-field">
              <label>Edad</label>
              <input value={form.age} onChange={e => updateField('age', e.target.value)} placeholder="Ej: 12 años" />
            </div>
            <div className="aliado-field">
              <label>Color</label>
              <input value={form.color} onChange={e => updateField('color', e.target.value)} />
            </div>
            <div className="aliado-field full">
              <label>Características</label>
              <textarea value={form.characteristics} onChange={e => updateField('characteristics', e.target.value)} placeholder="Señas particulares, collar, chip, etc." />
            </div>
          </div>

          <h3>👤 Datos del Propietario</h3>
          <div className="aliado-form-grid">
            <div className="aliado-field">
              <label>Nombre del Propietario *</label>
              <input value={form.clientName} onChange={e => updateField('clientName', e.target.value)} />
            </div>
            <div className="aliado-field">
              <label>Teléfono *</label>
              <input value={form.clientPhone} onChange={e => updateField('clientPhone', e.target.value)} placeholder="Ej: 55 1234 5678" />
            </div>
            <div className="aliado-field">
              <label>Email</label>
              <input type="email" value={form.clientEmail} onChange={e => updateField('clientEmail', e.target.value)} />
            </div>
          </div>

          <h3>🚗 Recolección</h3>
          <div className="aliado-form-grid">
            <div className="aliado-field full">
              <label>Dirección de Recolección *</label>
              <input value={form.pickupAddress} onChange={e => updateField('pickupAddress', e.target.value)} placeholder="Dirección completa para recolección" />
            </div>
            <div className="aliado-field">
              <label>Fecha Preferida</label>
              <input type="date" value={form.pickupDate} onChange={e => updateField('pickupDate', e.target.value)} />
            </div>
            <div className="aliado-field">
              <label>Horario Preferido</label>
              <input value={form.pickupTimeSlot} onChange={e => updateField('pickupTimeSlot', e.target.value)} placeholder="Ej: 10:00-14:00" />
            </div>
            <div className="aliado-field full">
              <label>Notas de Recolección</label>
              <textarea value={form.pickupNotes} onChange={e => updateField('pickupNotes', e.target.value)} placeholder="Indicaciones especiales para la recolección..." />
            </div>
          </div>

          <h3>📝 Notas Adicionales</h3>
          <div className="aliado-field full">
            <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Alguna indicación adicional..." />
          </div>

          <div className="aliado-submit-row">
            <button type="submit" className="aliado-submit-btn" disabled={!isValid || submitting}>
              {submitting ? 'Enviando...' : '📋 Enviar Solicitud de Cremación'}
            </button>
          </div>
        </form>
      </main>

      <footer className="aliado-footer">
        <p>© {new Date().getFullYear()} Everest Vet — Crematorio de Mascotas</p>
      </footer>
    </div>
  );
}
