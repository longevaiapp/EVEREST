// src/components/CatalogoUrnas.jsx
// Public urn catalog - no login needed, no prices, informational only

import { useState, useEffect } from 'react';
import crematorioService from '../services/crematorio.service';
import './CatalogoUrnas.css';

const SIZE_LABELS = {
  CHICA: 'Chica',
  MEDIANA: 'Mediana',
  GRANDE: 'Grande',
  EXTRA_GRANDE: 'Extra Grande',
};

export default function CatalogoUrnas() {
  const [urns, setUrns] = useState([]);
  const [packagingRanges, setPackagingRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sizeFilter, setSizeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [urnsData, pkgData] = await Promise.all([
        crematorioService.getPublicUrns(),
        crematorioService.getPackagingRanges(),
      ]);
      setUrns(urnsData);
      setPackagingRanges(pkgData);
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUrns = sizeFilter === 'all' 
    ? urns 
    : urns.filter(u => u.size === sizeFilter);

  return (
    <div className="catalogo-page">
      {/* Header */}
      <header className="catalogo-header">
        <div className="catalogo-header-content">
          <img src="/logo.png" alt="Everest Vet" className="catalogo-logo" />
          <div>
            <h1>Servicio de Cremación</h1>
            <p>Honramos la memoria de tu compañero con dignidad y respeto</p>
          </div>
        </div>
      </header>

      <main className="catalogo-main">
        {/* Intro */}
        <section className="catalogo-intro">
          <h2>🕊️ Catálogo de Urnas</h2>
          <p>
            Ofrecemos una variedad de urnas de alta calidad para que puedas conservar 
            las cenizas de tu mascota. Cada urna está diseñada con cuidado y amor.
          </p>
        </section>

        {/* Filters */}
        <div className="catalogo-filters">
          <button className={`filter-btn ${sizeFilter === 'all' ? 'active' : ''}`} onClick={() => setSizeFilter('all')}>Todas</button>
          {Object.entries(SIZE_LABELS).map(([key, label]) => (
            <button key={key} className={`filter-btn ${sizeFilter === key ? 'active' : ''}`} onClick={() => setSizeFilter(key)}>{label}</button>
          ))}
        </div>

        {/* Urns Grid */}
        {loading ? (
          <div className="catalogo-loading">Cargando catálogo...</div>
        ) : filteredUrns.length === 0 ? (
          <div className="catalogo-empty">No hay urnas disponibles en este momento.</div>
        ) : (
          <div className="catalogo-grid">
            {filteredUrns.map(urn => (
              <div key={urn.id} className="catalogo-urn-card">
                <div className="urn-card-image">
                  {urn.imageUrl ? (
                    <img src={urn.imageUrl} alt={urn.name} />
                  ) : (
                    <div className="urn-placeholder">⚱️</div>
                  )}
                </div>
                <div className="urn-card-info">
                  <h3>{urn.name}</h3>
                  {urn.description && <p>{urn.description}</p>}
                  <span className="urn-size-tag">{SIZE_LABELS[urn.size] || urn.size}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Packaging info */}
        {packagingRanges.length > 0 && (
          <section className="catalogo-packaging">
            <h2>📦 Tipos de Servicio según Peso</h2>
            <div className="packaging-grid">
              {packagingRanges.map(pkg => (
                <div key={pkg.id} className="packaging-card">
                  <div className="packaging-label">{pkg.label}</div>
                  <div className="packaging-range">
                    {parseFloat(pkg.minKg)} - {parseFloat(pkg.maxKg) >= 999 ? '80+' : parseFloat(pkg.maxKg)} kg
                  </div>
                  {pkg.requiresTwoOperators && <span className="packaging-note">Servicio especial</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="catalogo-process">
          <h2>¿Cómo funciona?</h2>
          <div className="process-steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <h4>📞 Solicitud</h4>
              <p>Contáctanos o solicita el servicio a través de tu veterinario</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h4>🚗 Recolección</h4>
              <p>Programamos la recolección a domicilio o en clínica</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h4>🔥 Cremación</h4>
              <p>Proceso individual con total respeto y dignidad</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h4>🕊️ Entrega</h4>
              <p>Entregamos las cenizas en la urna seleccionada</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="catalogo-cta">
          <h2>¿Necesitas más información?</h2>
          <p>Contáctanos para recibir atención personalizada</p>
          <a href="/crematorio/aliado" className="cta-button">Solicitar Servicio</a>
        </section>
      </main>

      <footer className="catalogo-footer">
        <p>© {new Date().getFullYear()} Everest Vet — Crematorio de Mascotas</p>
      </footer>
    </div>
  );
}
