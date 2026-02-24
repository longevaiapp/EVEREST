// PrescriptionPrint.jsx
// Component for printing external prescriptions as PDF

import React, { useEffect, useState, useCallback } from 'react';
import { recetaService } from '../../services/medico.service';
import './PrescriptionPrint.css';

/**
 * PrescriptionPrint - Modal para visualizar e imprimir recetas externas
 * @param {string} consultationId - ID de la consulta
 * @param {object} patient - Datos del paciente (nombre, especie, raza, etc.)
 * @param {function} onClose - Callback para cerrar el modal
 */
const PrescriptionPrint = ({ consultationId, patient, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recetaService.getExternalForPdf(consultationId);
      setPrescriptions(data.prescriptions);
      setBusinessInfo(data.businessInfo);
    } catch (err) {
      setError(err.message || 'Error loading prescription data');
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Flatten all items from all prescriptions
  const allItems = prescriptions.flatMap(p => p.items || []);

  if (loading) {
    return (
      <div className="prescription-print-overlay" onClick={onClose}>
        <div className="prescription-print-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando receta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prescription-print-overlay" onClick={onClose}>
        <div className="prescription-print-modal" onClick={e => e.stopPropagation()}>
          <div className="error-state">
            <p>❌ {error}</p>
            <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="prescription-print-overlay" onClick={onClose}>
        <div className="prescription-print-modal" onClick={e => e.stopPropagation()}>
          <div className="empty-state">
            <p>📄 No hay medicamentos externos en esta receta</p>
            <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const firstPrescription = prescriptions[0];
  const visit = firstPrescription?.consultation?.visit;
  const petData = visit?.pet || patient;
  const ownerData = petData?.owner;

  return (
    <div className="prescription-print-overlay" onClick={onClose}>
      <div className="prescription-print-modal" onClick={e => e.stopPropagation()}>
        {/* Print Controls - Hidden when printing */}
        <div className="print-controls no-print">
          <button className="btn-primary" onClick={handlePrint}>
            🖨️ Imprimir / Guardar PDF
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {/* Printable Content */}
        <div className="prescription-document">
          {/* Header */}
          <header className="prescription-header">
            {businessInfo?.clinicLogo && (
              <img 
                src={businessInfo.clinicLogo} 
                alt="Logo" 
                className="clinic-logo"
              />
            )}
            <div className="clinic-info">
              <h1>{businessInfo?.clinicName || 'Clínica Veterinaria'}</h1>
              {businessInfo?.clinicAddress && <p>{businessInfo.clinicAddress}</p>}
              {(businessInfo?.clinicCity || businessInfo?.clinicState) && (
                <p>
                  {businessInfo.clinicCity}
                  {businessInfo.clinicCity && businessInfo.clinicState ? ', ' : ''}
                  {businessInfo.clinicState}
                  {businessInfo.clinicZip ? ` CP ${businessInfo.clinicZip}` : ''}
                </p>
              )}
              {businessInfo?.clinicPhone && <p>Tel: {businessInfo.clinicPhone}</p>}
              {businessInfo?.clinicEmail && <p>{businessInfo.clinicEmail}</p>}
            </div>
            {businessInfo?.prescriptionHeader && (
              <p className="prescription-header-text">{businessInfo.prescriptionHeader}</p>
            )}
          </header>

          {/* Title */}
          <div className="prescription-title">
            <h2>RECETA MÉDICA VETERINARIA</h2>
            <p className="prescription-date">Fecha: {formatDate(firstPrescription?.createdAt || new Date())}</p>
          </div>

          {/* Patient Info */}
          <section className="patient-info-section">
            <div className="info-row">
              <div className="info-item">
                <label>Paciente:</label>
                <span>{petData?.nombre || petData?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Especie:</label>
                <span>{petData?.especie || petData?.species || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Raza:</label>
                <span>{petData?.raza || petData?.breed || 'N/A'}</span>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <label>Propietario:</label>
                <span>
                  {ownerData?.nombre || 'N/A'}
                </span>
              </div>
              <div className="info-item">
                <label>Teléfono:</label>
                <span>{ownerData?.telefono || ownerData?.phone || 'N/A'}</span>
              </div>
            </div>
          </section>

          {/* Medications */}
          <section className="medications-section">
            <h3>Rx</h3>
            <table className="medications-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Dosis</th>
                  <th>Frecuencia</th>
                  <th>Vía</th>
                  <th>Duración</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{item.name}</td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                    <td>{item.route || item.via || 'Oral'}</td>
                    <td>{item.duration}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* General Instructions */}
          {firstPrescription?.generalInstructions && (
            <section className="instructions-section">
              <h4>Indicaciones Generales:</h4>
              <p>{firstPrescription.generalInstructions}</p>
            </section>
          )}

          {/* Warnings */}
          {businessInfo?.prescriptionWarnings && (
            <section className="warnings-section">
              <p>⚠️ {businessInfo.prescriptionWarnings}</p>
            </section>
          )}

          {/* Signature */}
          <section className="signature-section">
            <div className="signature-box">
              {businessInfo?.vetSignature && (
                <img 
                  src={businessInfo.vetSignature} 
                  alt="Firma" 
                  className="vet-signature"
                />
              )}
              <div className="signature-line"></div>
              <p className="vet-name">{businessInfo?.vetName || firstPrescription?.prescribedBy?.nombre || 'Médico Veterinario'}</p>
              {businessInfo?.vetLicense && <p className="vet-license">Cédula Prof.: {businessInfo.vetLicense}</p>}
              {businessInfo?.vetSpecialty && <p className="vet-specialty">{businessInfo.vetSpecialty}</p>}
            </div>
          </section>

          {/* Footer */}
          <footer className="prescription-footer">
            {businessInfo?.prescriptionFooter && (
              <p>{businessInfo.prescriptionFooter}</p>
            )}
            {businessInfo?.taxId && (
              <p className="tax-info">RFC: {businessInfo.taxId}</p>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPrint;
