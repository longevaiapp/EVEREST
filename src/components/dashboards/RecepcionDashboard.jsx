import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import useRecepcion from '../../hooks/useRecepcion';
import { QRCodeSVG } from 'qrcode.react';
import './RecepcionDashboard.css';

function RecepcionDashboard() {
  const { user } = useAuth();
  const { 
    currentUser, 
    assignToDoctor, 
    updatePatientState, 
    updatePatientData,
    registerTriage,
    completeTask, 
    dischargePatient,
    scheduleFollowUp,
    registerPayment
  } = useApp();

  // Hook para operaciones con API real
  const {
    loading: apiLoading,
    error: apiError,
    visits: todayVisits = [],
    appointments = [],
    searchOwnerByPhone,
    createOwner,
    createPet,
    checkInPet,
    completeTriage,
    dischargeVisit,
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    loadInitialData: refreshData
  } = useRecepcion();
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [clientSearchPhone, setClientSearchPhone] = useState('');
  const [foundClient, setFoundClient] = useState(null);
  const [clientSearchError, setClientSearchError] = useState('');
  const [showClientPets, setShowClientPets] = useState(false);
  const [mascotaWizardStep, setMascotaWizardStep] = useState(1);
  const [triageData, setTriageData] = useState({
    motivo: '',
    tipoVisita: 'consulta_general',
    prioridad: 'MEDIA',
    peso: '',
    temperatura: '',
    antecedentes: '',
    primeraVisita: false
  });

  const [newPatientData, setNewPatientData] = useState({
    // Datos del Propietario
    propietario: '',
    direccion: '',
    telefono: '',
    email: '',
    // Datos del Paciente
    foto: null,
    fotoPreview: null,
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Macho',
    peso: '',
    especie: 'Perro',
    raza: '',
    color: '',
    condicionCorporal: '3',
    // Historial Médico
    snapTest: '',
    analisisClinicos: '',
    // Desparasitaciones y Vacunas
    desparasitacionExterna: false,
    ultimaDesparasitacion: '',
    vacunas: '',
    vacunasActualizadas: false,
    ultimaVacuna: '',
    // Cirugías y Tratamientos
    esterilizado: 'No',
    otrasCirugias: 'No',
    detalleCirugias: '',
    // Alimentación y Patologías
    alimento: '',
    porcionesPorDia: '',
    otrosAlimentos: '',
    frecuenciaOtrosAlimentos: '',
    alergias: '',
    enfermedadesCronicas: '',
    // Info Reproductiva (Hembras)
    ultimoCelo: '',
    cantidadPartos: '',
    ultimoParto: '',
    // Otros Datos
    conviveOtrasMascotas: 'No',
    cualesMascotas: '',
    actividadFisica: 'No',
    frecuenciaActividad: '',
    saleViaPublica: 'No',
    frecuenciaSalida: '',
    otrosDatos: ''
  });
  const [dischargeData, setDischargeData] = useState({
    fechaSeguimiento: '',
    horaSeguimiento: '',
    total: '',
    metodoPago: 'efectivo'
  });

  const [newAppointmentData, setNewAppointmentData] = useState({
    pacienteId: '',
    pacienteNombre: '',
    fecha: '',
    hora: '',
    tipo: 'consulta_general',
    motivo: '',
    confirmada: false
  });

  // ============================================================================
  // DATOS REALES DE LA API (sin mock)
  // ============================================================================
  
  // Transformar visitas de la API al formato del dashboard
  const allVisits = (todayVisits || []).map(v => ({
    id: v.pet?.id,
    visitId: v.id,
    nombre: v.pet?.nombre || 'Sin nombre',
    especie: v.pet?.especie || 'Desconocido',
    raza: v.pet?.raza || '',
    numeroFicha: v.pet?.numeroFicha || `VET-${String(v.pet?.id).padStart(3, '0')}`,
    propietario: v.pet?.owner?.nombre || 'Sin propietario',
    telefono: v.pet?.owner?.telefono || '',
    estado: v.status,
    motivo: v.motivo || 'Consulta',
    prioridad: v.prioridad || 'MEDIA',
    tipoVisita: v.tipoVisita,
    peso: v.peso,
    temperatura: v.temperatura,
    fromApi: true
  }));

  // Filtrar por estado
  const newArrivals = allVisits.filter(p => p.estado === 'RECIEN_LLEGADO');
  const waitingPatients = allVisits.filter(p => p.estado === 'EN_ESPERA');
  const inConsultPatients = allVisits.filter(p => p.estado === 'EN_CONSULTA');
  const readyForDischarge = allVisits.filter(p => p.estado === 'LISTO_PARA_ALTA');

  // Búsqueda de pacientes
  const filteredPatients = searchQuery
    ? allVisits.filter(p => 
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.numeroFicha?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propietario?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.telefono?.includes(searchQuery)
      )
    : allVisits;

  // Citas de la API
  const todayAppointments = (appointments || []).map(apt => ({
    id: apt.id,
    pacienteId: apt.pet?.id,
    pacienteNombre: apt.pet?.nombre || 'Sin nombre',
    propietario: apt.pet?.owner?.nombre || '',
    telefono: apt.pet?.owner?.telefono || '',
    fecha: apt.fecha,
    hora: apt.hora || '',
    tipo: apt.tipo || 'consulta_general',
    motivo: apt.motivo || '',
    confirmada: apt.confirmada,
    cancelada: apt.cancelada,
    fromApi: true
  }));

  // Tareas pendientes (por ahora vacío, se puede implementar después)
  const myTasks = [];

  // Calendario preventivo (por ahora vacío, se puede implementar con endpoint dedicado)
  const preventiveCalendar = [];

  const getPriorityColor = (priority) => {
    const colors = { ALTA: '#f44336', MEDIA: '#ff9800', BAJA: '#4caf50' };
    return colors[priority] || '#757575';
  };

  const getStatusColor = (status) => {
    const colors = {
      'RECIEN_LLEGADO': '#9e9e9e',
      'EN_ESPERA': '#ff9800',
      'EN_CONSULTA': '#2196f3',
      'EN_ESTUDIOS': '#9c27b0',
      'EN_FARMACIA': '#673ab7',
      'CIRUGIA_PROGRAMADA': '#e91e63',
      'EN_CIRUGIA': '#f44336',
      'HOSPITALIZADO': '#ff5722',
      'LISTO_PARA_ALTA': '#4caf50',
      'ALTA': '#757575'
    };
    return colors[status] || '#757575';
  };

  const handleStartTriage = (patient) => {
    setSelectedPatient(patient);
    setShowTriageModal(true);
    setTriageData({
      motivo: patient.motivo || '',
      tipoVisita: 'consulta_general',
      prioridad: 'MEDIA',
      peso: patient.peso || '',
      temperatura: '',
      antecedentes: patient.antecedentes || '',
      primeraVisita: patient.primeraVisita !== false // Si no está definido, asumir que es primera visita
    });
  };

  const handleSubmitTriage = async (e) => {
    e.preventDefault();
    
    try {
      // Si es medicina preventiva, verificar calendario
      if (triageData.tipoVisita === 'medicina_preventiva') {
        console.log('Verificando calendario de medicina preventiva...');
      }
      
      // Usar API real para completar triage
      if (selectedPatient.visitId) {
        await completeTriage(selectedPatient.visitId, {
          tipoVisita: triageData.tipoVisita,
          motivo: triageData.motivo,
          prioridad: triageData.prioridad,
          peso: triageData.peso,
          temperatura: triageData.temperatura,
          antecedentes: triageData.antecedentes,
          primeraVisita: triageData.primeraVisita
        });
        await refreshData();
      } else {
        // Fallback a mock si no hay visitId
        registerTriage(selectedPatient.id, triageData);
        updatePatientData(selectedPatient.id, {
          primeraVisita: triageData.primeraVisita
        });
      }
      
      alert(triageData.primeraVisita 
        ? 'Triage completado - Se creará nuevo expediente' 
        : 'Triage completado - Se consultará expediente existente'
      );
      setShowTriageModal(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error completando triage:', error);
      alert('Error al completar triage. Intenta de nuevo.');
    }
  };

  const handleAssignDoctor = (patientId) => {
    const userName = user?.firstName || currentUser?.nombre || 'Recepción';
    assignToDoctor(patientId, userName);
    alert('Paciente asignado al médico');
  };

  const handleViewExpediente = (patient) => {
    setSelectedPatient(patient);
    setShowExpedienteModal(true);
  };

  const handleViewCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleConfirmAppointment = async (citaId) => {
    try {
      await confirmAppointment(citaId);
      await refreshData();
      alert('✅ Cita confirmada exitosamente');
    } catch (error) {
      console.error('Error confirmando cita:', error);
      alert('❌ Error al confirmar cita: ' + error.message);
    }
  };

  const handleCancelAppointment = async (citaId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    try {
      await cancelAppointment(citaId);
      await refreshData();
      alert('✅ Cita cancelada');
    } catch (error) {
      console.error('Error cancelando cita:', error);
      alert('❌ Error al cancelar cita: ' + error.message);
    }
  };

  const handleCallPatient = (telefono) => {
    window.open(`tel:${telefono}`, '_self');
  };

  // Función para buscar cliente por teléfono (usando API real)
  const handleSearchClient = async (e) => {
    e.preventDefault();
    setClientSearchError('');
    setFoundClient(null);
    setShowClientPets(false);
    
    if (!clientSearchPhone.trim()) {
      setClientSearchError('Por favor ingresa un número de teléfono');
      return;
    }

    try {
      const result = await searchOwnerByPhone(clientSearchPhone.trim());
      
      if (result && result.owner) {
        // API retorna campos en español: nombre, telefono, email
        // result = { owner, pets }
        const { owner, pets } = result;
        setFoundClient({
          id: owner.id,
          nombre: owner.nombre,
          telefono: owner.telefono,
          email: owner.email || '',
          mascotas: (pets || []).map(pet => ({
            id: pet.id,
            nombre: pet.nombre,
            especie: pet.especie,
            raza: pet.raza,
            numeroFicha: pet.numeroFicha || `VET-${String(pet.id).padStart(3, '0')}`,
            propietario: owner.nombre
          }))
        });
        setShowClientPets(true);
      } else {
        setClientSearchError('No encontramos ningún cliente con ese número. El cliente puede registrarse escaneando el código QR.');
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      setClientSearchError('Error al buscar cliente. Intenta de nuevo.');
    }
  };

  // Función para hacer check-in de mascota existente (usando API real)
  const handleCheckInExistingPet = async (pet) => {
    try {
      await checkInPet(pet.id);
      await refreshData(); // Actualizar lista de visitas
      alert(`✅ Check-in realizado para ${pet.nombre}\nEl paciente está listo para triage.`);
      setFoundClient(null);
      setClientSearchPhone('');
      setShowClientPets(false);
      setActiveSection('triage');
    } catch (error) {
      console.error('Error en check-in:', error);
      alert('Error al realizar check-in. Intenta de nuevo.');
    }
  };

  // URL para el formulario de cliente (puede ser ajustada según el deploy)
  const clientFormURL = `${window.location.origin}/registro-cliente`;

  const handleNewAppointment = () => {
    setShowNewAppointmentModal(true);
    setNewAppointmentData({
      pacienteId: '',
      pacienteNombre: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '',
      tipo: 'consulta_general',
      motivo: '',
      confirmada: false
    });
  };

  const handleSubmitNewAppointment = async (e) => {
    e.preventDefault();
    
    try {
      // Intentar crear cita via API
      if (newAppointmentData.pacienteId) {
        await createAppointment({
          petId: parseInt(newAppointmentData.pacienteId),
          scheduledDate: new Date(`${newAppointmentData.fecha}T${newAppointmentData.hora}`).toISOString(),
          appointmentType: newAppointmentData.tipo,
          reason: newAppointmentData.motivo
        });
        await refreshData();
      }
      
      alert(`✅ Cita agendada exitosamente\nPaciente: ${newAppointmentData.pacienteNombre}\nFecha: ${newAppointmentData.fecha} ${newAppointmentData.hora}`);
      setShowNewAppointmentModal(false);
      setActiveSection('citas');
    } catch (error) {
      console.error('Error creando cita:', error);
      alert('Error al agendar cita. Intenta de nuevo.');
    }
  };

  const handleSubmitNewPatient = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Crear propietario primero
      const ownerData = {
        nombre: newPatientData.propietario,
        telefono: newPatientData.telefono,
        email: newPatientData.email || null,
        direccion: newPatientData.direccion || null,
      };
      
      const owner = await createOwner(ownerData);
      
      if (!owner || !owner.id) {
        throw new Error('No se pudo crear el propietario');
      }
      
      // 2. Crear mascota asociada al propietario
      const petData = {
        ownerId: owner.id,
        nombre: newPatientData.nombre,
        especie: newPatientData.especie,
        raza: newPatientData.raza || null,
        sexo: newPatientData.sexo,
        fechaNacimiento: newPatientData.fechaNacimiento || null,
        peso: newPatientData.peso || null,
        color: newPatientData.color || null,
        condicionCorporal: newPatientData.condicionCorporal || '3',
        // Historial médico
        snapTest: newPatientData.snapTest || null,
        analisisClinicos: newPatientData.analisisClinicos || null,
        antecedentes: newPatientData.antecedentes || null,
        // Vacunas
        desparasitacionExterna: newPatientData.desparasitacionExterna || false,
        ultimaDesparasitacion: newPatientData.ultimaDesparasitacion || null,
        vacunas: newPatientData.vacunas || null,
        vacunasActualizadas: newPatientData.vacunasActualizadas || false,
        ultimaVacuna: newPatientData.ultimaVacuna || null,
        // Cirugías
        esterilizado: newPatientData.esterilizado,
        otrasCirugias: newPatientData.otrasCirugias,
        detalleCirugias: newPatientData.detalleCirugias || null,
        // Alimentación
        alimento: newPatientData.alimento || null,
        porcionesPorDia: newPatientData.porcionesPorDia || null,
        otrosAlimentos: newPatientData.otrosAlimentos || null,
        frecuenciaOtrosAlimentos: newPatientData.frecuenciaOtrosAlimentos || null,
        // Patologías
        alergias: newPatientData.alergias || null,
        enfermedadesCronicas: newPatientData.enfermedadesCronicas || null,
        // Reproducción
        ultimoCelo: newPatientData.ultimoCelo || null,
        cantidadPartos: newPatientData.cantidadPartos || null,
        ultimoParto: newPatientData.ultimoParto || null,
        // Estilo de vida
        conviveOtrasMascotas: newPatientData.conviveOtrasMascotas,
        cualesMascotas: newPatientData.cualesMascotas || null,
        actividadFisica: newPatientData.actividadFisica,
        frecuenciaActividad: newPatientData.frecuenciaActividad || null,
        saleViaPublica: newPatientData.saleViaPublica,
        frecuenciaSalida: newPatientData.frecuenciaSalida || null,
        otrosDatos: newPatientData.otrosDatos || null,
      };
      
      const pet = await createPet(petData);
      
      if (!pet) {
        throw new Error('No se pudo crear la mascota');
      }
      
      // 3. Hacer check-in automático
      await checkInPet(pet.id);
      await refreshData();
      
      alert(`✅ Paciente registrado exitosamente!\n\n` +
            `Propietario: ${owner.nombre}\n` +
            `Mascota: ${pet.nombre}\n` +
            `Ficha: ${pet.numeroFicha || 'Generada'}\n\n` +
            `El paciente está listo para triage.`);
      
      // Resetear formulario
      setMascotaWizardStep(1);
      setNewPatientData({
        propietario: '',
        direccion: '',
        telefono: '',
        email: '',
        foto: null,
        fotoPreview: null,
        nombre: '',
        fechaNacimiento: '',
        sexo: 'Macho',
        peso: '',
        especie: 'Perro',
        raza: '',
        color: '',
        condicionCorporal: '3',
        snapTest: '',
        analisisClinicos: '',
        desparasitacionExterna: false,
        ultimaDesparasitacion: '',
        vacunas: '',
        vacunasActualizadas: false,
        ultimaVacuna: '',
        esterilizado: 'No',
        otrasCirugias: 'No',
        detalleCirugias: '',
        alimento: '',
        porcionesPorDia: '',
        otrosAlimentos: '',
        frecuenciaOtrosAlimentos: '',
        alergias: '',
        enfermedadesCronicas: '',
        ultimoCelo: '',
        cantidadPartos: '',
        ultimoParto: '',
        conviveOtrasMascotas: 'No',
        cualesMascotas: '',
        actividadFisica: 'No',
        frecuenciaActividad: '',
        saleViaPublica: 'No',
        frecuenciaSalida: '',
        otrosDatos: ''
      });
      
      setActiveSection('triage');
      
    } catch (error) {
      console.error('Error registrando paciente:', error);
      alert(`❌ Error: ${error.message || 'No se pudo registrar el paciente'}`);
    }
  };

  const handleStartDischarge = (patient) => {
    setSelectedPatient(patient);
    setShowDischargeModal(true);
    setDischargeData({
      fechaSeguimiento: '',
      horaSeguimiento: '',
      total: '1200',
      metodoPago: 'efectivo'
    });
  };

  const handleSubmitDischarge = async (e) => {
    e.preventDefault();
    
    try {
      // Llamar API real para procesar alta
      await dischargeVisit(selectedPatient.visitId, {
        total: dischargeData.total,
        metodoPago: dischargeData.metodoPago,
        dischargeNotes: dischargeData.notas || ''
      });

      // Programar seguimiento si hay fecha (opcional - se puede crear cita)
      if (dischargeData.fechaSeguimiento) {
        try {
          await createAppointment({
            petId: selectedPatient.petId,
            ownerId: selectedPatient.ownerId,
            fecha: dischargeData.fechaSeguimiento,
            hora: dischargeData.horaSeguimiento || '10:00',
            tipo: 'SEGUIMIENTO',
            motivo: `Seguimiento de visita - ${selectedPatient.reason || 'Consulta'}`
          });
        } catch (err) {
          console.warn('Error creando cita de seguimiento:', err);
        }
      }

      alert('✅ Paciente dado de alta exitosamente');
      setShowDischargeModal(false);
      setSelectedPatient(null);
      await refreshData();
    } catch (error) {
      console.error('Error procesando alta:', error);
      alert('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="dashboard recepcion-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>🏥 Recepción</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveSection('checkin')}
          >
            <span className="nav-icon">📲</span>
            <span>Check-in Cliente</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'nueva-mascota' ? 'active' : ''}`}
            onClick={() => setActiveSection('nueva-mascota')}
          >
            <span className="nav-icon">🐾</span>
            <span>Nueva Mascota</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'citas' ? 'active' : ''}`}
            onClick={() => setActiveSection('citas')}
          >
            <span className="nav-icon">📅</span>
            <span>Citas del Día</span>
            {todayAppointments.length > 0 && (
              <span className="nav-badge">{todayAppointments.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'preventiva' ? 'active' : ''}`}
            onClick={() => setActiveSection('preventiva')}
          >
            <span className="nav-icon">💉</span>
            <span>Medicina Preventiva</span>
            {preventiveCalendar.length > 0 && (
              <span className="nav-badge warning">{preventiveCalendar.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'triage' ? 'active' : ''}`}
            onClick={() => setActiveSection('triage')}
          >
            <span className="nav-icon">🚨</span>
            <span>Triage Urgente</span>
            {newArrivals.length > 0 && (
              <span className="nav-badge urgent">{newArrivals.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveSection('todos')}
          >
            <span className="nav-icon">📋</span>
            <span>Todos los Pacientes</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'alta' ? 'active' : ''}`}
            onClick={() => setActiveSection('alta')}
          >
            <span className="nav-icon">✅</span>
            <span>Listos para Alta</span>
            {readyForDischarge.length > 0 && (
              <span className="nav-badge success">{readyForDischarge.length}</span>
            )}
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {activeSection === 'dashboard' && 'Dashboard'}
              {activeSection === 'checkin' && 'Check-in de Clientes'}
              {activeSection === 'nueva-mascota' && 'Nueva Mascota'}
              {activeSection === 'citas' && 'Citas del Día'}
              {activeSection === 'preventiva' && 'Medicina Preventiva'}
              {activeSection === 'triage' && 'Triage Urgente'}
              {activeSection === 'todos' && 'Todos los Pacientes'}
              {activeSection === 'alta' && 'Listos para Alta'}
            </h1>
            <p>
              {activeSection === 'dashboard' && 'Resumen general de la recepción'}
              {activeSection === 'checkin' && 'El cliente puede escanear el QR o buscar su registro'}
              {activeSection === 'nueva-mascota' && 'Registro completo de nueva mascota'}
              {activeSection === 'citas' && `${todayAppointments.length} citas programadas para hoy`}
              {activeSection === 'preventiva' && 'Pacientes que requieren vacunación'}
              {activeSection === 'triage' && 'Pacientes recién llegados que necesitan evaluación'}
              {activeSection === 'todos' && 'Listado completo de pacientes'}
              {activeSection === 'alta' && 'Pacientes listos para procesar alta'}
            </p>
          </div>
        </div>

        {/* DASHBOARD PRINCIPAL */}
        {activeSection === 'dashboard' && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(244, 67, 54, 0.3)'}}>🆕</div>
                <div className="stat-content">
                  <h3>{newArrivals.length}</h3>
                  <p>Recién Llegados</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(255, 152, 0, 0.3)'}}>⏳</div>
                <div className="stat-content">
                  <h3>{waitingPatients.length}</h3>
                  <p>En Sala de Espera</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(33, 150, 243, 0.3)'}}>👨‍⚕️</div>
                <div className="stat-content">
                  <h3>{inConsultPatients.length}</h3>
                  <p>En Consulta</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(76, 175, 80, 0.3)'}}>✅</div>
                <div className="stat-content">
                  <h3>{readyForDischarge.length}</h3>
                  <p>Listos para Alta</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              {/* Resumen de alertas */}
              {newArrivals.length > 0 && (
                <div className="content-section urgent">
                  <h2>🚨 Atención Urgente</h2>
                  <p>{newArrivals.length} paciente(s) esperando triage</p>
                  <button className="btn-action" onClick={() => setActiveSection('triage')}>
                    Ver Pacientes
                  </button>
                </div>
              )}

              {todayAppointments.length > 0 && (
                <div className="content-section info">
                  <h2>📅 Citas de Hoy</h2>
                  <p>{todayAppointments.length} cita(s) programadas</p>
                  <button className="btn-action" onClick={() => setActiveSection('citas')}>
                    Ver Agenda
                  </button>
                </div>
              )}

              {preventiveCalendar.length > 0 && (
                <div className="content-section warning">
                  <h2>💉 Medicina Preventiva</h2>
                  <p>{preventiveCalendar.length} paciente(s) requieren vacunación</p>
                  <button className="btn-action" onClick={() => setActiveSection('preventiva')}>
                    Ver Calendario
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* SECCIÓN: CHECK-IN DE CLIENTES */}
        {activeSection === 'checkin' && (
          <div className="checkin-section">
            <div className="checkin-grid">
              {/* QR Code para nuevos clientes */}
              <div className="checkin-card qr-card">
                <div className="qr-header">
                  <span className="qr-badge">NUEVO</span>
                  <h3>📱 Cliente Nuevo</h3>
                </div>
                <p className="qr-description">
                  El cliente escanea este código QR para registrar sus datos y los de su mascota desde su celular
                </p>
                <div className="qr-container">
                  <QRCodeSVG 
                    value={clientFormURL}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                  />
                </div>
                <p className="qr-instruction">
                  📋 Formulario de Antecedentes Clínicos
                </p>
                <div className="qr-url">
                  <small>{clientFormURL}</small>
                </div>
              </div>

              {/* Búsqueda de cliente existente */}
              <div className="checkin-card search-card">
                <div className="search-header">
                  <span className="search-badge">RECURRENTE</span>
                  <h3>🔍 ¿Ya eres cliente?</h3>
                </div>
                <p className="search-description">
                  Busca tu registro por número de teléfono para hacer check-in rápido
                </p>
                
                <form onSubmit={handleSearchClient} className="client-search-form">
                  <div className="search-input-group">
                    <span className="search-icon">📞</span>
                    <input
                      type="tel"
                      value={clientSearchPhone}
                      onChange={(e) => setClientSearchPhone(e.target.value)}
                      placeholder="Ingresa tu número de teléfono"
                      className="phone-input"
                    />
                    <button type="submit" className="btn-search">
                      Buscar
                    </button>
                  </div>
                </form>

                {clientSearchError && (
                  <div className="search-error">
                    <span>⚠️</span> {clientSearchError}
                  </div>
                )}

                {/* Resultados de búsqueda */}
                {foundClient && showClientPets && (
                  <div className="client-found">
                    <div className="client-info">
                      <h4>👤 {foundClient.nombre}</h4>
                      <p>📞 {foundClient.telefono}</p>
                      {foundClient.email && <p>✉️ {foundClient.email}</p>}
                    </div>
                    
                    <div className="pets-list">
                      <h5>🐾 Mascotas registradas:</h5>
                      {foundClient.mascotas.map(pet => (
                        <div key={pet.id} className="pet-item">
                          <div className="pet-info">
                            <span className="pet-icon">
                              {pet.especie === 'Perro' ? '🐕' : '🐈'}
                            </span>
                            <div>
                              <strong>{pet.nombre}</strong>
                              <small>{pet.raza} • {pet.edad}</small>
                            </div>
                          </div>
                          <button 
                            className="btn-checkin"
                            onClick={() => handleCheckInExistingPet(pet)}
                          >
                            ✓ Check-in
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      className="btn-add-pet"
                      onClick={() => {
                        alert('El cliente puede escanear el QR para agregar una nueva mascota');
                      }}
                    >
                      ➕ Agregar nueva mascota
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Instrucciones para recepción */}
            <div className="checkin-instructions">
              <h4>📋 Instrucciones</h4>
              <div className="instructions-grid">
                <div className="instruction-item">
                  <span className="step">1</span>
                  <p><strong>Cliente nuevo:</strong> Muestra el código QR al cliente para que registre sus datos</p>
                </div>
                <div className="instruction-item">
                  <span className="step">2</span>
                  <p><strong>Cliente existente:</strong> Busca por teléfono y haz check-in de la mascota</p>
                </div>
                <div className="instruction-item">
                  <span className="step">3</span>
                  <p><strong>Después del check-in:</strong> El paciente aparecerá en la sección de Triage</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN: NUEVA MASCOTA - WIZARD */}
        {activeSection === 'nueva-mascota' && (
          <div className="nueva-mascota-section">
            {/* Indicador de pasos */}
            <div className="wizard-steps">
              {[
                { num: 1, label: 'Propietario', icon: '👤' },
                { num: 2, label: 'Paciente', icon: '🐾' },
                { num: 3, label: 'Historial', icon: '📋' },
                { num: 4, label: 'Vacunas', icon: '💉' },
                { num: 5, label: 'Cirugías', icon: '🏥' },
                { num: 6, label: 'Alimentación', icon: '🍖' },
                { num: 7, label: 'Otros', icon: '📝' }
              ].map((step) => (
                <div 
                  key={step.num}
                  className={`wizard-step ${mascotaWizardStep === step.num ? 'active' : ''} ${mascotaWizardStep > step.num ? 'completed' : ''}`}
                  onClick={() => setMascotaWizardStep(step.num)}
                >
                  <div className="step-number">
                    {mascotaWizardStep > step.num ? '✓' : step.icon}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
              ))}
            </div>

            {/* Contenido del paso actual */}
            <div className="wizard-content">
              
              {/* PASO 1: DATOS DEL PROPIETARIO */}
              {mascotaWizardStep === 1 && (
                <div className="form-card wizard-card">
                  <h3>👤 Datos del Propietario</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Nombre del propietario: *</label>
                      <input
                        type="text"
                        value={newPatientData.propietario}
                        onChange={(e) => setNewPatientData({...newPatientData, propietario: e.target.value})}
                        placeholder="Nombre completo"
                        required
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Dirección:</label>
                      <input
                        type="text"
                        value={newPatientData.direccion}
                        onChange={(e) => setNewPatientData({...newPatientData, direccion: e.target.value})}
                        placeholder="Calle, número, colonia, ciudad"
                      />
                    </div>
                    <div className="form-group">
                      <label>Teléfono: *</label>
                      <input
                        type="tel"
                        value={newPatientData.telefono}
                        onChange={(e) => setNewPatientData({...newPatientData, telefono: e.target.value})}
                        placeholder="10 dígitos"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Correo electrónico:</label>
                      <input
                        type="email"
                        value={newPatientData.email}
                        onChange={(e) => setNewPatientData({...newPatientData, email: e.target.value})}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: DATOS DEL PACIENTE */}
              {mascotaWizardStep === 2 && (
                <div className="form-card wizard-card">
                  <h3>🐾 Datos del Paciente</h3>
                  
                  {/* Foto de la mascota */}
                  <div className="foto-upload-container">
                    <div className="foto-preview">
                      {newPatientData.fotoPreview ? (
                        <img src={newPatientData.fotoPreview} alt="Foto mascota" />
                      ) : (
                        <div className="foto-placeholder">
                          <span>📷</span>
                          <p>Foto de la mascota</p>
                        </div>
                      )}
                    </div>
                    <div className="foto-actions">
                      <label className="btn-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewPatientData({
                                  ...newPatientData,
                                  foto: file,
                                  fotoPreview: reader.result
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        📷 Seleccionar foto
                      </label>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre: *</label>
                      <input
                        type="text"
                        value={newPatientData.nombre}
                        onChange={(e) => setNewPatientData({...newPatientData, nombre: e.target.value})}
                        placeholder="Nombre de la mascota"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de nacimiento:</label>
                      <input
                        type="date"
                        value={newPatientData.fechaNacimiento}
                        onChange={(e) => setNewPatientData({...newPatientData, fechaNacimiento: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Sexo: *</label>
                      <select
                        value={newPatientData.sexo}
                        onChange={(e) => setNewPatientData({...newPatientData, sexo: e.target.value})}
                      >
                        <option value="Macho">Macho</option>
                        <option value="Hembra">Hembra</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Peso (kg):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPatientData.peso}
                        onChange={(e) => setNewPatientData({...newPatientData, peso: e.target.value})}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Especie: *</label>
                      <select
                        value={newPatientData.especie}
                        onChange={(e) => setNewPatientData({...newPatientData, especie: e.target.value})}
                      >
                        <option value="Perro">Perro</option>
                        <option value="Gato">Gato</option>
                        <option value="Ave">Ave</option>
                        <option value="Roedor">Roedor</option>
                        <option value="Reptil">Reptil</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Raza:</label>
                      <input
                        type="text"
                        value={newPatientData.raza}
                        onChange={(e) => setNewPatientData({...newPatientData, raza: e.target.value})}
                        placeholder="Raza o mestizo"
                      />
                    </div>
                    <div className="form-group">
                      <label>Color:</label>
                      <input
                        type="text"
                        value={newPatientData.color}
                        onChange={(e) => setNewPatientData({...newPatientData, color: e.target.value})}
                        placeholder="Color del pelaje"
                      />
                    </div>
                    <div className="form-group">
                      <label>Condición Corporal (1-5):</label>
                      <select
                        value={newPatientData.condicionCorporal}
                        onChange={(e) => setNewPatientData({...newPatientData, condicionCorporal: e.target.value})}
                      >
                        <option value="1">1 - Muy delgado</option>
                        <option value="2">2 - Delgado</option>
                        <option value="3">3 - Ideal</option>
                        <option value="4">4 - Sobrepeso</option>
                        <option value="5">5 - Obeso</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3: HISTORIAL MÉDICO */}
              {mascotaWizardStep === 3 && (
                <div className="form-card wizard-card">
                  <h3>📋 Historial Médico</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Snap Test:</label>
                      <input
                        type="text"
                        value={newPatientData.snapTest}
                        onChange={(e) => setNewPatientData({...newPatientData, snapTest: e.target.value})}
                        placeholder="Resultados de Snap Test"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Análisis clínicos:</label>
                      <textarea
                        value={newPatientData.analisisClinicos}
                        onChange={(e) => setNewPatientData({...newPatientData, analisisClinicos: e.target.value})}
                        placeholder="Resultados de análisis clínicos previos"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 4: DESPARASITACIONES Y VACUNAS */}
              {mascotaWizardStep === 4 && (
                <div className="form-card wizard-card">
                  <h3>💉 Desparasitaciones y Vacunas</h3>
                  <div className="form-grid">
                    <div className="form-group checkbox-group">
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={newPatientData.desparasitacionExterna}
                          onChange={(e) => setNewPatientData({...newPatientData, desparasitacionExterna: e.target.checked})}
                        />
                        Desparasitación externa
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Última aplicación:</label>
                      <input
                        type="date"
                        value={newPatientData.ultimaDesparasitacion}
                        onChange={(e) => setNewPatientData({...newPatientData, ultimaDesparasitacion: e.target.value})}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Vacunas:</label>
                      <textarea
                        value={newPatientData.vacunas}
                        onChange={(e) => setNewPatientData({...newPatientData, vacunas: e.target.value})}
                        placeholder="Lista de vacunas aplicadas"
                        rows={3}
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={newPatientData.vacunasActualizadas}
                          onChange={(e) => setNewPatientData({...newPatientData, vacunasActualizadas: e.target.checked})}
                        />
                        Vacunas al día
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Última vacuna:</label>
                      <input
                        type="date"
                        value={newPatientData.ultimaVacuna}
                        onChange={(e) => setNewPatientData({...newPatientData, ultimaVacuna: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 5: CIRUGÍAS Y TRATAMIENTOS */}
              {mascotaWizardStep === 5 && (
                <div className="form-card wizard-card">
                  <h3>🏥 Cirugías y Tratamientos</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>¿Esterilizado?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="esterilizado"
                            value="Si"
                            checked={newPatientData.esterilizado === 'Si'}
                            onChange={(e) => setNewPatientData({...newPatientData, esterilizado: e.target.value})}
                          />
                          Sí
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="esterilizado"
                            value="No"
                            checked={newPatientData.esterilizado === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, esterilizado: e.target.value})}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>¿Otras cirugías?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="otrasCirugias"
                            value="Si"
                            checked={newPatientData.otrasCirugias === 'Si'}
                            onChange={(e) => setNewPatientData({...newPatientData, otrasCirugias: e.target.value})}
                          />
                          Sí
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="otrasCirugias"
                            value="No"
                            checked={newPatientData.otrasCirugias === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, otrasCirugias: e.target.value})}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {newPatientData.otrasCirugias === 'Si' && (
                      <div className="form-group full-width">
                        <label>Detalle de cirugías:</label>
                        <textarea
                          value={newPatientData.detalleCirugias}
                          onChange={(e) => setNewPatientData({...newPatientData, detalleCirugias: e.target.value})}
                          placeholder="Describa las cirugías previas"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info reproductiva solo para hembras */}
                  {newPatientData.sexo === 'Hembra' && (
                    <>
                      <h4 className="subsection-title">🎀 Información Reproductiva</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Último celo:</label>
                          <input
                            type="date"
                            value={newPatientData.ultimoCelo}
                            onChange={(e) => setNewPatientData({...newPatientData, ultimoCelo: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Cantidad de partos:</label>
                          <input
                            type="number"
                            min="0"
                            value={newPatientData.cantidadPartos}
                            onChange={(e) => setNewPatientData({...newPatientData, cantidadPartos: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label>Último parto:</label>
                          <input
                            type="date"
                            value={newPatientData.ultimoParto}
                            onChange={(e) => setNewPatientData({...newPatientData, ultimoParto: e.target.value})}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PASO 6: ALIMENTACIÓN Y PATOLOGÍAS */}
              {mascotaWizardStep === 6 && (
                <div className="form-card wizard-card">
                  <h3>🍖 Alimentación y Patologías</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Alimento:</label>
                      <input
                        type="text"
                        value={newPatientData.alimento}
                        onChange={(e) => setNewPatientData({...newPatientData, alimento: e.target.value})}
                        placeholder="Marca/tipo de alimento"
                      />
                    </div>
                    <div className="form-group">
                      <label>Porciones por día:</label>
                      <input
                        type="text"
                        value={newPatientData.porcionesPorDia}
                        onChange={(e) => setNewPatientData({...newPatientData, porcionesPorDia: e.target.value})}
                        placeholder="Ej: 2 tazas"
                      />
                    </div>
                    <div className="form-group">
                      <label>Otros alimentos:</label>
                      <input
                        type="text"
                        value={newPatientData.otrosAlimentos}
                        onChange={(e) => setNewPatientData({...newPatientData, otrosAlimentos: e.target.value})}
                        placeholder="Premios, sobras, etc."
                      />
                    </div>
                    <div className="form-group">
                      <label>Frecuencia:</label>
                      <input
                        type="text"
                        value={newPatientData.frecuenciaOtrosAlimentos}
                        onChange={(e) => setNewPatientData({...newPatientData, frecuenciaOtrosAlimentos: e.target.value})}
                        placeholder="Diario, semanal, etc."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Alergias:</label>
                      <input
                        type="text"
                        value={newPatientData.alergias}
                        onChange={(e) => setNewPatientData({...newPatientData, alergias: e.target.value})}
                        placeholder="Alergias conocidas"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Enfermedades crónicas:</label>
                      <textarea
                        value={newPatientData.enfermedadesCronicas}
                        onChange={(e) => setNewPatientData({...newPatientData, enfermedadesCronicas: e.target.value})}
                        placeholder="Condiciones médicas crónicas"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 7: OTROS DATOS */}
              {mascotaWizardStep === 7 && (
                <div className="form-card wizard-card">
                  <h3>📝 Otros Datos</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>¿Convive con otras mascotas?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="conviveOtrasMascotas"
                            value="Si"
                            checked={newPatientData.conviveOtrasMascotas === 'Si'}
                            onChange={(e) => setNewPatientData({...newPatientData, conviveOtrasMascotas: e.target.value})}
                          />
                          Sí
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="conviveOtrasMascotas"
                            value="No"
                            checked={newPatientData.conviveOtrasMascotas === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, conviveOtrasMascotas: e.target.value})}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {newPatientData.conviveOtrasMascotas === 'Si' && (
                      <div className="form-group">
                        <label>¿Cuáles?</label>
                        <input
                          type="text"
                          value={newPatientData.cualesMascotas}
                          onChange={(e) => setNewPatientData({...newPatientData, cualesMascotas: e.target.value})}
                          placeholder="Perros, gatos, etc."
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>¿Realiza actividad física?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="actividadFisica"
                            value="Si"
                            checked={newPatientData.actividadFisica === 'Si'}
                            onChange={(e) => setNewPatientData({...newPatientData, actividadFisica: e.target.value})}
                          />
                          Sí
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="actividadFisica"
                            value="No"
                            checked={newPatientData.actividadFisica === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, actividadFisica: e.target.value})}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {newPatientData.actividadFisica === 'Si' && (
                      <div className="form-group">
                        <label>Frecuencia:</label>
                        <input
                          type="text"
                          value={newPatientData.frecuenciaActividad}
                          onChange={(e) => setNewPatientData({...newPatientData, frecuenciaActividad: e.target.value})}
                          placeholder="Diario, 3 veces/semana, etc."
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>¿Sale a la vía pública?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="saleViaPublica"
                            value="Si"
                            checked={newPatientData.saleViaPublica === 'Si'}
                            onChange={(e) => setNewPatientData({...newPatientData, saleViaPublica: e.target.value})}
                          />
                          Sí
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="saleViaPublica"
                            value="No"
                            checked={newPatientData.saleViaPublica === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, saleViaPublica: e.target.value})}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {newPatientData.saleViaPublica === 'Si' && (
                      <div className="form-group">
                        <label>Frecuencia:</label>
                        <input
                          type="text"
                          value={newPatientData.frecuenciaSalida}
                          onChange={(e) => setNewPatientData({...newPatientData, frecuenciaSalida: e.target.value})}
                          placeholder="Paseos diarios, etc."
                        />
                      </div>
                    )}
                    <div className="form-group full-width">
                      <label>Otros datos/comentarios:</label>
                      <textarea
                        value={newPatientData.otrosDatos}
                        onChange={(e) => setNewPatientData({...newPatientData, otrosDatos: e.target.value})}
                        placeholder="Información adicional relevante"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de navegación del wizard */}
            <div className="wizard-navigation">
              {mascotaWizardStep > 1 && (
                <button 
                  type="button" 
                  className="btn-wizard-prev"
                  onClick={() => setMascotaWizardStep(mascotaWizardStep - 1)}
                >
                  ← Anterior
                </button>
              )}
              
              {mascotaWizardStep < 7 ? (
                <button 
                  type="button" 
                  className="btn-wizard-next"
                  onClick={() => setMascotaWizardStep(mascotaWizardStep + 1)}
                >
                  Siguiente →
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-wizard-submit"
                  onClick={() => {
                    alert('Mascota registrada exitosamente');
                    setMascotaWizardStep(1);
                    setActiveSection('dashboard');
                  }}
                >
                  🐾 Guardar Mascota
                </button>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN: CITAS DEL DÍA */}
        {activeSection === 'citas' && (
          <div className="appointments-section">
            <div className="section-actions">
              <button className="btn-primary" onClick={handleNewAppointment}>
                ➕ Agendar Nueva Cita
              </button>
            </div>
            {todayAppointments.length > 0 ? (
              <div className="appointments-grid">
                {todayAppointments.map((cita) => (
                  <div key={cita.id} className="appointment-card">
                      <div className="appointment-header">
                        <div className="appointment-time-large">{cita.hora}</div>
                        {cita.cancelada ? (
                          <span className="status-badge error">✕ Cancelada</span>
                        ) : cita.confirmada ? (
                          <span className="status-badge success">✓ Confirmada</span>
                        ) : (
                          <span className="status-badge warning">⚠ Sin confirmar</span>
                        )}
                      </div>
                      <div className="appointment-body">
                        <h4>{cita.pacienteNombre || cita.paciente}</h4>
                        <p><strong>Propietario:</strong> {cita.propietario}</p>
                        <p><strong>Tipo:</strong> {cita.tipo?.replace(/_/g, ' ')}</p>
                        <p><strong>Motivo:</strong> {cita.motivo}</p>
                      </div>
                      <div className="appointment-actions">
                        <button className="btn-icon" title="Llamar" onClick={() => handleCallPatient(cita.telefono || '555-0000')}>📞</button>
                        <button className="btn-icon" title="Ver expediente" onClick={() => alert('Ver expediente')}>📄</button>
                        {!cita.confirmada && !cita.cancelada && (
                          <button 
                            className="btn-icon success" 
                            title="Confirmar"
                            onClick={() => handleConfirmAppointment(cita.id)}
                          >
                            ✓
                          </button>
                        )}
                        {!cita.cancelada && (
                          <button 
                            className="btn-icon error" 
                            title="Cancelar"
                            onClick={() => handleCancelAppointment(cita.id)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>📅 No hay citas programadas para hoy</p>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: MEDICINA PREVENTIVA */}
        {activeSection === 'preventiva' && (
          <div className="preventive-section">
            {preventiveCalendar.length > 0 ? (
              <div className="preventive-calendar-grid">
                {preventiveCalendar.map(patient => (
                  <div key={patient.id} className="calendar-patient-card">
                      <div className="calendar-patient-header">
                        <div className="patient-avatar">
                          {patient.especie === 'Perro' ? '🐕' : '🐈'}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="text-small">{patient.propietario}</span>
                        </div>
                      </div>

                      <div className="calendar-patient-details">
                      <div className="detail-item">
                        <strong>Ficha:</strong> {patient.numeroFicha}
                      </div>
                      <div className="detail-item">
                        <strong>Teléfono:</strong> {patient.telefono}
                      </div>
                    </div>

                    <div className="pending-vaccines">
                      <h5>💉 Vacunas pendientes:</h5>
                      <ul>
                        {patient.vacunas && patient.vacunas
                          .filter(v => v.proximaDosis)
                          .map((vacuna, idx) => (
                            <li key={idx}>
                              <strong>{vacuna.nombre}</strong>
                              <br />
                              <span className="text-small">Próxima dosis: {vacuna.proximaDosis}</span>
                            </li>
                          ))
                        }
                        {(!patient.vacunas || patient.vacunas.length === 0) && (
                          <li>Esquema de vacunación inicial</li>
                        )}
                      </ul>
                    </div>

                    <div className="card-actions">
                      <button className="btn-action">📞 Llamar</button>
                      <button className="btn-action" onClick={() => handleViewExpediente(patient)}>📄 Expediente</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>✅ No hay pacientes con medicina preventiva pendiente</p>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: TRIAGE URGENTE */}
        {activeSection === 'triage' && (
          <div className="triage-section">
            {newArrivals.length > 0 ? (
              <div className="patients-grid">
                {newArrivals.map(patient => (
                  <div key={patient.id} className="patient-card-urgent">
                      <div className="patient-card-header">
                        <div className="patient-avatar-small">
                          {patient.especie === 'Perro' ? '🐕' : '🐈'}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="patient-ficha">{patient.numeroFicha}</span>
                        </div>
                      </div>
                      <div className="patient-details-small">
                        <p><strong>Propietario:</strong> {patient.propietario}</p>
                        <p><strong>Especie:</strong> {patient.especie} - {patient.raza}</p>
                        <p><strong>Teléfono:</strong> {patient.telefono}</p>
                        {patient.motivo && <p><strong>Motivo:</strong> {patient.motivo}</p>}
                      </div>
                      <button 
                        className="btn-action urgent"
                        onClick={() => handleStartTriage(patient)}
                      >
                        📋 Iniciar Triage
                      </button>
                    </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>✅ No hay pacientes esperando triage</p>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: TODOS LOS PACIENTES */}
        {activeSection === 'todos' && (
          <div className="patients-table-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, ficha, propietario o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="btn-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Ficha</th>
                  <th>Paciente</th>
                  <th>Propietario</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => (
                  <tr key={patient.id}>
                    <td><strong>{patient.numeroFicha}</strong></td>
                    <td>
                      <div className="patient-name-cell">
                        <span>{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                        <div>
                          <div><strong>{patient.nombre}</strong></div>
                          <small>{patient.raza}</small>
                        </div>
                      </div>
                    </td>
                    <td>{patient.propietario}</td>
                    <td>{patient.motivo || 'Sin registrar'}</td>
                    <td>
                      <span className="status-badge" style={{background: getStatusColor(patient.estado)}}>
                        {patient.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {patient.prioridad && (
                        <span className="priority-badge" style={{background: getPriorityColor(patient.prioridad)}}>
                          {patient.prioridad}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => handleViewExpediente(patient)} title="Ver expediente">
                          📄
                        </button>
                        {patient.estado === 'RECIEN_LLEGADO' && (
                          <button 
                            className="btn-icon warning"
                            onClick={() => handleStartTriage(patient)}
                            title="Iniciar Triage"
                          >
                            📋
                          </button>
                        )}
                        {patient.estado === 'LISTO_PARA_ALTA' && (
                          <button 
                            className="btn-icon success"
                            onClick={() => handleStartDischarge(patient)}
                            title="Procesar Alta"
                          >
                            💰
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SECCIÓN: LISTOS PARA ALTA */}
        {activeSection === 'alta' && (
          <div className="alta-section">
            {readyForDischarge.length > 0 ? (
              <div className="patients-grid">
                {readyForDischarge.map(patient => (
                    <div key={patient.id} className="patient-card-alta">
                      <div className="patient-card-header">
                        <div className="patient-avatar-small">
                          {patient.especie === 'Perro' ? '🐕' : '🐈'}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="patient-ficha">{patient.numeroFicha}</span>
                        </div>
                      </div>
                      <div className="patient-details-small">
                        <p><strong>Propietario:</strong> {patient.propietario}</p>
                        <p><strong>Teléfono:</strong> {patient.telefono}</p>
                        <p><strong>Especie:</strong> {patient.especie} - {patient.raza}</p>
                      </div>
                      <button 
                        className="btn-action success"
                        onClick={() => handleStartDischarge(patient)}
                      >
                        💰 Procesar Alta
                      </button>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay pacientes listos para alta</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALES */}
      {/* MODAL: TRIAGE */}
      {showTriageModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowTriageModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <h2>📋 Triage - {selectedPatient.nombre}</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Propietario:</strong> {selectedPatient.propietario}
              </div>
              <div className="info-row">
                <strong>Teléfono:</strong> {selectedPatient.telefono}
              </div>
              <div className="info-row">
                <strong>Especie:</strong> {selectedPatient.especie} - {selectedPatient.raza}
              </div>
            </div>

            <form onSubmit={handleSubmitTriage} className="triage-form">
              <div className="form-section">
                <h3>1. Tipo de Visita</h3>
                <select 
                  value={triageData.tipoVisita}
                  onChange={(e) => setTriageData({...triageData, tipoVisita: e.target.value})}
                  required
                >
                  <option value="consulta_general">Consulta General</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="medicina_preventiva">Medicina Preventiva</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>

              <div className="form-section">
                <h3>2. Motivo de la Visita</h3>
                <textarea
                  value={triageData.motivo}
                  onChange={(e) => setTriageData({...triageData, motivo: e.target.value})}
                  placeholder="Describa el motivo de la visita..."
                  rows="3"
                  required
                />
              </div>

              <div className="form-section">
                <h3>3. Prioridad</h3>
                <div className="priority-options">
                  <label className={triageData.prioridad === 'BAJA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="BAJA"
                      checked={triageData.prioridad === 'BAJA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#4caf50'}}>BAJA</span>
                  </label>
                  <label className={triageData.prioridad === 'MEDIA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="MEDIA"
                      checked={triageData.prioridad === 'MEDIA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#ff9800'}}>MEDIA</span>
                  </label>
                  <label className={triageData.prioridad === 'ALTA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="ALTA"
                      checked={triageData.prioridad === 'ALTA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#f44336'}}>ALTA</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={triageData.peso}
                    onChange={(e) => setTriageData({...triageData, peso: e.target.value})}
                    placeholder="Ej: 25.5"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={triageData.temperatura}
                    onChange={(e) => setTriageData({...triageData, temperatura: e.target.value})}
                    placeholder="Ej: 38.5"
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={triageData.primeraVisita}
                      onChange={(e) => setTriageData({...triageData, primeraVisita: e.target.checked})}
                    />
                    <strong>¿Es primera visita?</strong>
                    <small>(Se creará expediente nuevo y se solicitará formato de antecedentes)</small>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>4. Antecedentes Clínicos</h3>
                <textarea
                  value={triageData.antecedentes}
                  onChange={(e) => setTriageData({...triageData, antecedentes: e.target.value})}
                  placeholder="Alergias, cirugías previas, medicamentos actuales..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowTriageModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-success">
                  ✓ Completar Triage
                </button>
              </div>
            </form>
          </div>
            
        </div>
      )}

      {/* MODAL: ALTA Y COBRO */}
      {showDischargeModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>💰 Proceso de Alta - {selectedPatient.nombre}</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>Propietario:</strong> {selectedPatient.propietario}
              </div>
              <div className="info-row">
                <strong>Ficha:</strong> {selectedPatient.numeroFicha}
              </div>
            </div>

            <form onSubmit={handleSubmitDischarge} className="discharge-form">
              <div className="form-section">
                <h3>1. Cobro</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total a Cobrar ($)</label>
                    <input
                      type="number"
                      value={dischargeData.total}
                      onChange={(e) => setDischargeData({...dischargeData, total: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Método de Pago</label>
                    <select
                      value={dischargeData.metodoPago}
                      onChange={(e) => setDischargeData({...dischargeData, metodoPago: e.target.value})}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>2. Cita de Seguimiento (Opcional)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha</label>
                    <input
                      type="date"
                      value={dischargeData.fechaSeguimiento}
                      onChange={(e) => setDischargeData({...dischargeData, fechaSeguimiento: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora</label>
                    <input
                      type="time"
                      value={dischargeData.horaSeguimiento}
                      onChange={(e) => setDischargeData({...dischargeData, horaSeguimiento: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowDischargeModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-success">
                  ✅ Completar Alta
                </button>
              </div>
            </form>
          </div>
            
        </div>
      )}

      {/* MODAL: DETALLES DEL PACIENTE */}
      {selectedPatient && !showTriageModal && !showDischargeModal && !showExpedienteModal && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>📄 Expediente - {selectedPatient.nombre}</h2>
            <div className="patient-detail-info">
              <div className="detail-row">
                <strong>Nombre:</strong> {selectedPatient.nombre}
              </div>
              <div className="detail-row">
                <strong>Especie:</strong> {selectedPatient.especie}
              </div>
              <div className="detail-row">
                <strong>Raza:</strong> {selectedPatient.raza}
              </div>
              <div className="detail-row">
                <strong>Edad:</strong> {selectedPatient.edad}
              </div>
              <div className="detail-row">
                <strong>Peso:</strong> {selectedPatient.peso || 'No registrado'}
              </div>
              <div className="detail-row">
                <strong>Propietario:</strong> {selectedPatient.propietario}
              </div>
              <div className="detail-row">
                <strong>Teléfono:</strong> {selectedPatient.telefono}
              </div>
              <div className="detail-row">
                <strong>Estado:</strong> 
                <span className="status-badge" style={{background: getStatusColor(selectedPatient.estado), marginLeft: '0.5rem'}}>
                  {selectedPatient.estado.replace(/_/g, ' ')}
                </span>
              </div>
              {selectedPatient.motivo && (
                <div className="detail-row">
                  <strong>Motivo:</strong> {selectedPatient.motivo}
                </div>
              )}
            </div>
            <button className="btn-close" onClick={() => setSelectedPatient(null)}>
              Cerrar
            </button>
          </div>
            
        </div>
      )}

      {/* MODAL: EXPEDIENTE CLÍNICO */}
      {showExpedienteModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowExpedienteModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <h2>📄 Expediente Clínico - {selectedPatient.nombre}</h2>
            
            <div className="expediente-content">
              <div className="expediente-section">
                <h3>Información General</h3>
                <div className="info-grid">
                  <div><strong>Ficha:</strong> {selectedPatient.numeroFicha}</div>
                  <div><strong>Especie:</strong> {selectedPatient.especie}</div>
                  <div><strong>Raza:</strong> {selectedPatient.raza}</div>
                  <div><strong>Edad:</strong> {selectedPatient.edad}</div>
                  <div><strong>Sexo:</strong> {selectedPatient.sexo || 'No especificado'}</div>
                  <div><strong>Peso actual:</strong> {selectedPatient.peso || 'No registrado'}</div>
                </div>
              </div>

              <div className="expediente-section">
                <h3>Propietario</h3>
                <div className="info-grid">
                  <div><strong>Nombre:</strong> {selectedPatient.propietario}</div>
                  <div><strong>Teléfono:</strong> {selectedPatient.telefono}</div>
                  <div><strong>Email:</strong> {selectedPatient.email || 'No registrado'}</div>
                </div>
              </div>

              {selectedPatient.antecedentes && (
                <div className="expediente-section">
                  <h3>Antecedentes Médicos</h3>
                  <p className="expediente-text">{selectedPatient.antecedentes}</p>
                </div>
              )}

              {selectedPatient.alergias && selectedPatient.alergias.length > 0 && (
                <div className="expediente-section">
                  <h3>⚠️ Alergias</h3>
                  <ul className="expediente-list">
                    {selectedPatient.alergias.map((alergia, idx) => (
                      <li key={idx} className="alert-item">{alergia}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPatient.vacunas && selectedPatient.vacunas.length > 0 && (
                <div className="expediente-section">
                  <h3>💉 Vacunas Aplicadas</h3>
                  <ul className="expediente-list">
                    {selectedPatient.vacunas.map((vacuna, idx) => (
                      <li key={idx}>
                        <strong>{vacuna.nombre}</strong> - {vacuna.fecha}
                        {vacuna.proximaDosis && <span className="text-small"> (Próxima: {vacuna.proximaDosis})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPatient.cirugiasPrevias && selectedPatient.cirugiasPrevias.length > 0 && (
                <div className="expediente-section">
                  <h3>🏥 Cirugías Previas</h3>
                  <ul className="expediente-list">
                    {selectedPatient.cirugiasPrevias.map((cirugia, idx) => (
                      <li key={idx}>
                        <strong>{cirugia.tipo}</strong> - {cirugia.fecha}
                        {cirugia.notas && <p className="text-small">{cirugia.notas}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPatient.expediente && selectedPatient.expediente.length > 0 && (
                <div className="expediente-section">
                  <h3>📋 Historial de Consultas</h3>
                  <div className="consultas-timeline">
                    {selectedPatient.expediente.map((consulta, idx) => (
                      <div key={idx} className="consulta-item">
                        <div className="consulta-date">{consulta.fecha}</div>
                        <div className="consulta-content">
                          <strong>{consulta.tipo || 'Consulta General'}</strong>
                          <p>{consulta.motivo}</p>
                          {consulta.diagnostico && <p><strong>Diagnóstico:</strong> {consulta.diagnostico}</p>}
                          {consulta.tratamiento && <p><strong>Tratamiento:</strong> {consulta.tratamiento}</p>}
                          <span className="consulta-doctor">Dr. {consulta.medico}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn-close" onClick={() => setShowExpedienteModal(false)}>
              Cerrar Expediente
            </button>
          </div>
            
        </div>
      )}

      {/* MODAL: NUEVA CITA */}
      {showNewAppointmentModal && (
        <div className="modal-overlay" onClick={() => setShowNewAppointmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>📅 Agendar Nueva Cita</h2>
            
            <form onSubmit={handleSubmitNewAppointment} className="appointment-form">
              <div className="form-section">
                <h3>Información del Paciente</h3>
                <div className="form-group">
                  <label>Seleccionar Paciente *</label>
                  <select
                    value={newAppointmentData.pacienteNombre}
                    onChange={(e) => {
                      const selectedPatient = allVisits.find(p => p.nombre === e.target.value);
                      setNewAppointmentData({
                        ...newAppointmentData,
                        pacienteId: selectedPatient?.id || '',
                        pacienteNombre: e.target.value
                      });
                    }}
                    required
                  >
                    <option value="">-- Seleccione un paciente --</option>
                    {allVisits.map(p => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre} ({p.numeroFicha}) - {p.propietario}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Fecha y Hora</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      value={newAppointmentData.fecha}
                      onChange={(e) => setNewAppointmentData({...newAppointmentData, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora *</label>
                    <input
                      type="time"
                      value={newAppointmentData.hora}
                      onChange={(e) => setNewAppointmentData({...newAppointmentData, hora: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Detalles de la Cita</h3>
                <div className="form-group">
                  <label>Tipo de Cita *</label>
                  <select
                    value={newAppointmentData.tipo}
                    onChange={(e) => setNewAppointmentData({...newAppointmentData, tipo: e.target.value})}
                    required
                  >
                    <option value="consulta_general">Consulta General</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="vacunacion">Vacunación</option>
                    <option value="cirugia">Cirugía</option>
                    <option value="emergencia">Emergencia</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Motivo de la Cita *</label>
                  <textarea
                    value={newAppointmentData.motivo}
                    onChange={(e) => setNewAppointmentData({...newAppointmentData, motivo: e.target.value})}
                    placeholder="Describa brevemente el motivo de la cita..."
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newAppointmentData.confirmada}
                      onChange={(e) => setNewAppointmentData({...newAppointmentData, confirmada: e.target.checked})}
                    />
                    {' '}Confirmar cita inmediatamente
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowNewAppointmentModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-success">
                  ✅ Agendar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CALENDARIO MEDICINA PREVENTIVA */}
      {showCalendarModal && (
        <div className="modal-overlay" onClick={() => setShowCalendarModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>📅 Calendario de Medicina Preventiva</h2>
            
            <div className="calendar-content">
              <div className="calendar-info">
                <p>Pacientes que requieren atención preventiva próximamente</p>
              </div>

              <div className="preventive-calendar-grid">
                {preventiveCalendar.map(patient => (
                  <div key={patient.id} className="calendar-patient-card">
                    <div className="calendar-patient-header">
                      <div className="patient-avatar">
                        {patient.especie === 'Perro' ? '🐕' : '🐈'}
                      </div>
                      <div>
                        <h4>{patient.nombre}</h4>
                        <span className="text-small">{patient.propietario}</span>
                      </div>
                    </div>

                    <div className="calendar-patient-details">
                      <div className="detail-item">
                        <strong>Ficha:</strong> {patient.numeroFicha}
                      </div>
                      <div className="detail-item">
                        <strong>Teléfono:</strong> {patient.telefono}
                      </div>
                    </div>

                    <div className="pending-vaccines">
                      <h5>💉 Vacunas pendientes:</h5>
                      <ul>
                        {patient.vacunas && patient.vacunas
                          .filter(v => v.proximaDosis)
                          .map((vacuna, idx) => (
                            <li key={idx}>
                              <strong>{vacuna.nombre}</strong>
                              <br />
                              <span className="text-small">Próxima dosis: {vacuna.proximaDosis}</span>
                            </li>
                          ))
                        }
                        {(!patient.vacunas || patient.vacunas.length === 0) && (
                          <li>Esquema de vacunación inicial</li>
                        )}
                      </ul>
                    </div>

                    <button className="btn-action">
                      📞 Llamar para Agendar
                    </button>
                  </div>
                ))}

                {preventiveCalendar.length === 0 && (
                  <div className="empty-state">
                    <p>✅ No hay pacientes con medicina preventiva pendiente</p>
                  </div>
                )}
              </div>
            </div>

            <button className="btn-close" onClick={() => setShowCalendarModal(false)}>
              Cerrar Calendario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecepcionDashboard;

