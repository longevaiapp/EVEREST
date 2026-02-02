import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ownerService, petService, visitService } from '../services/recepcion.service';
import './RegistroCliente.css';

const RegistroCliente = () => {
  const navigate = useNavigate();
  const { pacientes, setPacientes, agregarPacienteACola } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchPhone, setSearchPhone] = useState('');
  const [isExistingClient, setIsExistingClient] = useState(null);
  const [foundPatients, setFoundPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [foundOwner, setFoundOwner] = useState(null);
  
  const totalSteps = 5;

  const [formData, setFormData] = useState({
    // Paso 1: Datos del Propietario
    propietario: {
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      codigoPostal: ''
    },
    // Paso 2: Datos del Paciente
    paciente: {
      nombre: '',
      especie: '',
      raza: '',
      sexo: '',
      edad: '',
      unidadEdad: 'years',
      peso: '',
      color: '',
      esterilizado: '',
      microchip: '',
      foto: null,
      fotoPreview: null
    },
    // Paso 3: Historial Médico
    historial: {
      vacunasAlDia: '',
      ultimaVacuna: '',
      desparasitacionInterna: '',
      fechaDesparasitacionInt: '',
      desparasitacionExterna: '',
      fechaDesparasitacionExt: '',
      enfermedadesPrevias: '',
      detalleEnfermedades: '',
      cirugiasPrevias: '',
      detalleCirugias: '',
      alergias: '',
      detalleAlergias: '',
      medicamentosActuales: '',
      detalleMedicamentos: ''
    },
    // Paso 4: Motivo de Consulta
    consulta: {
      motivoConsulta: '',
      sintomas: [],
      duracionSintomas: '',
      comportamiento: '',
      apetito: '',
      agua: '',
      orina: '',
      heces: '',
      otrosDetalles: ''
    },
    // Paso 5: Consentimiento
    consentimiento: {
      autorizaTratamiento: false,
      autorizaEmergencia: false,
      aceptaTerminos: false,
      firma: ''
    }
  });

  const sintomasOpciones = [
    'Vomiting', 'Diarrhea', 'Loss of appetite', 'Lethargy',
    'Cough', 'Sneezing', 'Nasal discharge', 'Eye discharge',
    'Limping', 'Excessive scratching', 'Hair loss', 'Lumps/masses',
    'Difficulty breathing', 'Difficulty urinating', 'Bleeding',
    'Seizures', 'Fever', 'Other'
  ];

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSintomasChange = (sintoma) => {
    setFormData(prev => {
      const sintomas = prev.consulta.sintomas.includes(sintoma)
        ? prev.consulta.sintomas.filter(s => s !== sintoma)
        : [...prev.consulta.sintomas, sintoma];
      return {
        ...prev,
        consulta: { ...prev.consulta, sintomas }
      };
    });
  };

  const handleSearchExisting = async () => {
    if (searchPhone.length >= 8) {
      try {
        // Buscar en la API
        const owner = await ownerService.searchByPhone(searchPhone);
        
        if (owner) {
          setFoundOwner(owner);
          // Obtener mascotas del propietario
          const pets = await petService.getByOwner(owner.id);
          setFoundPatients(pets.map(pet => ({
            id: pet.id,
            nombre: pet.nombre,
            especie: pet.especie === 'PERRO' ? 'Canino' : pet.especie === 'GATO' ? 'Felino' : pet.especie,
            raza: pet.raza || 'Sin especificar',
            edad: pet.fechaNacimiento ? calcularEdad(pet.fechaNacimiento) : 'Sin registrar',
            propietario: owner.nombre,
            telefono: owner.telefono,
          })));
        } else {
          // Fallback: buscar en datos locales
          const found = pacientes?.filter(p => 
            p.telefono?.includes(searchPhone) || 
            p.propietario?.telefono?.includes(searchPhone)
          ) || [];
          setFoundPatients(found);
        }
      } catch (err) {
        console.error('Error searching:', err);
        // Fallback a búsqueda local
        const found = pacientes?.filter(p => 
          p.telefono?.includes(searchPhone) || 
          p.propietario?.telefono?.includes(searchPhone)
        ) || [];
        setFoundPatients(found);
      }
    }
  };

  // Function to calculate age
  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    const years = hoy.getFullYear() - nacimiento.getFullYear();
    const meses = hoy.getMonth() - nacimiento.getMonth();
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (meses > 0) {
      return `${meses} month${meses > 1 ? 's' : ''}`;
    } else {
      const dias = Math.floor((hoy - nacimiento) / (1000 * 60 * 60 * 24));
      return `${dias} day${dias > 1 ? 's' : ''}`;
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setCurrentStep(4); // Ir directo al motivo de consulta
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let owner = foundOwner;
      let pet = selectedPatient;

      // 1. Crear propietario si es nuevo
      if (!owner && !selectedPatient) {
        owner = await ownerService.create({
          nombre: formData.propietario.nombre,
          telefono: formData.propietario.telefono,
          email: formData.propietario.email || null,
          direccion: formData.propietario.direccion || null,
          ciudad: formData.propietario.ciudad || null,
          codigoPostal: formData.propietario.codigoPostal || null,
        });
      }

      // 2. Crear mascota si es nueva
      if (!selectedPatient && owner) {
        // Calcular fecha de nacimiento aproximada
        let fechaNacimiento = null;
        if (formData.paciente.edad) {
          const hoy = new Date();
          const edadNum = parseInt(formData.paciente.edad);
          if (formData.paciente.unidadEdad === 'años') {
            hoy.setFullYear(hoy.getFullYear() - edadNum);
          } else if (formData.paciente.unidadEdad === 'meses') {
            hoy.setMonth(hoy.getMonth() - edadNum);
          }
          fechaNacimiento = hoy.toISOString().split('T')[0];
        }

        pet = await petService.create({
          ownerId: owner.id,
          nombre: formData.paciente.nombre,
          especie: formData.paciente.especie,
          raza: formData.paciente.raza || null,
          sexo: formData.paciente.sexo,
          fechaNacimiento: fechaNacimiento,
          peso: formData.paciente.peso ? parseFloat(formData.paciente.peso) : null,
          color: formData.paciente.color || null,
          esterilizado: formData.paciente.esterilizado === 'Sí',
          fotoUrl: formData.paciente.fotoPreview || null, // Base64 photo
          // Historial
          vacunasActualizadas: formData.historial.vacunasAlDia === 'Sí',
          ultimaVacuna: formData.historial.ultimaVacuna || null,
          desparasitacionExterna: formData.historial.desparasitacionExterna === 'Sí',
          ultimaDesparasitacion: formData.historial.fechaDesparasitacionExt || null,
          otrasCirugias: formData.historial.cirugiasPrevias === 'Sí',
          detalleCirugias: formData.historial.detalleCirugias || null,
          alergias: formData.historial.detalleAlergias || null,
          antecedentes: formData.historial.detalleEnfermedades || null,
        });
      }

      // 3. Crear visita/check-in
      if (pet?.id) {
        await visitService.create(pet.id);
      }

      // Fallback: agregar a la cola local también
      const nuevoPaciente = {
        id: pet?.id || selectedPatient?.id || `PAC-${Date.now()}`,
        nombre: pet?.nombre || selectedPatient?.nombre || formData.paciente.nombre,
        especie: pet?.especie || selectedPatient?.especie || formData.paciente.especie,
        raza: pet?.raza || selectedPatient?.raza || formData.paciente.raza,
        propietario: owner?.nombre || selectedPatient?.propietario || formData.propietario.nombre,
        telefono: owner?.telefono || selectedPatient?.telefono || formData.propietario.telefono,
        motivoConsulta: formData.consulta.motivoConsulta,
        sintomas: formData.consulta.sintomas,
        fechaRegistro: new Date().toISOString(),
        estado: 'RECIEN_LLEGADO'
      };

      if (agregarPacienteACola) {
        agregarPacienteACola(nuevoPaciente);
      }

      setShowSuccess(true);
    } catch (err) {
      console.error('Error en registro:', err);
      setSubmitError(err.message || 'Error al registrar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3, 4, 5].map(step => (
        <div 
          key={step} 
          className={`step ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
        >
          <div className="step-number">
            {currentStep > step ? '✓' : step}
          </div>
          <div className="step-label">
            {step === 1 && 'Owner'}
            {step === 2 && 'Pet'}
            {step === 3 && 'History'}
            {step === 4 && 'Consultation'}
            {step === 5 && 'Confirm'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderInitialChoice = () => (
    <div className="initial-choice">
      <div className="logo-header">
        <span className="logo-icon">🏥</span>
        <h1>Veterinary Clinic</h1>
        <p>Clinical History Declaration</p>
      </div>
      
      <div className="choice-cards">
        <div 
          className="choice-card new-client"
          onClick={() => setIsExistingClient(false)}
        >
          <span className="choice-icon">🐾</span>
          <h3>I'm a new client</h3>
          <p>First time at the clinic</p>
        </div>
        
        <div 
          className="choice-card existing-client"
          onClick={() => setIsExistingClient(true)}
        >
          <span className="choice-icon">👤</span>
          <h3>I'm already a client</h3>
          <p>I have previous appointments</p>
        </div>
      </div>
    </div>
  );

  const renderExistingClientSearch = () => (
    <div className="existing-client-search">
      <button className="back-button" onClick={() => setIsExistingClient(null)}>
        ← Back
      </button>
      
      <h2>🔍 Search my record</h2>
      <p>Enter your phone number to find your registered pets</p>
      
      <div className="search-box">
        <input
          type="tel"
          placeholder="Phone number"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
        />
        <button onClick={handleSearchExisting}>Search</button>
      </div>
      
      {foundPatients.length > 0 && (
        <div className="found-patients">
          <h3>Pets found:</h3>
          {foundPatients.map(patient => (
            <div 
              key={patient.id} 
              className="patient-card"
              onClick={() => handleSelectPatient(patient)}
            >
              <span className="patient-icon">
                {patient.especie === 'Canino' ? '🐕' : patient.especie === 'Felino' ? '🐈' : '🐾'}
              </span>
              <div className="patient-info">
                <strong>{patient.nombre}</strong>
                <span>{patient.raza} • {patient.edad}</span>
              </div>
              <span className="select-arrow">→</span>
            </div>
          ))}
          
          <div className="add-new-pet">
            <button onClick={() => {
              setFormData(prev => ({
                ...prev,
                propietario: {
                  ...prev.propietario,
                  telefono: searchPhone,
                  nombre: foundPatients[0]?.propietario || ''
                }
              }));
              setIsExistingClient(false);
              setCurrentStep(2); // Go to pet data
            }}>
              + Register new pet
            </button>
          </div>
        </div>
      )}
      
      {searchPhone.length >= 8 && foundPatients.length === 0 && (
        <div className="no-results">
          <p>No records found with that number</p>
          <button onClick={() => setIsExistingClient(false)}>
            Register as new client
          </button>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h2>👤 Owner Information</h2>
      
      <div className="form-group">
        <label>Full name *</label>
        <input
          type="text"
          value={formData.propietario.nombre}
          onChange={(e) => handleInputChange('propietario', 'nombre', e.target.value)}
          placeholder="First and last name"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Phone *</label>
          <input
            type="tel"
            value={formData.propietario.telefono}
            onChange={(e) => handleInputChange('propietario', 'telefono', e.target.value)}
            placeholder="10 digits"
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.propietario.email}
            onChange={(e) => handleInputChange('propietario', 'email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          value={formData.propietario.direccion}
          onChange={(e) => handleInputChange('propietario', 'direccion', e.target.value)}
          placeholder="Street, number, neighborhood"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            value={formData.propietario.ciudad}
            onChange={(e) => handleInputChange('propietario', 'ciudad', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Postal Code</label>
          <input
            type="text"
            value={formData.propietario.codigoPostal}
            onChange={(e) => handleInputChange('propietario', 'codigoPostal', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h2>🐾 Pet Information</h2>
      
      <div className="form-group">
        <label>Pet name *</label>
        <input
          type="text"
          value={formData.paciente.nombre}
          onChange={(e) => handleInputChange('paciente', 'nombre', e.target.value)}
          placeholder="What's their name?"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Species *</label>
          <select
            value={formData.paciente.especie}
            onChange={(e) => handleInputChange('paciente', 'especie', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Canino">Dog</option>
            <option value="Felino">Cat</option>
            <option value="Ave">Bird</option>
            <option value="Roedor">Rodent</option>
            <option value="Reptil">Reptile</option>
            <option value="Otro">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Breed</label>
          <input
            type="text"
            value={formData.paciente.raza}
            onChange={(e) => handleInputChange('paciente', 'raza', e.target.value)}
            placeholder="Breed or mixed"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Sex *</label>
          <select
            value={formData.paciente.sexo}
            onChange={(e) => handleInputChange('paciente', 'sexo', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Macho">Male</option>
            <option value="Hembra">Female</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Is spayed/neutered?</label>
          <select
            value={formData.paciente.esterilizado}
            onChange={(e) => handleInputChange('paciente', 'esterilizado', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Si">Yes</option>
            <option value="No">No</option>
            <option value="No se">Don't know</option>
          </select>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group flex-row">
          <div>
            <label>Edad *</label>
            <input
              type="number"
              value={formData.paciente.edad}
              onChange={(e) => handleInputChange('paciente', 'edad', e.target.value)}
              placeholder="Edad"
            />
          </div>
          <select
            value={formData.paciente.unidadEdad}
            onChange={(e) => handleInputChange('paciente', 'unidadEdad', e.target.value)}
          >
            <option value="years">years</option>
            <option value="meses">months</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.paciente.peso}
            onChange={(e) => handleInputChange('paciente', 'peso', e.target.value)}
            placeholder="Approximate weight"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Color/Coat</label>
          <input
            type="text"
            value={formData.paciente.color}
            onChange={(e) => handleInputChange('paciente', 'color', e.target.value)}
            placeholder="Coat color"
          />
        </div>
        
        <div className="form-group">
          <label>Microchip number</label>
          <input
            type="text"
            value={formData.paciente.microchip}
            onChange={(e) => handleInputChange('paciente', 'microchip', e.target.value)}
            placeholder="If applicable"
          />
        </div>
      </div>

      {/* Pet photo */}
      <div className="form-group foto-upload-section">
        <label>📷 Pet photo (optional)</label>
        <div className="foto-upload-container-qr">
          <div className="foto-preview-qr">
            {formData.paciente.fotoPreview ? (
              <img src={formData.paciente.fotoPreview} alt="Pet photo" />
            ) : (
              <div className="foto-placeholder-qr">
                <span>🐾</span>
                <p>No photo</p>
              </div>
            )}
          </div>
          <div className="foto-actions-qr">
            <label className="btn-upload-foto">
              📷 Take / Select photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      // Compress image to reduce size
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 400;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height && width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                        } else if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        setFormData(prev => ({
                          ...prev,
                          paciente: {
                            ...prev.paciente,
                            foto: file,
                            fotoPreview: compressedBase64
                          }
                        }));
                      };
                      img.src = reader.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
            {formData.paciente.fotoPreview && (
              <button 
                type="button"
                className="btn-remove-foto"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  paciente: { ...prev.paciente, foto: null, fotoPreview: null }
                }))}
              >
                ❌ Remove photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h2>📋 Medical History</h2>
      
      <div className="form-section">
        <h3>Vaccination</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Vaccines up to date?</label>
            <select
              value={formData.historial.vacunasAlDia}
              onChange={(e) => handleInputChange('historial', 'vacunasAlDia', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Si">Yes</option>
              <option value="No">No</option>
              <option value="No se">Don't know</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Last vaccine</label>
            <input
              type="date"
              value={formData.historial.ultimaVacuna}
              onChange={(e) => handleInputChange('historial', 'ultimaVacuna', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Deworming</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Internal deworming</label>
            <select
              value={formData.historial.desparasitacionInterna}
              onChange={(e) => handleInputChange('historial', 'desparasitacionInterna', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Si">Yes</option>
              <option value="No">No</option>
              <option value="No se">Don't know</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.historial.fechaDesparasitacionInt}
              onChange={(e) => handleInputChange('historial', 'fechaDesparasitacionInt', e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>External deworming</label>
            <select
              value={formData.historial.desparasitacionExterna}
              onChange={(e) => handleInputChange('historial', 'desparasitacionExterna', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Si">Yes</option>
              <option value="No">No</option>
              <option value="No se">Don't know</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.historial.fechaDesparasitacionExt}
              onChange={(e) => handleInputChange('historial', 'fechaDesparasitacionExt', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Medical Background</h3>
        
        <div className="form-group">
          <label>Has had previous illnesses?</label>
          <select
            value={formData.historial.enfermedadesPrevias}
            onChange={(e) => handleInputChange('historial', 'enfermedadesPrevias', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Si">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.enfermedadesPrevias === 'Si' && (
          <div className="form-group">
            <label>Describe which:</label>
            <textarea
              value={formData.historial.detalleEnfermedades}
              onChange={(e) => handleInputChange('historial', 'detalleEnfermedades', e.target.value)}
              placeholder="Describe previous illnesses"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Has had previous surgeries?</label>
          <select
            value={formData.historial.cirugiasPrevias}
            onChange={(e) => handleInputChange('historial', 'cirugiasPrevias', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Si">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.cirugiasPrevias === 'Si' && (
          <div className="form-group">
            <label>Describe which:</label>
            <textarea
              value={formData.historial.detalleCirugias}
              onChange={(e) => handleInputChange('historial', 'detalleCirugias', e.target.value)}
              placeholder="Describe previous surgeries"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Has known allergies?</label>
          <select
            value={formData.historial.alergias}
            onChange={(e) => handleInputChange('historial', 'alergias', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Si">Yes</option>
            <option value="No">No</option>
            <option value="No se">Don't know</option>
          </select>
        </div>
        {formData.historial.alergias === 'Si' && (
          <div className="form-group">
            <label>Describe which:</label>
            <textarea
              value={formData.historial.detalleAlergias}
              onChange={(e) => handleInputChange('historial', 'detalleAlergias', e.target.value)}
              placeholder="Describe the allergies"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Currently taking medications?</label>
          <select
            value={formData.historial.medicamentosActuales}
            onChange={(e) => handleInputChange('historial', 'medicamentosActuales', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Si">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.medicamentosActuales === 'Si' && (
          <div className="form-group">
            <label>Which medications?</label>
            <textarea
              value={formData.historial.detalleMedicamentos}
              onChange={(e) => handleInputChange('historial', 'detalleMedicamentos', e.target.value)}
              placeholder="List medications and doses"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="form-step">
      <h2>🩺 Reason for Visit</h2>
      
      {selectedPatient && (
        <div className="selected-patient-banner">
          <span>Patient: <strong>{selectedPatient.nombre}</strong></span>
          <span>{selectedPatient.especie} • {selectedPatient.raza}</span>
        </div>
      )}
      
      <div className="form-group">
        <label>What is the reason for the visit? *</label>
        <textarea
          value={formData.consulta.motivoConsulta}
          onChange={(e) => handleInputChange('consulta', 'motivoConsulta', e.target.value)}
          placeholder="Briefly describe the reason for your visit"
          rows={3}
        />
      </div>
      
      <div className="form-group">
        <label>Observed symptoms (select all that apply)</label>
        <div className="sintomas-grid">
          {sintomasOpciones.map(sintoma => (
            <label key={sintoma} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.consulta.sintomas.includes(sintoma)}
                onChange={() => handleSintomasChange(sintoma)}
              />
              <span>{sintoma}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="form-group">
        <label>How long have the symptoms been present?</label>
        <input
          type="text"
          value={formData.consulta.duracionSintomas}
          onChange={(e) => handleInputChange('consulta', 'duracionSintomas', e.target.value)}
          placeholder="e.g.: For the past 3 days"
        />
      </div>
      
      <div className="form-section">
        <h3>General condition</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Behavior</label>
            <select
              value={formData.consulta.comportamiento}
              onChange={(e) => handleInputChange('consulta', 'comportamiento', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Normal">Normal</option>
              <option value="Decaído">Lethargic</option>
              <option value="Agresivo">More aggressive</option>
              <option value="Ansioso">Anxious</option>
              <option value="Otro">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Appetite</label>
            <select
              value={formData.consulta.apetito}
              onChange={(e) => handleInputChange('consulta', 'apetito', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Normal">Normal</option>
              <option value="Aumentado">Increased</option>
              <option value="Disminuido">Decreased</option>
              <option value="Nulo">Not eating</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Water intake</label>
            <select
              value={formData.consulta.agua}
              onChange={(e) => handleInputChange('consulta', 'agua', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Normal">Normal</option>
              <option value="Aumentado">Increased</option>
              <option value="Disminuido">Decreased</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Urination</label>
            <select
              value={formData.consulta.orina}
              onChange={(e) => handleInputChange('consulta', 'orina', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Normal">Normal</option>
              <option value="Frecuente">More frequent</option>
              <option value="Escasa">Infrequent</option>
              <option value="ConSangre">With blood</option>
              <option value="Dificultad">Difficulty</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Stools</label>
          <select
            value={formData.consulta.heces}
            onChange={(e) => handleInputChange('consulta', 'heces', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Normal">Normal</option>
            <option value="Diarrea">Diarrhea</option>
            <option value="Estrenimiento">Constipation</option>
            <option value="ConSangre">With blood</option>
            <option value="ConMoco">With mucus</option>
          </select>
        </div>
      </div>
      
      <div className="form-group">
        <label>Other important details</label>
        <textarea
          value={formData.consulta.otrosDetalles}
          onChange={(e) => handleInputChange('consulta', 'otrosDetalles', e.target.value)}
          placeholder="Any other information you consider relevant"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="form-step">
      <h2>✅ Confirmation and Consent</h2>
      
      <div className="summary-section">
        <h3>Information Summary</h3>
        
        <div className="summary-card">
          <h4>Owner</h4>
          <p><strong>{formData.propietario.nombre || selectedPatient?.propietario}</strong></p>
          <p>📞 {formData.propietario.telefono || selectedPatient?.telefono}</p>
        </div>
        
        <div className="summary-card">
          <h4>Pet</h4>
          <p><strong>{formData.paciente.nombre || selectedPatient?.nombre}</strong></p>
          <p>{formData.paciente.especie || selectedPatient?.especie} • {formData.paciente.raza || selectedPatient?.raza}</p>
          <p>{formData.paciente.edad || selectedPatient?.edad} {formData.paciente.unidadEdad}</p>
        </div>
        
        <div className="summary-card">
          <h4>Reason for visit</h4>
          <p>{formData.consulta.motivoConsulta}</p>
          {formData.consulta.sintomas.length > 0 && (
            <p><small>Symptoms: {formData.consulta.sintomas.join(', ')}</small></p>
          )}
        </div>
      </div>
      
      <div className="consent-section">
        <h3>Informed Consent</h3>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.autorizaTratamiento}
            onChange={(e) => handleInputChange('consentimiento', 'autorizaTratamiento', e.target.checked)}
          />
          <span>I authorize the veterinarian to perform the physical examination and necessary diagnostic procedures for my pet.</span>
        </label>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.autorizaEmergencia}
            onChange={(e) => handleInputChange('consentimiento', 'autorizaEmergencia', e.target.checked)}
          />
          <span>In case of emergency, I authorize the performance of urgent procedures necessary to preserve my pet's life.</span>
        </label>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.aceptaTerminos}
            onChange={(e) => handleInputChange('consentimiento', 'aceptaTerminos', e.target.checked)}
          />
          <span>I declare that the information provided is truthful and I accept the terms and conditions of service.</span>
        </label>
      </div>
      
      <div className="form-group">
        <label>Full name (as electronic signature) *</label>
        <input
          type="text"
          value={formData.consentimiento.firma}
          onChange={(e) => handleInputChange('consentimiento', 'firma', e.target.value)}
          placeholder="Write your full name"
          className="signature-input"
        />
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="success-screen">
      <div className="success-content">
        <span className="success-icon">✅</span>
        <h2>Registration Complete!</h2>
        <p>Your information has been received successfully.</p>
        <div className="success-info">
          <p>📍 Please approach reception to complete your check-in.</p>
          <p>🕐 Please wait, you will be attended to shortly.</p>
        </div>
        <div className="turno-box">
          <span>Your registration number:</span>
          <strong>{selectedPatient?.id || `PAC-${Date.now().toString().slice(-6)}`}</strong>
        </div>
      </div>
    </div>
  );

  if (showSuccess) {
    return renderSuccess();
  }

  return (
    <div className="registro-cliente-container">
      {isExistingClient === null && renderInitialChoice()}
      
      {isExistingClient === true && !selectedPatient && renderExistingClientSearch()}
      
      {(isExistingClient === false || selectedPatient) && (
        <div className="wizard-container">
          <button className="back-button" onClick={() => {
            if (currentStep > 1) {
              prevStep();
            } else {
              setIsExistingClient(null);
              setSelectedPatient(null);
            }
          }}>
            ← Back
          </button>
          
          {renderStepIndicator()}
          
          <div className="form-container">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </div>
          
          <div className="navigation-buttons">
            {currentStep > 1 && (
              <button className="btn-secondary" onClick={prevStep}>
                Previous
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button className="btn-primary" onClick={nextStep}>
                Next
              </button>
            ) : (
              <button 
                className="btn-submit"
                onClick={handleSubmit}
                disabled={!formData.consentimiento.aceptaTerminos || !formData.consentimiento.firma}
              >
                Submit registration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroCliente;
