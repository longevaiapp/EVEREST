// src/components/dashboards/EstilistaDashboard.jsx
// Dashboard for Stylists (Grooming) - Grooming Module
// 3-column layout similar to medical module

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useEstilista from '../../hooks/useEstilista';
import './EstilistaDashboard.css';

function EstilistaDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Hook for API operations
    const {
        groomingVisits,
        resumen,
        selectedGrooming,
        selectedPatient,
        loading,
        error,
        loadGroomingVisits,
        selectPatient,
        startService,
        completeService,
        cancelService,
        updateInternalUse,
        getFilteredVisits,
        clearError,
        clearSelection,
    } = useEstilista();

    // Local state
    const [activeFilter, setActiveFilter] = useState('all');
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Internal use form state (Section 8)
    const [internalUseForm, setInternalUseForm] = useState({
        dischargeCondition: '',
        stylistNotes: '',
    });

    // ============================================================================
    // HANDLERS
    // ============================================================================

    const handleSelectPatient = useCallback(async (visit) => {
        await selectPatient(visit);
    }, [selectPatient]);

    const handleStartService = useCallback(async () => {
        if (!selectedGrooming?.id) return;
        try {
            await startService(selectedGrooming.id);
            alert('✅ Service started');
        } catch (err) {
            alert('Error starting service');
        }
    }, [selectedGrooming, startService]);

    const handleOpenCompleteModal = useCallback(() => {
        setInternalUseForm({
            dischargeCondition: '',
            stylistNotes: '',
        });
        setShowCompleteModal(true);
    }, []);

    const handleCompleteService = useCallback(async () => {
        if (!selectedGrooming?.id) return;
        if (!internalUseForm.dischargeCondition) {
            alert('Please select a discharge condition');
            return;
        }

        try {
            await completeService(selectedGrooming.id, {
                dischargeCondition: internalUseForm.dischargeCondition,
                stylistNotes: internalUseForm.stylistNotes,
                checkoutTime: new Date().toISOString(),
            });
            setShowCompleteModal(false);
            alert('✅ Service completed - Patient ready for discharge');
        } catch (err) {
            alert('Error completing service');
        }
    }, [selectedGrooming, completeService, internalUseForm]);

    const handleCancelService = useCallback(async () => {
        if (!selectedGrooming?.id) return;
        const reason = prompt('Cancellation reason:');
        if (!reason) return;

        try {
            await cancelService(selectedGrooming.id, reason);
            alert('Service cancelled');
        } catch (err) {
            alert('Error cancelling service');
        }
    }, [selectedGrooming, cancelService]);

    // ============================================================================
    // RENDER HELPERS
    // ============================================================================

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDIENTE':
                return { class: 'pending', label: '⏳ Pending', icon: '⏳' };
            case 'EN_PROCESO':
                return { class: 'in-progress', label: '✂️ In Progress', icon: '✂️' };
            case 'COMPLETADO':
                return { class: 'completed', label: '✅ Completed', icon: '✅' };
            case 'CANCELADO':
                return { class: 'cancelled', label: '❌ Cancelled', icon: '❌' };
            default:
                return { class: 'unknown', label: status, icon: '❓' };
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '--:--';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();
        if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
        return `${months} month${months > 1 ? 's' : ''}`;
    };

    const filteredVisits = getFilteredVisits(activeFilter);

    // ============================================================================
    // LOADING STATE
    // ============================================================================

    if (loading && groomingVisits.length === 0) {
        return (
            <div className="dashboard estilista-dashboard loading-state">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading grooming patients...</p>
                </div>
            </div>
        );
    }

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    return (
        <div className="dashboard estilista-dashboard three-panel-layout">
            {/* Error notification */}
            {error && (
                <div className="error-notification">
                    <span>{error}</span>
                    <button onClick={clearError}>✕</button>
                </div>
            )}

            {/* ===== LEFT PANEL - Patient Queue ===== */}
            <aside className="left-panel">
                <div className="panel-header">
                    <h3>✂️ Grooming Queue</h3>
                    <button className="refresh-btn" onClick={loadGroomingVisits} disabled={loading}>
                        🔄
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="queue-summary">
                    <div className="stat pending" onClick={() => setActiveFilter('pending')}>
                        <span className="stat-number">{resumen.pendientes}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                    <div className="stat in-progress" onClick={() => setActiveFilter('in-progress')}>
                        <span className="stat-number">{resumen.enProceso}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                    <div className="stat completed" onClick={() => setActiveFilter('completed')}>
                        <span className="stat-number">{resumen.completados}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All ({resumen.total})
                    </button>
                    <button
                        className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('pending')}
                    >
                        ⏳ Pending
                    </button>
                    <button
                        className={`filter-tab ${activeFilter === 'in-progress' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('in-progress')}
                    >
                        ✂️ In Progress
                    </button>
                </div>

                {/* Patient List */}
                <div className="patient-queue">
                    {filteredVisits.length === 0 ? (
                        <div className="empty-queue">
                            <span className="empty-icon">🐾</span>
                            <p>No patients in this category</p>
                        </div>
                    ) : (
                        filteredVisits.map((visit) => {
                            const status = getStatusBadge(visit.groomingService?.status);
                            const isSelected = selectedPatient?.visitId === visit.id;

                            return (
                                <div
                                    key={visit.id}
                                    className={`patient-card ${status.class} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelectPatient(visit)}
                                >
                                    <div className="patient-time">{formatTime(visit.arrivalTime)}</div>
                                    <div className="patient-info">
                                        <div className="patient-name">
                                            {visit.pet?.fotoUrl ? (
                                                <img src={visit.pet.fotoUrl} alt={visit.pet.nombre} className="pet-photo" />
                                            ) : (
                                                <span className="pet-icon">{visit.pet?.especie === 'Perro' ? '🐕' : '🐈'}</span>
                                            )}
                                            <span>{visit.pet?.nombre || 'No name'}</span>
                                        </div>
                                        <div className="patient-details">
                                            {visit.pet?.raza} • {visit.pet?.owner?.nombre}
                                        </div>
                                    </div>
                                    <span className={`status-badge ${status.class}`}>
                                        {status.icon}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ===== MIDDLE PANEL - Grooming Details + Internal Use ===== */}
            <main className="main-panel">
                {!selectedGrooming ? (
                    <div className="no-selection">
                        <div className="no-selection-icon">✂️</div>
                        <h2>Select a patient</h2>
                        <p>Click on a patient from the list to view grooming service details</p>
                    </div>
                ) : (
                    <div className="grooming-details">
                        {/* Header */}
                        <div className="details-header">
                            <div className="patient-header-info">
                                <h2>
                                    {selectedPatient?.fotoUrl ? (
                                        <img src={selectedPatient.fotoUrl} alt={selectedPatient.nombre} className="header-pet-photo" />
                                    ) : (
                                        <span className="header-pet-icon">{selectedPatient?.especie === 'Perro' ? '🐕' : '🐈'}</span>
                                    )}
                                    {selectedPatient?.nombre}
                                </h2>
                                <span className={`status-badge large ${getStatusBadge(selectedGrooming.status).class}`}>
                                    {getStatusBadge(selectedGrooming.status).label}
                                </span>
                            </div>
                            <div className="action-buttons">
                                {selectedGrooming.status === 'PENDIENTE' && (
                                    <button className="btn-primary" onClick={handleStartService}>
                                        ▶️ Start Service
                                    </button>
                                )}
                                {selectedGrooming.status === 'EN_PROCESO' && (
                                    <button className="btn-success" onClick={handleOpenCompleteModal}>
                                        ✅ Complete Service
                                    </button>
                                )}
                                {(selectedGrooming.status === 'PENDIENTE' || selectedGrooming.status === 'EN_PROCESO') && (
                                    <button className="btn-danger" onClick={handleCancelService}>
                                        ❌ Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Grooming Form Details (Read-only) */}
                        <div className="grooming-form-details">
                            {/* Section 3: Pet's Condition */}
                            <div className="detail-section">
                                <h3>🐾 Pet's Condition</h3>
                                <div className="condition-tags">
                                    {selectedGrooming.conditionCalm && <span className="tag calm">😊 Calm</span>}
                                    {selectedGrooming.conditionNervous && <span className="tag nervous">😰 Nervous</span>}
                                    {selectedGrooming.conditionAggressive && <span className="tag aggressive">😠 Aggressive</span>}
                                    {selectedGrooming.conditionAnxious && <span className="tag anxious">😟 Anxious</span>}
                                    {selectedGrooming.conditionBites && <span className="tag warning">⚠️ Bites</span>}
                                    {selectedGrooming.conditionNeedsMuzzle && <span className="tag warning">🔒 Needs Muzzle</span>}
                                    {selectedGrooming.conditionFirstGrooming && <span className="tag info">🆕 First Time</span>}
                                </div>
                                {selectedGrooming.conditionObservations && (
                                    <p className="observations">{selectedGrooming.conditionObservations}</p>
                                )}
                            </div>

                            {/* Section 4: Services Requested */}
                            <div className="detail-section">
                                <h3>🛁 Requested Services</h3>

                                <div className="services-grid">
                                    {/* Bath */}
                                    <div className="service-group">
                                        <h4>Bath</h4>
                                        <div className="service-items">
                                            {selectedGrooming.bathBasic && <span className="service-item">🚿 Basic Bath</span>}
                                            {selectedGrooming.bathMedicated && <span className="service-item">💊 Medicated Bath</span>}
                                            {selectedGrooming.bathFleaTreatment && <span className="service-item">🐜 Flea Treatment</span>}
                                            {selectedGrooming.bathMoisturizing && <span className="service-item">💧 Moisturizing</span>}
                                            {selectedGrooming.bathDrying && <span className="service-item">💨 Drying</span>}
                                        </div>
                                    </div>

                                    {/* Haircut */}
                                    <div className="service-group">
                                        <h4>Haircut</h4>
                                        <div className="service-items">
                                            {selectedGrooming.haircutFull && <span className="service-item">✂️ Full Haircut</span>}
                                            {selectedGrooming.haircutDeshedding && <span className="service-item">🧹 Deshedding</span>}
                                            {selectedGrooming.haircutTrimming && <span className="service-item">✂️ Trimming</span>}
                                            {selectedGrooming.haircutSanitary && <span className="service-item">🧼 Sanitary Cut</span>}
                                            {selectedGrooming.haircutFace && <span className="service-item">😺 Face</span>}
                                            {selectedGrooming.haircutPaws && <span className="service-item">🐾 Paws</span>}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="service-group">
                                        <h4>Details</h4>
                                        <div className="service-items">
                                            {selectedGrooming.detailsNailTrimming && <span className="service-item">💅 Nail Trimming</span>}
                                            {selectedGrooming.detailsEarCleaning && <span className="service-item">👂 Ear Cleaning</span>}
                                            {selectedGrooming.detailsAnalGlands && <span className="service-item">🔬 Anal Glands</span>}
                                            {selectedGrooming.detailsTeethBrushing && <span className="service-item">🦷 Teeth Brushing</span>}
                                        </div>
                                    </div>

                                    {/* Extras */}
                                    <div className="service-group">
                                        <h4>Extras</h4>
                                        <div className="service-items">
                                            {selectedGrooming.extrasPerfume && <span className="service-item">🌸 Perfume</span>}
                                            {selectedGrooming.extrasBowsBandana && <span className="service-item">🎀 Bows/Bandana</span>}
                                            {selectedGrooming.extrasSpecialShampoo && (
                                                <span className="service-item">🧴 Special Shampoo: {selectedGrooming.extrasSpecialShampooType}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Special Instructions */}
                            {selectedGrooming.specialInstructions && (
                                <div className="detail-section">
                                    <h3>📝 Special Instructions</h3>
                                    <p className="special-instructions">{selectedGrooming.specialInstructions}</p>
                                </div>
                            )}

                            {/* Section 6: Health Conditions */}
                            <div className="detail-section health-section">
                                <h3>⚕️ Health Conditions</h3>
                                <div className="health-tags">
                                    {selectedGrooming.healthWounds && <span className="tag health-alert">🩹 Wounds</span>}
                                    {selectedGrooming.healthSkinProblems && <span className="tag health-alert">🔴 Skin Problems</span>}
                                    {selectedGrooming.healthOtitis && <span className="tag health-alert">👂 Otitis</span>}
                                    {selectedGrooming.healthAllergies && <span className="tag health-alert">⚠️ Allergies</span>}
                                    {selectedGrooming.healthFleasTicks && <span className="tag health-alert">🐜 Fleas/Ticks</span>}
                                    {selectedGrooming.healthChronicIllness && <span className="tag health-alert">💊 Chronic Illness</span>}
                                    {selectedGrooming.healthUnderTreatment && (
                                        <span className="tag health-alert">💉 Under Treatment: {selectedGrooming.healthTreatmentDetails}</span>
                                    )}
                                    {!selectedGrooming.healthWounds && !selectedGrooming.healthSkinProblems &&
                                        !selectedGrooming.healthOtitis && !selectedGrooming.healthAllergies &&
                                        !selectedGrooming.healthFleasTicks && !selectedGrooming.healthChronicIllness &&
                                        !selectedGrooming.healthUnderTreatment && (
                                            <span className="tag health-ok">✅ No conditions reported</span>
                                        )}
                                </div>
                            </div>

                            {/* Section 7: Authorization */}
                            <div className="detail-section">
                                <h3>✅ Authorizations</h3>
                                <div className="authorization-items">
                                    {selectedGrooming.authorizeMuzzle && <span className="auth-item">✓ Authorizes muzzle use</span>}
                                    {selectedGrooming.authorizeAdjustments && <span className="auth-item">✓ Authorizes service adjustments</span>}
                                    {selectedGrooming.consentGiven && (
                                        <span className="auth-item consent">✓ Consent signed ({formatTime(selectedGrooming.consentTimestamp)})</span>
                                    )}
                                </div>
                            </div>

                            {/* Section 8: Internal Use (Editable by Stylist) */}
                            <div className="detail-section internal-use">
                                <h3>🏥 EVERESTVET - INTERNAL USE</h3>

                                {selectedGrooming.status === 'COMPLETADO' ? (
                                    // Show completed data (read-only)
                                    <div className="internal-use-completed">
                                        <div className="internal-field">
                                            <label>Check-out Time:</label>
                                            <span>{formatTime(selectedGrooming.checkoutTime)}</span>
                                        </div>
                                        <div className="internal-field">
                                            <label>Discharge Condition:</label>
                                            <span className={`discharge-badge ${selectedGrooming.dischargeCondition?.toLowerCase()}`}>
                                                {selectedGrooming.dischargeCondition === 'EXCELLENT' && '⭐ Excellent'}
                                                {selectedGrooming.dischargeCondition === 'GOOD' && '👍 Good'}
                                                {selectedGrooming.dischargeCondition === 'REQUIRES_OBSERVATION' && '👀 Requires Observation'}
                                            </span>
                                        </div>
                                        {selectedGrooming.stylistNotes && (
                                            <div className="internal-field">
                                                <label>Stylist Notes:</label>
                                                <p>{selectedGrooming.stylistNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Show pending message
                                    <div className="internal-use-pending">
                                        <p>Complete the service to fill this section</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ===== RIGHT PANEL - Patient Info ===== */}
            <aside className="right-panel">
                {!selectedPatient ? (
                    <div className="no-selection-small">
                        <span>🐾</span>
                        <p>Patient information</p>
                    </div>
                ) : (
                    <div className="patient-details-panel">
                        {/* Pet Photo */}
                        <div className="patient-photo-section">
                            {selectedPatient.fotoUrl ? (
                                <img src={selectedPatient.fotoUrl} alt={selectedPatient.nombre} className="patient-photo-large" />
                            ) : (
                                <div className="patient-photo-placeholder">
                                    {selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}
                                </div>
                            )}
                        </div>

                        {/* Basic Info */}
                        <div className="info-section">
                            <h3>{selectedPatient.nombre}</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Species</label>
                                    <span>{selectedPatient.especie}</span>
                                </div>
                                <div className="info-item">
                                    <label>Breed</label>
                                    <span>{selectedPatient.raza}</span>
                                </div>
                                <div className="info-item">
                                    <label>Age</label>
                                    <span>{calculateAge(selectedPatient.fechaNacimiento)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Sex</label>
                                    <span>{selectedPatient.sexo}</span>
                                </div>
                                <div className="info-item">
                                    <label>Weight</label>
                                    <span>{selectedPatient.peso} kg</span>
                                </div>
                                <div className="info-item">
                                    <label>Color</label>
                                    <span>{selectedPatient.color || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Owner Info */}
                        <div className="info-section owner-section">
                            <h4>👤 Owner</h4>
                            <div className="owner-info">
                                <p className="owner-name">{selectedPatient.owner?.nombre}</p>
                                <p className="owner-phone">📞 {selectedPatient.owner?.telefono}</p>
                                {selectedPatient.owner?.email && (
                                    <p className="owner-email">📧 {selectedPatient.owner?.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Visit Info */}
                        <div className="info-section visit-section">
                            <h4>📅 Current Visit</h4>
                            <div className="visit-info">
                                <p><strong>Arrival:</strong> {formatTime(selectedPatient.arrivalTime)}</p>
                                <p><strong>Type:</strong> Grooming</p>
                                <p><strong>Date:</strong> {formatDate(selectedPatient.arrivalTime)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* ===== COMPLETE SERVICE MODAL ===== */}
            {showCompleteModal && (
                <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
                    <div className="modal-content complete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🏥 EVERESTVET - INTERNAL USE</h2>
                            <button className="close-btn" onClick={() => setShowCompleteModal(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Check-out Time</label>
                                <input
                                    type="text"
                                    value={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    disabled
                                    className="time-display"
                                />
                            </div>

                            <div className="form-group">
                                <label>Discharge Condition <span className="required">*</span></label>
                                <div className="discharge-options">
                                    <label className={`discharge-option ${internalUseForm.dischargeCondition === 'EXCELLENT' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="dischargeCondition"
                                            value="EXCELLENT"
                                            checked={internalUseForm.dischargeCondition === 'EXCELLENT'}
                                            onChange={(e) => setInternalUseForm(prev => ({ ...prev, dischargeCondition: e.target.value }))}
                                        />
                                        <span className="option-icon">⭐</span>
                                        <span className="option-label">Excellent</span>
                                    </label>
                                    <label className={`discharge-option ${internalUseForm.dischargeCondition === 'GOOD' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="dischargeCondition"
                                            value="GOOD"
                                            checked={internalUseForm.dischargeCondition === 'GOOD'}
                                            onChange={(e) => setInternalUseForm(prev => ({ ...prev, dischargeCondition: e.target.value }))}
                                        />
                                        <span className="option-icon">👍</span>
                                        <span className="option-label">Good</span>
                                    </label>
                                    <label className={`discharge-option ${internalUseForm.dischargeCondition === 'REQUIRES_OBSERVATION' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="dischargeCondition"
                                            value="REQUIRES_OBSERVATION"
                                            checked={internalUseForm.dischargeCondition === 'REQUIRES_OBSERVATION'}
                                            onChange={(e) => setInternalUseForm(prev => ({ ...prev, dischargeCondition: e.target.value }))}
                                        />
                                        <span className="option-icon">👀</span>
                                        <span className="option-label">Requires Observation</span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Stylist Notes</label>
                                <textarea
                                    value={internalUseForm.stylistNotes}
                                    onChange={(e) => setInternalUseForm(prev => ({ ...prev, stylistNotes: e.target.value }))}
                                    placeholder="Observations about the service, pet behavior, recommendations..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCompleteModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-success"
                                onClick={handleCompleteService}
                                disabled={!internalUseForm.dischargeCondition || loading}
                            >
                                {loading ? 'Saving...' : '✅ Complete Service'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EstilistaDashboard;
