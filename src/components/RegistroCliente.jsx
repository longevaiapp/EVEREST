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
      unidadEdad: 'años',
      peso: '',
      color: '',
      esterilizado: '',
      microchip: ''
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
    'Vómito', 'Diarrea', 'Pérdida de apetito', 'Letargia',
    'Tos', 'Estornudos', 'Secreción nasal', 'Secreción ocular',
    'Cojera', 'Rascado excesivo', 'Pérdida de pelo', 'Bultos/masas',
    'Dificultad para respirar', 'Dificultad para orinar', 'Sangrado',
    'Convulsiones', 'Fiebre', 'Otro'
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

  // Función para calcular edad
  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    const años = hoy.getFullYear() - nacimiento.getFullYear();
    const meses = hoy.getMonth() - nacimiento.getMonth();
    
    if (años > 0) {
      return `${años} año${años > 1 ? 's' : ''}`;
    } else if (meses > 0) {
      return `${meses} mes${meses > 1 ? 'es' : ''}`;
    } else {
      const dias = Math.floor((hoy - nacimiento) / (1000 * 60 * 60 * 24));
      return `${dias} día${dias > 1 ? 's' : ''}`;
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
            {step === 1 && 'Propietario'}
            {step === 2 && 'Mascota'}
            {step === 3 && 'Historial'}
            {step === 4 && 'Consulta'}
            {step === 5 && 'Confirmar'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderInitialChoice = () => (
    <div className="initial-choice">
      <div className="logo-header">
        <span className="logo-icon">🏥</span>
        <h1>Clínica Veterinaria</h1>
        <p>Declaración de Antecedentes Clínicos</p>
      </div>
      
      <div className="choice-cards">
        <div 
          className="choice-card new-client"
          onClick={() => setIsExistingClient(false)}
        >
          <span className="choice-icon">🐾</span>
          <h3>Soy nuevo cliente</h3>
          <p>Primera vez en la clínica</p>
        </div>
        
        <div 
          className="choice-card existing-client"
          onClick={() => setIsExistingClient(true)}
        >
          <span className="choice-icon">👤</span>
          <h3>Ya soy cliente</h3>
          <p>Tengo citas previas</p>
        </div>
      </div>
    </div>
  );

  const renderExistingClientSearch = () => (
    <div className="existing-client-search">
      <button className="back-button" onClick={() => setIsExistingClient(null)}>
        ← Volver
      </button>
      
      <h2>🔍 Buscar mi registro</h2>
      <p>Ingresa tu número de teléfono para encontrar tus mascotas registradas</p>
      
      <div className="search-box">
        <input
          type="tel"
          placeholder="Número de teléfono"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
        />
        <button onClick={handleSearchExisting}>Buscar</button>
      </div>
      
      {foundPatients.length > 0 && (
        <div className="found-patients">
          <h3>Mascotas encontradas:</h3>
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
              setCurrentStep(2); // Ir a datos de mascota
            }}>
              + Registrar nueva mascota
            </button>
          </div>
        </div>
      )}
      
      {searchPhone.length >= 8 && foundPatients.length === 0 && (
        <div className="no-results">
          <p>No encontramos registros con ese número</p>
          <button onClick={() => setIsExistingClient(false)}>
            Registrarme como nuevo cliente
          </button>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="form-step">
      <h2>👤 Datos del Propietario</h2>
      
      <div className="form-group">
        <label>Nombre completo *</label>
        <input
          type="text"
          value={formData.propietario.nombre}
          onChange={(e) => handleInputChange('propietario', 'nombre', e.target.value)}
          placeholder="Nombre y apellidos"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Teléfono *</label>
          <input
            type="tel"
            value={formData.propietario.telefono}
            onChange={(e) => handleInputChange('propietario', 'telefono', e.target.value)}
            placeholder="10 dígitos"
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.propietario.email}
            onChange={(e) => handleInputChange('propietario', 'email', e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>Dirección</label>
        <input
          type="text"
          value={formData.propietario.direccion}
          onChange={(e) => handleInputChange('propietario', 'direccion', e.target.value)}
          placeholder="Calle, número, colonia"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Ciudad</label>
          <input
            type="text"
            value={formData.propietario.ciudad}
            onChange={(e) => handleInputChange('propietario', 'ciudad', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Código Postal</label>
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
      <h2>🐾 Datos de la Mascota</h2>
      
      <div className="form-group">
        <label>Nombre de la mascota *</label>
        <input
          type="text"
          value={formData.paciente.nombre}
          onChange={(e) => handleInputChange('paciente', 'nombre', e.target.value)}
          placeholder="¿Cómo se llama?"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Especie *</label>
          <select
            value={formData.paciente.especie}
            onChange={(e) => handleInputChange('paciente', 'especie', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Canino">Perro</option>
            <option value="Felino">Gato</option>
            <option value="Ave">Ave</option>
            <option value="Roedor">Roedor</option>
            <option value="Reptil">Reptil</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Raza</label>
          <input
            type="text"
            value={formData.paciente.raza}
            onChange={(e) => handleInputChange('paciente', 'raza', e.target.value)}
            placeholder="Raza o mestizo"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Sexo *</label>
          <select
            value={formData.paciente.sexo}
            onChange={(e) => handleInputChange('paciente', 'sexo', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Macho">Macho</option>
            <option value="Hembra">Hembra</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>¿Está esterilizado/a?</label>
          <select
            value={formData.paciente.esterilizado}
            onChange={(e) => handleInputChange('paciente', 'esterilizado', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
            <option value="No se">No sé</option>
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
            <option value="años">años</option>
            <option value="meses">meses</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.paciente.peso}
            onChange={(e) => handleInputChange('paciente', 'peso', e.target.value)}
            placeholder="Peso aproximado"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Color/Pelaje</label>
          <input
            type="text"
            value={formData.paciente.color}
            onChange={(e) => handleInputChange('paciente', 'color', e.target.value)}
            placeholder="Color del pelaje"
          />
        </div>
        
        <div className="form-group">
          <label>Número de microchip</label>
          <input
            type="text"
            value={formData.paciente.microchip}
            onChange={(e) => handleInputChange('paciente', 'microchip', e.target.value)}
            placeholder="Si tiene"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h2>📋 Historial Médico</h2>
      
      <div className="form-section">
        <h3>Vacunación</h3>
        <div className="form-row">
          <div className="form-group">
            <label>¿Vacunas al día?</label>
            <select
              value={formData.historial.vacunasAlDia}
              onChange={(e) => handleInputChange('historial', 'vacunasAlDia', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
              <option value="No se">No sé</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Última vacuna</label>
            <input
              type="date"
              value={formData.historial.ultimaVacuna}
              onChange={(e) => handleInputChange('historial', 'ultimaVacuna', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Desparasitación</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Desparasitación interna</label>
            <select
              value={formData.historial.desparasitacionInterna}
              onChange={(e) => handleInputChange('historial', 'desparasitacionInterna', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
              <option value="No se">No sé</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={formData.historial.fechaDesparasitacionInt}
              onChange={(e) => handleInputChange('historial', 'fechaDesparasitacionInt', e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Desparasitación externa</label>
            <select
              value={formData.historial.desparasitacionExterna}
              onChange={(e) => handleInputChange('historial', 'desparasitacionExterna', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
              <option value="No se">No sé</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={formData.historial.fechaDesparasitacionExt}
              onChange={(e) => handleInputChange('historial', 'fechaDesparasitacionExt', e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Antecedentes</h3>
        
        <div className="form-group">
          <label>¿Ha tenido enfermedades previas?</label>
          <select
            value={formData.historial.enfermedadesPrevias}
            onChange={(e) => handleInputChange('historial', 'enfermedadesPrevias', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.enfermedadesPrevias === 'Si' && (
          <div className="form-group">
            <label>Describa cuáles:</label>
            <textarea
              value={formData.historial.detalleEnfermedades}
              onChange={(e) => handleInputChange('historial', 'detalleEnfermedades', e.target.value)}
              placeholder="Describa las enfermedades previas"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>¿Ha tenido cirugías previas?</label>
          <select
            value={formData.historial.cirugiasPrevias}
            onChange={(e) => handleInputChange('historial', 'cirugiasPrevias', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.cirugiasPrevias === 'Si' && (
          <div className="form-group">
            <label>Describa cuáles:</label>
            <textarea
              value={formData.historial.detalleCirugias}
              onChange={(e) => handleInputChange('historial', 'detalleCirugias', e.target.value)}
              placeholder="Describa las cirugías previas"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>¿Tiene alergias conocidas?</label>
          <select
            value={formData.historial.alergias}
            onChange={(e) => handleInputChange('historial', 'alergias', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
            <option value="No se">No sé</option>
          </select>
        </div>
        {formData.historial.alergias === 'Si' && (
          <div className="form-group">
            <label>Describa cuáles:</label>
            <textarea
              value={formData.historial.detalleAlergias}
              onChange={(e) => handleInputChange('historial', 'detalleAlergias', e.target.value)}
              placeholder="Describa las alergias"
            />
          </div>
        )}
        
        <div className="form-group">
          <label>¿Toma medicamentos actualmente?</label>
          <select
            value={formData.historial.medicamentosActuales}
            onChange={(e) => handleInputChange('historial', 'medicamentosActuales', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Si">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.historial.medicamentosActuales === 'Si' && (
          <div className="form-group">
            <label>¿Cuáles medicamentos?</label>
            <textarea
              value={formData.historial.detalleMedicamentos}
              onChange={(e) => handleInputChange('historial', 'detalleMedicamentos', e.target.value)}
              placeholder="Liste los medicamentos y dosis"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="form-step">
      <h2>🩺 Motivo de Consulta</h2>
      
      {selectedPatient && (
        <div className="selected-patient-banner">
          <span>Paciente: <strong>{selectedPatient.nombre}</strong></span>
          <span>{selectedPatient.especie} • {selectedPatient.raza}</span>
        </div>
      )}
      
      <div className="form-group">
        <label>¿Cuál es el motivo de la consulta? *</label>
        <textarea
          value={formData.consulta.motivoConsulta}
          onChange={(e) => handleInputChange('consulta', 'motivoConsulta', e.target.value)}
          placeholder="Describa brevemente el motivo de su visita"
          rows={3}
        />
      </div>
      
      <div className="form-group">
        <label>Síntomas observados (seleccione todos los que apliquen)</label>
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
        <label>¿Desde cuándo presenta los síntomas?</label>
        <input
          type="text"
          value={formData.consulta.duracionSintomas}
          onChange={(e) => handleInputChange('consulta', 'duracionSintomas', e.target.value)}
          placeholder="Ej: Desde hace 3 días"
        />
      </div>
      
      <div className="form-section">
        <h3>Estado general</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Comportamiento</label>
            <select
              value={formData.consulta.comportamiento}
              onChange={(e) => handleInputChange('consulta', 'comportamiento', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Normal">Normal</option>
              <option value="Decaído">Decaído</option>
              <option value="Agresivo">Más agresivo</option>
              <option value="Ansioso">Ansioso</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Apetito</label>
            <select
              value={formData.consulta.apetito}
              onChange={(e) => handleInputChange('consulta', 'apetito', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Normal">Normal</option>
              <option value="Aumentado">Aumentado</option>
              <option value="Disminuido">Disminuido</option>
              <option value="Nulo">No come</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Consumo de agua</label>
            <select
              value={formData.consulta.agua}
              onChange={(e) => handleInputChange('consulta', 'agua', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Normal">Normal</option>
              <option value="Aumentado">Aumentado</option>
              <option value="Disminuido">Disminuido</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Orina</label>
            <select
              value={formData.consulta.orina}
              onChange={(e) => handleInputChange('consulta', 'orina', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Normal">Normal</option>
              <option value="Frecuente">Más frecuente</option>
              <option value="Escasa">Escasa</option>
              <option value="ConSangre">Con sangre</option>
              <option value="Dificultad">Con dificultad</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Heces</label>
          <select
            value={formData.consulta.heces}
            onChange={(e) => handleInputChange('consulta', 'heces', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Normal">Normal</option>
            <option value="Diarrea">Diarrea</option>
            <option value="Estrenimiento">Estreñimiento</option>
            <option value="ConSangre">Con sangre</option>
            <option value="ConMoco">Con moco</option>
          </select>
        </div>
      </div>
      
      <div className="form-group">
        <label>Otros detalles importantes</label>
        <textarea
          value={formData.consulta.otrosDetalles}
          onChange={(e) => handleInputChange('consulta', 'otrosDetalles', e.target.value)}
          placeholder="Cualquier otra información que considere relevante"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="form-step">
      <h2>✅ Confirmación y Consentimiento</h2>
      
      <div className="summary-section">
        <h3>Resumen de la información</h3>
        
        <div className="summary-card">
          <h4>Propietario</h4>
          <p><strong>{formData.propietario.nombre || selectedPatient?.propietario}</strong></p>
          <p>📞 {formData.propietario.telefono || selectedPatient?.telefono}</p>
        </div>
        
        <div className="summary-card">
          <h4>Mascota</h4>
          <p><strong>{formData.paciente.nombre || selectedPatient?.nombre}</strong></p>
          <p>{formData.paciente.especie || selectedPatient?.especie} • {formData.paciente.raza || selectedPatient?.raza}</p>
          <p>{formData.paciente.edad || selectedPatient?.edad} {formData.paciente.unidadEdad}</p>
        </div>
        
        <div className="summary-card">
          <h4>Motivo de consulta</h4>
          <p>{formData.consulta.motivoConsulta}</p>
          {formData.consulta.sintomas.length > 0 && (
            <p><small>Síntomas: {formData.consulta.sintomas.join(', ')}</small></p>
          )}
        </div>
      </div>
      
      <div className="consent-section">
        <h3>Consentimiento informado</h3>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.autorizaTratamiento}
            onChange={(e) => handleInputChange('consentimiento', 'autorizaTratamiento', e.target.checked)}
          />
          <span>Autorizo al médico veterinario a realizar la exploración física y los procedimientos diagnósticos necesarios para mi mascota.</span>
        </label>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.autorizaEmergencia}
            onChange={(e) => handleInputChange('consentimiento', 'autorizaEmergencia', e.target.checked)}
          />
          <span>En caso de emergencia, autorizo la realización de procedimientos de urgencia necesarios para preservar la vida de mi mascota.</span>
        </label>
        
        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={formData.consentimiento.aceptaTerminos}
            onChange={(e) => handleInputChange('consentimiento', 'aceptaTerminos', e.target.checked)}
          />
          <span>Declaro que la información proporcionada es verídica y acepto los términos y condiciones del servicio.</span>
        </label>
      </div>
      
      <div className="form-group">
        <label>Nombre completo (como firma electrónica) *</label>
        <input
          type="text"
          value={formData.consentimiento.firma}
          onChange={(e) => handleInputChange('consentimiento', 'firma', e.target.value)}
          placeholder="Escriba su nombre completo"
          className="signature-input"
        />
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="success-screen">
      <div className="success-content">
        <span className="success-icon">✅</span>
        <h2>¡Registro completado!</h2>
        <p>Tu información ha sido recibida correctamente.</p>
        <div className="success-info">
          <p>📍 Por favor, acércate a recepción para completar tu check-in.</p>
          <p>🕐 Un momento, serás atendido pronto.</p>
        </div>
        <div className="turno-box">
          <span>Tu número de registro:</span>
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
            ← Volver
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
                Anterior
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button className="btn-primary" onClick={nextStep}>
                Siguiente
              </button>
            ) : (
              <button 
                className="btn-submit"
                onClick={handleSubmit}
                disabled={!formData.consentimiento.aceptaTerminos || !formData.consentimiento.firma}
              >
                Enviar registro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroCliente;
