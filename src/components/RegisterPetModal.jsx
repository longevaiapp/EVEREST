// src/components/RegisterPetModal.jsx
// Modal form for registering a new pet during check-in flow

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { petService } from '../services/recepcion.service';
import './RegisterPetModal.css';

const SPECIES_OPTIONS = [
    { value: 'PERRO', label: 'Dog', icon: '🐕' },
    { value: 'GATO', label: 'Cat', icon: '🐈' },
    { value: 'AVE', label: 'Bird', icon: '🐦' },
    { value: 'ROEDOR', label: 'Rodent', icon: '🐹' },
    { value: 'REPTIL', label: 'Reptile', icon: '🦎' },
    { value: 'OTRO', label: 'Other', icon: '🐾' },
];

const SEX_OPTIONS = [
    { value: 'MACHO', label: 'Male', icon: '♂️' },
    { value: 'HEMBRA', label: 'Female', icon: '♀️' },
];

function RegisterPetModal({ isOpen, onClose, owner, onPetCreated }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    const [formData, setFormData] = useState({
        nombre: '',
        especie: 'PERRO',
        raza: '',
        sexo: 'MACHO',
        fechaNacimiento: '',
        peso: '',
        color: '',
        fotoUrl: null,
        // Optional medical info
        alergias: '',
        enfermedadesCronicas: '',
        esterilizado: false,
        antecedentes: '',
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Photo must be less than 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                setPhotoPreview(base64);
                setFormData(prev => ({ ...prev, fotoUrl: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validation
        if (!formData.nombre.trim()) {
            setError('Pet name is required');
            setLoading(false);
            return;
        }

        if (!owner?.id) {
            setError('Owner information is missing. Please try again.');
            setLoading(false);
            return;
        }

        try {
            const petData = {
                ...formData,
                ownerId: owner.id,
                peso: formData.peso ? parseFloat(formData.peso) : null,
                fechaNacimiento: formData.fechaNacimiento || null,
            };

            console.log('[RegisterPetModal] Creating pet with data:', petData);
            const newPet = await petService.create(petData);
            console.log('[RegisterPetModal] Pet created successfully:', newPet);

            // Success - call callback with new pet
            onPetCreated(newPet);

            // Reset form
            setFormData({
                nombre: '',
                especie: 'PERRO',
                raza: '',
                sexo: 'MACHO',
                fechaNacimiento: '',
                peso: '',
                color: '',
                fotoUrl: null,
                alergias: '',
                enfermedadesCronicas: '',
                esterilizado: false,
                antecedentes: '',
            });
            setPhotoPreview(null);

        } catch (err) {
            console.error('Error creating pet:', err);
            console.error('Error details:', err.response?.data);
            const errorMessage = err.response?.data?.message
                || err.response?.data?.error
                || (err.response?.data?.details ? JSON.stringify(err.response?.data?.details) : null)
                || err.message
                || 'Failed to register pet. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        setPhotoPreview(null);
        setFormData({
            nombre: '',
            especie: 'PERRO',
            raza: '',
            sexo: 'MACHO',
            fechaNacimiento: '',
            peso: '',
            color: '',
            fotoUrl: null,
            alergias: '',
            enfermedadesCronicas: '',
            esterilizado: false,
            antecedentes: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="register-pet-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🐾 Register New Pet</h2>
                    <p className="owner-info">Owner: <strong>{owner?.nombre}</strong></p>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>

                {error && (
                    <div className="error-message">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="pet-form">
                    {/* Photo Upload */}
                    <div className="photo-section">
                        <div className="photo-preview">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Pet preview" />
                            ) : (
                                <div className="photo-placeholder">
                                    <span>📷</span>
                                    <p>Add Photo</p>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            id="pet-photo"
                            hidden
                        />
                        <label htmlFor="pet-photo" className="upload-btn">
                            {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        </label>
                    </div>

                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>📋 Basic Information</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="nombre">Pet Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Enter pet name"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-row two-cols">
                            <div className="form-group">
                                <label>Species <span className="required">*</span></label>
                                <div className="option-grid species-grid">
                                    {SPECIES_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className={`option-card ${formData.especie === option.value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="especie"
                                                value={option.value}
                                                checked={formData.especie === option.value}
                                                onChange={handleChange}
                                            />
                                            <span className="option-icon">{option.icon}</span>
                                            <span className="option-label">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Sex <span className="required">*</span></label>
                                <div className="option-grid sex-grid">
                                    {SEX_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className={`option-card ${formData.sexo === option.value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="sexo"
                                                value={option.value}
                                                checked={formData.sexo === option.value}
                                                onChange={handleChange}
                                            />
                                            <span className="option-icon">{option.icon}</span>
                                            <span className="option-label">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="form-row three-cols">
                            <div className="form-group">
                                <label htmlFor="raza">Breed</label>
                                <input
                                    type="text"
                                    id="raza"
                                    name="raza"
                                    value={formData.raza}
                                    onChange={handleChange}
                                    placeholder="e.g., Labrador, Persian"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="color">Color</label>
                                <input
                                    type="text"
                                    id="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    placeholder="e.g., Golden, Black"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="peso">Weight (kg)</label>
                                <input
                                    type="number"
                                    id="peso"
                                    name="peso"
                                    value={formData.peso}
                                    onChange={handleChange}
                                    placeholder="e.g., 5.5"
                                    step="0.1"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="fechaNacimiento">Date of Birth</label>
                                <input
                                    type="date"
                                    id="fechaNacimiento"
                                    name="fechaNacimiento"
                                    value={formData.fechaNacimiento}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Medical Info (Optional) */}
                    <div className="form-section collapsible">
                        <h3>⚕️ Medical Information <span className="optional">(Optional)</span></h3>

                        <div className="form-row">
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="esterilizado"
                                        checked={formData.esterilizado}
                                        onChange={handleChange}
                                    />
                                    <span className="checkmark"></span>
                                    Spayed/Neutered
                                </label>
                            </div>
                        </div>

                        <div className="form-row two-cols">
                            <div className="form-group">
                                <label htmlFor="alergias">Known Allergies</label>
                                <textarea
                                    id="alergias"
                                    name="alergias"
                                    value={formData.alergias}
                                    onChange={handleChange}
                                    placeholder="List any known allergies..."
                                    rows={2}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="enfermedadesCronicas">Chronic Conditions</label>
                                <textarea
                                    id="enfermedadesCronicas"
                                    name="enfermedadesCronicas"
                                    value={formData.enfermedadesCronicas}
                                    onChange={handleChange}
                                    placeholder="List any chronic conditions..."
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="antecedentes">Medical History Notes</label>
                                <textarea
                                    id="antecedentes"
                                    name="antecedentes"
                                    value={formData.antecedentes}
                                    onChange={handleChange}
                                    placeholder="Any important medical history..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Registering...
                                </>
                            ) : (
                                <>
                                    ✓ Register Pet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RegisterPetModal;
