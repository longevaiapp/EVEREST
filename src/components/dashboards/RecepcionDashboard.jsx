import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useRecepcion from '../../hooks/useRecepcion';
import { petService } from '../../services/recepcion.service';
import { citaSeguimientoService } from '../../services/medico.service';
import { QRCodeSVG } from 'qrcode.react';
import './RecepcionDashboard.css';

function RecepcionDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Hook para operaciones con API real (sin datos mock)
  const {
    loading: apiLoading,
    error: apiError,
    visits: todayVisits = [],
    appointments = [],
    preventiveCalendar = [],
    foundOwner,
    ownerPets = [],
    searchOwnerByPhone,
    searchPets,
    createOwner,
    createPet,
    updatePet,
    checkInPet,
    completeTriage,
    dischargeVisit,
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    clearFoundOwner,
    loadInitialData: refreshData,
    allPets = []
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
  
  // Estado para modal de edición de foto
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editPhotoData, setEditPhotoData] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  
  // Estado para historial médico en expediente
  const [historialData, setHistorialData] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  // Estado para citas agendadas por médicos
  const [citasMedico, setCitasMedico] = useState([]);
  const [loadingCitasMedico, setLoadingCitasMedico] = useState(false);
  
  // Estado para búsqueda de mascotas en modal de citas
  const [petSearchQuery, setPetSearchQuery] = useState('');
  const [petSearchResults, setPetSearchResults] = useState([]);
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
    // Patient Data
    foto: null,
    fotoPreview: null,
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Male',
    peso: '',
    especie: 'Dog',
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
  // REAL DATA FROM API (no mock)
  // ============================================================================
  
  // Transform visits from API to dashboard format
  const allVisits = (todayVisits || []).map(v => ({
    id: v.pet?.id,
    visitId: v.id,
    nombre: v.pet?.nombre || 'No name',
    especie: v.pet?.especie || 'Unknown',
    raza: v.pet?.raza || '',
    numeroFicha: v.pet?.numeroFicha || `VET-${String(v.pet?.id).padStart(3, '0')}`,
    propietario: v.pet?.owner?.nombre || 'No owner',
    telefono: v.pet?.owner?.telefono || '',
    estado: v.status,
    motivo: v.motivo || 'Consultation',
    prioridad: v.prioridad || 'MEDIA',
    tipoVisita: v.tipoVisita,
    peso: v.peso,
    temperatura: v.temperatura,
    fotoUrl: v.pet?.fotoUrl || null,
    fromApi: true
  }));

  // Filter by status
  const newArrivals = allVisits.filter(p => p.estado === 'RECIEN_LLEGADO');
  const waitingPatients = allVisits.filter(p => p.estado === 'EN_ESPERA');
  const inConsultPatients = allVisits.filter(p => p.estado === 'EN_CONSULTA');
  const readyForDischarge = allVisits.filter(p => p.estado === 'LISTO_PARA_ALTA');

  // List of ALL registered pets (for "All Patients" section)
  const allPetsFormatted = (allPets || []).map(pet => ({
    id: pet.id,
    nombre: pet.nombre || 'No name',
    especie: pet.especie || 'Unknown',
    raza: pet.raza || '',
    numeroFicha: pet.numeroFicha || `VET-${String(pet.id).padStart(3, '0')}`,
    propietario: pet.owner?.nombre || 'No owner',
    telefono: pet.owner?.telefono || '',
    estado: pet.estado || 'ALTA',
    fotoUrl: pet.fotoUrl || null,
  }));

  // Patient search - uses allPetsFormatted instead of allVisits for "all" section
  const filteredPatients = searchQuery
    ? allPetsFormatted.filter(p => 
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.numeroFicha?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propietario?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.telefono?.includes(searchQuery)
      )
    : allPetsFormatted;

  // Appointments from API
  const todayAppointments = (appointments || []).map(apt => ({
    id: apt.id,
    pacienteId: apt.pet?.id,
    pacienteNombre: apt.pet?.nombre || 'No name',
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

  // Pending tasks (empty for now, can be implemented later)
  const myTasks = [];

  // preventiveCalendar comes from useRecepcion hook

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
    
    if (!selectedPatient?.visitId) {
      alert('Error: Patient does not have an associated visit');
      return;
    }
    
    try {
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
      
      alert(triageData.primeraVisita 
        ? 'Triage completed - New record will be created' 
        : 'Triage completed - Existing record will be consulted'
      );
      setShowTriageModal(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error completing triage:', error);
      alert('Error completing triage: ' + (error.message || 'Please try again.'));
    }
  };

  const handleAssignDoctor = (patientId) => {
    // TODO: Implementar asignación de doctor vía API
    const userName = user?.firstName || user?.nombre || 'Recepción';
    alert(`Patient assigned to doctor by ${userName}`);
  };

  const handleViewExpediente = useCallback(async (patient) => {
    setSelectedPatient(patient);
    setShowExpedienteModal(true);
    setLoadingHistorial(true);
    setHistorialData(null);
    
    try {
      const data = await petService.getHistorial(patient.id);
      console.log('[handleViewExpediente] Historial cargado:', data);
      setHistorialData(data);
    } catch (err) {
      console.error('[handleViewExpediente] Error cargando historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // Función para formatear el historial para mostrar
  const getFormattedHistorial = useCallback(() => {
    if (!historialData?.historial) return [];
    
    const history = [];
    const { consultas, cirugias, hospitalizaciones, vacunas } = historialData.historial;
    
    // Agregar consultas con detalles completos
    if (consultas && Array.isArray(consultas)) {
      consultas.forEach(consulta => {
        history.push({
          timestamp: consulta.startTime,
          tipo: 'consulta',
          status: consulta.status,
          doctor: consulta.doctor?.nombre,
          motivo: consulta.motivo || consulta.soapSubjective?.substring(0, 100),
          diagnostico: consulta.diagnosticos?.[0]?.descripcion,
          soap: {
            subjetivo: consulta.soapSubjective,
            objetivo: consulta.soapObjective,
            analisis: consulta.soapAssessment,
            plan: consulta.soapPlan
          },
          signosVitales: consulta.signosVitales?.[0],
          diagnosticos: consulta.diagnosticos || [],
          recetas: consulta.prescriptions?.map(p => ({
            fecha: p.createdAt,
            items: p.items?.map(item => ({
              medicamento: item.medicationName,
              dosis: item.dosage,
              frecuencia: item.frequency,
              duracion: item.duration
            })) || []
          })) || [],
          laboratorios: consulta.labRequests?.map(lab => ({
            tipo: lab.testType,
            estado: lab.status,
            resultados: lab.results
          })) || []
        });
      });
    }
    
    // Agregar hospitalizaciones
    if (hospitalizaciones && Array.isArray(hospitalizaciones)) {
      hospitalizaciones.forEach(hosp => {
        history.push({
          timestamp: hosp.admittedAt,
          tipo: 'hospitalizacion',
          status: hosp.status,
          doctor: hosp.admittedBy?.nombre,
          motivo: hosp.reason,
          fechaAlta: hosp.dischargedAt
        });
      });
    }
    
    // Agregar cirugías
    if (cirugias && Array.isArray(cirugias)) {
      cirugias.forEach(surgery => {
        history.push({
          timestamp: surgery.scheduledDate,
          tipo: 'cirugia',
          status: surgery.status,
          doctor: surgery.surgeon?.nombre,
          procedimiento: surgery.procedureName || surgery.type
        });
      });
    }
    
    // Agregar vacunas
    if (vacunas && Array.isArray(vacunas)) {
      vacunas.forEach(vacuna => {
        history.push({
          timestamp: vacuna.fecha,
          tipo: 'vacuna',
          nombre: vacuna.nombre || vacuna.tipo,
          lote: vacuna.lote,
          proximaDosis: vacuna.proximaDosis
        });
      });
    }
    
    // Ordenar por fecha descendente
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [historialData]);

  // ============================================================================
  // EDICIÓN DE FOTO DE MASCOTA
  // ============================================================================
  
  const handleEditPhoto = (pet) => {
    setEditingPet(pet);
    setEditPhotoPreview(pet.fotoUrl || null);
    setEditPhotoData(null);
    setShowEditPhotoModal(true);
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Crear preview y comprimir imagen
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Comprimir imagen usando canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionar a máximo 400px manteniendo proporción
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Base64 con compresión JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setEditPhotoPreview(compressedBase64);
        setEditPhotoData(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!editingPet || !editPhotoData) {
      alert('No photo to save');
      return;
    }

    setSavingPhoto(true);
    try {
      console.log('[EditPhoto] Saving photo for:', editingPet.nombre);
      console.log('[EditPhoto] Base64 length:', editPhotoData.length);
      
      await updatePet(editingPet.id, { fotoUrl: editPhotoData });
      
      // Refresh data
      await refreshData();
      
      alert('✅ Photo saved successfully');
      setShowEditPhotoModal(false);
      setEditingPet(null);
      setEditPhotoPreview(null);
      setEditPhotoData(null);
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('❌ Error saving photo: ' + error.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!editingPet) return;
    
    if (!window.confirm('Are you sure you want to delete the photo?')) return;

    setSavingPhoto(true);
    try {
      await updatePet(editingPet.id, { fotoUrl: null });
      await refreshData();
      
      alert('✅ Photo deleted');
      setShowEditPhotoModal(false);
      setEditingPet(null);
      setEditPhotoPreview(null);
      setEditPhotoData(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('❌ Error deleting photo: ' + error.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleViewCalendar = () => {
    setShowCalendarModal(true);
  };

  const handleConfirmAppointment = async (citaId) => {
    try {
      await confirmAppointment(citaId);
      await refreshData();
      alert('✅ Appointment confirmed successfully');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      alert('❌ Error confirming appointment: ' + error.message);
    }
  };

  const handleCancelAppointment = async (citaId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await cancelAppointment(citaId);
      await refreshData();
      alert('✅ Appointment cancelled');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('❌ Error cancelling appointment: ' + error.message);
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
      setClientSearchError('Please enter a phone number');
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
        setClientSearchError('No client found with that number. The client can register by scanning the QR code.');
      }
    } catch (error) {
      console.error('Error searching for client:', error);
      setClientSearchError('Error searching for client. Please try again.');
    }
  };

  // Función para hacer check-in de mascota existente (usando API real)
  const handleCheckInExistingPet = async (pet) => {
    try {
      await checkInPet(pet.id);
      await refreshData(); // Update visits list
      alert(`✅ Check-in completed for ${pet.nombre}\nThe patient is ready for triage.`);
      setFoundClient(null);
      setClientSearchPhone('');
      setShowClientPets(false);
      setActiveSection('triage');
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Error performing check-in. Please try again.');
    }
  };

  // Función para cargar citas agendadas por médicos
  const loadCitasMedico = useCallback(async () => {
    setLoadingCitasMedico(true);
    try {
      const citas = await citaSeguimientoService.getCitasMedico();
      setCitasMedico(citas || []);
    } catch (error) {
      console.error('Error cargando citas de médico:', error);
      setCitasMedico([]);
    } finally {
      setLoadingCitasMedico(false);
    }
  }, []);

  // URL para el formulario de cliente (puede ser ajustada según el deploy)
  const clientFormURL = `${window.location.origin}/registro-cliente`;

  const handleNewAppointment = () => {
    setShowNewAppointmentModal(true);
    clearFoundOwner?.(); // Limpiar búsqueda anterior
    setPetSearchQuery(''); // Limpiar búsqueda de mascotas
    setPetSearchResults([]); // Limpiar resultados
    setNewAppointmentData({
      pacienteId: '',
      pacienteNombre: '',
      telefonoBusqueda: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '',
      tipo: 'CONSULTA_GENERAL',
      motivo: '',
      confirmada: false
    });
  };
  
  // Función para buscar mascotas por nombre
  const handleSearchPets = async (query) => {
    setPetSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchPets(query);
      setPetSearchResults(results);
    } else {
      setPetSearchResults([]);
    }
  };

  const handleSubmitNewAppointment = async (e) => {
    e.preventDefault();
    
    try {
      // Try to create appointment via API
      if (newAppointmentData.pacienteId) {
        // Don't convert to parseInt - petId may be a CUID string
        await createAppointment({
          petId: newAppointmentData.pacienteId,
          fecha: newAppointmentData.fecha,
          hora: newAppointmentData.hora,
          tipo: newAppointmentData.tipo,
          motivo: newAppointmentData.motivo || 'Scheduled consultation'
        });
        await refreshData();
      }
      
      alert(`✅ Appointment scheduled successfully\nPatient: ${newAppointmentData.pacienteNombre}\nDate: ${newAppointmentData.fecha} ${newAppointmentData.hora}`);
      setShowNewAppointmentModal(false);
      setActiveSection('citas');
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error scheduling appointment: ' + (error.message || 'Please try again.'));
    }
  };

  const handleSubmitNewPatient = async (e) => {
    e.preventDefault();
    
    try {
      console.log('[handleSubmitNewPatient] Starting new patient registration...');
      
      // 1. Create owner first
      const ownerData = {
        nombre: newPatientData.propietario,
        telefono: newPatientData.telefono,
        email: newPatientData.email || null,
        direccion: newPatientData.direccion || null,
      };
      
      console.log('[handleSubmitNewPatient] Creating owner:', ownerData);
      const owner = await createOwner(ownerData);
      console.log('[handleSubmitNewPatient] Owner created:', owner);
      
      if (!owner || !owner.id) {
        throw new Error('Could not create owner');
      }
      
      // Helper functions to transform frontend values to backend enum values
      const mapEspecie = (val) => {
        const map = { 'Dog': 'PERRO', 'Cat': 'GATO', 'Bird': 'AVE', 'Rodent': 'ROEDOR', 'Reptile': 'REPTIL', 'Other': 'OTRO' };
        return map[val] || 'OTRO';
      };
      const mapSexo = (val) => {
        const map = { 'Male': 'MACHO', 'Female': 'HEMBRA' };
        return map[val] || 'MACHO';
      };
      const mapCondicion = (val) => {
        const map = { '1': 'MUY_DELGADO', '2': 'DELGADO', '3': 'IDEAL', '4': 'SOBREPESO', '5': 'OBESO' };
        return map[val] || 'IDEAL';
      };
      const toBoolean = (val) => val === 'Yes' || val === true;
      const toDatetimeOrNull = (val) => val ? new Date(val).toISOString() : null;
      
      // 2. Create pet associated with owner
      const petData = {
        ownerId: owner.id,
        nombre: newPatientData.nombre,
        especie: mapEspecie(newPatientData.especie),
        raza: newPatientData.raza || null,
        sexo: mapSexo(newPatientData.sexo),
        fechaNacimiento: toDatetimeOrNull(newPatientData.fechaNacimiento),
        peso: newPatientData.peso ? parseFloat(newPatientData.peso) : null,
        color: newPatientData.color || null,
        condicionCorporal: mapCondicion(newPatientData.condicionCorporal),
        fotoUrl: newPatientData.fotoPreview || null, // Base64 encoded photo
        // Historial médico
        snapTest: newPatientData.snapTest || null,
        analisisClinicos: newPatientData.analisisClinicos || null,
        antecedentes: newPatientData.antecedentes || null,
        // Vacunas
        desparasitacionExterna: toBoolean(newPatientData.desparasitacionExterna),
        ultimaDesparasitacion: toDatetimeOrNull(newPatientData.ultimaDesparasitacion),
        vacunasTexto: newPatientData.vacunas || null,
        vacunasActualizadas: toBoolean(newPatientData.vacunasActualizadas),
        ultimaVacuna: toDatetimeOrNull(newPatientData.ultimaVacuna),
        // Cirugías
        esterilizado: toBoolean(newPatientData.esterilizado),
        otrasCirugias: toBoolean(newPatientData.otrasCirugias),
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
        ultimoCelo: toDatetimeOrNull(newPatientData.ultimoCelo),
        cantidadPartos: newPatientData.cantidadPartos ? parseInt(newPatientData.cantidadPartos) : null,
        ultimoParto: toDatetimeOrNull(newPatientData.ultimoParto),
        // Estilo de vida
        conviveOtrasMascotas: toBoolean(newPatientData.conviveOtrasMascotas),
        cualesMascotas: newPatientData.cualesMascotas || null,
        actividadFisica: toBoolean(newPatientData.actividadFisica),
        frecuenciaActividad: newPatientData.frecuenciaActividad || null,
        saleViaPublica: toBoolean(newPatientData.saleViaPublica),
        frecuenciaSalida: newPatientData.frecuenciaSalida || null,
        otrosDatos: newPatientData.otrosDatos || null,
      };
      
      console.log('[handleSubmitNewPatient] Creating pet:', petData);
      const pet = await createPet(petData);
      console.log('[handleSubmitNewPatient] Pet created:', pet);
      
      if (!pet || !pet.id) {
        throw new Error('Could not create pet');
      }
      
      // 3. Auto check-in (create visit)
      console.log('[handleSubmitNewPatient] Checking in pet:', pet.id);
      const visit = await checkInPet(pet.id);
      console.log('[handleSubmitNewPatient] Visit created:', visit);
      
      // 4. Refresh data
      console.log('[handleSubmitNewPatient] Refreshing data...');
      await refreshData();
      console.log('[handleSubmitNewPatient] Data refreshed. Current visits:', todayVisits);
      
      alert(`✅ Patient registered successfully!\n\n` +
            `Owner: ${owner.nombre}\n` +
            `Pet: ${pet.nombre}\n` +
            `Record: ${pet.numeroFicha || 'Generated'}\n\n` +
            `Patient appears in "New Arrivals" and is ready for triage.`);
      
      // Close modal 
      setShowNewPatientModal(false);
      
      // Reset form
      setNewPatientData({
        propietario: '',
        direccion: '',
        telefono: '',
        email: '',
        foto: null,
        fotoPreview: null,
        nombre: '',
        fechaNacimiento: '',
        sexo: 'Male',
        peso: '',
        especie: 'Dog',
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
      setMascotaWizardStep(1);
      
      // Switch to triage section to see the new patient
      setActiveSection('triage');
      
    } catch (error) {
      console.error('Error registering patient:', error);
      alert(`❌ Error: ${error.message || 'Could not register patient'}`);
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

      // Schedule follow-up if date exists (optional - can create appointment)
      if (dischargeData.fechaSeguimiento) {
        try {
          // Use selectedPatient.id which is the petId
          await createAppointment({
            petId: selectedPatient.id, // This is the pet ID
            fecha: dischargeData.fechaSeguimiento,
            hora: dischargeData.horaSeguimiento || '10:00',
            tipo: 'SEGUIMIENTO',
            motivo: `Follow-up visit - ${selectedPatient.motivo || 'Consultation'}`
          });
        } catch (err) {
          console.error('Error creating follow-up appointment:', err);
          // Don't fail main operation for this
        }
      }

      alert('✅ Patient discharged successfully');
      setShowDischargeModal(false);
      setSelectedPatient(null);
      await refreshData();
    } catch (error) {
      console.error('Error processing discharge:', error);
      alert('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="dashboard recepcion-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>🏥 {t('recepcion.title')}</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>{t('recepcion.dashboard')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveSection('checkin')}
          >
            <span className="nav-icon">📲</span>
            <span>{t('recepcion.checkIn')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'nueva-mascota' ? 'active' : ''}`}
            onClick={() => setActiveSection('nueva-mascota')}
          >
            <span className="nav-icon">🐾</span>
            <span>{t('recepcion.newPatient.title')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'citas' ? 'active' : ''}`}
            onClick={() => setActiveSection('citas')}
          >
            <span className="nav-icon">📅</span>
            <span>{t('recepcion.sections.todayAppointments')}</span>
            {todayAppointments.length > 0 && (
              <span className="nav-badge">{todayAppointments.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'citas-medico' ? 'active' : ''}`}
            onClick={() => { 
              setActiveSection('citas-medico');
              loadCitasMedico();
            }}
          >
            <span className="nav-icon">🩺</span>
            <span>Citas por Médico</span>
            {citasMedico.length > 0 && (
              <span className="nav-badge doctor">{citasMedico.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'preventiva' ? 'active' : ''}`}
            onClick={() => setActiveSection('preventiva')}
          >
            <span className="nav-icon">💉</span>
            <span>{t('recepcion.triage.consultationTypes.preventive')}</span>
            {preventiveCalendar.length > 0 && (
              <span className="nav-badge warning">{preventiveCalendar.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'triage' ? 'active' : ''}`}
            onClick={() => setActiveSection('triage')}
          >
            <span className="nav-icon">🚨</span>
            <span>{t('recepcion.triage.title')}</span>
            {newArrivals.length > 0 && (
              <span className="nav-badge urgent">{newArrivals.length}</span>
            )}
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveSection('todos')}
          >
            <span className="nav-icon">📋</span>
            <span>{t('recepcion.allPatients')}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'alta' ? 'active' : ''}`}
            onClick={() => setActiveSection('alta')}
          >
            <span className="nav-icon">✅</span>
            <span>{t('recepcion.sections.readyForDischarge')}</span>
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
              {activeSection === 'dashboard' && t('recepcion.dashboard')}
              {activeSection === 'checkin' && t('recepcion.checkInFlow.title')}
              {activeSection === 'nueva-mascota' && t('recepcion.newPatient.title')}
              {activeSection === 'citas' && t('recepcion.sections.todayAppointments')}
              {activeSection === 'citas-medico' && '🩺 Citas por Médico'}
              {activeSection === 'preventiva' && t('recepcion.triage.consultationTypes.preventive')}
              {activeSection === 'triage' && t('recepcion.triage.title')}
              {activeSection === 'todos' && t('recepcion.allPatients')}
              {activeSection === 'alta' && t('recepcion.sections.readyForDischarge')}
            </h1>
            <p>
              {activeSection === 'dashboard' && t('recepcion.title')}
              {activeSection === 'checkin' && t('recepcion.checkInFlow.searchByPhone')}
              {activeSection === 'nueva-mascota' && t('recepcion.newPatient.registerPatient')}
              {activeSection === 'citas' && `${todayAppointments.length} ${t('recepcion.sections.todayAppointments').toLowerCase()}`}
              {activeSection === 'citas-medico' && `${citasMedico.length} citas agendadas por médicos`}
              {activeSection === 'preventiva' && t('recepcion.triage.consultationTypes.preventive')}
              {activeSection === 'triage' && t('recepcion.sections.triagePending')}
              {activeSection === 'todos' && t('recepcion.allPatients')}
              {activeSection === 'alta' && t('recepcion.sections.readyForDischarge')}
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
                  <p>{t('recepcion.sections.recentArrivals')}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(255, 152, 0, 0.3)'}}>⏳</div>
                <div className="stat-content">
                  <h3>{waitingPatients.length}</h3>
                  <p>{t('recepcion.sections.waitingQueue')}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(33, 150, 243, 0.3)'}}>👨‍⚕️</div>
                <div className="stat-content">
                  <h3>{inConsultPatients.length}</h3>
                  <p>{t('recepcion.status.EN_CONSULTA')}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{background: 'rgba(76, 175, 80, 0.3)'}}>✅</div>
                <div className="stat-content">
                  <h3>{readyForDischarge.length}</h3>
                  <p>{t('recepcion.sections.readyForDischarge')}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-content">
              {/* Resumen de alertas */}
              {newArrivals.length > 0 && (
                <div className="content-section urgent">
                  <h2>🚨 {t('recepcion.triage.title')}</h2>
                  <p>{newArrivals.length} {t('recepcion.sections.triagePending').toLowerCase()}</p>
                  <button className="btn-action" onClick={() => setActiveSection('triage')}>
                    {t('recepcion.patients')}
                  </button>
                </div>
              )}

              {todayAppointments.length > 0 && (
                <div className="content-section info">
                  <h2>📅 {t('recepcion.sections.todayAppointments')}</h2>
                  <p>{todayAppointments.length} citas programadas</p>
                  <button className="btn-action" onClick={() => setActiveSection('citas')}>
                    {t('common.search')}
                  </button>
                </div>
              )}

              {preventiveCalendar.length > 0 && (
                <div className="content-section warning">
                  <h2>💉 {t('recepcion.triage.consultationTypes.preventive')}</h2>
                  <p>{preventiveCalendar.length} {t('recepcion.patients')}</p>
                  <button className="btn-action" onClick={() => setActiveSection('preventiva')}>
                    {t('common.search')}
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
                  <span className="qr-badge">{t('recepcion.newPatient.title').toUpperCase()}</span>
                  <h3>📱 {t('recepcion.checkInFlow.searchClient')}</h3>
                </div>
                <p className="qr-description">
                  {t('recepcion.checkInFlow.searchByPhone')}
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
                  📋 {t('recepcion.newPatient.medicalHistory')}
                </p>
                <div className="qr-url">
                  <small>{clientFormURL}</small>
                </div>
              </div>

              {/* Búsqueda de cliente existente */}
              <div className="checkin-card search-card">
                <div className="search-header">
                  <span className="search-badge">{t('recepcion.checkIn').toUpperCase()}</span>
                  <h3>🔍 {t('recepcion.checkInFlow.searchClient')}</h3>
                </div>
                <p className="search-description">
                  {t('recepcion.checkInFlow.searchByPhone')}
                </p>
                
                <form onSubmit={handleSearchClient} className="client-search-form">
                  <div className="search-input-group">
                    <span className="search-icon">📞</span>
                    <input
                      type="tel"
                      value={clientSearchPhone}
                      onChange={(e) => setClientSearchPhone(e.target.value)}
                      placeholder={t('recepcion.checkInFlow.enterPhone')}
                      className="phone-input"
                    />
                    <button type="submit" className="btn-search">
                      {t('common.search')}
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
                      <h5>🐾 {t('recepcion.checkInFlow.selectPet')}:</h5>
                      {foundClient.mascotas.map(pet => (
                        <div key={pet.id} className="pet-item">
                          <div className="pet-info">
                            <span className="pet-icon">
                              {pet.especie === 'Dog' ? '🐕' : '🐈'}
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
                            ✓ {t('recepcion.checkIn')}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      className="btn-add-pet"
                      onClick={() => {
                        alert(t('recepcion.checkInFlow.registerNewPet'));
                      }}
                    >
                      ➕ {t('recepcion.checkInFlow.registerNewPet')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Instrucciones para recepción */}
            <div className="checkin-instructions">
              <h4>📋 {t('common.actions')}</h4>
              <div className="instructions-grid">
                <div className="instruction-item">
                  <span className="step">1</span>
                  <p><strong>{t('recepcion.newPatient.title')}:</strong> {t('recepcion.checkInFlow.searchByPhone')}</p>
                </div>
                <div className="instruction-item">
                  <span className="step">2</span>
                  <p><strong>{t('recepcion.checkIn')}:</strong> {t('recepcion.checkInFlow.selectPet')}</p>
                </div>
                <div className="instruction-item">
                  <span className="step">3</span>
                  <p><strong>{t('recepcion.triage.title')}:</strong> {t('recepcion.sections.triagePending')}</p>
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
                { num: 1, label: t('recepcion.patient.owner'), icon: '👤' },
                { num: 2, label: t('recepcion.patients'), icon: '🐾' },
                { num: 3, label: t('recepcion.newPatient.medicalHistory'), icon: '📋' },
                { num: 4, label: t('recepcion.newPatient.vaccines'), icon: '💉' },
                { num: 5, label: t('recepcion.newPatient.surgeries'), icon: '🏥' },
                { num: 6, label: t('recepcion.newPatient.feeding'), icon: '🍖' },
                { num: 7, label: t('recepcion.lifestyle.otherData'), icon: '📝' }
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
              
              {/* STEP 1: OWNER DATA */}
              {mascotaWizardStep === 1 && (
                <div className="form-card wizard-card">
                  <h3>👤 {t('recepcion.newPatient.ownerInfo')}</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>{t('recepcion.patient.owner')}: *</label>
                      <input
                        type="text"
                        value={newPatientData.propietario}
                        onChange={(e) => setNewPatientData({...newPatientData, propietario: e.target.value})}
                        placeholder={t('recepcion.patient.name')}
                        required
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('recepcion.patient.address')}:</label>
                      <input
                        type="text"
                        value={newPatientData.direccion}
                        onChange={(e) => setNewPatientData({...newPatientData, direccion: e.target.value})}
                        placeholder={t('recepcion.patient.address')}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.phone')}: *</label>
                      <input
                        type="tel"
                        value={newPatientData.telefono}
                        onChange={(e) => setNewPatientData({...newPatientData, telefono: e.target.value})}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.email')}:</label>
                      <input
                        type="email"
                        value={newPatientData.email}
                        onChange={(e) => setNewPatientData({...newPatientData, email: e.target.value})}
                        placeholder={t('auth.enterEmail')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PATIENT DATA */}
              {mascotaWizardStep === 2 && (
                <div className="form-card wizard-card">
                  <h3>🐾 {t('recepcion.newPatient.petInfo')}</h3>
                  
                  {/* Pet photo */}
                  <div className="foto-upload-container">
                    <div className="foto-preview">
                      {newPatientData.fotoPreview ? (
                        <img src={newPatientData.fotoPreview} alt="Pet photo" />
                      ) : (
                        <div className="foto-placeholder">
                          <span>📷</span>
                          <p>{t('recepcion.patient.photo')}</p>
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
                        📷 Select photo
                      </label>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('recepcion.patient.name')}: *</label>
                      <input
                        type="text"
                        value={newPatientData.nombre}
                        onChange={(e) => setNewPatientData({...newPatientData, nombre: e.target.value})}
                        placeholder="Pet name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.birthDate')}:</label>
                      <input
                        type="date"
                        value={newPatientData.fechaNacimiento}
                        onChange={(e) => setNewPatientData({...newPatientData, fechaNacimiento: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.sex')}: *</label>
                      <select
                        value={newPatientData.sexo}
                        onChange={(e) => setNewPatientData({...newPatientData, sexo: e.target.value})}
                      >
                        <option value="Male">{t('recepcion.patient.male')}</option>
                        <option value="Female">{t('recepcion.patient.female')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.weight')} (kg):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPatientData.peso}
                        onChange={(e) => setNewPatientData({...newPatientData, peso: e.target.value})}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.species')}: *</label>
                      <select
                        value={newPatientData.especie}
                        onChange={(e) => setNewPatientData({...newPatientData, especie: e.target.value})}
                      >
                        <option value="Dog">{t('recepcion.species.dog')}</option>
                        <option value="Cat">{t('recepcion.species.cat')}</option>
                        <option value="Bird">{t('recepcion.species.bird')}</option>
                        <option value="Rodent">{t('recepcion.species.rodent')}</option>
                        <option value="Reptile">{t('recepcion.species.reptile')}</option>
                        <option value="Other">{t('recepcion.species.other')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.breed')}:</label>
                      <input
                        type="text"
                        value={newPatientData.raza}
                        onChange={(e) => setNewPatientData({...newPatientData, raza: e.target.value})}
                        placeholder="Breed or mixed"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.color')}:</label>
                      <input
                        type="text"
                        value={newPatientData.color}
                        onChange={(e) => setNewPatientData({...newPatientData, color: e.target.value})}
                        placeholder="Coat color"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.patient.bodyCondition')} (1-5):</label>
                      <select
                        value={newPatientData.condicionCorporal}
                        onChange={(e) => setNewPatientData({...newPatientData, condicionCorporal: e.target.value})}
                      >
                        <option value="1">1 - Very thin</option>
                        <option value="2">2 - Thin</option>
                        <option value="3">3 - Ideal</option>
                        <option value="4">4 - Overweight</option>
                        <option value="5">5 - Obese</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: MEDICAL HISTORY */}
              {mascotaWizardStep === 3 && (
                <div className="form-card wizard-card">
                  <h3>📋 {t('recepcion.newPatient.medicalHistory')}</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>{t('recepcion.medicalHistory.snapTest')}:</label>
                      <input
                        type="text"
                        value={newPatientData.snapTest}
                        onChange={(e) => setNewPatientData({...newPatientData, snapTest: e.target.value})}
                        placeholder="Snap Test results"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('recepcion.medicalHistory.clinicalAnalysis')}:</label>
                      <textarea
                        value={newPatientData.analisisClinicos}
                        onChange={(e) => setNewPatientData({...newPatientData, analisisClinicos: e.target.value})}
                        placeholder="Previous clinical analysis results"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: DEWORMING AND VACCINES */}
              {mascotaWizardStep === 4 && (
                <div className="form-card wizard-card">
                  <h3>💉 {t('recepcion.newPatient.vaccines')}</h3>
                  <div className="form-grid">
                    <div className="form-group checkbox-group">
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={newPatientData.desparasitacionExterna}
                          onChange={(e) => setNewPatientData({...newPatientData, desparasitacionExterna: e.target.checked})}
                        />
                        {t('recepcion.medicalHistory.externalDeworming')}
                      </label>
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.medicalHistory.lastDeworming')}:</label>
                      <input
                        type="date"
                        value={newPatientData.ultimaDesparasitacion}
                        onChange={(e) => setNewPatientData({...newPatientData, ultimaDesparasitacion: e.target.value})}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('recepcion.medicalHistory.vaccines')}:</label>
                      <textarea
                        value={newPatientData.vacunas}
                        onChange={(e) => setNewPatientData({...newPatientData, vacunas: e.target.value})}
                        placeholder="List of applied vaccines"
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
                        {t('recepcion.medicalHistory.vaccinesUpToDate')}
                      </label>
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.medicalHistory.lastVaccine')}:</label>
                      <input
                        type="date"
                        value={newPatientData.ultimaVacuna}
                        onChange={(e) => setNewPatientData({...newPatientData, ultimaVacuna: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: SURGERIES AND TREATMENTS */}
              {mascotaWizardStep === 5 && (
                <div className="form-card wizard-card">
                  <h3>🏥 {t('recepcion.newPatient.surgeries')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('recepcion.surgeries.sterilized')}?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="esterilizado"
                            value="Yes"
                            checked={newPatientData.esterilizado === 'Yes'}
                            onChange={(e) => setNewPatientData({...newPatientData, esterilizado: e.target.value})}
                          />
                          {t('common.yes')}
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="esterilizado"
                            value="No"
                            checked={newPatientData.esterilizado === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, esterilizado: e.target.value})}
                          />
                          {t('common.no')}
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.surgeries.otherSurgeries')}?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="otrasCirugias"
                            value="Yes"
                            checked={newPatientData.otrasCirugias === 'Yes'}
                            onChange={(e) => setNewPatientData({...newPatientData, otrasCirugias: e.target.value})}
                          />
                          {t('common.yes')}
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="otrasCirugias"
                            value="No"
                            checked={newPatientData.otrasCirugias === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, otrasCirugias: e.target.value})}
                          />
                          {t('common.no')}
                        </label>
                      </div>
                    </div>
                    {newPatientData.otrasCirugias === 'Yes' && (
                      <div className="form-group full-width">
                        <label>{t('recepcion.surgeries.surgeryDetails')}:</label>
                        <textarea
                          value={newPatientData.detalleCirugias}
                          onChange={(e) => setNewPatientData({...newPatientData, detalleCirugias: e.target.value})}
                          placeholder="Describe previous surgeries"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reproductive info for females only */}
                  {newPatientData.sexo === 'Female' && (
                    <>
                      <h4 className="subsection-title">🎀 Reproductive Information</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>{t('recepcion.reproductive.lastHeat')}:</label>
                          <input
                            type="date"
                            value={newPatientData.ultimoCelo}
                            onChange={(e) => setNewPatientData({...newPatientData, ultimoCelo: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('recepcion.reproductive.numberOfBirths')}:</label>
                          <input
                            type="number"
                            min="0"
                            value={newPatientData.cantidadPartos}
                            onChange={(e) => setNewPatientData({...newPatientData, cantidadPartos: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('recepcion.reproductive.lastBirth')}:</label>
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

              {/* STEP 6: FEEDING AND PATHOLOGIES */}
              {mascotaWizardStep === 6 && (
                <div className="form-card wizard-card">
                  <h3>🍖 {t('recepcion.newPatient.feeding')} & {t('recepcion.allergies.title')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('recepcion.feeding.food')}:</label>
                      <input
                        type="text"
                        value={newPatientData.alimento}
                        onChange={(e) => setNewPatientData({...newPatientData, alimento: e.target.value})}
                        placeholder="Brand/type of food"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.feeding.portionsPerDay')}:</label>
                      <input
                        type="text"
                        value={newPatientData.porcionesPorDia}
                        onChange={(e) => setNewPatientData({...newPatientData, porcionesPorDia: e.target.value})}
                        placeholder="e.g., 2 cups"
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.feeding.otherFoods')}:</label>
                      <input
                        type="text"
                        value={newPatientData.otrosAlimentos}
                        onChange={(e) => setNewPatientData({...newPatientData, otrosAlimentos: e.target.value})}
                        placeholder="Treats, scraps, etc."
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('recepcion.feeding.frequency')}:</label>
                      <input
                        type="text"
                        value={newPatientData.frecuenciaOtrosAlimentos}
                        onChange={(e) => setNewPatientData({...newPatientData, frecuenciaOtrosAlimentos: e.target.value})}
                        placeholder="Daily, weekly, etc."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('recepcion.allergies.title')}:</label>
                      <input
                        type="text"
                        value={newPatientData.alergias}
                        onChange={(e) => setNewPatientData({...newPatientData, alergias: e.target.value})}
                        placeholder="Known allergies"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>{t('recepcion.allergies.chronicDiseases')}:</label>
                      <textarea
                        value={newPatientData.enfermedadesCronicas}
                        onChange={(e) => setNewPatientData({...newPatientData, enfermedadesCronicas: e.target.value})}
                        placeholder="Chronic medical conditions"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: OTHER DATA */}
              {mascotaWizardStep === 7 && (
                <div className="form-card wizard-card">
                  <h3>📝 {t('recepcion.lifestyle.otherData')}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>{t('recepcion.lifestyle.livesWithOtherPets')}?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="conviveOtrasMascotas"
                            value="Yes"
                            checked={newPatientData.conviveOtrasMascotas === 'Yes'}
                            onChange={(e) => setNewPatientData({...newPatientData, conviveOtrasMascotas: e.target.value})}
                          />
                          {t('common.yes')}
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="conviveOtrasMascotas"
                            value="No"
                            checked={newPatientData.conviveOtrasMascotas === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, conviveOtrasMascotas: e.target.value})}
                          />
                          {t('common.no')}
                        </label>
                      </div>
                    </div>
                    {newPatientData.conviveOtrasMascotas === 'Yes' && (
                      <div className="form-group">
                        <label>{t('recepcion.lifestyle.whichPets')}</label>
                        <input
                          type="text"
                          value={newPatientData.cualesMascotas}
                          onChange={(e) => setNewPatientData({...newPatientData, cualesMascotas: e.target.value})}
                          placeholder="Dogs, cats, etc."
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>{t('recepcion.lifestyle.physicalActivity')}?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="actividadFisica"
                            value="Yes"
                            checked={newPatientData.actividadFisica === 'Yes'}
                            onChange={(e) => setNewPatientData({...newPatientData, actividadFisica: e.target.value})}
                          />
                          {t('common.yes')}
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="actividadFisica"
                            value="No"
                            checked={newPatientData.actividadFisica === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, actividadFisica: e.target.value})}
                          />
                          {t('common.no')}
                        </label>
                      </div>
                    </div>
                    {newPatientData.actividadFisica === 'Yes' && (
                      <div className="form-group">
                        <label>{t('recepcion.lifestyle.activityFrequency')}:</label>
                        <input
                          type="text"
                          value={newPatientData.frecuenciaActividad}
                          onChange={(e) => setNewPatientData({...newPatientData, frecuenciaActividad: e.target.value})}
                          placeholder="Daily, 3 times/week, etc."
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label>{t('recepcion.lifestyle.goesOutside')}?</label>
                      <div className="radio-group">
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="saleViaPublica"
                            value="Yes"
                            checked={newPatientData.saleViaPublica === 'Yes'}
                            onChange={(e) => setNewPatientData({...newPatientData, saleViaPublica: e.target.value})}
                          />
                          {t('common.yes')}
                        </label>
                        <label className="radio-inline">
                          <input
                            type="radio"
                            name="saleViaPublica"
                            value="No"
                            checked={newPatientData.saleViaPublica === 'No'}
                            onChange={(e) => setNewPatientData({...newPatientData, saleViaPublica: e.target.value})}
                          />
                          {t('common.no')}
                        </label>
                      </div>
                    </div>
                    {newPatientData.saleViaPublica === 'Yes' && (
                      <div className="form-group">
                        <label>{t('recepcion.lifestyle.outingFrequency')}:</label>
                        <input
                          type="text"
                          value={newPatientData.frecuenciaSalida}
                          onChange={(e) => setNewPatientData({...newPatientData, frecuenciaSalida: e.target.value})}
                          placeholder="Daily walks, etc."
                        />
                      </div>
                    )}
                    <div className="form-group full-width">
                      <label>{t('recepcion.lifestyle.otherData')}:</label>
                      <textarea
                        value={newPatientData.otrosDatos}
                        onChange={(e) => setNewPatientData({...newPatientData, otrosDatos: e.target.value})}
                        placeholder="Additional relevant information"
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
                  ← {t('common.previous')}
                </button>
              )}
              
              {mascotaWizardStep < 7 ? (
                <button 
                  type="button" 
                  className="btn-wizard-next"
                  onClick={() => setMascotaWizardStep(mascotaWizardStep + 1)}
                >
                  {t('common.next')} →
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-wizard-submit"
                  onClick={handleSubmitNewPatient}
                  disabled={apiLoading}
                >
                  {apiLoading ? '⏳ Guardando...' : `🐾 ${t('common.save')}`}
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
                ➕ {t('recepcion.appointments.newAppointment')}
              </button>
            </div>
            {todayAppointments.length > 0 ? (
              <div className="appointments-grid">
                {todayAppointments.map((cita) => (
                  <div key={cita.id} className="appointment-card">
                      <div className="appointment-header">
                        <div className="appointment-time-large">{cita.hora || '---'}</div>
                        {cita.cancelada ? (
                          <span className="status-badge error">✕ {t('recepcion.appointments.cancelled')}</span>
                        ) : cita.confirmada ? (
                          <span className="status-badge success">✓ {t('recepcion.appointments.confirmed')}</span>
                        ) : (
                          <span className="status-badge warning">⚠ {t('recepcion.appointments.pending')}</span>
                        )}
                      </div>
                      <div className="appointment-body">
                        <h4>{cita.pacienteNombre || cita.paciente || 'No name'}</h4>
                        <p><strong>{t('recepcion.patient.owner')}:</strong> {cita.propietario || 'Not specified'}</p>
                        <p><strong>{t('recepcion.appointments.type')}:</strong> {(cita.tipo || 'CONSULTA_GENERAL').replace(/_/g, ' ')}</p>
                        <p><strong>{t('recepcion.triage.reason')}:</strong> {cita.motivo || 'Not specified'}</p>
                      </div>
                      <div className="appointment-actions">
                        <button className="btn-icon" title={t('recepcion.actions.call')} onClick={() => handleCallPatient(cita.telefono || '555-0000')}>📞</button>
                        <button className="btn-icon" title={t('recepcion.actions.viewRecord')} onClick={() => alert(t('recepcion.actions.viewRecord'))}>📄</button>
                        {/* Botón Check-in: Solo para citas confirmadas que aún no tienen check-in */}
                        {cita.confirmada && !cita.cancelada && cita.pacienteId && (
                          <button 
                            className="btn-icon success" 
                            title={t('recepcion.checkIn', 'Check-in')}
                            onClick={async () => {
                              try {
                                await checkInPet(cita.pacienteId);
                                await refreshData();
                                alert(`✅ Check-in completed for ${cita.pacienteNombre}\nThe patient is ready for triage.`);
                                setActiveSection('triage');
                              } catch (err) {
                                alert('Check-in error: ' + (err.message || 'Please try again'));
                              }
                            }}
                          >
                            🏥
                          </button>
                        )}
                        {!cita.confirmada && !cita.cancelada && (
                          <button 
                            className="btn-icon success" 
                            title={t('common.confirm')}
                            onClick={() => handleConfirmAppointment(cita.id)}
                          >
                            ✓
                          </button>
                        )}
                        {!cita.cancelada && (
                          <button 
                            className="btn-icon error" 
                            title={t('common.cancel')}
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
                <p>📅 {t('recepcion.messages.noAppointmentsToday')}</p>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: CITAS AGENDADAS POR MÉDICO */}
        {activeSection === 'citas-medico' && (
          <div className="citas-medico-section">
            <div className="section-actions">
              <button className="btn-secondary" onClick={loadCitasMedico} disabled={loadingCitasMedico}>
                🔄 {loadingCitasMedico ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            
            {loadingCitasMedico ? (
              <div className="loading-state">
                <span className="spinner">⏳</span>
                <p>Cargando citas...</p>
              </div>
            ) : citasMedico.length > 0 ? (
              <div className="citas-medico-grid">
                {citasMedico.map((cita) => (
                  <div key={cita.id} className="cita-medico-card">
                    <div className="cita-medico-header">
                      <div className="cita-datetime">
                        <span className="cita-fecha">📅 {new Date(cita.fecha).toLocaleDateString()}</span>
                        <span className="cita-hora">🕐 {cita.hora}</span>
                      </div>
                      <span className={`status-badge ${cita.confirmada ? 'success' : 'warning'}`}>
                        {cita.confirmada ? '✓ Confirmada' : '⏳ Por confirmar'}
                      </span>
                    </div>
                    
                    <div className="cita-medico-patient">
                      <div className="patient-row">
                        <span className="pet-icon">{cita.pet?.especie === 'PERRO' ? '🐕' : '🐈'}</span>
                        <div className="patient-details">
                          <strong>{cita.pet?.nombre || 'Mascota'}</strong>
                          <span className="breed">{cita.pet?.raza}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="cita-medico-owner">
                      <div className="owner-info-line">
                        <span className="owner-icon">👤</span>
                        <strong>{cita.pet?.owner?.nombre || 'Propietario'}</strong>
                      </div>
                      {cita.pet?.owner?.telefono && (
                        <div className="owner-phone-line">
                          <span className="phone-icon">📱</span>
                          <span className="phone-number">{cita.pet.owner.telefono}</span>
                          <button 
                            className="btn-call" 
                            onClick={() => handleCallPatient(cita.pet.owner.telefono)}
                          >
                            Llamar
                          </button>
                        </div>
                      )}
                      {cita.pet?.owner?.email && (
                        <div className="owner-email-line">
                          <span className="email-icon">✉️</span>
                          <span className="email">{cita.pet.owner.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="cita-medico-motivo">
                      <strong>📝 Motivo:</strong>
                      <p>{cita.motivo}</p>
                    </div>
                    
                    {cita.metadata?.labType && (
                      <div className="cita-medico-lab-context">
                        <span className="lab-badge">🧪 {cita.metadata.labType}</span>
                      </div>
                    )}
                    
                    {cita.notas && (
                      <div className="cita-medico-notas">
                        <small>💬 {cita.notas}</small>
                      </div>
                    )}
                    
                    <div className="cita-medico-actions">
                      {!cita.confirmada && (
                        <button 
                          className="btn-confirm"
                          onClick={async () => {
                            try {
                              await confirmAppointment(cita.id);
                              await loadCitasMedico();
                              alert('✅ Cita confirmada');
                            } catch (err) {
                              alert('Error: ' + (err.message || 'No se pudo confirmar'));
                            }
                          }}
                        >
                          ✓ Confirmar
                        </button>
                      )}
                      {cita.confirmada && cita.pet?.id && (
                        <button 
                          className="btn-checkin"
                          onClick={async () => {
                            try {
                              await checkInPet(cita.pet.id);
                              await refreshData();
                              await loadCitasMedico();
                              alert(`✅ Check-in completado para ${cita.pet.nombre}`);
                              setActiveSection('triage');
                            } catch (err) {
                              alert('Error: ' + (err.message || 'No se pudo hacer check-in'));
                            }
                          }}
                        >
                          🏥 Check-in
                        </button>
                      )}
                      <button 
                        className="btn-cancel"
                        onClick={async () => {
                          if (confirm('¿Cancelar esta cita?')) {
                            try {
                              await cancelAppointment(cita.id);
                              await loadCitasMedico();
                              alert('Cita cancelada');
                            } catch (err) {
                              alert('Error: ' + (err.message || 'No se pudo cancelar'));
                            }
                          }
                        }}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🩺</span>
                <p>No hay citas agendadas por médicos pendientes</p>
                <small>Cuando un médico agende una cita de seguimiento desde resultados de laboratorio, aparecerá aquí</small>
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
                          {patient.fotoUrl ? (
                            <img src={patient.fotoUrl} alt={patient.nombre} className="patient-avatar-photo-small" />
                          ) : (
                            patient.especie === 'DOG' ? '🐕' : patient.especie === 'CAT' ? '🐈' : '🐾'
                          )}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="text-small">{patient.propietario}</span>
                        </div>
                      </div>

                      <div className="calendar-patient-details">
                      <div className="detail-item">
                        <strong>{t('recepcion.patient.name')}:</strong> {patient.numeroFicha}
                      </div>
                      <div className="detail-item">
                        <strong>{t('recepcion.patient.phone')}:</strong> {patient.telefono}
                      </div>
                    </div>

                    <div className="pending-vaccines">
                      <h5>⚕️ {t('recepcion.triage.consultationTypes.preventive')}:</h5>
                      <ul>
                        {patient.needs && patient.needs.map((need, idx) => (
                          <li key={idx} className={`need-item priority-${need.priority}`}>
                            <span className="need-icon">
                              {need.type === 'VACUNA' && '💉'}
                              {need.type === 'VACUNA_PROGRAMADA' && '📅'}
                              {need.type === 'DESPARASITACION' && '💊'}
                            </span>
                            <strong>{need.reason}</strong>
                            {need.lastDate && (
                              <span className="text-small need-date">
                                Last: {new Date(need.lastDate).toLocaleDateString()}
                              </span>
                            )}
                            {need.scheduledDate && (
                              <span className="text-small need-date scheduled">
                                Scheduled: {new Date(need.scheduledDate).toLocaleDateString()}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="card-actions">
                      <button 
                        className="btn-action"
                        onClick={() => window.open(`tel:${patient.telefono}`, '_self')}
                      >
                        📞 Call
                      </button>
                      <button className="btn-action" onClick={() => handleViewExpediente(patient)}>📄 Record</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <p>No patients with pending preventive medicine</p>
                <p className="text-small">Patients with expired vaccinations or dewormings will appear here</p>
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
                          {patient.fotoUrl ? (
                            <img src={patient.fotoUrl} alt={patient.nombre} className="patient-avatar-photo-small" />
                          ) : (
                            patient.especie === 'Dog' ? '🐕' : '🐈'
                          )}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="patient-ficha">{patient.numeroFicha}</span>
                        </div>
                      </div>
                      <div className="patient-details-small">
                        <p><strong>{t('recepcion.patient.owner')}:</strong> {patient.propietario}</p>
                        <p><strong>{t('recepcion.patient.species')}:</strong> {patient.especie} - {patient.raza}</p>
                        <p><strong>{t('recepcion.patient.phone')}:</strong> {patient.telefono}</p>
                        {patient.motivo && <p><strong>{t('recepcion.triage.reason')}:</strong> {patient.motivo}</p>}
                      </div>
                      <button 
                        className="btn-action urgent"
                        onClick={() => handleStartTriage(patient)}
                      >
                        📋 {t('recepcion.triage.startTriage')}
                      </button>
                    </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>✅ {t('recepcion.messages.noPendingTriage')}</p>
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
                placeholder={`🔍 ${t('common.search')}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="btn-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            
            <div className="patients-grid-modern">
              {filteredPatients.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🐾</span>
                  <p>{t('recepcion.messages.noRecentArrivals', 'No registered patients')}</p>
                </div>
              ) : (
                filteredPatients.map(patient => (
                  <div key={patient.id} className={`patient-card-modern ${patient.estado === 'HOSPITALIZADO' ? 'hospitalized' : ''}`}>
                    <div className="patient-card-top">
                      <div className="patient-avatar-container">
                        {patient.fotoUrl ? (
                          <img 
                            src={patient.fotoUrl} 
                            alt={patient.nombre} 
                            className="patient-avatar-photo"
                          />
                        ) : (
                          <span className="patient-avatar-emoji">
                            {patient.especie === 'Dog' ? '🐕' : patient.especie === 'Cat' ? '🐈' : '🐾'}
                          </span>
                        )}
                        <span className={`status-dot ${patient.estado?.toLowerCase().replace(/_/g, '-')}`}></span>
                      </div>
                      <div className="patient-main-details">
                        <h4 className="patient-name">{patient.nombre}</h4>
                        <span className="patient-ficha-badge">{patient.numeroFicha}</span>
                      </div>
                      <div className="patient-card-actions">
                        <button 
                          className="btn-card-action primary" 
                          onClick={() => handleViewExpediente(patient)} 
                          title={t('recepcion.actions.viewRecord')}
                        >
                          📋
                        </button>
                        <button 
                          className="btn-card-action secondary"
                          onClick={() => handleEditPhoto(patient)}
                          title="Edit Photo"
                        >
                          📷
                        </button>
                        {patient.estado === 'RECIEN_LLEGADO' && (
                          <button 
                            className="btn-card-action warning"
                            onClick={() => handleStartTriage(patient)}
                            title="Start Triage"
                          >
                            🩺
                          </button>
                        )}
                        {patient.estado === 'LISTO_PARA_ALTA' && (
                          <button 
                            className="btn-card-action success"
                            onClick={() => handleStartDischarge(patient)}
                            title="Process Discharge"
                          >
                            ✅
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="patient-card-info">
                      <div className="info-item">
                        <span className="info-icon">🧬</span>
                        <span className="info-text">{patient.raza || 'No breed'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">👤</span>
                        <span className="info-text">{patient.propietario}</span>
                      </div>
                      {patient.motivo && (
                        <div className="info-item full-width">
                          <span className="info-icon">📝</span>
                          <span className="info-text">{patient.motivo}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="patient-card-footer">
                      <span className={`status-badge-modern ${patient.estado?.toLowerCase().replace(/_/g, '-')}`}>
                        {t(`recepcion.status.${patient.estado}`, patient.estado?.replace(/_/g, ' '))}
                      </span>
                      {patient.prioridad && (
                        <span className={`priority-badge-modern ${patient.prioridad?.toLowerCase()}`}>
                          {patient.prioridad === 'ALTA' ? '🔴' : patient.prioridad === 'MEDIA' ? '🟠' : '🟢'} 
                          {' '}{patient.prioridad === 'ALTA' ? t('recepcion.triage.high', 'Alta') : 
                                patient.prioridad === 'MEDIA' ? t('recepcion.triage.medium', 'Media') : 
                                t('recepcion.triage.low', 'Baja')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
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
                          {patient.fotoUrl ? (
                            <img src={patient.fotoUrl} alt={patient.nombre} className="patient-avatar-photo-small" />
                          ) : (
                            patient.especie === 'Dog' ? '🐕' : '🐈'
                          )}
                        </div>
                        <div>
                          <h4>{patient.nombre}</h4>
                          <span className="patient-ficha">{patient.numeroFicha}</span>
                        </div>
                      </div>
                      <div className="patient-details-small">
                        <p><strong>{t('recepcion.patient.owner')}:</strong> {patient.propietario}</p>
                        <p><strong>{t('recepcion.patient.phone')}:</strong> {patient.telefono}</p>
                        <p><strong>{t('recepcion.patient.species')}:</strong> {patient.especie} - {patient.raza}</p>
                      </div>
                      <button 
                        className="btn-action success"
                        onClick={() => handleStartDischarge(patient)}
                      >
                        💰 {t('recepcion.discharge.processDischarge')}
                      </button>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="empty-state">
                <p>{t('recepcion.messages.noDischargeReady')}</p>
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
              <h2>📋 {t('recepcion.triage.title')} - {selectedPatient.nombre}</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>{t('recepcion.patient.owner')}:</strong> {selectedPatient.propietario}
              </div>
              <div className="info-row">
                <strong>{t('recepcion.patient.phone')}:</strong> {selectedPatient.telefono}
              </div>
              <div className="info-row">
                <strong>{t('recepcion.patient.species')}:</strong> {selectedPatient.especie} - {selectedPatient.raza}
              </div>
            </div>

            <form onSubmit={handleSubmitTriage} className="triage-form">
              <div className="form-section">
                <h3>1. {t('recepcion.triage.visitType')}</h3>
                <select 
                  value={triageData.tipoVisita}
                  onChange={(e) => setTriageData({...triageData, tipoVisita: e.target.value})}
                  required
                >
                  <option value="consulta_general">{t('recepcion.triage.consultationTypes.general')}</option>
                  <option value="seguimiento">{t('recepcion.triage.consultationTypes.followUp')}</option>
                  <option value="medicina_preventiva">{t('recepcion.triage.consultationTypes.preventive')}</option>
                  <option value="emergencia">{t('recepcion.triage.consultationTypes.emergency')}</option>
                </select>
              </div>

              <div className="form-section">
                <h3>2. {t('recepcion.triage.reason')}</h3>
                <textarea
                  value={triageData.motivo}
                  onChange={(e) => setTriageData({...triageData, motivo: e.target.value})}
                  placeholder={t('recepcion.triage.reason')}
                  rows="3"
                  required
                />
              </div>


              <div className="form-section">
                <h3>3. {t('recepcion.triage.priority')}</h3>
                <div className="priority-options">
                  <label className={triageData.prioridad === 'BAJA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="BAJA"
                      checked={triageData.prioridad === 'BAJA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#4caf50'}}>{t('recepcion.triage.low').toUpperCase()}</span>
                  </label>
                  <label className={triageData.prioridad === 'MEDIA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="MEDIA"
                      checked={triageData.prioridad === 'MEDIA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#ff9800'}}>{t('recepcion.triage.medium').toUpperCase()}</span>
                  </label>
                  <label className={triageData.prioridad === 'ALTA' ? 'selected' : ''}>
                    <input 
                      type="radio" 
                      name="prioridad" 
                      value="ALTA"
                      checked={triageData.prioridad === 'ALTA'}
                      onChange={(e) => setTriageData({...triageData, prioridad: e.target.value})}
                    />
                    <span style={{background: '#f44336'}}>{t('recepcion.triage.high').toUpperCase()}</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('recepcion.patient.weight')} (kg)</label>
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
                  <label>{t('recepcion.triage.temperature')}</label>
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
                    <strong>{t('recepcion.triage.firstVisit')}?</strong>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>4. {t('recepcion.triage.background')}</h3>
                <textarea
                  value={triageData.antecedentes}
                  onChange={(e) => setTriageData({...triageData, antecedentes: e.target.value})}
                  placeholder={t('recepcion.triage.background')}
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-close" onClick={() => setShowTriageModal(false)}>
                  {t('common.cancel')}
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
              <h2>💰 {t('recepcion.discharge.title')} - {selectedPatient.nombre}</h2>
            
            <div className="patient-info-modal">
              <div className="info-row">
                <strong>{t('recepcion.patient.owner')}:</strong> {selectedPatient.propietario}
              </div>
              <div className="info-row">
                <strong>{t('recepcion.patient.record')}:</strong> {selectedPatient.numeroFicha}
              </div>
            </div>

            <form onSubmit={handleSubmitDischarge} className="discharge-form">
              <div className="form-section">
                <h3>1. {t('recepcion.discharge.payment')}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('recepcion.discharge.total')} ($)</label>
                    <input
                      type="number"
                      value={dischargeData.total}
                      onChange={(e) => setDischargeData({...dischargeData, total: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('recepcion.discharge.paymentMethod')}</label>
                    <select
                      value={dischargeData.metodoPago}
                      onChange={(e) => setDischargeData({...dischargeData, metodoPago: e.target.value})}
                    >
                      <option value="efectivo">{t('recepcion.discharge.cash')}</option>
                      <option value="tarjeta">{t('recepcion.discharge.card')}</option>
                      <option value="transferencia">{t('recepcion.discharge.transfer')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>2. {t('recepcion.discharge.followUp')} ({t('common.optional')})</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('recepcion.appointments.date')}</label>
                    <input
                      type="date"
                      value={dischargeData.fechaSeguimiento}
                      onChange={(e) => setDischargeData({...dischargeData, fechaSeguimiento: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('recepcion.appointments.time')}</label>
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
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-success">
                  ✅ {t('recepcion.discharge.completeDischarge')}
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
              <h2>📄 {t('recepcion.expediente.title')} - {selectedPatient.nombre}</h2>
            <div className="patient-detail-info">
              <div className="detail-row">
                <strong>{t('recepcion.patient.name')}:</strong> {selectedPatient.nombre}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.species')}:</strong> {selectedPatient.especie}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.breed')}:</strong> {selectedPatient.raza}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.age')}:</strong> {selectedPatient.edad}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.weight')}:</strong> {selectedPatient.peso || t('common.notRegistered')}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.owner')}:</strong> {selectedPatient.propietario}
              </div>
              <div className="detail-row">
                <strong>{t('recepcion.patient.phone')}:</strong> {selectedPatient.telefono}
              </div>
              <div className="detail-row">
                <strong>{t('common.status')}:</strong> 
                <span className="status-badge" style={{background: getStatusColor(selectedPatient.estado), marginLeft: '0.5rem'}}>
                  {selectedPatient.estado.replace(/_/g, ' ')}
                </span>
              </div>
              {selectedPatient.motivo && (
                <div className="detail-row">
                  <strong>{t('recepcion.patient.reason')}:</strong> {selectedPatient.motivo}
                </div>
              )}
            </div>
            <button className="btn-close" onClick={() => setSelectedPatient(null)}>
              {t('common.close')}
            </button>
          </div>
            
        </div>
      )}

      {/* MODAL: EXPEDIENTE CLÍNICO */}
      {showExpedienteModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowExpedienteModal(false)}>
          <div className="modal-content large expediente-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 {t('recepcion.expediente.clinicalRecord')} - {selectedPatient.nombre}</h2>
              <button className="close-btn" onClick={() => setShowExpedienteModal(false)}>✕</button>
            </div>
            
            <div className="expediente-content">
              <div className="expediente-section">
                <h3>{t('recepcion.expediente.generalInfo')}</h3>
                <div className="info-grid">
                  <div><strong>{t('recepcion.patient.record')}:</strong> {selectedPatient.numeroFicha}</div>
                  <div><strong>{t('recepcion.patient.species')}:</strong> {selectedPatient.especie}</div>
                  <div><strong>{t('recepcion.patient.breed')}:</strong> {selectedPatient.raza}</div>
                  <div><strong>{t('recepcion.patient.age')}:</strong> {selectedPatient.edad}</div>
                  <div><strong>{t('recepcion.patient.sex')}:</strong> {selectedPatient.sexo || t('common.notSpecified')}</div>
                  <div><strong>{t('recepcion.patient.currentWeight')}:</strong> {selectedPatient.peso || t('common.notRegistered')}</div>
                </div>
              </div>

              <div className="expediente-section">
                <h3>{t('recepcion.patient.owner')}</h3>
                <div className="info-grid">
                  <div><strong>{t('recepcion.patient.name')}:</strong> {selectedPatient.propietario || historialData?.paciente?.owner?.nombre}</div>
                  <div><strong>{t('recepcion.patient.phone')}:</strong> {selectedPatient.telefono || historialData?.paciente?.owner?.telefono}</div>
                  <div><strong>{t('recepcion.patient.email')}:</strong> {selectedPatient.email || historialData?.paciente?.owner?.email || t('common.notRegistered')}</div>
                </div>
              </div>

              {selectedPatient.antecedentes && (
                <div className="expediente-section">
                  <h3>{t('recepcion.expediente.medicalHistory')}</h3>
                  <p className="expediente-text">{selectedPatient.antecedentes}</p>
                </div>
              )}

              {selectedPatient.alergias && selectedPatient.alergias.length > 0 && (
                <div className="expediente-section">
                  <h3>⚠️ {t('recepcion.expediente.allergies')}</h3>
                  <ul className="expediente-list">
                    {selectedPatient.alergias.map((alergia, idx) => (
                      <li key={idx} className="alert-item">{alergia}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CONSULTATION HISTORY FROM API */}
              <div className="expediente-section historial-section">
                <h3>📋 {t('recepcion.expediente.consultHistory')}</h3>
                
                {loadingHistorial ? (
                  <div className="loading-historial">
                    <div className="spinner"></div>
                    <p>{t('common.loading')}</p>
                  </div>
                ) : getFormattedHistorial().length === 0 ? (
                  <div className="empty-historial">
                    <span>📭</span>
                    <p>No consultations recorded for this patient</p>
                  </div>
                ) : (
                  <div className="consultas-timeline">
                    {getFormattedHistorial().map((item, idx) => (
                      <div key={idx} className={`consulta-card consulta-${item.tipo}`}>
                        <div className="consulta-header">
                          <div className="consulta-icon">
                            {item.tipo === 'consulta' && '🩺'}
                            {item.tipo === 'hospitalizacion' && '🏥'}
                            {item.tipo === 'cirugia' && '⚕️'}
                            {item.tipo === 'vacuna' && '💉'}
                          </div>
                          <div className="consulta-info">
                            <span className="consulta-tipo">
                              {item.tipo === 'consulta' && 'Consultation'}
                              {item.tipo === 'hospitalizacion' && 'Hospitalization'}
                              {item.tipo === 'cirugia' && 'Surgery'}
                              {item.tipo === 'vacuna' && `Vaccine: ${item.nombre}`}
                            </span>
                            <span className="consulta-fecha">
                              {new Date(item.timestamp).toLocaleDateString('en-US', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {item.doctor && <span className="consulta-doctor">👨‍⚕️ {item.doctor}</span>}
                        </div>
                        
                        {item.tipo === 'consulta' && (
                          <div className="consulta-detalles">
                            {/* SOAP Notes */}
                            {(item.soap?.subjetivo || item.soap?.objetivo || item.soap?.analisis || item.soap?.plan) && (
                              <div className="soap-section">
                                <h5>SOAP Notes</h5>
                                <div className="soap-grid">
                                  {item.soap.subjetivo && (
                                    <div className="soap-item">
                                      <span className="soap-label">S - Subjective:</span>
                                      <p>{item.soap.subjetivo}</p>
                                    </div>
                                  )}
                                  {item.soap.objetivo && (
                                    <div className="soap-item">
                                      <span className="soap-label">O - Objective:</span>
                                      <p>{item.soap.objetivo}</p>
                                    </div>
                                  )}
                                  {item.soap.analisis && (
                                    <div className="soap-item">
                                      <span className="soap-label">A - Assessment:</span>
                                      <p>{item.soap.analisis}</p>
                                    </div>
                                  )}
                                  {item.soap.plan && (
                                    <div className="soap-item">
                                      <span className="soap-label">P - Plan:</span>
                                      <p>{item.soap.plan}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Vital Signs */}
                            {item.signosVitales && (
                              <div className="vitales-section">
                                <h5>🌡️ Vital Signs</h5>
                                <div className="vitales-grid">
                                  {item.signosVitales.temperatura && <span>Temp: {item.signosVitales.temperatura}°C</span>}
                                  {item.signosVitales.frecuenciaCardiaca && <span>HR: {item.signosVitales.frecuenciaCardiaca} bpm</span>}
                                  {item.signosVitales.frecuenciaRespiratoria && <span>RR: {item.signosVitales.frecuenciaRespiratoria} rpm</span>}
                                  {item.signosVitales.peso && <span>Weight: {item.signosVitales.peso} kg</span>}
                                </div>
                              </div>
                            )}
                            
                            {/* Diagnoses */}
                            {item.diagnosticos && item.diagnosticos.length > 0 && (
                              <div className="diagnosticos-section">
                                <h5>🔍 Diagnoses</h5>
                                <ul>
                                  {item.diagnosticos.map((d, i) => (
                                    <li key={i}>
                                      <strong>{d.descripcion}</strong>
                                      {d.tipo && <span className="badge">{d.tipo}</span>}
                                      {d.severidad && <span className={`badge severity-${d.severidad.toLowerCase()}`}>{d.severidad}</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Prescriptions */}
                            {item.recetas && item.recetas.length > 0 && (
                              <div className="recetas-section">
                                <h5>💊 Prescribed Medications</h5>
                                {item.recetas.map((receta, ri) => (
                                  <ul key={ri}>
                                    {receta.items.map((med, mi) => (
                                      <li key={mi}>
                                        <strong>{med.medicamento}</strong> - {med.dosis}
                                        {med.frecuencia && <span> every {med.frecuencia}</span>}
                                        {med.duracion && <span> for {med.duracion}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                ))}
                              </div>
                            )}
                            
                            {/* Laboratory Tests */}
                            {item.laboratorios && item.laboratorios.length > 0 && (
                              <div className="labs-section">
                                <h5>🔬 Laboratory Tests</h5>
                                <ul>
                                  {item.laboratorios.map((lab, li) => (
                                    <li key={li}>
                                      <strong>{lab.tipo}</strong>
                                      <span className={`badge status-${lab.estado?.toLowerCase()}`}>{lab.estado}</span>
                                      {lab.resultados && <p className="resultados">{lab.resultados}</p>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {item.tipo === 'hospitalizacion' && (
                          <div className="consulta-detalles">
                            <p><strong>Reason:</strong> {item.motivo}</p>
                            {item.fechaAlta && <p><strong>Discharge:</strong> {new Date(item.fechaAlta).toLocaleDateString()}</p>}
                          </div>
                        )}
                        
                        {item.tipo === 'cirugia' && (
                          <div className="consulta-detalles">
                            <p><strong>Procedure:</strong> {item.procedimiento}</p>
                            <span className={`badge status-${item.status?.toLowerCase()}`}>{item.status}</span>
                          </div>
                        )}
                        
                        {item.tipo === 'vacuna' && (
                          <div className="consulta-detalles">
                            {item.lote && <p><strong>Batch:</strong> {item.lote}</p>}
                            {item.proximaDosis && <p><strong>Next dose:</strong> {new Date(item.proximaDosis).toLocaleDateString()}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button className="btn-close" onClick={() => setShowExpedienteModal(false)}>
              {t('recepcion.expediente.closeRecord')}
            </button>
          </div>
            
        </div>
      )}

      {/* MODAL: NUEVA CITA */}
      {showNewAppointmentModal && (
        <div className="modal-overlay" onClick={() => setShowNewAppointmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>📅 {t('recepcion.appointments.scheduleNew')}</h2>
            
            <form onSubmit={handleSubmitNewAppointment} className="appointment-form">
              <div className="form-section">
                <h3>{t('recepcion.appointments.patientInfo')}</h3>
                
                {/* Search by pet name */}
                <div className="form-group">
                  <label>🐾 Search pet by name, record or owner</label>
                  <div className="search-row" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="e.g., Max, Luna, Buddy..."
                      value={petSearchQuery}
                      onChange={(e) => handleSearchPets(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  
                  {/* Resultados de búsqueda de mascotas */}
                  {petSearchResults.length > 0 && (
                    <div className="search-results" style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginTop: '0.5rem'
                    }}>
                      {petSearchResults.map(pet => (
                        <div 
                          key={pet.id}
                          onClick={() => {
                            setNewAppointmentData({
                              ...newAppointmentData,
                              pacienteId: pet.id,
                              pacienteNombre: pet.nombre
                            });
                            setPetSearchQuery('');
                            setPetSearchResults([]);
                          }}
                          style={{
                            padding: '0.75rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="search-result-item"
                        >
                          <div>
                            <strong>{pet.nombre}</strong>
                            <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                              ({pet.especie} - {pet.raza || 'No breed'})
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            {pet.owner?.nombre || 'No owner'} • {pet.numeroFicha || 'No record'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {petSearchQuery.length >= 2 && petSearchResults.length === 0 && (
                    <div style={{ padding: '0.5rem', color: '#666', fontStyle: 'italic' }}>
                      No pets found with "{petSearchQuery}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', color: '#888' }}>
                  <div style={{ flex: 1, borderBottom: '1px solid #ddd' }}></div>
                  <span style={{ padding: '0 1rem' }}>or</span>
                  <div style={{ flex: 1, borderBottom: '1px solid #ddd' }}></div>
                </div>

                {/* Phone search */}
                <div className="form-group">
                  <label>📞 Search by owner phone</label>
                  <div className="search-row" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="tel"
                      placeholder="Enter phone..."
                      value={newAppointmentData.telefonoBusqueda || ''}
                      onChange={(e) => setNewAppointmentData({
                        ...newAppointmentData, 
                        telefonoBusqueda: e.target.value
                      })}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        if (newAppointmentData.telefonoBusqueda?.length >= 8) {
                          const result = await searchOwnerByPhone(newAppointmentData.telefonoBusqueda);
                          if (!result) {
                            alert('No client found with that phone number');
                          }
                        } else {
                          alert('Enter at least 8 digits');
                        }
                      }}
                    >
                      {t('common.search')}
                    </button>
                  </div>
                </div>

                {/* Show pets found by phone */}
                {foundOwner && ownerPets.length > 0 && (
                  <div className="form-group">
                    <label>Pets of {foundOwner.nombre}:</label>
                    <select
                      value={newAppointmentData.pacienteId || ''}
                      onChange={(e) => {
                        const pet = ownerPets.find(p => p.id === e.target.value);
                        setNewAppointmentData({
                          ...newAppointmentData,
                          pacienteId: e.target.value,
                          pacienteNombre: pet?.nombre || ''
                        });
                      }}
                      required
                    >
                      <option value="">-- Select pet --</option>
                      {ownerPets.map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.nombre} ({pet.especie} - {pet.raza})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newAppointmentData.pacienteNombre && (
                  <div className="selected-patient-info" style={{ 
                    padding: '0.75rem', 
                    background: '#e8f5e9', 
                    borderRadius: '4px',
                    marginTop: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>✅ Selected patient: <strong>{newAppointmentData.pacienteNombre}</strong></span>
                    <button 
                      type="button"
                      onClick={() => setNewAppointmentData({
                        ...newAppointmentData,
                        pacienteId: '',
                        pacienteNombre: ''
                      })}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: '#d32f2f'
                      }}
                    >
                      ✕ Change
                    </button>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>{t('recepcion.appointments.dateTime')}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('recepcion.appointments.date')} *</label>
                    <input
                      type="date"
                      value={newAppointmentData.fecha}
                      onChange={(e) => setNewAppointmentData({...newAppointmentData, fecha: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('recepcion.appointments.time')} *</label>
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
                <h3>{t('recepcion.appointments.appointmentDetails')}</h3>
                <div className="form-group">
                  <label>{t('recepcion.appointments.type')} *</label>
                  <select
                    value={newAppointmentData.tipo}
                    onChange={(e) => setNewAppointmentData({...newAppointmentData, tipo: e.target.value})}
                    required
                  >
                    <option value="CONSULTA_GENERAL">{t('recepcion.triage.general')}</option>
                    <option value="SEGUIMIENTO">{t('recepcion.triage.followUp')}</option>
                    <option value="VACUNACION">{t('recepcion.triage.vaccination')}</option>
                    <option value="CIRUGIA">{t('recepcion.triage.surgery')}</option>
                    <option value="EMERGENCIA">{t('recepcion.triage.emergency')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('recepcion.appointments.reason')} *</label>
                  <textarea
                    value={newAppointmentData.motivo}
                    onChange={(e) => setNewAppointmentData({...newAppointmentData, motivo: e.target.value})}
                    placeholder={t('recepcion.appointments.reasonPlaceholder')}
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
                    {' '}{t('recepcion.appointments.confirmImmediately')}
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowNewAppointmentModal(false);
                    clearFoundOwner?.();
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn-success"
                  disabled={!newAppointmentData.pacienteId}
                >
                  ✅ {t('recepcion.appointments.scheduleAppointment')}
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
            <h2>📅 {t('recepcion.preventive.calendar')}</h2>
            
            <div className="calendar-content">
              <div className="calendar-info">
                <p>{t('recepcion.preventive.patientsNeedingAttention')}</p>
              </div>

              <div className="preventive-calendar-grid">
                {preventiveCalendar.map(patient => (
                  <div key={patient.id} className="calendar-patient-card">
                    <div className="calendar-patient-header">
                      <div className="patient-avatar">
                        {patient.fotoUrl ? (
                          <img src={patient.fotoUrl} alt={patient.nombre} className="patient-avatar-photo-small" />
                        ) : (
                          patient.especie === 'Dog' ? '🐕' : '🐈'
                        )}
                      </div>
                      <div>
                        <h4>{patient.nombre}</h4>
                        <span className="text-small">{patient.propietario}</span>
                      </div>
                    </div>

                    <div className="calendar-patient-details">
                      <div className="detail-item">
                        <strong>{t('recepcion.patient.record')}:</strong> {patient.numeroFicha}
                      </div>
                      <div className="detail-item">
                        <strong>{t('recepcion.patient.phone')}:</strong> {patient.telefono}
                      </div>
                    </div>

                    <div className="pending-vaccines">
                      <h5>💉 {t('recepcion.preventive.pendingVaccines')}:</h5>
                      <ul>
                        {patient.vacunas && patient.vacunas
                          .filter(v => v.proximaDosis)
                          .map((vacuna, idx) => (
                            <li key={idx}>
                              <strong>{vacuna.nombre}</strong>
                              <br />
                              <span className="text-small">{t('recepcion.expediente.nextDose')}: {vacuna.proximaDosis}</span>
                            </li>
                          ))
                        }
                        {(!patient.vacunas || patient.vacunas.length === 0) && (
                          <li>{t('recepcion.preventive.initialVaccineSchedule')}</li>
                        )}
                      </ul>
                    </div>

                    <button className="btn-action">
                      📞 {t('recepcion.preventive.callToSchedule')}
                    </button>
                  </div>
                ))}

                {preventiveCalendar.length === 0 && (
                  <div className="empty-state">
                    <p>✅ {t('recepcion.preventive.noPendingPatients')}</p>
                  </div>
                )}
              </div>
            </div>

            <button className="btn-close" onClick={() => setShowCalendarModal(false)}>
              {t('recepcion.preventive.closeCalendar')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PET PHOTO */}
      {showEditPhotoModal && editingPet && (
        <div className="modal-overlay" onClick={() => !savingPhoto && setShowEditPhotoModal(false)}>
          <div className="modal-content modal-edit-photo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📷 Photo of {editingPet.nombre}</h3>
              <button 
                className="btn-close-modal" 
                onClick={() => setShowEditPhotoModal(false)}
                disabled={savingPhoto}
              >
                ✕
              </button>
            </div>

            <div className="modal-body edit-photo-body">
              <div className="photo-preview-container">
                {editPhotoPreview ? (
                  <img 
                    src={editPhotoPreview} 
                    alt={editingPet.nombre}
                    className="photo-preview-large"
                  />
                ) : (
                  <div className="photo-placeholder-large">
                    <span className="placeholder-emoji">
                      {editingPet.especie === 'Dog' ? '🐕' : editingPet.especie === 'Cat' ? '🐈' : '🐾'}
                    </span>
                    <p>No photo</p>
                  </div>
                )}
              </div>

              <div className="photo-upload-section">
                <label className="btn-upload-photo">
                  📷 Select Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    style={{ display: 'none' }}
                    disabled={savingPhoto}
                  />
                </label>
                <p className="photo-hint">JPG, PNG or GIF • Max 5MB</p>
              </div>
            </div>

            <div className="modal-footer">
              {editPhotoPreview && !editPhotoData && (
                <button 
                  className="btn-danger"
                  onClick={handleRemovePhoto}
                  disabled={savingPhoto}
                >
                  🗑️ Delete
                </button>
              )}
              <button 
                className="btn-secondary"
                onClick={() => setShowEditPhotoModal(false)}
                disabled={savingPhoto}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSavePhoto}
                disabled={savingPhoto || !editPhotoData}
              >
                {savingPhoto ? '⏳ Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecepcionDashboard;