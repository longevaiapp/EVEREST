// src/components/dashboards/GroomingIntakeForm.jsx
// Grooming Service Request Form - 7 sections as per specification

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GroomingIntakeForm.css';

const GroomingIntakeForm = ({
    pet,
    owner,
    visit,
    onSubmit,
    onCancel,
    isSubmitting: externalSubmitting = false
}) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editable owner information (for missing fields)
    const [editableOwner, setEditableOwner] = useState({
        nombre: owner?.nombre || '',
        telefono: owner?.telefono || '',
        email: owner?.email || ''
    });

    // Editable pet information (for missing fields)
    const [editablePet, setEditablePet] = useState({
        nombre: pet?.nombre || '',
        especie: pet?.especie || '',
        raza: pet?.raza || '',
        fechaNacimiento: pet?.fechaNacimiento || '',
        peso: pet?.peso || '',
        sexo: pet?.sexo || '',
        esterilizado: pet?.esterilizado || false
    });

    // Internal state for grooming data
    const [groomingData, setGroomingData] = useState({
        // Section 3: Pet Condition
        conditionMatted: false,
        conditionTangled: false,
        conditionClean: false,
        conditionDirty: false,
        conditionFleas: false,
        conditionTicks: false,
        conditionSkinIrritation: false,
        conditionEarDirty: false,
        conditionNailsLong: false,
        conditionNotes: '',

        // Section 4: Services
        bathType: 'BASIC',
        haircutStyle: 'NONE',
        brushing: false,
        deShedding: false,
        nailTrim: false,
        nailGrinding: false,
        earCleaning: false,
        teethBrushing: false,
        analGlands: false,
        pawTrim: false,
        faceTrim: false,
        sanitaryTrim: false,
        cologne: false,
        bandana: false,
        customStyleNotes: '',

        // Section 5: Special Instructions
        specialInstructions: '',

        // Section 6: Health
        hasAllergies: false,
        allergiesDetails: '',
        hasMedicalConditions: false,
        medicalConditionsDetails: '',
        isOnMedication: false,
        medicationDetails: '',
        recentVaccination: false,
        vaccinationDetails: '',
        behaviorAggressive: false,
        behaviorAnxious: false,
        behaviorBites: false,
        behaviorNotes: '',

        // Section 7: Authorization
        authorized: false,
        pickupTime: '',
        contactPhone: owner?.telefono || ''
    });

    // Handler for editable owner fields
    const handleOwnerChange = (field, value) => {
        setEditableOwner(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handler for editable pet fields
    const handlePetChange = (field, value) => {
        setEditablePet(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCheckboxChange = (field) => {
        setGroomingData(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleInputChange = (field, value) => {
        setGroomingData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!groomingData.consentGiven) {
            alert('Please check the consent checkbox to continue.');
            return;
        }
        setIsSubmitting(true);
        try {
            // Include editable pet/owner data for updating records if needed
            const submissionData = {
                ...groomingData,
                // Include any updated pet info
                petUpdates: {
                    raza: editablePet.raza || undefined,
                    fechaNacimiento: editablePet.fechaNacimiento || undefined,
                    peso: editablePet.peso ? parseFloat(editablePet.peso) : undefined,
                    sexo: editablePet.sexo || undefined,
                    esterilizado: editablePet.esterilizado,
                    especie: editablePet.especie || undefined
                },
                // Include any updated owner info
                ownerUpdates: {
                    email: editableOwner.email || undefined
                }
            };
            await onSubmit(submissionData);
        } catch (error) {
            console.error('Error submitting grooming form:', error);
            alert('Error submitting form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate age from birth date
    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const birth = new Date(birthDate);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();
        if (years > 0) {
            return `${years} año${years > 1 ? 's' : ''}`;
        }
        return `${months} mes${months > 1 ? 'es' : ''}`;
    };

    return (
        <div className="grooming-intake-form">
            <div className="form-header">
                <h2>✂️ GROOMING SERVICE REQUEST FORM</h2>
                <div className="form-meta">
                    <span>📅 Date: {new Date().toLocaleDateString()}</span>
                    <span>⏰ Check-in Time: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* SECTION 1: OWNER INFORMATION */}
            <section className="form-section">
                <h3>1️⃣ OWNER INFORMATION</h3>
                <div className="info-grid editable-grid">
                    <div className="info-item">
                        <label>Owner's Name:</label>
                        {owner?.nombre ? (
                            <span className="filled-value">{editableOwner.nombre}</span>
                        ) : (
                            <input
                                type="text"
                                value={editableOwner.nombre}
                                onChange={(e) => handleOwnerChange('nombre', e.target.value)}
                                placeholder="Enter owner name"
                                className="editable-input"
                            />
                        )}
                    </div>
                    <div className="info-item">
                        <label>Phone:</label>
                        {owner?.telefono ? (
                            <span className="filled-value">{editableOwner.telefono}</span>
                        ) : (
                            <input
                                type="tel"
                                value={editableOwner.telefono}
                                onChange={(e) => handleOwnerChange('telefono', e.target.value)}
                                placeholder="Enter phone number"
                                className="editable-input"
                            />
                        )}
                    </div>
                    <div className="info-item">
                        <label>Email:</label>
                        {owner?.email ? (
                            <span className="filled-value">{editableOwner.email}</span>
                        ) : (
                            <input
                                type="email"
                                value={editableOwner.email}
                                onChange={(e) => handleOwnerChange('email', e.target.value)}
                                placeholder="Enter email (optional)"
                                className="editable-input"
                            />
                        )}
                    </div>
                </div>
            </section>

            {/* SECTION 2: PET INFORMATION */}
            <section className="form-section">
                <h3>2️⃣ PET INFORMATION</h3>
                <div className="info-grid editable-grid pet-info">
                    {pet?.fotoUrl && (
                        <div className="pet-photo">
                            <img src={pet.fotoUrl} alt={pet.nombre} />
                        </div>
                    )}
                    <div className="pet-details">
                        <div className="info-item">
                            <label>Name:</label>
                            {pet?.nombre ? (
                                <span className="filled-value">{editablePet.nombre}</span>
                            ) : (
                                <input
                                    type="text"
                                    value={editablePet.nombre}
                                    onChange={(e) => handlePetChange('nombre', e.target.value)}
                                    placeholder="Enter pet name"
                                    className="editable-input"
                                />
                            )}
                        </div>
                        <div className="info-item">
                            <label>Species:</label>
                            {pet?.especie ? (
                                <span className="filled-value">
                                    {pet.especie === 'PERRO' ? '🐕 Dog' : pet.especie === 'GATO' ? '🐱 Cat' : pet.especie}
                                </span>
                            ) : (
                                <select
                                    value={editablePet.especie}
                                    onChange={(e) => handlePetChange('especie', e.target.value)}
                                    className="editable-input"
                                >
                                    <option value="">Select species</option>
                                    <option value="PERRO">🐕 Dog</option>
                                    <option value="GATO">🐱 Cat</option>
                                    <option value="AVE">🐦 Bird</option>
                                    <option value="ROEDOR">🐹 Rodent</option>
                                    <option value="REPTIL">🦎 Reptile</option>
                                    <option value="OTRO">🐾 Other</option>
                                </select>
                            )}
                        </div>
                        <div className="info-item">
                            <label>Breed:</label>
                            {pet?.raza ? (
                                <span className="filled-value">{editablePet.raza}</span>
                            ) : (
                                <input
                                    type="text"
                                    value={editablePet.raza}
                                    onChange={(e) => handlePetChange('raza', e.target.value)}
                                    placeholder="Enter breed (optional)"
                                    className="editable-input"
                                />
                            )}
                        </div>
                        <div className="info-item">
                            <label>Age / Date of Birth:</label>
                            {pet?.fechaNacimiento ? (
                                <span className="filled-value">{calculateAge(pet.fechaNacimiento)}</span>
                            ) : (
                                <input
                                    type="date"
                                    value={editablePet.fechaNacimiento}
                                    onChange={(e) => handlePetChange('fechaNacimiento', e.target.value)}
                                    className="editable-input"
                                />
                            )}
                        </div>
                        <div className="info-item">
                            <label>Weight (kg):</label>
                            {pet?.peso ? (
                                <span className="filled-value">{pet.peso} kg</span>
                            ) : (
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editablePet.peso}
                                    onChange={(e) => handlePetChange('peso', e.target.value)}
                                    placeholder="Enter weight"
                                    className="editable-input"
                                />
                            )}
                        </div>
                        <div className="info-item">
                            <label>Sex:</label>
                            {pet?.sexo ? (
                                <span className="filled-value">
                                    {pet.sexo === 'MACHO' ? '♂ Male' : '♀ Female'}
                                </span>
                            ) : (
                                <select
                                    value={editablePet.sexo}
                                    onChange={(e) => handlePetChange('sexo', e.target.value)}
                                    className="editable-input"
                                >
                                    <option value="">Select sex</option>
                                    <option value="MACHO">♂ Male</option>
                                    <option value="HEMBRA">♀ Female</option>
                                </select>
                            )}
                        </div>
                        <div className="info-item">
                            <label>Spayed/Neutered:</label>
                            <div className="checkbox-inline">
                                <input
                                    type="checkbox"
                                    checked={editablePet.esterilizado}
                                    onChange={(e) => handlePetChange('esterilizado', e.target.checked)}
                                    id="esterilizado-check"
                                />
                                <label htmlFor="esterilizado-check">
                                    {editablePet.esterilizado ? '✓ Yes' : '✗ No'}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3: PET'S GENERAL CONDITION */}
            <section className="form-section">
                <h3>3️⃣ PET'S GENERAL CONDITION</h3>
                <p className="section-note">Check all that apply:</p>
                <div className="checkbox-grid">
                    <label className={`checkbox-item ${groomingData.conditionCalm ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionCalm || false}
                            onChange={() => handleCheckboxChange('conditionCalm')}
                        />
                        <span>😊 Calm</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionNervous ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionNervous || false}
                            onChange={() => handleCheckboxChange('conditionNervous')}
                        />
                        <span>😰 Nervous</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionAggressive ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionAggressive || false}
                            onChange={() => handleCheckboxChange('conditionAggressive')}
                        />
                        <span>😠 Aggressive</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionAnxious ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionAnxious || false}
                            onChange={() => handleCheckboxChange('conditionAnxious')}
                        />
                        <span>😟 Anxious</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionBites ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionBites || false}
                            onChange={() => handleCheckboxChange('conditionBites')}
                        />
                        <span>🦷 Bites</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionNeedsMuzzle ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionNeedsMuzzle || false}
                            onChange={() => handleCheckboxChange('conditionNeedsMuzzle')}
                        />
                        <span>🐕‍🦺 Requires muzzle</span>
                    </label>
                    <label className={`checkbox-item ${groomingData.conditionFirstGrooming ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.conditionFirstGrooming || false}
                            onChange={() => handleCheckboxChange('conditionFirstGrooming')}
                        />
                        <span>🆕 First grooming service</span>
                    </label>
                </div>
                <div className="form-group">
                    <label>Important observations:</label>
                    <textarea
                        value={groomingData.conditionObservations || ''}
                        onChange={(e) => handleInputChange('conditionObservations', e.target.value)}
                        placeholder="Any important observations about the pet's behavior or condition..."
                        rows="3"
                    />
                </div>
            </section>

            {/* SECTION 4: REQUESTED SERVICES */}
            <section className="form-section">
                <h3>4️⃣ REQUESTED SERVICES</h3>
                <p className="section-note">Check one or more:</p>

                {/* Bath Services */}
                <div className="service-subsection">
                    <h4>🛁 Bath</h4>
                    <div className="checkbox-grid">
                        <label className={`checkbox-item ${groomingData.bathBasic ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.bathBasic || false}
                                onChange={() => handleCheckboxChange('bathBasic')}
                            />
                            <span>Basic bath</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.bathMedicated ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.bathMedicated || false}
                                onChange={() => handleCheckboxChange('bathMedicated')}
                            />
                            <span>Medicated bath</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.bathFleaTreatment ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.bathFleaTreatment || false}
                                onChange={() => handleCheckboxChange('bathFleaTreatment')}
                            />
                            <span>Flea treatment bath</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.bathMoisturizing ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.bathMoisturizing || false}
                                onChange={() => handleCheckboxChange('bathMoisturizing')}
                            />
                            <span>Moisturizing bath</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.bathDrying ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.bathDrying || false}
                                onChange={() => handleCheckboxChange('bathDrying')}
                            />
                            <span>Drying</span>
                        </label>
                    </div>
                </div>

                {/* Haircut & Grooming */}
                <div className="service-subsection">
                    <h4>✂️ Haircut & Grooming</h4>
                    <div className="checkbox-grid">
                        <label className={`checkbox-item ${groomingData.haircutFull ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutFull || false}
                                onChange={() => handleCheckboxChange('haircutFull')}
                            />
                            <span>Full haircut</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.haircutDeshedding ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutDeshedding || false}
                                onChange={() => handleCheckboxChange('haircutDeshedding')}
                            />
                            <span>De-shedding</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.haircutTrimming ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutTrimming || false}
                                onChange={() => handleCheckboxChange('haircutTrimming')}
                            />
                            <span>Trimming</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.haircutSanitary ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutSanitary || false}
                                onChange={() => handleCheckboxChange('haircutSanitary')}
                            />
                            <span>Sanitary trim</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.haircutFace ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutFace || false}
                                onChange={() => handleCheckboxChange('haircutFace')}
                            />
                            <span>Face trim</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.haircutPaws ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.haircutPaws || false}
                                onChange={() => handleCheckboxChange('haircutPaws')}
                            />
                            <span>Paw trim</span>
                        </label>
                    </div>
                </div>

                {/* Details */}
                <div className="service-subsection">
                    <h4>🐾 Details</h4>
                    <div className="checkbox-grid">
                        <label className={`checkbox-item ${groomingData.detailsNailTrimming ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.detailsNailTrimming || false}
                                onChange={() => handleCheckboxChange('detailsNailTrimming')}
                            />
                            <span>Nail trimming</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.detailsEarCleaning ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.detailsEarCleaning || false}
                                onChange={() => handleCheckboxChange('detailsEarCleaning')}
                            />
                            <span>Ear cleaning</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.detailsAnalGlands ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.detailsAnalGlands || false}
                                onChange={() => handleCheckboxChange('detailsAnalGlands')}
                            />
                            <span>Anal gland expression</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.detailsTeethBrushing ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.detailsTeethBrushing || false}
                                onChange={() => handleCheckboxChange('detailsTeethBrushing')}
                            />
                            <span>Teeth brushing</span>
                        </label>
                    </div>
                </div>

                {/* Extras */}
                <div className="service-subsection">
                    <h4>✨ Extras</h4>
                    <div className="checkbox-grid">
                        <label className={`checkbox-item ${groomingData.extrasPerfume ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.extrasPerfume || false}
                                onChange={() => handleCheckboxChange('extrasPerfume')}
                            />
                            <span>Perfume</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.extrasBowsBandana ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.extrasBowsBandana || false}
                                onChange={() => handleCheckboxChange('extrasBowsBandana')}
                            />
                            <span>Bows / Bandana</span>
                        </label>
                        <label className={`checkbox-item ${groomingData.extrasSpecialShampoo ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={groomingData.extrasSpecialShampoo || false}
                                onChange={() => handleCheckboxChange('extrasSpecialShampoo')}
                            />
                            <span>Special shampoo</span>
                        </label>
                    </div>
                    {groomingData.extrasSpecialShampoo && (
                        <div className="form-group inline">
                            <label>Specify shampoo type:</label>
                            <input
                                type="text"
                                value={groomingData.extrasSpecialShampooType || ''}
                                onChange={(e) => handleInputChange('extrasSpecialShampooType', e.target.value)}
                                placeholder="e.g., Oatmeal, Hypoallergenic, Whitening..."
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* SECTION 5: SPECIAL INSTRUCTIONS */}
            <section className="form-section">
                <h3>5️⃣ SPECIAL INSTRUCTIONS FROM THE OWNER</h3>
                <div className="form-group">
                    <textarea
                        value={groomingData.specialInstructions || ''}
                        onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                        placeholder="E.g., length of cut, areas not to cut, sensitivities, preferred style..."
                        rows="4"
                    />
                </div>
            </section>

            {/* SECTION 6: HEALTH CONDITIONS */}
            <section className="form-section health-section">
                <h3>6️⃣ HEALTH CONDITIONS <span className="important-badge">⚠️ IMPORTANT</span></h3>
                <p className="section-note">Does your pet have any of the following conditions?</p>
                <div className="checkbox-grid health-grid">
                    <label className={`checkbox-item warning ${groomingData.healthWounds ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthWounds || false}
                            onChange={() => handleCheckboxChange('healthWounds')}
                        />
                        <span>🩹 Wounds</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthSkinProblems ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthSkinProblems || false}
                            onChange={() => handleCheckboxChange('healthSkinProblems')}
                        />
                        <span>🔴 Skin problems</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthOtitis ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthOtitis || false}
                            onChange={() => handleCheckboxChange('healthOtitis')}
                        />
                        <span>👂 Otitis</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthAllergies ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthAllergies || false}
                            onChange={() => handleCheckboxChange('healthAllergies')}
                        />
                        <span>🤧 Allergies</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthFleasTicks ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthFleasTicks || false}
                            onChange={() => handleCheckboxChange('healthFleasTicks')}
                        />
                        <span>🐛 Fleas / ticks</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthChronicIllness ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthChronicIllness || false}
                            onChange={() => handleCheckboxChange('healthChronicIllness')}
                        />
                        <span>💊 Chronic illness</span>
                    </label>
                    <label className={`checkbox-item warning ${groomingData.healthUnderTreatment ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.healthUnderTreatment || false}
                            onChange={() => handleCheckboxChange('healthUnderTreatment')}
                        />
                        <span>💉 Currently under medical treatment</span>
                    </label>
                </div>
                {groomingData.healthUnderTreatment && (
                    <div className="form-group">
                        <label>Specify treatment details:</label>
                        <textarea
                            value={groomingData.healthTreatmentDetails || ''}
                            onChange={(e) => handleInputChange('healthTreatmentDetails', e.target.value)}
                            placeholder="What medication or treatment is the pet currently receiving?"
                            rows="2"
                        />
                    </div>
                )}
            </section>

            {/* SECTION 7: AUTHORIZATION AND CONSENT */}
            <section className="form-section consent-section">
                <h3>7️⃣ AUTHORIZATION AND CONSENT</h3>
                <div className="consent-text">
                    <p>
                        I declare that the information provided is accurate and authorize EverestVet to perform
                        the requested grooming services. I understand that reactions related to the procedure
                        may occur (stress, mild redness, hair shedding, etc.).
                    </p>
                </div>
                <div className="checkbox-grid consent-grid">
                    <label className={`checkbox-item consent ${groomingData.authorizeMuzzle ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.authorizeMuzzle || false}
                            onChange={() => handleCheckboxChange('authorizeMuzzle')}
                        />
                        <span>I authorize the use of a muzzle if necessary</span>
                    </label>
                    <label className={`checkbox-item consent ${groomingData.authorizeAdjustments ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.authorizeAdjustments || false}
                            onChange={() => handleCheckboxChange('authorizeAdjustments')}
                        />
                        <span>I authorize service adjustments for the patient's well-being</span>
                    </label>
                </div>
                <div className="consent-final">
                    <label className={`checkbox-item consent-main ${groomingData.consentGiven ? 'checked' : ''}`}>
                        <input
                            type="checkbox"
                            checked={groomingData.consentGiven || false}
                            onChange={() => handleCheckboxChange('consentGiven')}
                            required
                        />
                        <span><strong>✓ I agree to the terms and authorize the grooming service</strong></span>
                    </label>
                </div>
                <div className="form-group signature">
                    <label>Owner's Name (Digital Signature):</label>
                    <input
                        type="text"
                        value={groomingData.ownerSignature || ''}
                        onChange={(e) => handleInputChange('ownerSignature', e.target.value)}
                        placeholder="Type your full name as signature"
                    />
                </div>
            </section>

            {/* FORM ACTIONS */}
            <div className="form-actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-submit"
                    onClick={handleFormSubmit}
                    disabled={isSubmitting || !groomingData.consentGiven}
                >
                    {isSubmitting ? '⏳ Submitting...' : '✓ Complete Check-in'}
                </button>
            </div>
        </div>
    );
};

export default GroomingIntakeForm;
