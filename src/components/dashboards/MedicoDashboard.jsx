import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useMedico from '../../hooks/useMedico';
import farmaciaService from '../../services/farmacia.service';
import recepcionService from '../../services/recepcion.service';
import { laboratorioService, citaSeguimientoService } from '../../services/medico.service';
import ExamenFisico from '../medico/ExamenFisico';
import PreventiveMedicinePanel from '../medico/PreventiveMedicinePanel';
import './MedicoDashboard.css';

function MedicoDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Hook para operaciones con API real
  const {
    loading: apiLoading,
    error: apiError,
    resumen,
    waitingPatients,
    patientsInConsultation,
    patientsInStudies,
    todayAppointments,
    loadDashboardData,
    getPaciente,
    getHistorial,
    iniciarConsulta,
    actualizarConsulta,
    completarConsulta,
    agregarDiagnostico,
    guardarSignosVitales,
    crearReceta,
    crearOrdenLab,
    hospitalizarPaciente,
    clearError,
  } = useMedico();

  // State Management
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [showHospitalizationModal, setShowHospitalizationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPreventiveMedicine, setShowPreventiveMedicine] = useState(false); // Medicina Preventiva
  
  // Estado para formulario de cita de seguimiento
  const [followUpForm, setFollowUpForm] = useState({
    fecha: '',
    hora: '10:00',
    tipo: 'SEGUIMIENTO',
    motivo: ''
  });
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  
  // Estado para historial completo desde API
  const [historialData, setHistorialData] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Estado para Resultados de Laboratorio Completados
  const [labResults, setLabResults] = useState([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);
  const [showLabResultsPanel, setShowLabResultsPanel] = useState(false);
  const [selectedLabResult, setSelectedLabResult] = useState(null);
  const [showAgendarCitaModal, setShowAgendarCitaModal] = useState(false);
  const [showLabResultDetailModal, setShowLabResultDetailModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImage, setViewerImage] = useState({ src: '', name: '' });
  const [agendarCitaForm, setAgendarCitaForm] = useState({
    fecha: '',
    hora: '10:00',
    motivo: ''
  });
  const [savingCitaSeguimiento, setSavingCitaSeguimiento] = useState(false);

  // Estado para el examen físico estructurado
  const [examenFisicoData, setExamenFisicoData] = useState(null);

  const [vitalsForm, setVitalsForm] = useState({
    temperatura: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    presionArterial: '',
    peso: '',
    nivelConciencia: 'Alerta',
    escalaDolor: '0'
  });

  const [diagnosisForm, setDiagnosisForm] = useState({
    codigo: '',
    descripcion: '',
    tipo: 'PRESUNTIVO',
    severidad: 'MODERADO',
    notas: ''
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    medicamentos: [],
    instrucciones: '',
    duracion: ''
  });

  const [currentMedication, setCurrentMedication] = useState({
    medicationId: null,
    nombre: '',
    presentacion: '',
    concentracion: '',
    stockDisponible: 0,
    dosis: '',
    unidadDosis: 'mg',
    frecuencia: '',
    via: 'ORAL',
    duracion: '',
    cantidad: 1,
    type: 'USO_INMEDIATO' // USO_INMEDIATO = farmacia interna, RECETA_EXTERNA = receta para imprimir
  });

  // Prescription medication search states
  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationResults, setMedicationResults] = useState([]);
  const [searchingMedications, setSearchingMedications] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const medicationSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Common frequency and duration options
  const frequencyOptions = [
    { value: 'cada 8 horas', label: 'Cada 8 horas' },
    { value: 'cada 12 horas', label: 'Cada 12 horas' },
    { value: 'cada 24 horas', label: 'Cada 24 horas' },
    { value: '1 vez al día', label: '1 vez al día' },
    { value: '2 veces al día', label: '2 veces al día' },
    { value: '3 veces al día', label: '3 veces al día' },
    { value: 'cada 6 horas', label: 'Cada 6 horas' },
    { value: 'cada 4 horas', label: 'Cada 4 horas' },
    { value: 'dosis única', label: 'Dosis única' },
    { value: 'según necesidad', label: 'Según necesidad (PRN)' }
  ];

  const durationOptions = [
    { value: '3 días', label: '3 días' },
    { value: '5 días', label: '5 días' },
    { value: '7 días', label: '7 días' },
    { value: '10 días', label: '10 días' },
    { value: '14 días', label: '14 días' },
    { value: '21 días', label: '21 días' },
    { value: '30 días', label: '30 días' },
    { value: 'continuo', label: 'Continuo/Indefinido' },
    { value: 'dosis única', label: 'Dosis única' }
  ];

  const dosisUnitOptions = [
    { value: 'mg', label: 'mg' },
    { value: 'ml', label: 'ml' },
    { value: 'g', label: 'g' },
    { value: 'UI', label: 'UI' },
    { value: 'gotas', label: 'gotas' },
    { value: 'tabletas', label: 'tableta(s)' },
    { value: 'capsulas', label: 'cápsula(s)' },
    { value: 'aplicaciones', label: 'aplicación(es)' }
  ];

  // Helper para convertir tipo de estudio a label legible
  const tipoLabToLabel = (tipo) => {
    const labels = {
      HEMOGRAMA: 'Hemograma',
      QUIMICA_SANGUINEA: 'Química Sanguínea',
      URINALISIS: 'Urianálisis',
      RAYOS_X: 'Rayos X',
      ULTRASONIDO: 'Ultrasonido',
      ELECTROCARDIOGRAMA: 'Electrocardiograma',
      CITOLOGIA: 'Citología',
      BIOPSIA: 'Biopsia',
      COPROLOGIA: 'Coprología',
      PERFIL_TIROIDEO: 'Perfil Tiroideo',
    };
    return labels[tipo] || tipo;
  };

  // Helper para descargar archivos base64 o URL
  const downloadFile = (fileData, fileName) => {
    try {
      const link = document.createElement('a');
      if (fileData.startsWith('data:')) {
        // Es base64
        link.href = fileData;
        link.download = fileName || 'archivo';
      } else {
        // Es URL
        link.href = fileData;
        link.download = fileName || fileData.split('/').pop() || 'archivo';
        link.target = '_blank';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Helper para abrir imagen en visor
  const openImageViewer = (src, name) => {
    setViewerImage({ src, name });
    setShowImageViewer(true);
  };

  const [labOrderForm, setLabOrderForm] = useState({
    estudios: [],
    prioridad: 'NORMAL',
    indicaciones: ''
  });

  const [hospitalizationForm, setHospitalizationForm] = useState({
    type: '',
    motivo: '',
    ubicacion: '',
    frecuenciaMonitoreo: '4h',
    cuidadosEspeciales: '',
    estimacionDias: '',
    dietaInstrucciones: ''
  });

  // Derived state - Usando datos de la API
  const myPatients = patientsInConsultation || [];
  const inStudies = patientsInStudies || [];
  const hospitalized = []; // TODO: Agregar endpoint de hospitalizados
  const myTasks = []; // TODO: Agregar endpoint de tareas

  // Estados combinados de loading y error
  const loading = apiLoading || localLoading;
  const error = apiError || localError;

  // Auto-limpiar errores después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError?.();
        setLocalError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Cargar resultados de laboratorio
  const loadLabResults = useCallback(async () => {
    setLoadingLabResults(true);
    try {
      const results = await laboratorioService.getResultados();
      setLabResults(results || []);
    } catch (err) {
      console.error('Error cargando resultados de lab:', err);
      setLabResults([]);
    } finally {
      setLoadingLabResults(false);
    }
  }, []);

  // Cargar resultados al mostrar el panel
  useEffect(() => {
    if (showLabResultsPanel) {
      loadLabResults();
    }
  }, [showLabResultsPanel, loadLabResults]);

  // Agendar cita de seguimiento desde resultados de lab
  const handleAgendarCitaSeguimiento = async () => {
    if (!selectedLabResult || !agendarCitaForm.fecha || !agendarCitaForm.hora || !agendarCitaForm.motivo) {
      setLocalError('Completa todos los campos para agendar la cita');
      return;
    }

    setSavingCitaSeguimiento(true);
    try {
      await citaSeguimientoService.crear({
        petId: selectedLabResult.petId,
        labRequestId: selectedLabResult.id,
        motivo: agendarCitaForm.motivo,
        fecha: agendarCitaForm.fecha,
        hora: agendarCitaForm.hora,
        notas: `Seguimiento por resultado de ${tipoLabToLabel(selectedLabResult.type)}`
      });

      // Limpiar y cerrar
      setShowAgendarCitaModal(false);
      setSelectedLabResult(null);
      setAgendarCitaForm({ fecha: '', hora: '10:00', motivo: '' });
      loadLabResults(); // Recargar para ver actualización
    } catch (err) {
      console.error('Error agendando cita:', err);
      setLocalError('Error al agendar la cita: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingCitaSeguimiento(false);
    }
  };

  // Studies options (backend enums)
  const studiesOptions = [
    { id: 'HEMOGRAMA', name: t('medico.studies.hemograma', 'Complete Blood Count') },
    { id: 'QUIMICA_SANGUINEA', name: t('medico.studies.bioquimica', 'Blood Chemistry') },
    { id: 'URINALISIS', name: t('medico.studies.urinalisis', 'Urinalysis') },
    { id: 'COPROLOGIA', name: t('medico.studies.coprologico', 'Stool Analysis') },
    { id: 'RAYOS_X', name: t('medico.studies.radiografia', 'X-Ray') },
    { id: 'ULTRASONIDO', name: t('medico.studies.ecografia', 'Ultrasound') },
    { id: 'ELECTROCARDIOGRAMA', name: t('medico.studies.electrocardiograma', 'Electrocardiogram') },
    { id: 'PERFIL_TIROIDEO', name: t('medico.studies.tiroideo', 'Thyroid Panel') },
    { id: 'CITOLOGIA', name: t('medico.studies.citologia', 'Cytology') },
    { id: 'BIOPSIA', name: t('medico.studies.biopsia', 'Biopsy') }
  ];

  const commonMedications = [
    'Amoxicilina 500mg',
    'Carprofeno 75mg',
    'Metronidazol 250mg',
    'Prednisona 5mg',
    'Tramadol 50mg',
    'Meloxicam 7.5mg',
    'Omeprazol 20mg'
  ];

  // Medication search effect with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (medicationSearch.length < 2) {
      setMedicationResults([]);
      setShowMedicationDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingMedications(true);
      try {
        const results = await farmaciaService.getMedications({ search: medicationSearch });
        setMedicationResults(results);
        setShowMedicationDropdown(true);
      } catch (err) {
        console.error('[MedicoDashboard] Error searching medications:', err);
        setMedicationResults([]);
      } finally {
        setSearchingMedications(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [medicationSearch]);

  // Close medication dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (medicationSearchRef.current && !medicationSearchRef.current.contains(event.target)) {
        setShowMedicationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select medication from search results
  const handleSelectMedication = useCallback((medication) => {
    const stock = medication.currentStock ?? medication.stockActual ?? 0;
    setCurrentMedication(prev => ({
      ...prev,
      medicationId: medication.id,
      nombre: medication.name || medication.nombre,
      presentacion: medication.presentation || medication.presentacion || '',
      concentracion: medication.concentration || medication.concentracion || '',
      stockDisponible: stock,
      unidadDosis: medication.unit || 'mg'
    }));
    setMedicationSearch('');
    setShowMedicationDropdown(false);
    setMedicationResults([]);
  }, []);

  const handleSelectPatient = useCallback(async (patient) => {
    console.log('[handleSelectPatient] patient:', patient);
    setSelectedPatient(patient);
    setLocalError(null);
    
    // Si el paciente ya tiene una consulta activa (viene de patientsInConsultation), establecerla
    if (patient.consultationId) {
      console.log('[handleSelectPatient] Estableciendo activeConsultation con id:', patient.consultationId);
      setActiveConsultation({
        id: patient.consultationId,
        patientId: patient.id,
        visitId: patient.visitId,
        status: 'IN_PROGRESS'
      });
    } else {
      // Si no tiene consulta, limpiar activeConsultation
      setActiveConsultation(null);
    }
    
    // Cargar datos completos del paciente (incluye historial de visitas, consultas, etc.)
    if (patient.id) {
      try {
        const pacienteCompleto = await getPaciente(patient.id);
        console.log('[handleSelectPatient] Paciente completo cargado:', pacienteCompleto);
        if (pacienteCompleto) {
          // Fusionar datos básicos del paciente con los datos completos
          setSelectedPatient(prev => ({
            ...prev,
            ...pacienteCompleto,
            // Mantener datos de la visita actual
            visitId: patient.visitId,
            consultationId: patient.consultationId,
            estado: patient.estado || pacienteCompleto.estado
          }));
        }
      } catch (err) {
        console.error('[handleSelectPatient] Error cargando paciente:', err);
        // Error silencioso, usamos los datos que ya tenemos
      }
    }
  }, [getPaciente]);

  const handleStartConsultation = useCallback(async (patient) => {
    console.log('[handleStartConsultation] patient:', patient);
    if (!patient.visitId) {
      setLocalError(t('medico.errors.noVisitId', 'Patient does not have an active visit'));
      return;
    }
    
    // Si ya tiene una consulta activa, cargar datos existentes
    if (patient.consultationId) {
      console.log('[handleStartConsultation] Paciente ya tiene consulta, cargando datos existentes:', patient.consultationId);
      
      // Cargar datos completos de la consulta primero
      try {
        const { consultaService } = await import('../../services/medico.service');
        const consultaData = await consultaService.getById(patient.consultationId);
        
        setActiveConsultation({
          id: patient.consultationId,
          patientId: patient.id,
          visitId: patient.visitId,
          startTime: consultaData?.startTime || new Date().toISOString(),
          status: 'IN_PROGRESS'
        });
        setSelectedPatient(patient);
        
        if (consultaData?.physicalExam) {
          try {
            const examData = JSON.parse(consultaData.physicalExam);
            setExamenFisicoData(examData);
            console.log('[handleStartConsultation] Examen físico cargado:', examData);
          } catch (e) {
            console.error('Error parsing physicalExam:', e);
          }
        }
      } catch (err) {
        console.error('Error loading consultation data:', err);
        // Fallback: establecer consulta sin datos adicionales
        setActiveConsultation({
          id: patient.consultationId,
          patientId: patient.id,
          visitId: patient.visitId,
          startTime: new Date().toISOString(),
          status: 'IN_PROGRESS'
        });
        setSelectedPatient(patient);
      }
      return;
    }
    
    setLocalLoading(true);
    try {
      const consulta = await iniciarConsulta(patient.visitId, patient.id);
      console.log('[handleStartConsultation] consulta creada:', consulta);
      if (consulta) {
        setActiveConsultation({
          id: consulta.id,
          patientId: patient.id,
          visitId: patient.visitId,
          startTime: consulta.startTime,
          status: 'IN_PROGRESS'
        });
        console.log('[handleStartConsultation] activeConsultation establecido con id:', consulta.id);
        setSelectedPatient(patient);
        setExamenFisicoData(null); // Limpiar examen físico para nueva consulta
      }
    } catch (err) {
      console.error('[handleStartConsultation] Error:', err);
      setLocalError(err.message || t('medico.errors.startConsultation', 'Error starting consultation'));
    } finally {
      setLocalLoading(false);
    }
  }, [iniciarConsulta, t]);

  const handleEndConsultation = useCallback(async () => {
    if (!selectedPatient || !activeConsultation?.id) {
      setLocalError(t('medico.errors.noActiveConsultation', 'No active consultation'));
      return;
    }
    
    setLocalLoading(true);
    try {
      // Use existing consultation data or defaults
      const diagnosis = activeConsultation.diagnosis || activeConsultation.soapAssessment || 'Consulta completada';
      const soapPlan = activeConsultation.soapPlan || activeConsultation.treatment || 'Plan de tratamiento establecido';
      
      await completarConsulta(activeConsultation.id, {
        diagnosis,
        soapPlan,
      });
      
      setActiveConsultation(null);
      setSelectedPatient(null);
      setExamenFisicoData(null);
    } catch (err) {
      setLocalError(err.message || t('medico.errors.endConsultation', 'Error ending consultation'));
    } finally {
      setLocalLoading(false);
    }
  }, [selectedPatient, activeConsultation, completarConsulta, t]);

  // Handler for completing preventive medicine
  const handleCompletePreventiveMedicine = useCallback((result) => {
    console.log('[handleCompletePreventiveMedicine] result:', result);
    setShowPreventiveMedicine(false);
    setSelectedPatient(null);
    // Reload dashboard to reflect changes
    loadDashboardData();
  }, [loadDashboardData]);

  // Handler for cancelling preventive medicine
  const handleCancelPreventiveMedicine = useCallback(() => {
    setShowPreventiveMedicine(false);
    setSelectedPatient(null);
  }, []);

  // Handler for starting preventive medicine (when patient with MEDICINA_PREVENTIVA is selected)
  const handleStartPreventiveMedicine = useCallback((patient) => {
    console.log('[handleStartPreventiveMedicine] patient:', patient);
    setSelectedPatient(patient);
    setShowPreventiveMedicine(true);
    setActiveConsultation(null);
  }, []);

  const handleSaveVitals = useCallback(async () => {
    if (!activeConsultation) {
      setLocalError(t('medico.errors.noActiveConsultation', 'No active consultation'));
      return;
    }
    
    setLocalLoading(true);
    try {
      await guardarSignosVitales(activeConsultation.id, {
        temperatura: vitalsForm.temperatura ? parseFloat(vitalsForm.temperatura) : undefined,
        frecuenciaCardiaca: vitalsForm.frecuenciaCardiaca ? parseInt(vitalsForm.frecuenciaCardiaca) : undefined,
        frecuenciaRespiratoria: vitalsForm.frecuenciaRespiratoria ? parseInt(vitalsForm.frecuenciaRespiratoria) : undefined,
        presionArterial: vitalsForm.presionArterial || undefined,
        peso: vitalsForm.peso ? parseFloat(vitalsForm.peso) : undefined,
        escalaDolor: vitalsForm.escalaDolor ? parseInt(vitalsForm.escalaDolor) : undefined
      });
      
      setShowVitalsModal(false);
      setVitalsForm({
        temperatura: '',
        frecuenciaCardiaca: '',
        frecuenciaRespiratoria: '',
        presionArterial: '',
        peso: '',
        nivelConciencia: 'Alerta',
        escalaDolor: '0'
      });
    } catch (err) {
      setLocalError(err.message || t('medico.errors.saveVitals', 'Error saving vital signs'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, vitalsForm, guardarSignosVitales, t]);

  const handleAddDiagnosis = useCallback(async () => {
    if (!activeConsultation || !diagnosisForm.descripcion) {
      setLocalError(t('medico.errors.diagnosisRequired', 'Diagnosis description required'));
      return;
    }
    
    setLocalLoading(true);
    try {
      await agregarDiagnostico({
        consultationId: activeConsultation.id,
        codigoCIE10: diagnosisForm.codigo || undefined,
        descripcion: diagnosisForm.descripcion,
        tipo: diagnosisForm.tipo,
        severidad: diagnosisForm.severidad,
        observaciones: diagnosisForm.notas || undefined
      });
      
      setShowDiagnosisModal(false);
      setDiagnosisForm({
        codigo: '',
        descripcion: '',
        tipo: 'PRESUNTIVO',
        severidad: 'MODERADO',
        notas: ''
      });
    } catch (err) {
      setLocalError(err.message || t('medico.errors.addDiagnosis', 'Error adding diagnosis'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, diagnosisForm, agregarDiagnostico, t]);

  const handleAddMedication = useCallback(() => {
    if (!currentMedication.nombre || !currentMedication.dosis || !currentMedication.frecuencia) return;
    
    // Format dosis with unit
    const dosisCompleta = `${currentMedication.dosis} ${currentMedication.unidadDosis}`;
    
    setPrescriptionForm(prev => ({
      ...prev,
      medicamentos: [...prev.medicamentos, { 
        ...currentMedication, 
        dosis: dosisCompleta,
        id: Date.now() 
      }]
    }));
    
    setCurrentMedication({
      medicationId: null,
      nombre: '',
      presentacion: '',
      concentracion: '',
      stockDisponible: 0,
      dosis: '',
      unidadDosis: 'mg',
      frecuencia: '',
      via: 'ORAL',
      duracion: '',
      cantidad: 1,
      type: 'USO_INMEDIATO'
    });
  }, [currentMedication]);

  const handleRemoveMedication = useCallback((medicationId) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter(m => m.id !== medicationId)
    }));
  }, []);

  const handleCreatePrescription = useCallback(async () => {
    console.log('[handleCreatePrescription] activeConsultation:', activeConsultation);
    console.log('[handleCreatePrescription] prescriptionForm:', prescriptionForm);
    console.log('[handleCreatePrescription] selectedPatient:', selectedPatient);
    
    if (!activeConsultation || prescriptionForm.medicamentos.length === 0) {
      setLocalError(t('medico.errors.noMedications', 'Must add at least one medication'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No patient selected'));
      return;
    }
    
    setLocalLoading(true);
    try {
      console.log('[handleCreatePrescription] calling crearReceta with:', activeConsultation.id);
      await crearReceta(activeConsultation.id, {
        petId: selectedPatient.id,
        items: prescriptionForm.medicamentos.map(m => ({
          medicationId: m.medicationId || undefined,
          nombre: m.nombre,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          via: m.via,
          duracion: m.duracion || '7 días',
          cantidad: m.cantidad || 1,
          type: m.type || 'USO_INMEDIATO'
        })),
        instruccionesGenerales: prescriptionForm.instrucciones || undefined
      });
      
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicamentos: [], instrucciones: '', duracion: '' });
      
      // External prescriptions will be printed at reception during discharge
    } catch (err) {
      setLocalError(err.message || t('medico.errors.createPrescription', 'Error creating prescription'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, selectedPatient, prescriptionForm, crearReceta, t]);

  const handleToggleStudy = useCallback((studyId) => {
    setLabOrderForm(prev => ({
      ...prev,
      estudios: prev.estudios.includes(studyId)
        ? prev.estudios.filter(s => s !== studyId)
        : [...prev.estudios, studyId]
    }));
  }, []);

  const handleCreateLabOrder = useCallback(async () => {
    if (!activeConsultation || labOrderForm.estudios.length === 0) {
      setLocalError(t('medico.errors.noStudies', 'Must select at least one study'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No patient selected'));
      return;
    }
    
    setLocalLoading(true);
    try {
      // labOrderForm.estudios ya contiene los IDs del enum (HEMOGRAMA, QUIMICA_SANGUINEA, etc.)
      await crearOrdenLab(activeConsultation.id, {
        petId: selectedPatient.id,
        estudios: labOrderForm.estudios,
        prioridad: labOrderForm.prioridad,
        indicaciones: labOrderForm.indicaciones || null
      });
      
      setShowLabOrderModal(false);
      setLabOrderForm({ estudios: [], prioridad: 'NORMAL', indicaciones: '' });
    } catch (err) {
      setLocalError(err.message || t('medico.errors.createLabOrder', 'Error creating lab order'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, selectedPatient, labOrderForm, crearOrdenLab, t]);

  const handleCreateHospitalization = useCallback(async () => {
    if (!hospitalizationForm.type) {
      setLocalError('Selecciona el área de hospitalización');
      return;
    }
    if (!activeConsultation || !hospitalizationForm.motivo) {
      setLocalError(t('medico.errors.hospitalizationReasonRequired', 'Motivo de hospitalización requerido'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No patient selected'));
      return;
    }
    
    setLocalLoading(true);
    try {
      await hospitalizarPaciente(activeConsultation.id, {
        petId: selectedPatient.id,
        type: hospitalizationForm.type || 'GENERAL',
        motivo: hospitalizationForm.motivo,
        ubicacion: hospitalizationForm.ubicacion || undefined,
        frecuenciaMonitoreo: hospitalizationForm.frecuenciaMonitoreo,
        cuidadosEspeciales: [
          hospitalizationForm.cuidadosEspeciales,
          hospitalizationForm.dietaInstrucciones ? `DIETA: ${hospitalizationForm.dietaInstrucciones}` : ''
        ].filter(Boolean).join('\n') || null,
        estimacionDias: hospitalizationForm.estimacionDias ? parseInt(hospitalizationForm.estimacionDias) : null
      });
      
      setShowHospitalizationModal(false);
      setHospitalizationForm({
        type: '',
        motivo: '',
        ubicacion: '',
        frecuenciaMonitoreo: '4h',
        cuidadosEspeciales: '',
        estimacionDias: '',
        dietaInstrucciones: ''
      });
      setActiveConsultation(null);
      setSelectedPatient(null);
    } catch (err) {
      setLocalError(err.message || t('medico.errors.hospitalize', 'Error hospitalizing patient'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, selectedPatient, hospitalizationForm, hospitalizarPaciente, t]);

  // Función para abrir el modal de historial y cargar datos desde la API
  const handleOpenHistory = useCallback(async () => {
    if (!selectedPatient?.id) return;
    
    setLoadingHistorial(true);
    setShowHistoryModal(true);
    
    try {
      const data = await getHistorial(selectedPatient.id);
      console.log('[handleOpenHistory] Historial cargado:', data);
      setHistorialData(data);
    } catch (err) {
      console.error('[handleOpenHistory] Error:', err);
      setHistorialData(null);
    } finally {
      setLoadingHistorial(false);
    }
  }, [selectedPatient, getHistorial]);

  // Transformar historial de la API a formato para mostrar
  const getFormattedHistory = useCallback(() => {
    console.log('[getFormattedHistory] historialData:', historialData);
    console.log('[getFormattedHistory] historialData?.historial:', historialData?.historial);
    
    if (!historialData?.historial) return [];
    
    const history = [];
    const { consultas, cirugias, hospitalizaciones, vacunas, notas } = historialData.historial;
    console.log('[getFormattedHistory] consultas:', consultas?.length, 'vacunas:', vacunas?.length);
    
    // Agregar consultas con detalles completos
    if (consultas && Array.isArray(consultas)) {
      consultas.forEach(consulta => {
        const detalles = {
          examenFisico: null,
          diagnosticos: [],
          signosVitales: null,
          recetas: [],
          laboratorios: [],
          notas: consulta.notes || null
        };
        
        // Examen Físico
        if (consulta.physicalExam) {
          try {
            detalles.examenFisico = JSON.parse(consulta.physicalExam);
          } catch (e) {
            console.error('Error parsing physicalExam:', e);
            detalles.examenFisico = { raw: consulta.physicalExam };
          }
        }
        
        // Diagnósticos
        if (consulta.diagnosticos && consulta.diagnosticos.length > 0) {
          detalles.diagnosticos = consulta.diagnosticos.map(d => ({
            descripcion: d.descripcion,
            tipo: d.tipo,
            severidad: d.severidad,
            codigoCIE10: d.codigoCIE10
          }));
        }
        
        // Signos vitales
        if (consulta.signosVitales && consulta.signosVitales.length > 0) {
          const sv = consulta.signosVitales[0];
          detalles.signosVitales = {
            temperatura: sv.temperatura,
            frecuenciaCardiaca: sv.frecuenciaCardiaca,
            frecuenciaRespiratoria: sv.frecuenciaRespiratoria,
            presionSistolica: sv.presionSistolica,
            presionDiastolica: sv.presionDiastolica,
            peso: sv.peso,
            mucpilas: sv.mucpilas,
            hidratacion: sv.hidratacion,
            condicionCorporal: sv.condicionCorporal
          };
        }
        
        // Recetas/Prescripciones
        if (consulta.prescriptions && consulta.prescriptions.length > 0) {
          detalles.recetas = consulta.prescriptions.map(p => ({
            id: p.id,
            fecha: p.createdAt,
            items: p.items?.map(item => ({
              medicamento: item.medicationName || item.medication?.nombre,
              dosis: item.dosage,
              frecuencia: item.frequency,
              duracion: item.duration,
              via: item.route,
              cantidad: item.quantity,
              instrucciones: item.instructions
            })) || []
          }));
        }
        
        // Solicitudes de laboratorio
        if (consulta.labRequests && consulta.labRequests.length > 0) {
          detalles.laboratorios = consulta.labRequests.map(lab => ({
            id: lab.id,
            tipo: lab.type,
            prioridad: lab.urgency,
            estado: lab.status,
            notas: lab.notes,
            resultados: lab.results,
            archivos: lab.resultFiles,
            fechaSolicitud: lab.requestedAt,
            fechaResultado: lab.completedAt
          }));
        }
        
        history.push({
          timestamp: consulta.startTime,
          endTime: consulta.endTime,
          accion: `Consulta${consulta.status === 'COMPLETADA' ? ' Completada' : ''}`,
          tipo: 'consulta',
          status: consulta.status,
          detalles: detalles,
          doctor: consulta.doctor?.nombre || 'Doctor',
          duracion: consulta.duration ? `${consulta.duration} min` : null
        });
      });
    }
    
    // Add hospitalizations with details
    if (hospitalizaciones && Array.isArray(hospitalizaciones)) {
      hospitalizaciones.forEach(hosp => {
        history.push({
          timestamp: hosp.admittedAt,
          accion: `Hospitalization${hosp.status === 'ALTA' ? ' (Discharged)' : ''}`,
          tipo: 'hospitalizacion',
          status: hosp.status,
          detalles: {
            motivo: hosp.reason,
            ubicacion: hosp.location,
            frecuenciaMonitoreo: hosp.frecuenciaMonitoreo,
            cuidadosEspeciales: hosp.cuidadosEspeciales,
            dieta: hosp.dieta,
            diasEstimados: hosp.estimacionDias,
            fechaAlta: hosp.dischargedAt ? new Date(hosp.dischargedAt).toLocaleDateString() : null,
            notasAlta: hosp.dischargeNotes,
            monitoreos: hosp.monitorings?.map(m => ({
              fecha: m.recordedAt,
              temperatura: m.temperature,
              frecuenciaCardiaca: m.heartRate,
              frecuenciaRespiratoria: m.respiratoryRate,
              notas: m.notes,
              estado: m.status
            })) || []
          },
          doctor: hosp.admittedBy?.nombre || 'Doctor'
        });
      });
    }
    
    // Add surgeries
    if (cirugias && Array.isArray(cirugias)) {
      cirugias.forEach(surgery => {
        history.push({
          timestamp: surgery.scheduledDate,
          accion: `Surgery - ${surgery.type || surgery.procedureName || 'Procedure'}`,
          tipo: 'cirugia',
          status: surgery.status,
          detalles: {
            procedimiento: surgery.procedureName,
            tipo: surgery.type,
            notas: surgery.notes,
            notasPreOp: surgery.preOpNotes,
            notasPostOp: surgery.postOpNotes,
            anestesia: surgery.anesthesiaType,
            duracion: surgery.duration
          },
          doctor: surgery.surgeon?.nombre || 'Surgeon'
        });
      });
    }
    
    // Add vaccines
    if (vacunas && Array.isArray(vacunas)) {
      vacunas.forEach(vacuna => {
        history.push({
          timestamp: vacuna.fecha,
          accion: `Vaccine - ${vacuna.nombre || vacuna.tipo}`,
          tipo: 'vacuna',
          detalles: {
            nombre: vacuna.nombre,
            lote: vacuna.lote,
            proximaDosis: vacuna.proximaDosis
          }
        });
      });
    }
    
    // Ordenar por fecha descendente
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [historialData]);

  // El historial ahora viene del paciente seleccionado desde la API
  // Transformamos visits y consultations a formato de historial con detalles completos
  const getPatientHistory = useCallback((patientId) => {
    if (selectedPatient?.id !== patientId) {
      return [];
    }
    
    const history = [];
    
    // Agregar consultas con detalles completos
    if (selectedPatient.consultations && Array.isArray(selectedPatient.consultations)) {
      selectedPatient.consultations.forEach(consulta => {
        const detalles = {
          examenFisico: null,
          diagnosticos: [],
          signosVitales: null,
          recetas: [],
          laboratorios: [],
          notas: consulta.notes || null
        };
        
        // Examen Físico
        if (consulta.physicalExam) {
          try {
            detalles.examenFisico = JSON.parse(consulta.physicalExam);
          } catch (e) {
            console.error('Error parsing physicalExam:', e);
            detalles.examenFisico = { raw: consulta.physicalExam };
          }
        }
        
        // Diagnósticos
        if (consulta.diagnosticos && consulta.diagnosticos.length > 0) {
          detalles.diagnosticos = consulta.diagnosticos.map(d => ({
            descripcion: d.descripcion,
            tipo: d.tipo,
            severidad: d.severidad,
            codigoCIE10: d.codigoCIE10
          }));
        }
        
        // Signos vitales
        if (consulta.signosVitales && consulta.signosVitales.length > 0) {
          const sv = consulta.signosVitales[0];
          detalles.signosVitales = {
            temperatura: sv.temperatura,
            frecuenciaCardiaca: sv.frecuenciaCardiaca,
            frecuenciaRespiratoria: sv.frecuenciaRespiratoria,
            presionSistolica: sv.presionSistolica,
            presionDiastolica: sv.presionDiastolica,
            peso: sv.peso,
            mucpilas: sv.mucpilas,
            hidratacion: sv.hidratacion,
            condicionCorporal: sv.condicionCorporal
          };
        }
        
        // Recetas/Prescripciones
        if (consulta.prescriptions && consulta.prescriptions.length > 0) {
          detalles.recetas = consulta.prescriptions.map(p => ({
            id: p.id,
            fecha: p.createdAt,
            items: p.items?.map(item => ({
              medicamento: item.medicationName || item.medication?.nombre,
              dosis: item.dosage,
              frecuencia: item.frequency,
              duracion: item.duration,
              via: item.route,
              cantidad: item.quantity,
              instrucciones: item.instructions
            })) || []
          }));
        }
        
        // Solicitudes de laboratorio
        if (consulta.labRequests && consulta.labRequests.length > 0) {
          detalles.laboratorios = consulta.labRequests.map(lab => ({
            id: lab.id,
            tipo: lab.type,
            prioridad: lab.urgency,
            estado: lab.status,
            notas: lab.notes,
            resultados: lab.results,
            archivos: lab.resultFiles,
            fechaSolicitud: lab.requestedAt,
            fechaResultado: lab.completedAt
          }));
        }
        
        history.push({
          timestamp: consulta.startTime,
          endTime: consulta.endTime,
          accion: `Consultation${consulta.status === 'COMPLETADA' ? ' Completed' : ' in progress'}`,
          tipo: 'consulta',
          status: consulta.status,
          detalles: detalles,
          doctor: consulta.doctor?.nombre || 'Doctor',
          duracion: consulta.duration ? `${consulta.duration} min` : null
        });
      });
    }
    
    // Add visits without consultation
    if (selectedPatient.visits && Array.isArray(selectedPatient.visits)) {
      selectedPatient.visits.forEach(visit => {
        // Only add if no consultation (to avoid duplicates)
        if (!visit.consultation) {
          history.push({
            timestamp: visit.arrivalTime,
            accion: `Visit - ${visit.tipoVisita || 'Consultation'} (${visit.status})`,
            tipo: 'visita',
            detalles: { 
              motivo: visit.motivo,
              peso: visit.peso,
              temperatura: visit.temperatura,
              prioridad: visit.prioridad
            }
          });
        }
      });
    }
    
    // Add hospitalizations with details
    if (selectedPatient.hospitalizations && Array.isArray(selectedPatient.hospitalizations)) {
      selectedPatient.hospitalizations.forEach(hosp => {
        history.push({
          timestamp: hosp.admittedAt,
          accion: `Hospitalization${hosp.status === 'ALTA' ? ' (Discharged)' : ' (Active)'}`,
          tipo: 'hospitalizacion',
          status: hosp.status,
          detalles: {
            motivo: hosp.reason,
            ubicacion: hosp.location,
            frecuenciaMonitoreo: hosp.frecuenciaMonitoreo,
            cuidadosEspeciales: hosp.cuidadosEspeciales,
            dieta: hosp.dieta,
            diasEstimados: hosp.estimacionDias,
            fechaAlta: hosp.dischargedAt ? new Date(hosp.dischargedAt).toLocaleDateString() : null,
            notasAlta: hosp.dischargeNotes,
            monitoreos: hosp.monitorings?.map(m => ({
              fecha: m.recordedAt,
              temperatura: m.temperature,
              frecuenciaCardiaca: m.heartRate,
              frecuenciaRespiratoria: m.respiratoryRate,
              notas: m.notes,
              estado: m.status
            })) || []
          },
          doctor: hosp.admittedBy?.nombre || 'Doctor'
        });
      });
    }
    
    // Add surgeries
    if (selectedPatient.surgeries && Array.isArray(selectedPatient.surgeries)) {
      selectedPatient.surgeries.forEach(surgery => {
        history.push({
          timestamp: surgery.scheduledDate,
          accion: `Surgery - ${surgery.type || surgery.procedureName || 'Procedure'}`,
          tipo: 'cirugia',
          status: surgery.status,
          detalles: {
            procedimiento: surgery.procedureName,
            tipo: surgery.type,
            notas: surgery.notes,
            notasPreOp: surgery.preOpNotes,
            notasPostOp: surgery.postOpNotes,
            anestesia: surgery.anesthesiaType,
            duracion: surgery.duration
          },
          doctor: surgery.surgeon?.nombre || 'Surgeon'
        });
      });
    }
    
    // Sort by date descending
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [selectedPatient]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDIENTE': return 'warning';
      case 'CONFIRMADA': return 'success';
      case 'EN_CONSULTA': return '';
      case 'EN_ESPERA': return 'warning';
      case 'EN_ESTUDIOS': return 'warning';
      case 'HOSPITALIZADO': return 'urgent';
      case 'COMPLETADA': return 'success';
      default: return '';
    }
  };

  const getAppointmentStatusLabel = (status) => {
    const labels = {
      'PENDIENTE': t('medico.status.pending', 'Pending'),
      'CONFIRMADA': t('medico.status.confirmed', 'Confirmed'),
      'EN_CONSULTA': t('medico.status.inConsultation', 'In Consultation'),
      'COMPLETADA': t('medico.status.completed', 'Completed'),
      'NO_ASISTIO': t('medico.status.noShow', 'No Show'),
      'CANCELADA': t('medico.status.cancelled', 'Cancelled')
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="dashboard medico-dashboard">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard medico-dashboard three-panel-layout">
      {error && (
        <div className="error-notification">
          <span>{error}</span>
          <button onClick={() => { clearError?.(); setLocalError(null); }}>✕</button>
        </div>
      )}

      {/* LEFT PANEL - Today's Appointments */}
      <aside className="left-panel">
        <div className="panel-header">
          <h3>📅 {t('medico.todayAppointments', 'Citas de Hoy')}</h3>
          <span className="badge-count">{todayAppointments.length + waitingPatients.length + myPatients.length}</span>
        </div>

        <div className="appointments-list">
          {waitingPatients.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">⏳</span>
                {t('medico.waitingPatients', 'En Espera')}
                <span className="count">{waitingPatients.length}</span>
              </h4>
              {waitingPatients.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card waiting ${selectedPatient?.id === patient.id ? 'selected' : ''} ${patient.serviceType === 'MEDICINA_PREVENTIVA' ? 'preventive' : ''}`}
                  onClick={() => patient.serviceType === 'MEDICINA_PREVENTIVA' 
                    ? handleStartPreventiveMedicine(patient) 
                    : handleSelectPatient(patient)}
                >
                  <div className="appointment-time">{patient.horaRegistro || '--:--'}</div>
                  <div className="appointment-info">
                    <div className="patient-name">
                      {patient.fotoUrl ? (
                        <img src={patient.fotoUrl} alt={patient.nombre} className="pet-icon-photo" />
                      ) : (
                        <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      )}
                      {patient.nombre}
                      {patient.serviceType === 'MEDICINA_PREVENTIVA' && (
                        <span className="service-badge preventive">💉</span>
                      )}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                    <div className="appointment-reason">{patient.motivo}</div>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(patient.estado)}`}>{patient.estado}</span>
                </div>
              ))}
            </div>
          )}

          {myPatients.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">🏥</span>
                {t('medico.inConsultation', 'En Consulta')}
                <span className="count">{myPatients.length}</span>
              </h4>
              {myPatients.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card in-progress ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="appointment-time">{patient.horaConsulta || '--:--'}</div>
                  <div className="appointment-info">
                    <div className="patient-name">
                      {patient.fotoUrl ? (
                        <img src={patient.fotoUrl} alt={patient.nombre} className="pet-icon-photo" />
                      ) : (
                        <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      )}
                      {patient.nombre}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                    <div className="appointment-reason">{patient.motivo}</div>
                  </div>
                  <span className="status-badge active">{t('medico.active', 'Activo')}</span>
                </div>
              ))}
            </div>
          )}

          {todayAppointments.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">📋</span>
                {t('medico.scheduledAppointments', 'Programadas')}
                <span className="count">{todayAppointments.length}</span>
              </h4>
              {todayAppointments.map(cita => {
                // El paciente viene anidado en la cita desde la API
                const patient = cita.paciente;
                return (
                  <div 
                    key={cita.id}
                    className={`appointment-card scheduled ${selectedPatient?.id === patient?.id ? 'selected' : ''}`}
                    onClick={() => patient && handleSelectPatient({ ...patient, citaId: cita.id, motivo: cita.motivo })}
                  >
                    <div className="appointment-time">{cita.hora}</div>
                    <div className="appointment-info">
                      <div className="patient-name">
                        {patient?.fotoUrl ? (
                          <img src={patient.fotoUrl} alt={patient?.nombre || 'Paciente'} className="pet-icon-photo" />
                        ) : (
                          <span className="pet-icon">{patient?.especie === 'PERRO' ? '🐕' : '🐈'}</span>
                        )}
                        {patient?.nombre || 'Paciente'}
                      </div>
                      <div className="patient-details-small">{cita.tipo} • {patient?.propietario?.nombre || 'Owner'}</div>
                      <div className="appointment-reason">{cita.motivo}</div>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(cita.estado || 'PENDIENTE')}`}>
                      {getAppointmentStatusLabel(cita.estado || 'PENDIENTE')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {inStudies.length > 0 && (
            <div className="appointment-section">
              <h4 className="section-title">
                <span className="icon">🔬</span>
                {t('medico.inStudies', 'En Estudios')}
                <span className="count">{inStudies.length}</span>
              </h4>
              {inStudies.map(patient => (
                <div 
                  key={patient.id}
                  className={`appointment-card studies ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="appointment-info">
                    <div className="patient-name">
                      {patient.fotoUrl ? (
                        <img src={patient.fotoUrl} alt={patient.nombre} className="pet-icon-photo" />
                      ) : (
                        <span className="pet-icon">{patient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                      )}
                      {patient.nombre}
                    </div>
                    <div className="patient-details-small">{patient.raza} • {patient.propietario}</div>
                  </div>
                  <span className="status-badge warning">🔬 {t('medico.pendingResults', 'Pendiente')}</span>
                </div>
              ))}
            </div>
          )}

          {waitingPatients.length === 0 && myPatients.length === 0 && todayAppointments.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>{t('medico.noAppointments', 'No hay citas para hoy')}</p>
            </div>
          )}
        </div>

        {/* Botón para ver Resultados de Laboratorio */}
        <div className="lab-results-toggle">
          <button 
            className={`lab-results-btn ${showLabResultsPanel ? 'active' : ''}`}
            onClick={() => setShowLabResultsPanel(!showLabResultsPanel)}
          >
            <span className="icon">🧪</span>
            {t('medico.labResults', 'Resultados de Lab')}
            {labResults.length > 0 && <span className="badge-count">{labResults.length}</span>}
          </button>
        </div>

        {/* Panel de Resultados de Laboratorio */}
        {showLabResultsPanel && (
          <div className="lab-results-section">
            <div className="section-header">
              <h4>
                <span className="icon">🧪</span>
                {t('medico.completedLabResults', 'Resultados Completados')}
              </h4>
              <button className="refresh-btn" onClick={loadLabResults} disabled={loadingLabResults}>
                🔄
              </button>
            </div>

            {loadingLabResults ? (
              <div className="loading-state">
                <span className="spinner">⏳</span>
                <p>Cargando resultados...</p>
              </div>
            ) : labResults.length === 0 ? (
              <div className="empty-state small">
                <span className="empty-icon">📋</span>
                <p>No hay resultados de laboratorio pendientes de revisar</p>
              </div>
            ) : (
              <div className="lab-results-list">
                {labResults.map(result => (
                  <div key={result.id} className="lab-result-card">
                    <div className="lab-result-header">
                      <span className="lab-type-badge">{tipoLabToLabel(result.type)}</span>
                      <span className="lab-date">{new Date(result.completedAt || result.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="lab-result-info">
                      <div className="patient-row">
                        <span className="pet-icon">{result.pet?.especie === 'PERRO' ? '🐕' : '🐈'}</span>
                        <span className="patient-name">{result.pet?.nombre}</span>
                      </div>
                      <div className="owner-row">
                        <span className="owner-icon">👤</span>
                        <span className="owner-name">{result.pet?.owner?.nombre}</span>
                        {result.pet?.owner?.telefono && (
                          <span className="owner-phone">📱 {result.pet.owner.telefono}</span>
                        )}
                      </div>
                      {result.resultNotes && (
                        <div className="result-notes">
                          <strong>Resultado:</strong> {result.resultNotes.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                    <div className="lab-result-actions">
                      <button 
                        className="btn-view-result"
                        onClick={() => {
                          setSelectedLabResult(result);
                          setShowLabResultDetailModal(true);
                        }}
                      >
                        👁️ Ver
                      </button>
                      <button 
                        className="btn-schedule-followup"
                        onClick={() => {
                          setSelectedLabResult(result);
                          setAgendarCitaForm({
                            fecha: '',
                            hora: '10:00',
                            motivo: `Seguimiento por resultado de ${tipoLabToLabel(result.type)}`
                          });
                          setShowAgendarCitaModal(true);
                        }}
                      >
                        📅 Agendar Cita
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* CENTER PANEL - Active Consultation Workspace */}
      <main className="center-panel">
        <div className="panel-header">
          <h2>
            {showPreventiveMedicine
              ? `💉 ${t('medico.preventiveMedicine', 'Medicina Preventiva')}`
              : activeConsultation 
                ? `🏥 ${t('medico.activeConsultation', 'Consulta Activa')}`
                : `👨‍⚕️ ${t('medico.consultationWorkspace', 'Consultation Area')}`
            }
          </h2>
          <p>{t('medico.doctor', 'Dr.')} {user?.nombre} - {user?.especialidad || t('medico.generalPractice', 'Medicina General')}</p>
        </div>

        {/* PREVENTIVE MEDICINE PANEL */}
        {showPreventiveMedicine && selectedPatient && (
          <PreventiveMedicinePanel
            patient={selectedPatient}
            visit={{ id: selectedPatient.visitId, serviceType: selectedPatient.serviceType }}
            onComplete={handleCompletePreventiveMedicine}
            onCancel={handleCancelPreventiveMedicine}
          />
        )}

        {!showPreventiveMedicine && !selectedPatient && !activeConsultation && (
          <div className="consultation-empty">
            <div className="empty-consultation-content">
              <span className="empty-icon-large">👨‍⚕️</span>
              <h3>{t('medico.selectPatient', 'Select a patient')}</h3>
              <p>{t('medico.selectPatientDesc', 'Select a patient from the left panel to start a consultation')}</p>
            </div>
            
            <div className="consultation-stats">
              <div className="stat-item">
                <span className="stat-value">{waitingPatients.length}</span>
                <span className="stat-label">{t('medico.waiting', 'En Espera')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{myPatients.length}</span>
                <span className="stat-label">{t('medico.inProgress', 'En Progreso')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{hospitalized.length}</span>
                <span className="stat-label">{t('medico.hospitalized', 'Hospitalizados')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{myTasks.length}</span>
                <span className="stat-label">{t('medico.pendingTasks', 'Tareas')}</span>
              </div>
            </div>
          </div>
        )}

        {!showPreventiveMedicine && selectedPatient && !activeConsultation && (
          <div className="consultation-preview">
            <div className="preview-header">
              {selectedPatient.fotoUrl ? (
                <img src={selectedPatient.fotoUrl} alt={selectedPatient.nombre} className="patient-avatar-photo-large" />
              ) : (
                <div className="patient-avatar-large">{selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}</div>
              )}
              <div className="patient-main-info">
                <h3>{selectedPatient.nombre}</h3>
                <p>{selectedPatient.raza} • {selectedPatient.edad} • {selectedPatient.sexo}</p>
                <span className="ficha-badge">{selectedPatient.numeroFicha}</span>
              </div>
            </div>
            
            {/* Section: Current Visit */}
            <div className="info-section">
              <h4 className="section-label">🏥 Current Visit</h4>
              <div className="preview-details-grid">
                <div className="detail-card highlight">
                  <span className="detail-icon">📝</span>
                  <div className="detail-content">
                    <span className="detail-label">Reason for Visit</span>
                    <span className="detail-value">{selectedPatient.motivo || 'Not specified'}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🎯</span>
                  <div className="detail-content">
                    <span className="detail-label">Priority</span>
                    <span className={`priority-badge ${selectedPatient.prioridad?.toLowerCase() || 'media'}`}>
                      {selectedPatient.prioridad || 'MEDIA'}
                    </span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">⚖️</span>
                  <div className="detail-content">
                    <span className="detail-label">Current Weight</span>
                    <span className="detail-value">{selectedPatient.peso ? `${selectedPatient.peso} kg` : 'Not recorded'}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🌡️</span>
                  <div className="detail-content">
                    <span className="detail-label">Temperature</span>
                    <span className="detail-value">{selectedPatient.temperatura ? `${selectedPatient.temperatura}°C` : 'Not recorded'}</span>
                  </div>
                </div>
                {selectedPatient.antecedentes && (
                  <div className="detail-card full-width">
                    <span className="detail-icon">📋</span>
                    <div className="detail-content">
                      <span className="detail-label">Antecedentes (Triage)</span>
                      <span className="detail-value">{selectedPatient.antecedentes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Patient Data */}
            <div className="info-section">
              <h4 className="section-label">🐾 Patient Data</h4>
              <div className="preview-details-grid three-cols">
                <div className="detail-card compact">
                  <span className="detail-icon-small">🏷️</span>
                  <div className="detail-content">
                    <span className="detail-label">Species</span>
                    <span className="detail-value">{selectedPatient.especie}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">🐕</span>
                  <div className="detail-content">
                    <span className="detail-label">Breed</span>
                    <span className="detail-value">{selectedPatient.raza || 'Not specified'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">📅</span>
                  <div className="detail-content">
                    <span className="detail-label">Age</span>
                    <span className="detail-value">{selectedPatient.edad || 'Not recorded'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">⚧</span>
                  <div className="detail-content">
                    <span className="detail-label">Sex</span>
                    <span className="detail-value">{selectedPatient.sexo}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">🎨</span>
                  <div className="detail-content">
                    <span className="detail-label">Color</span>
                    <span className="detail-value">{selectedPatient.color || 'Not specified'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">💉</span>
                  <div className="detail-content">
                    <span className="detail-label">Spayed/Neutered</span>
                    <span className="detail-value">{selectedPatient.esterilizado ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Owner */}
            <div className="info-section">
              <h4 className="section-label">👤 Owner</h4>
              <div className="preview-details-grid">
                <div className="detail-card">
                  <span className="detail-icon">👤</span>
                  <div className="detail-content">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{selectedPatient.propietario}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">📱</span>
                  <div className="detail-content">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value clickable">{selectedPatient.telefono || 'Not registered'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes/History if exists */}
            {selectedPatient.antecedentes && (
              <div className="info-section">
                <h4 className="section-label">📋 Background</h4>
                <div className="notes-box">
                  {selectedPatient.antecedentes}
                </div>
              </div>
            )}

            <div className="preview-actions">
              <button className="btn-start-consultation" onClick={() => handleStartConsultation(selectedPatient)}>
                🏥 {t('medico.startConsultation', 'Iniciar Consulta')}
              </button>
              <button className="btn-view-history" onClick={handleOpenHistory}>
                📋 {t('medico.viewHistory', 'Ver Historial')}
              </button>
            </div>
          </div>
        )}

        {!showPreventiveMedicine && selectedPatient && activeConsultation && (
          <div className="consultation-active">
            <div className="consultation-header">
              <div className="patient-summary">
                {selectedPatient.fotoUrl ? (
                  <img src={selectedPatient.fotoUrl} alt={selectedPatient.nombre} className="pet-avatar-photo" />
                ) : (
                  <span className="pet-avatar">{selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                )}
                <div>
                  <h3>{selectedPatient.nombre}</h3>
                  <p>{selectedPatient.raza} • {selectedPatient.propietario}</p>
                </div>
              </div>
              <div className="consultation-timer">
                <span className="timer-label">{t('medico.consultationTime', 'Tiempo')}</span>
                <span className="timer-value">
                  {activeConsultation.startTime 
                    ? new Date(activeConsultation.startTime).toLocaleTimeString() 
                    : '--:--'}
                </span>
              </div>
            </div>

            {/* Examen Físico Estructurado */}
            <div className="examen-fisico-container">
              <ExamenFisico
                consultationId={activeConsultation?.id}
                initialData={examenFisicoData}
                triageData={{
                  peso: selectedPatient?.peso,
                  temperatura: selectedPatient?.temperatura
                }}
                loading={localLoading}
                onSave={async (examData) => {
                  setLocalLoading(true);
                  try {
                    // Guardar el examen físico en el campo physicalExam como JSON
                    await actualizarConsulta(activeConsultation.id, {
                      physicalExam: JSON.stringify(examData),
                      // También extraer signos vitales del examen general para campos individuales
                      ...(examData.general?.temperatura && { vitalTemperature: parseFloat(examData.general.temperatura) }),
                      ...(examData.general?.frecuenciaCardiaca && { vitalHeartRate: parseInt(examData.general.frecuenciaCardiaca) }),
                      ...(examData.general?.frecuenciaRespiratoria && { vitalRespiratoryRate: parseInt(examData.general.frecuenciaRespiratoria) }),
                      ...(examData.general?.peso && { vitalWeight: parseFloat(examData.general.peso) }),
                      ...(examData.general?.hidratacion && { vitalHydration: examData.general.hidratacion }),
                    });
                    setExamenFisicoData(examData);
                  } catch (err) {
                    setLocalError(err.message || 'Error guardando examen físico');
                  } finally {
                    setLocalLoading(false);
                  }
                }}
              />
            </div>

            <div className="quick-actions">
              <button className="action-btn vitals" onClick={() => {
                // Pre-cargar datos del triage si existen
                setVitalsForm(prev => ({
                  ...prev,
                  peso: selectedPatient?.peso || prev.peso,
                  temperatura: selectedPatient?.temperatura || prev.temperatura,
                }));
                setShowVitalsModal(true);
              }}>
                🌡️ {t('medico.recordVitals', 'Signos Vitales')}
              </button>
              <button className="action-btn diagnosis" onClick={() => setShowDiagnosisModal(true)}>
                🔍 {t('medico.addDiagnosis', 'Diagnosis')}
              </button>
              <button className="action-btn prescription" onClick={() => setShowPrescriptionModal(true)}>
                💊 {t('medico.createPrescription', 'Receta')}
              </button>
              <button className="action-btn lab" onClick={() => setShowLabOrderModal(true)}>
                🔬 {t('medico.orderLabs', 'Laboratorio')}
              </button>
              <button className="action-btn hospital" onClick={() => setShowHospitalizationModal(true)}>
                🏥 {t('medico.hospitalize', 'Hospitalizar')}
              </button>
              <button className="action-btn followup" onClick={() => {
                // Pre-llenar el motivo con info del diagnóstico si existe
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 7); // Default: 1 week from now
                setFollowUpForm({
                  fecha: tomorrow.toISOString().split('T')[0],
                  hora: '10:00',
                  tipo: 'SEGUIMIENTO',
                  motivo: `Seguimiento de consulta - ${selectedPatient?.nombre || 'Paciente'}`
                });
                setShowFollowUpModal(true);
              }}>
                📅 {t('medico.scheduleFollowUp', 'Agendar Seguimiento')}
              </button>
            </div>

            <div className="consultation-footer">
              <button className="btn-secondary" onClick={() => { setActiveConsultation(null); setSelectedPatient(null); }}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button className="btn-end-consultation" onClick={handleEndConsultation}>
                ✅ {t('medico.endConsultation', 'End Consultation')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL - Patient Information */}
      <aside className="right-panel">
        <div className="panel-header">
          <h3>📋 {t('medico.patientInfo', 'Patient Information')}</h3>
        </div>

        {!selectedPatient ? (
          <div className="patient-info-empty">
            <span className="empty-icon">🐾</span>
            <p>{t('medico.noPatientSelected', 'Select a patient to view their information')}</p>
          </div>
        ) : (
          <div className="patient-info-content">
            <div className="info-card">
              <h4>{t('medico.patientDetails', 'Patient Details')}</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('medico.species', 'Species')}</span>
                  <span className="info-value">{selectedPatient.especie}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.breed', 'Breed')}</span>
                  <span className="info-value">{selectedPatient.raza}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.age', 'Age')}</span>
                  <span className="info-value">{selectedPatient.edad}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.sex', 'Sex')}</span>
                  <span className="info-value">{selectedPatient.sexo}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.weight', 'Weight')}</span>
                  <span className="info-value">{selectedPatient.peso}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.fileNumber', 'File #')}</span>
                  <span className="info-value ficha">{selectedPatient.numeroFicha}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.ownerDetails', 'Owner Details')}</h4>
              <div className="owner-info">
                <p className="owner-name">{selectedPatient.propietario}</p>
                <a href={`tel:${selectedPatient.telefono}`} className="owner-phone">📞 {selectedPatient.telefono}</a>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.currentVisit', 'Current Visit')}</h4>
              <div className="visit-info">
                <div className="visit-item">
                  <span className="visit-label">{t('medico.reason', 'Reason')}</span>
                  <span className="visit-value">{selectedPatient.motivo || '-'}</span>
                </div>
                <div className="visit-item">
                  <span className="visit-label">{t('medico.priority', 'Priority')}</span>
                  <span className={`priority-badge ${selectedPatient.prioridad?.toLowerCase() || 'normal'}`}>
                    {selectedPatient.prioridad || 'Normal'}
                  </span>
                </div>
                {selectedPatient.antecedentes && (
                  <div className="visit-item full">
                    <span className="visit-label">{t('medico.history', 'History')}</span>
                    <span className="visit-value">{selectedPatient.antecedentes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card actions">
              <h4>{t('medico.quickActions', 'Quick Actions')}</h4>
              <div className="quick-action-buttons">
                <button className="quick-action-btn" onClick={handleOpenHistory}>
                  📋 {t('medico.viewFullHistory', 'View Full History')}
                </button>
                {selectedPatient.estado === 'HOSPITALIZADO' && (
                  <button className="quick-action-btn" onClick={() => {
                    setVitalsForm(prev => ({
                      ...prev,
                      peso: selectedPatient?.peso || prev.peso,
                      temperatura: selectedPatient?.temperatura || prev.temperatura,
                    }));
                    setShowVitalsModal(true);
                  }}>
                    📝 {t('medico.recordMonitoring', 'Record Monitoring')}
                  </button>
                )}
                {!activeConsultation && selectedPatient.estado !== 'HOSPITALIZADO' && (
                  <button className="quick-action-btn primary" onClick={() => handleStartConsultation(selectedPatient)}>
                    🏥 {t('medico.startConsultation', 'Start Consultation')}
                  </button>
                )}
              </div>
            </div>

            <div className="info-card history">
              <h4>{t('medico.recentHistory', 'Historial Reciente')}</h4>
              <div className="history-timeline-small">
                {getPatientHistory(selectedPatient.id).slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="history-item-small">
                    <span className="history-time">{new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span className="history-action">{entry.accion}</span>
                  </div>
                ))}
                {getPatientHistory(selectedPatient.id).length === 0 && (
                  <p className="no-history">{t('medico.noRecentHistory', 'No recent history')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Vitals Modal */}
      {showVitalsModal && (
        <div className="modal-overlay" onClick={() => setShowVitalsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🌡️ {t('medico.recordVitalSigns', 'Record Vital Signs')}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>🌡️ {t('medico.temperature', 'Temperature')} (°C)</label>
                <input type="number" step="0.1" className="form-control" placeholder="38.5" value={vitalsForm.temperatura} onChange={(e) => setVitalsForm(prev => ({ ...prev, temperatura: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>❤️ {t('medico.heartRate', 'Heart Rate')} (bpm)</label>
                <input type="number" className="form-control" placeholder="80" value={vitalsForm.frecuenciaCardiaca} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaCardiaca: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🫁 {t('medico.respiratoryRate', 'Respiratory Rate')} (rpm)</label>
                <input type="number" className="form-control" placeholder="20" value={vitalsForm.frecuenciaRespiratoria} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaRespiratoria: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🩺 {t('medico.bloodPressure', 'Blood Pressure')} (mmHg)</label>
                <input type="text" className="form-control" placeholder="120/80" value={vitalsForm.presionArterial} onChange={(e) => setVitalsForm(prev => ({ ...prev, presionArterial: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>⚖️ {t('medico.weight', 'Weight')} (kg)</label>
                <input type="number" step="0.1" className="form-control" placeholder="15.5" value={vitalsForm.peso} onChange={(e) => setVitalsForm(prev => ({ ...prev, peso: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🧠 {t('medico.consciousnessLevel', 'Consciousness Level')}</label>
                <select className="form-control" value={vitalsForm.nivelConciencia} onChange={(e) => setVitalsForm(prev => ({ ...prev, nivelConciencia: e.target.value }))}>
                  <option value="Alerta">Alert</option>
                  <option value="Somnoliento">Drowsy</option>
                  <option value="Desorientado">Disoriented</option>
                  <option value="Estuporoso">Stuporous</option>
                  <option value="Inconsciente">Unconscious</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>😣 {t('medico.painScale', 'Pain Scale')} (0-10)</label>
                <input type="range" min="0" max="10" className="pain-scale-input" value={vitalsForm.escalaDolor} onChange={(e) => setVitalsForm(prev => ({ ...prev, escalaDolor: e.target.value }))} />
                <span className="pain-value">{vitalsForm.escalaDolor}/10</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowVitalsModal(false)}>{t('common.cancel', 'Cancel')}</button>
              <button className="btn-primary" onClick={handleSaveVitals} disabled={!vitalsForm.temperatura || !vitalsForm.frecuenciaCardiaca}>{t('common.save', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔍 {t('medico.addDiagnosis', 'Add Diagnosis')}</h2>
            <div className="form-group">
              <label>{t('medico.diagnosisCode', 'Code (ICD-10)')}</label>
              <input type="text" className="form-control" placeholder="e.g: J06.9" value={diagnosisForm.codigo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, codigo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>{t('medico.diagnosisDescription', 'Description')} *</label>
              <textarea className="form-control" placeholder={t('medico.diagnosisDescPlaceholder', 'Describe the diagnosis...')} rows="3" value={diagnosisForm.descripcion} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.diagnosisType', 'Type')}</label>
                <select className="form-control" value={diagnosisForm.tipo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, tipo: e.target.value }))}>
                  <option value="PRESUNTIVO">{t('medico.presumptive', 'Presumptive')}</option>
                  <option value="DEFINITIVO">{t('medico.definitive', 'Definitive')}</option>
                  <option value="DIFERENCIAL">{t('medico.differential', 'Differential')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.severity', 'Severity')}</label>
                <select className="form-control" value={diagnosisForm.severidad} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, severidad: e.target.value }))}>
                  <option value="LEVE">{t('medico.mild', 'Mild')}</option>
                  <option value="MODERADO">{t('medico.moderate', 'Moderate')}</option>
                  <option value="SEVERO">{t('medico.severe', 'Severe')}</option>
                  <option value="CRITICO">{t('medico.critical', 'Critical')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.additionalNotes', 'Additional Notes')}</label>
              <textarea className="form-control" placeholder={t('medico.additionalNotesPlaceholder', 'Additional observations...')} rows="2" value={diagnosisForm.notas} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, notas: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDiagnosisModal(false)}>{t('common.cancel', 'Cancel')}</button>
              <button className="btn-primary" onClick={handleAddDiagnosis} disabled={!diagnosisForm.descripcion}>{t('medico.addDiagnosis', 'Add Diagnosis')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="modal-content large prescription-modal" onClick={e => e.stopPropagation()}>
            <h2>💊 {t('medico.createPrescription', 'Create Prescription')}</h2>
            
            {/* Medication Search */}
            <div className="medication-search-section">
              <label>{t('medico.searchMedication', 'Search medication in inventory')}</label>
              <div className="medication-search-container" ref={medicationSearchRef}>
                <div className="search-input-wrapper">
                  <input 
                    type="text" 
                    className="form-control search-medication-input" 
                    placeholder={t('medico.searchMedicationPlaceholder', 'Type to search medications...')} 
                    value={currentMedication.nombre || medicationSearch}
                    onChange={(e) => {
                      if (currentMedication.medicationId) {
                        // Clear selected medication and start new search
                        setCurrentMedication(prev => ({
                          ...prev,
                          medicationId: null,
                          nombre: '',
                          presentacion: '',
                          concentracion: '',
                          stockDisponible: 0
                        }));
                      }
                      setMedicationSearch(e.target.value);
                    }}
                  />
                  {searchingMedications && <span className="search-spinner">⏳</span>}
                  {currentMedication.medicationId && (
                    <button 
                      className="clear-selection-btn" 
                      onClick={() => {
                        setCurrentMedication(prev => ({
                          ...prev,
                          medicationId: null,
                          nombre: '',
                          presentacion: '',
                          concentracion: '',
                          stockDisponible: 0
                        }));
                        setMedicationSearch('');
                      }}
                    >✕</button>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showMedicationDropdown && medicationResults.length > 0 && (
                  <div className="medication-search-dropdown">
                    {medicationResults.map(med => {
                      const stock = med.currentStock ?? med.stockActual ?? 0;
                      return (
                        <div 
                          key={med.id} 
                          className={`medication-search-item ${stock === 0 ? 'out-of-stock' : ''}`}
                          onClick={() => stock > 0 && handleSelectMedication(med)}
                        >
                          <div className="med-search-info">
                            <strong>{med.name || med.nombre}</strong>
                            <span className="med-details">
                              {med.presentation || med.presentacion} {(med.concentration || med.concentracion) && `- ${med.concentration || med.concentracion}`}
                            </span>
                          </div>
                          <div className="med-stock-badge">
                            <span className={`stock-indicator ${stock > 10 ? 'high' : stock > 0 ? 'low' : 'empty'}`}>
                              {stock > 0 ? `${stock} disponibles` : 'Sin stock'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {showMedicationDropdown && medicationResults.length === 0 && medicationSearch.length >= 2 && !searchingMedications && (
                  <div className="medication-search-dropdown">
                    <div className="no-results">{t('medico.noMedicationsFound', 'No medications found')}</div>
                  </div>
                )}
              </div>
              
              {/* Selected Medication Info */}
              {currentMedication.medicationId && (
                <div className="selected-medication-info">
                  <div className="med-selected-badge">✓ {t('medico.medicationSelected', 'Selected')}</div>
                  <div className="med-selected-details">
                    <strong>{currentMedication.nombre}</strong>
                    {currentMedication.presentacion && <span> • {currentMedication.presentacion}</span>}
                    {currentMedication.concentracion && <span> • {currentMedication.concentracion}</span>}
                    <span className="stock-available"> • Stock: {currentMedication.stockDisponible}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fallback: Quick medications for when API is not available */}
            {!currentMedication.medicationId && (
              <div className="quick-medications">
                <p>{t('medico.orSelectCommon', 'Or select a common medication')}:</p>
                <div className="med-chips">
                  {commonMedications.map(med => (
                    <button key={med} className="med-chip" onClick={() => setCurrentMedication(prev => ({ ...prev, nombre: med }))}>+ {med}</button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Dosage Form */}
            <div className="add-medication-form">
              <div className="form-row">
                <div className="form-group dose-group">
                  <label>{t('medico.dose', 'Dose')} *</label>
                  <div className="dose-input-group">
                    <input 
                      type="number" 
                      className="form-control dose-amount" 
                      placeholder="500" 
                      value={currentMedication.dosis} 
                      onChange={(e) => setCurrentMedication(prev => ({ ...prev, dosis: e.target.value }))} 
                      min="0"
                      step="0.01"
                    />
                    <select 
                      className="form-control dose-unit" 
                      value={currentMedication.unidadDosis} 
                      onChange={(e) => setCurrentMedication(prev => ({ ...prev, unidadDosis: e.target.value }))}
                    >
                      {dosisUnitOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('medico.frequency', 'Frequency')} *</label>
                  <select 
                    className="form-control" 
                    value={currentMedication.frecuencia} 
                    onChange={(e) => setCurrentMedication(prev => ({ ...prev, frecuencia: e.target.value }))}
                  >
                    <option value="">{t('medico.selectFrequency', 'Select frequency...')}</option>
                    {frequencyOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('medico.route', 'Route')}</label>
                  <select className="form-control" value={currentMedication.via} onChange={(e) => setCurrentMedication(prev => ({ ...prev, via: e.target.value }))}>
                    <option value="ORAL">Oral</option>
                    <option value="INYECTABLE">Inyectable</option>
                    <option value="SUBCUTANEO">Subcutáneo</option>
                    <option value="INTRAMUSCULAR">Intramuscular</option>
                    <option value="INTRAVENOSO">Intravenoso</option>
                    <option value="TOPICO">Tópico</option>
                    <option value="OFTALMICA">Oftálmico</option>
                    <option value="OTICA">Ótico</option>
                    <option value="RECTAL">Rectal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('medico.duration', 'Duration')}</label>
                  <select 
                    className="form-control" 
                    value={currentMedication.duracion} 
                    onChange={(e) => setCurrentMedication(prev => ({ ...prev, duracion: e.target.value }))}
                  >
                    <option value="">{t('medico.selectDuration', 'Select duration...')}</option>
                    {durationOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group quantity-group">
                  <label>{t('medico.quantity', 'Quantity')}</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={currentMedication.cantidad} 
                    onChange={(e) => setCurrentMedication(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
              </div>
              
              {/* Prescription Type Selector */}
              <div className="form-row type-selector-row">
                <div className="form-group prescription-type-group">
                  <label>{t('medico.prescriptionType', 'Type')} *</label>
                  <div className="type-toggle">
                    <button 
                      type="button"
                      className={`type-btn ${currentMedication.type === 'USO_INMEDIATO' ? 'active' : ''}`}
                      onClick={() => setCurrentMedication(prev => ({ ...prev, type: 'USO_INMEDIATO' }))}
                    >
                      🏥 {t('medico.internalUse', 'Uso Interno')}
                    </button>
                    <button 
                      type="button"
                      className={`type-btn external ${currentMedication.type === 'RECETA_EXTERNA' ? 'active' : ''}`}
                      onClick={() => setCurrentMedication(prev => ({ ...prev, type: 'RECETA_EXTERNA' }))}
                    >
                      📄 {t('medico.externalPrescription', 'Receta Externa')}
                    </button>
                  </div>
                  <span className="type-hint">
                    {currentMedication.type === 'USO_INMEDIATO' 
                      ? t('medico.internalHint', 'Se dispensará de farmacia interna') 
                      : t('medico.externalHint', 'Se generará receta para comprar fuera')}
                  </span>
                </div>
              </div>
              
              <button 
                className="btn-add-medication" 
                onClick={handleAddMedication} 
                disabled={!currentMedication.nombre || !currentMedication.dosis || !currentMedication.frecuencia}
              >
                + {t('medico.addMedication', 'Add Medication')}
              </button>
            </div>
            
            {/* Medications List */}
            {prescriptionForm.medicamentos.length > 0 && (
              <div className="medications-list">
                <h4>{t('medico.prescribedMedications', 'Prescription medications')}:</h4>
                {prescriptionForm.medicamentos.map(med => (
                  <div key={med.id} className={`medication-item ${med.type === 'RECETA_EXTERNA' ? 'external-type' : 'internal-type'}`}>
                    <div className="medication-info">
                      <div className="med-header">
                        <strong>{med.nombre}</strong>
                        <span className={`type-badge ${med.type === 'RECETA_EXTERNA' ? 'external' : 'internal'}`}>
                          {med.type === 'RECETA_EXTERNA' ? '📄 Externa' : '🏥 Interna'}
                        </span>
                      </div>
                      {med.presentacion && <span className="med-presentation">{med.presentacion}</span>}
                      <span className="med-dosage">{med.dosis} - {med.frecuencia} - {med.via}</span>
                      {med.duracion && <span className="med-duration">{t('medico.duration', 'Duration')}: {med.duracion}</span>}
                      {med.cantidad > 1 && <span className="med-qty">{t('medico.quantity', 'Quantity')}: {med.cantidad}</span>}
                    </div>
                    <button className="btn-remove" onClick={() => handleRemoveMedication(med.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="form-group">
              <label>{t('medico.generalInstructions', 'General instructions')}</label>
              <textarea className="form-control" placeholder={t('medico.instructionsPlaceholder', 'Additional instructions for the owner...')} rows="2" value={prescriptionForm.instrucciones} onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instrucciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPrescriptionModal(false)}>{t('common.cancel', 'Cancel')}</button>
              <button className="btn-primary" onClick={handleCreatePrescription} disabled={prescriptionForm.medicamentos.length === 0}>💊 {t('medico.sendToPharmacy', 'Send to Pharmacy')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Order Modal */}
      {showLabOrderModal && (
        <div className="modal-overlay" onClick={() => setShowLabOrderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔬 {t('medico.createLabOrder', 'Lab Order')}</h2>
            <div className="studies-selection">
              <label>{t('medico.selectStudies', 'Select studies')}:</label>
              <div className="studies-grid">
                {studiesOptions.map(study => (
                  <label key={study.id} className={`study-checkbox ${labOrderForm.estudios.includes(study.id) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={labOrderForm.estudios.includes(study.id)} onChange={() => handleToggleStudy(study.id)} />
                    <span>{study.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.priority', 'Priority')}</label>
              <select className="form-control" value={labOrderForm.prioridad} onChange={(e) => setLabOrderForm(prev => ({ ...prev, prioridad: e.target.value }))}>
                <option value="NORMAL">{t('medico.normal', 'Normal')}</option>
                <option value="URGENTE">{t('medico.urgent', 'Urgent')}</option>
                <option value="STAT">{t('medico.stat', 'STAT')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('medico.clinicalIndications', 'Clinical Indications')}</label>
              <textarea className="form-control" placeholder={t('medico.indicationsPlaceholder', 'Presumptive diagnosis, reason for study...')} rows="3" value={labOrderForm.indicaciones} onChange={(e) => setLabOrderForm(prev => ({ ...prev, indicaciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLabOrderModal(false)}>{t('common.cancel', 'Cancel')}</button>
              <button className="btn-primary" onClick={handleCreateLabOrder} disabled={labOrderForm.estudios.length === 0}>🔬 {t('medico.sendToLab', 'Send to Laboratory')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hospitalization Modal */}
      {showHospitalizationModal && (
        <div className="modal-overlay" onClick={() => setShowHospitalizationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🏥 {t('medico.hospitalizePatient', 'Hospitalizar Paciente')}</h2>
            
            {/* Info del paciente */}
            {selectedPatient && (
              <div className="info-note" style={{ background: '#e8f4fd', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #2196f3', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{selectedPatient.especie === 'Gato' ? '🐈' : '🐕'}</span>
                <div>
                  <strong>{selectedPatient.nombre}</strong> — {selectedPatient.especie} {selectedPatient.raza && `(${selectedPatient.raza})`}
                  {selectedPatient.peso && <span style={{ marginLeft: '0.5rem', color: '#666' }}>• {selectedPatient.peso} kg</span>}
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Propietario: {selectedPatient.propietario}</div>
                </div>
              </div>
            )}
            
            {/* Área de Hospitalización */}
            <div className="form-group">
              <label>Área de Hospitalización *</label>
              <select className="form-control" value={hospitalizationForm.type} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, type: e.target.value }))}>
                <option value="">-- Seleccionar área --</option>
                {selectedPatient?.especie === 'Gato' ? (
                  <>
                    <optgroup label="🐈 Áreas para Gatos">
                      <option value="GATOS_NO_INFECCIOSOS">🐈 Hospitalización Gatos (No Infecciosos)</option>
                      <option value="GATOS_INFECCIOSOS">🐈‍⬛ Gatos Infecciosos (Aislamiento)</option>
                    </optgroup>
                    <optgroup label="🐕 Áreas para Perros">
                      <option value="PERROS_NO_INFECCIOSOS">🐕 Hospitalización Perros (No Infecciosos)</option>
                      <option value="PERROS_INFECCIOSOS">🐕‍🦺 Perros Infecciosos (Aislamiento)</option>
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="🐕 Áreas para Perros">
                      <option value="PERROS_NO_INFECCIOSOS">🐕 Hospitalización Perros (No Infecciosos)</option>
                      <option value="PERROS_INFECCIOSOS">🐕‍🦺 Perros Infecciosos (Aislamiento)</option>
                    </optgroup>
                    <optgroup label="🐈 Áreas para Gatos">
                      <option value="GATOS_NO_INFECCIOSOS">🐈 Hospitalización Gatos (No Infecciosos)</option>
                      <option value="GATOS_INFECCIOSOS">🐈‍⬛ Gatos Infecciosos (Aislamiento)</option>
                    </optgroup>
                  </>
                )}
                <optgroup label="Áreas Especiales">
                  <option value="UCI">❤️‍🩹 UCI - Cuidados Intensivos</option>
                  <option value="MATERNIDAD">🤱 Maternidad</option>
                  <option value="NEONATOS">🍼 Neonatos - Camada/recién nacidos</option>
                </optgroup>
                <optgroup label="General">
                  <option value="GENERAL">🏥 General</option>
                  <option value="INFECCIOSOS">⚠️ Infecciosos (General)</option>
                </optgroup>
              </select>
            </div>
            
            {/* Notas contextuales */}
            {hospitalizationForm.type === 'NEONATOS' && (
              <div className="info-note" style={{ background: '#fff3e0', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #ff9800' }}>
                🍼 <strong>Hospitalización de Neonatos:</strong> Después de crear la hospitalización, ve al Dashboard de Hospitalización para registrar cada neonato de la camada con su monitoreo periódico.
              </div>
            )}
            {hospitalizationForm.type === 'UCI' && (
              <div className="info-note" style={{ background: '#fce4ec', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #e91e63' }}>
                ❤️‍🩹 <strong>Cuidados Intensivos:</strong> Se recomienda monitoreo cada 1-2 horas. La frecuencia se ajustará automáticamente.
              </div>
            )}
            {hospitalizationForm.type === 'MATERNIDAD' && (
              <div className="info-note" style={{ background: '#f3e5f5', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #9c27b0' }}>
                🤱 <strong>Maternidad:</strong> Paciente en proceso de gestación/parto. Si nacen neonatos, crea una hospitalización de Neonatos separada para la camada.
              </div>
            )}
            {(hospitalizationForm.type === 'PERROS_INFECCIOSOS' || hospitalizationForm.type === 'GATOS_INFECCIOSOS' || hospitalizationForm.type === 'INFECCIOSOS') && (
              <div className="info-note" style={{ background: '#fff8e1', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid #ff9800' }}>
                ⚠️ <strong>Aislamiento:</strong> Paciente con enfermedad infecciosa. Se ubicará en área de aislamiento con protocolo de bioseguridad.
              </div>
            )}
            
            <div className="form-group">
              <label>Motivo de Hospitalización *</label>
              <textarea className="form-control" placeholder="Motivo detallado de la hospitalización..." rows="3" value={hospitalizationForm.motivo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, motivo: e.target.value }))} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ubicación / Jaula</label>
                <input type="text" className="form-control" placeholder="Ej: Jaula 3, Kennel A" value={hospitalizationForm.ubicacion} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, ubicacion: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Días Estimados</label>
                <input type="number" className="form-control" placeholder="3" min="1" value={hospitalizationForm.estimacionDias} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, estimacionDias: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Frecuencia de Monitoreo</label>
                <select className="form-control" value={hospitalizationForm.frecuenciaMonitoreo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, frecuenciaMonitoreo: e.target.value }))}>
                  <option value="30min">Cada 30 minutos (Crítico)</option>
                  <option value="1h">Cada 1 hora</option>
                  <option value="2h">Cada 2 horas</option>
                  <option value="4h">Cada 4 horas</option>
                  <option value="6h">Cada 6 horas</option>
                  <option value="8h">Cada 8 horas</option>
                  <option value="12h">Cada 12 horas</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Cuidados Especiales</label>
              <textarea className="form-control" placeholder="Instrucciones de cuidado especial, restricciones, precauciones..." rows="2" value={hospitalizationForm.cuidadosEspeciales} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, cuidadosEspeciales: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>🍽️ Instrucciones de Dieta</label>
              <textarea className="form-control" placeholder="Ayuno, dieta blanda, hidratación forzada, etc." rows="2" value={hospitalizationForm.dietaInstrucciones} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, dietaInstrucciones: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHospitalizationModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-warning" onClick={handleCreateHospitalization} disabled={!hospitalizationForm.motivo || !hospitalizationForm.type}>
                🏥 Confirmar Hospitalización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal - Complete Medical History */}
      {showHistoryModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>📋 {t('medico.medicalHistory', 'Medical History')}</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            
            <div className="history-patient-summary">
              <div className="patient-photo-history">
                {selectedPatient.fotoUrl ? (
                  <img src={selectedPatient.fotoUrl} alt={selectedPatient.nombre} />
                ) : (
                  <span>{selectedPatient.especie === 'Perro' ? '🐕' : '🐈'}</span>
                )}
              </div>
              <div className="patient-info-history">
                <h3>{selectedPatient.nombre}</h3>
                <p>{selectedPatient.raza} • {selectedPatient.edad} • {selectedPatient.sexo}</p>
                <span className="ficha-badge">{selectedPatient.numeroFicha}</span>
              </div>
              <div className="patient-owner-history">
                <p><strong>Owner:</strong> {selectedPatient.propietario || historialData?.paciente?.owner?.nombre}</p>
                <p><strong>Phone:</strong> {selectedPatient.telefono || historialData?.paciente?.owner?.telefono}</p>
              </div>
            </div>

            <div className="history-timeline">
              {loadingHistorial ? (
                <div className="loading-history">
                  <div className="loading-spinner"></div>
                  <p>Cargando historial...</p>
                </div>
              ) : (
                <>
                  {/* Resumen */}
                  {historialData?.resumen && (
                    <div className="history-summary-cards" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ background: '#e0f2fe', padding: '1rem', borderRadius: '8px', flex: 1, minWidth: '120px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369a1' }}>{historialData.resumen.totalConsultas || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#0284c7' }}>Consultas</div>
                      </div>
                      <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', flex: 1, minWidth: '120px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b45309' }}>{historialData.resumen.totalCirugias || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#d97706' }}>Cirugías</div>
                      </div>
                      <div style={{ background: '#fce7f3', padding: '1rem', borderRadius: '8px', flex: 1, minWidth: '120px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#be185d' }}>{historialData.resumen.totalHospitalizaciones || 0}</div>
                        <div style={{ fontSize: '0.85rem', color: '#db2777' }}>Hospitalizaciones</div>
                      </div>
                    </div>
                  )}

                  {/* Consultas */}
                  {historialData?.historial?.consultas?.length > 0 && (
                    <div className="history-section" style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ borderBottom: '2px solid #0ea5e9', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#0369a1' }}>🩺 Consultas ({historialData.historial.consultas.length})</h4>
                      {historialData.historial.consultas.map((c, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                            <div>
                              <strong style={{ color: '#334155', fontSize: '1rem' }}>
                                {c.status === 'COMPLETADA' ? '✅' : c.status === 'EN_PROGRESO' ? '🔄' : '📋'} Consulta #{i + 1}
                              </strong>
                              <span style={{ marginLeft: '0.75rem', background: c.status === 'COMPLETADA' ? '#dcfce7' : '#fef3c7', color: c.status === 'COMPLETADA' ? '#166534' : '#b45309', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                {c.status}
                              </span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>📅 {new Date(c.startTime).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          
                          {/* Doctor */}
                          {c.doctor && (
                            <p style={{ margin: '0.5rem 0', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ background: '#dbeafe', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>👨‍⚕️</span>
                              <strong>Dr. {c.doctor.nombre}</strong>
                              {c.doctor.especialidad && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({c.doctor.especialidad})</span>}
                            </p>
                          )}
                          
                          {/* SOAP Notes */}
                          <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                            {c.soapSubjective && (
                              <div style={{ background: '#fef3c7', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
                                <strong style={{ color: '#b45309', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>📝 SUBJETIVO (Motivo de consulta)</strong>
                                <span style={{ color: '#78350f' }}>{c.soapSubjective}</span>
                              </div>
                            )}
                            {c.soapObjective && (
                              <div style={{ background: '#e0f2fe', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #0ea5e9' }}>
                                <strong style={{ color: '#0369a1', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>🔍 OBJETIVO (Hallazgos)</strong>
                                <span style={{ color: '#0c4a6e' }}>{c.soapObjective}</span>
                              </div>
                            )}
                            {c.soapAssessment && (
                              <div style={{ background: '#fce7f3', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #ec4899' }}>
                                <strong style={{ color: '#be185d', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>🩺 EVALUACIÓN (Diagnóstico)</strong>
                                <span style={{ color: '#831843' }}>{c.soapAssessment}</span>
                              </div>
                            )}
                            {c.soapPlan && (
                              <div style={{ background: '#dcfce7', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
                                <strong style={{ color: '#166534', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>📋 PLAN (Tratamiento)</strong>
                                <span style={{ color: '#14532d' }}>{c.soapPlan}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Diagnósticos formales */}
                          {c.diagnosticos?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#faf5ff', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e9d5ff' }}>
                              <strong style={{ color: '#7c3aed', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>🔬 Diagnósticos Registrados</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {c.diagnosticos.map((d, di) => (
                                  <span key={di} style={{ background: '#e9d5ff', color: '#6b21a8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                    {d.descripcion} {d.codigoCIE10 && <small>({d.codigoCIE10})</small>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Signos Vitales */}
                          {c.signosVitales?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#f0fdf4', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                              <strong style={{ color: '#166534', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>🌡️ Signos Vitales</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {c.signosVitales[0]?.temperatura && <span style={{ color: '#166534' }}>🌡️ {c.signosVitales[0].temperatura}°C</span>}
                                {c.signosVitales[0]?.frecuenciaCardiaca && <span style={{ color: '#dc2626' }}>❤️ {c.signosVitales[0].frecuenciaCardiaca} bpm</span>}
                                {c.signosVitales[0]?.frecuenciaRespiratoria && <span style={{ color: '#0284c7' }}>💨 {c.signosVitales[0].frecuenciaRespiratoria} rpm</span>}
                                {c.signosVitales[0]?.peso && <span style={{ color: '#7c3aed' }}>⚖️ {c.signosVitales[0].peso} kg</span>}
                                {(c.signosVitales[0]?.presionSistolica || c.signosVitales[0]?.presionDiastolica) && (
                                  <span style={{ color: '#ea580c' }}>🩺 {c.signosVitales[0].presionSistolica}/{c.signosVitales[0].presionDiastolica} mmHg</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Prescripciones */}
                          {c.prescriptions?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#fff7ed', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                              <strong style={{ color: '#c2410c', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>💊 Medicamentos Recetados</strong>
                              {c.prescriptions.map((p, pi) => (
                                <div key={pi}>
                                  {p.items?.map((item, ii) => (
                                    <div key={ii} style={{ background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '4px', marginTop: '0.3rem', border: '1px solid #fdba74' }}>
                                      <strong style={{ color: '#9a3412' }}>{item.name || item.medicamento || item.medication?.nombre || 'Medicamento'}</strong>
                                      <div style={{ color: '#78350f', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                                        {(item.dosage || item.dosis) && <span>📏 {item.dosage || item.dosis}</span>}
                                        {(item.frequency || item.frecuencia) && <span>⏰ {item.frequency || item.frecuencia}</span>}
                                        {(item.duration || item.duracion) && <span>📅 {item.duration || item.duracion}</span>}
                                        {item.quantity && <span>📦 x{item.quantity}</span>}
                                        {item.via && <span>💉 {item.via}</span>}
                                      </div>
                                      {(item.instructions || item.instrucciones) && <p style={{ margin: '0.25rem 0 0', color: '#92400e', fontSize: '0.8rem', fontStyle: 'italic' }}>📝 {item.instructions || item.instrucciones}</p>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Laboratorios */}
                          {c.labRequests?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#eff6ff', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              <strong style={{ color: '#1e40af', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>🔬 Estudios de Laboratorio ({c.labRequests.length})</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {c.labRequests.map((lab, li) => (
                                  <span key={li} style={{ 
                                    background: lab.estado === 'COMPLETADO' ? '#dcfce7' : lab.estado === 'EN_PROCESO' ? '#fef3c7' : '#e0e7ff', 
                                    color: lab.estado === 'COMPLETADO' ? '#166534' : lab.estado === 'EN_PROCESO' ? '#b45309' : '#3730a3',
                                    padding: '0.2rem 0.5rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.8rem' 
                                  }}>
                                    {lab.tipo} - {lab.estado}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vacunas */}
                  {historialData?.historial?.vacunas?.length > 0 && (
                    <div className="history-section" style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ borderBottom: '2px solid #10b981', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#047857' }}>💉 Vacunas ({historialData.historial.vacunas.length})</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                        {historialData.historial.vacunas.map((v, i) => (
                          <div key={i} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <strong style={{ color: '#166534', fontSize: '1rem' }}>💉 {v.nombre || v.vacuna?.nombre || 'Vacuna'}</strong>
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                {new Date(v.fecha).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                            {(v.marca || v.nombreComercial) && (
                              <p style={{ margin: '0.25rem 0', color: '#166534', fontSize: '0.85rem' }}>
                                🏷️ <strong>Marca:</strong> {v.marca || v.nombreComercial}
                              </p>
                            )}
                            {v.lote && (
                              <p style={{ margin: '0.25rem 0', color: '#166534', fontSize: '0.85rem' }}>
                                📋 <strong>Lote:</strong> {v.lote}
                              </p>
                            )}
                            {v.proximaDosis && (
                              <div style={{ marginTop: '0.5rem', background: '#fef3c7', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📅</span>
                                <span style={{ color: '#92400e', fontSize: '0.85rem' }}>
                                  <strong>Próxima dosis:</strong> {new Date(v.proximaDosis).toLocaleDateString('es-MX')}
                                </span>
                              </div>
                            )}
                            {v.notas && (
                              <p style={{ margin: '0.5rem 0 0', color: '#047857', fontSize: '0.8rem', fontStyle: 'italic' }}>📝 {v.notas}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hospitalizaciones */}
                  {historialData?.historial?.hospitalizaciones?.length > 0 && (
                    <div className="history-section" style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#b45309' }}>🏥 Hospitalizaciones ({historialData.historial.hospitalizaciones.length})</h4>
                      {historialData.historial.hospitalizaciones.map((h, i) => (
                        <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #fde68a', paddingBottom: '0.5rem' }}>
                            <div>
                              <strong style={{ color: '#92400e', fontSize: '1rem' }}>🏥 {h.reason || 'Hospitalización'}</strong>
                              <span style={{ marginLeft: '0.75rem', background: h.status === 'ACTIVE' ? '#fef3c7' : h.status === 'DISCHARGED' ? '#dcfce7' : '#e0e7ff', color: h.status === 'ACTIVE' ? '#b45309' : h.status === 'DISCHARGED' ? '#166534' : '#4338ca', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                {h.status === 'ACTIVE' ? '🔴 Activa' : h.status === 'DISCHARGED' ? '✅ Alta' : h.status}
                              </span>
                            </div>
                            <span style={{ color: '#b45309', fontSize: '0.85rem' }}>📅 {new Date(h.admittedAt).toLocaleDateString('es-MX')}</span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {h.location && <p style={{ margin: 0, color: '#78350f' }}>📍 <strong>Ubicación:</strong> {h.location}</p>}
                            {h.cage && <p style={{ margin: 0, color: '#78350f' }}>🏠 <strong>Jaula:</strong> {h.cage}</p>}
                            {h.diet && <p style={{ margin: 0, color: '#78350f' }}>🍽️ <strong>Dieta:</strong> {h.diet}</p>}
                            {h.admittedBy && <p style={{ margin: 0, color: '#78350f' }}>👨‍⚕️ <strong>Admitió:</strong> {h.admittedBy.nombre}</p>}
                          </div>
                          
                          {h.specialCare && (
                            <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#b45309', fontSize: '0.8rem' }}>⚠️ Cuidados Especiales:</strong>
                              <p style={{ margin: '0.25rem 0 0', color: '#92400e' }}>{h.specialCare}</p>
                            </div>
                          )}
                          
                          {/* Monitoreos */}
                          {h.monitorings?.length > 0 && (
                            <div style={{ marginTop: '0.75rem', background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fde68a' }}>
                              <strong style={{ color: '#b45309', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>📊 Últimos Monitoreos ({h.monitorings.length})</strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {h.monitorings.slice(0, 3).map((m, mi) => (
                                  <div key={mi} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.25rem 0', borderBottom: mi < 2 ? '1px dashed #fde68a' : 'none', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#78350f' }}>🕐 {new Date(m.recordedAt).toLocaleString('es-MX')}</span>
                                    {m.temperatura && <span>🌡️ {m.temperatura}°C</span>}
                                    {m.frecuenciaCardiaca && <span>❤️ {m.frecuenciaCardiaca}</span>}
                                    {m.estado && <span>📋 {m.estado}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {h.dischargedAt && (
                            <div style={{ marginTop: '0.5rem', background: '#dcfce7', padding: '0.5rem', borderRadius: '4px' }}>
                              <strong style={{ color: '#166534' }}>✅ Alta:</strong> {new Date(h.dischargedAt).toLocaleDateString('es-MX')}
                              {h.dischargeNotes && <span style={{ color: '#15803d' }}> - {h.dischargeNotes}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cirugías */}
                  {historialData?.historial?.cirugias?.length > 0 && (
                    <div className="history-section" style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ borderBottom: '2px solid #8b5cf6', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#6d28d9' }}>⚕️ Cirugías ({historialData.historial.cirugias.length})</h4>
                      {historialData.historial.cirugias.map((s, i) => (
                        <div key={i} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #ddd6fe', paddingBottom: '0.5rem' }}>
                            <div>
                              <strong style={{ color: '#5b21b6', fontSize: '1rem' }}>🔪 {s.type || s.procedimiento || 'Cirugía'}</strong>
                              <span style={{ marginLeft: '0.75rem', background: s.status === 'COMPLETED' ? '#dcfce7' : s.status === 'SCHEDULED' ? '#e0f2fe' : '#fef3c7', color: s.status === 'COMPLETED' ? '#166534' : s.status === 'SCHEDULED' ? '#0369a1' : '#b45309', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                {s.status === 'COMPLETED' ? '✅ Completada' : s.status === 'SCHEDULED' ? '📅 Programada' : s.status}
                              </span>
                            </div>
                            <span style={{ color: '#7c3aed', fontSize: '0.85rem' }}>📅 {new Date(s.scheduledDate).toLocaleDateString('es-MX')}</span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {s.surgeon && <p style={{ margin: 0, color: '#5b21b6' }}>👨‍⚕️ <strong>Cirujano:</strong> Dr. {s.surgeon.nombre}</p>}
                            {s.anesthesiaType && <p style={{ margin: 0, color: '#5b21b6' }}>💉 <strong>Anestesia:</strong> {s.anesthesiaType}</p>}
                            {s.duration && <p style={{ margin: 0, color: '#5b21b6' }}>⏱️ <strong>Duración:</strong> {s.duration} min</p>}
                          </div>
                          
                          {s.preOpNotes && (
                            <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#b45309', fontSize: '0.8rem' }}>📋 Pre-operatorio:</strong>
                              <p style={{ margin: '0.25rem 0 0', color: '#92400e', fontSize: '0.9rem' }}>{s.preOpNotes}</p>
                            </div>
                          )}
                          
                          {s.postOpNotes && (
                            <div style={{ background: '#dcfce7', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#166534', fontSize: '0.8rem' }}>✅ Post-operatorio:</strong>
                              <p style={{ margin: '0.25rem 0 0', color: '#15803d', fontSize: '0.9rem' }}>{s.postOpNotes}</p>
                            </div>
                          )}
                          
                          {s.complications && (
                            <div style={{ background: '#fee2e2', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#dc2626', fontSize: '0.8rem' }}>⚠️ Complicaciones:</strong>
                              <p style={{ margin: '0.25rem 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>{s.complications}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notas Médicas */}
                  {historialData?.historial?.notas?.length > 0 && (
                    <div className="history-section" style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ borderBottom: '2px solid #64748b', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#475569' }}>📝 Notas Médicas ({historialData.historial.notas.length})</h4>
                      {historialData.historial.notas.map((n, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              {n.tipo || 'Nota'}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>📅 {new Date(n.createdAt).toLocaleDateString('es-MX')}</span>
                          </div>
                          <p style={{ margin: '0.5rem 0', color: '#334155' }}>{n.contenido}</p>
                          {n.createdBy && <p style={{ margin: '0.25rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>👨‍⚕️ {n.createdBy.nombre}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sin historial */}
                  {(!historialData?.historial?.consultas?.length && 
                    !historialData?.historial?.vacunas?.length && 
                    !historialData?.historial?.hospitalizaciones?.length &&
                    !historialData?.historial?.cirugias?.length &&
                    !historialData?.historial?.notas?.length) && (
                    <div className="empty-history">
                      <span className="empty-icon">📭</span>
                      <p>{t('medico.noHistoryFound', 'No se encontró historial para este paciente')}</p>
                      <p className="empty-sub">Las consultas y procedimientos aparecerán aquí</p>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem' }}>
                        Debug: historialData = {JSON.stringify(historialData ? Object.keys(historialData) : 'null')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHistoryModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Appointment Modal */}
      {showFollowUpModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div className="modal-content followup-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 {t('medico.scheduleFollowUp', 'Agendar Cita de Seguimiento')}</h2>
              <button className="close-btn" onClick={() => setShowFollowUpModal(false)}>✕</button>
            </div>

            <div className="followup-patient-info">
              <div className="patient-badge">
                <span className="patient-icon">{selectedPatient.especie?.toLowerCase() === 'gato' ? '🐈' : '🐕'}</span>
                <div className="patient-details">
                  <strong>{selectedPatient.nombre}</strong>
                  <span>{selectedPatient.raza} • {selectedPatient.propietario}</span>
                </div>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setSavingFollowUp(true);
              try {
                // Get pet ID from selectedPatient
                const petId = selectedPatient.petId || selectedPatient.id;
                
                await recepcionService.appointments.create({
                  petId: petId,
                  fecha: followUpForm.fecha,
                  hora: followUpForm.hora,
                  tipo: followUpForm.tipo,
                  motivo: followUpForm.motivo,
                  notas: `Cita de seguimiento agendada por Dr. ${user?.nombre || user?.name || 'Médico'}`
                });

                alert(`✅ Cita de seguimiento agendada\nFecha: ${followUpForm.fecha}\nHora: ${followUpForm.hora}`);
                setShowFollowUpModal(false);
                
                // Reload dashboard to reflect new appointment
                loadDashboardData();
              } catch (error) {
                console.error('Error scheduling follow-up:', error);
                alert('❌ Error al agendar cita: ' + (error.message || 'Por favor intente de nuevo'));
              } finally {
                setSavingFollowUp(false);
              }
            }} className="followup-form">
              <div className="form-row">
                <div className="form-group">
                  <label>📆 {t('medico.date', 'Fecha')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={followUpForm.fecha}
                    onChange={(e) => setFollowUpForm(prev => ({ ...prev, fecha: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>🕐 {t('medico.time', 'Hora')}</label>
                  <input
                    type="time"
                    className="form-control"
                    value={followUpForm.hora}
                    onChange={(e) => setFollowUpForm(prev => ({ ...prev, hora: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>📋 {t('medico.appointmentType', 'Tipo de Cita')}</label>
                <select
                  className="form-control"
                  value={followUpForm.tipo}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, tipo: e.target.value }))}
                >
                  <option value="SEGUIMIENTO">Seguimiento</option>
                  <option value="CONSULTA_GENERAL">Consulta General</option>
                  <option value="VACUNACION">Vacunación</option>
                  <option value="CIRUGIA">Cirugía</option>
                </select>
              </div>

              <div className="form-group">
                <label>📝 {t('medico.reason', 'Motivo')}</label>
                <textarea
                  className="form-control"
                  value={followUpForm.motivo}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ej: Revisión de herida quirúrgica, control de peso, seguimiento de tratamiento..."
                  rows={3}
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowFollowUpModal(false)}
                  disabled={savingFollowUp}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={savingFollowUp}
                >
                  {savingFollowUp ? '⏳ Agendando...' : `📅 ${t('medico.scheduleAppointment', 'Agendar Cita')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver detalle de resultados de lab */}
      {showLabResultDetailModal && selectedLabResult && (
        <div className="modal-overlay" onClick={() => setShowLabResultDetailModal(false)}>
          <div className="modal-content lab-result-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🧪 Resultado de Laboratorio</h2>
              <button className="close-btn" onClick={() => setShowLabResultDetailModal(false)}>✕</button>
            </div>

            <div className="lab-result-detail-content">
              {/* Info del estudio */}
              <div className="lab-result-type-header">
                <span className="lab-type-badge large">{tipoLabToLabel(selectedLabResult.type)}</span>
                <span className="lab-date">
                  Completado: {new Date(selectedLabResult.completedAt || selectedLabResult.updatedAt).toLocaleDateString()} 
                  {' '}a las{' '}
                  {new Date(selectedLabResult.completedAt || selectedLabResult.updatedAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Info del paciente */}
              <div className="lab-result-patient-section">
                <h4>🐾 Paciente</h4>
                <div className="patient-info-grid">
                  <div className="info-item">
                    <span className="label">Nombre:</span>
                    <span className="value">{selectedLabResult.pet?.nombre}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Especie:</span>
                    <span className="value">{selectedLabResult.pet?.especie}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Raza:</span>
                    <span className="value">{selectedLabResult.pet?.raza}</span>
                  </div>
                </div>
              </div>

              {/* Info del propietario */}
              <div className="lab-result-owner-section">
                <h4>👤 Propietario</h4>
                <div className="owner-info-grid">
                  <div className="info-item">
                    <span className="label">Nombre:</span>
                    <span className="value">{selectedLabResult.pet?.owner?.nombre}</span>
                  </div>
                  {selectedLabResult.pet?.owner?.telefono && (
                    <div className="info-item">
                      <span className="label">Teléfono:</span>
                      <span className="value">📱 {selectedLabResult.pet.owner.telefono}</span>
                    </div>
                  )}
                  {selectedLabResult.pet?.owner?.email && (
                    <div className="info-item">
                      <span className="label">Email:</span>
                      <span className="value">✉️ {selectedLabResult.pet.owner.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas del estudio */}
              {selectedLabResult.notes && (
                <div className="lab-result-notes-section">
                  <h4>📋 Indicaciones del Médico</h4>
                  <p>{selectedLabResult.notes}</p>
                </div>
              )}

              {/* Resultados */}
              <div className="lab-result-results-section">
                <h4>📊 Resultados</h4>
                {selectedLabResult.resultNotes ? (
                  <div className="result-notes-content">
                    <p>{selectedLabResult.resultNotes}</p>
                  </div>
                ) : (
                  <p className="no-results">Sin observaciones registradas</p>
                )}
              </div>

              {/* Archivos adjuntos */}
              {selectedLabResult.resultFiles && (
                <div className="lab-result-files-section">
                  <h4>📁 Archivos Adjuntos</h4>
                  <div className="files-gallery">
                    {(() => {
                      try {
                        let files = typeof selectedLabResult.resultFiles === 'string' 
                          ? JSON.parse(selectedLabResult.resultFiles) 
                          : selectedLabResult.resultFiles;
                        
                        if (Array.isArray(files) && files.length > 0) {
                          return files.map((file, idx) => {
                            // Detectar si es string (URL o base64) o objeto
                            const isString = typeof file === 'string';
                            const fileData = isString ? file : file.data;
                            const fileName = isString 
                              ? (file.startsWith('data:') ? `Resultado_${idx + 1}` : file.split('/').pop())
                              : (file.name || `Resultado_${idx + 1}`);
                            
                            // Detectar tipo de archivo
                            const isBase64 = fileData?.startsWith('data:');
                            const isBase64Image = isBase64 && fileData.startsWith('data:image/');
                            const isBase64PDF = isBase64 && fileData.startsWith('data:application/pdf');
                            const isUrlImage = !isBase64 && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileData || '');
                            const isUrlPDF = !isBase64 && /\.pdf$/i.test(fileData || '');
                            const isImage = isBase64Image || isUrlImage || file.type?.startsWith('image/');
                            const isPDF = isBase64PDF || isUrlPDF || file.type === 'application/pdf';
                            
                            // Extensión para el nombre del archivo
                            let fileExt = '';
                            if (isImage) {
                              const match = fileData?.match(/data:image\/(\w+)/);
                              fileExt = match ? `.${match[1]}` : '.jpg';
                            } else if (isPDF) {
                              fileExt = '.pdf';
                            }
                            const downloadName = fileName.includes('.') ? fileName : `${fileName}${fileExt}`;
                            
                            return (
                              <div key={idx} className="file-card-container">
                                {isImage ? (
                                  <div className="file-card image-card">
                                    <div 
                                      className="file-preview-clickable"
                                      onClick={() => openImageViewer(fileData, downloadName)}
                                    >
                                      <img src={fileData} alt={fileName} className="file-preview-img" />
                                      <div className="file-overlay-hover">🔍 Ver imagen</div>
                                    </div>
                                    <div className="file-actions">
                                      <button 
                                        className="btn-download"
                                        onClick={() => downloadFile(fileData, downloadName)}
                                        title="Descargar imagen"
                                      >
                                        📥 Descargar
                                      </button>
                                    </div>
                                  </div>
                                ) : isPDF ? (
                                  <div className="file-card pdf-card">
                                    <div className="pdf-icon-container">
                                      <div className="pdf-icon">📄</div>
                                      <span className="file-name">{downloadName}</span>
                                    </div>
                                    <div className="file-actions">
                                      <button 
                                        className="btn-download"
                                        onClick={() => downloadFile(fileData, downloadName)}
                                        title="Descargar PDF"
                                      >
                                        📥 Descargar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="file-card generic-card">
                                    <div className="file-icon-container">
                                      <div className="file-icon">📎</div>
                                      <span className="file-name">{downloadName}</span>
                                    </div>
                                    <div className="file-actions">
                                      <button 
                                        className="btn-download"
                                        onClick={() => downloadFile(fileData, downloadName)}
                                        title="Descargar archivo"
                                      >
                                        📥 Descargar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        }
                        return <p className="no-files">No hay archivos adjuntos</p>;
                      } catch (e) {
                        console.error('Error parsing resultFiles:', e);
                        return <p className="no-files">Error al cargar archivos</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowLabResultDetailModal(false)}
              >
                Cerrar
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  setShowLabResultDetailModal(false);
                  setAgendarCitaForm({
                    fecha: '',
                    hora: '10:00',
                    motivo: `Seguimiento por resultado de ${tipoLabToLabel(selectedLabResult.type)}`
                  });
                  setShowAgendarCitaModal(true);
                }}
              >
                📅 Agendar Cita de Seguimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agendar cita desde resultados de lab */}
      {showAgendarCitaModal && selectedLabResult && (
        <div className="modal-overlay" onClick={() => setShowAgendarCitaModal(false)}>
          <div className="modal-content agendar-cita-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 Agendar Cita de Seguimiento</h2>
              <button className="close-btn" onClick={() => setShowAgendarCitaModal(false)}>✕</button>
            </div>

            <div className="lab-context-info">
              <div className="info-badge lab-badge">
                <span className="icon">🧪</span>
                <span>{tipoLabToLabel(selectedLabResult.type)}</span>
              </div>
              <div className="patient-info-row">
                <span className="pet-icon">{selectedLabResult.pet?.especie === 'PERRO' ? '🐕' : '🐈'}</span>
                <div className="patient-details">
                  <strong>{selectedLabResult.pet?.nombre}</strong>
                  <span className="owner-info">
                    👤 {selectedLabResult.pet?.owner?.nombre}
                    {selectedLabResult.pet?.owner?.telefono && ` • 📱 ${selectedLabResult.pet.owner.telefono}`}
                  </span>
                </div>
              </div>
              {selectedLabResult.resultNotes && (
                <div className="result-preview">
                  <strong>Resultado:</strong>
                  <p>{selectedLabResult.resultNotes}</p>
                </div>
              )}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleAgendarCitaSeguimiento();
            }} className="agendar-form">
              <div className="form-row">
                <div className="form-group">
                  <label>📆 Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    value={agendarCitaForm.fecha}
                    onChange={(e) => setAgendarCitaForm(prev => ({ ...prev, fecha: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>🕐 Hora</label>
                  <input
                    type="time"
                    className="form-control"
                    value={agendarCitaForm.hora}
                    onChange={(e) => setAgendarCitaForm(prev => ({ ...prev, hora: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>📝 Motivo de la Cita</label>
                <textarea
                  className="form-control"
                  value={agendarCitaForm.motivo}
                  onChange={(e) => setAgendarCitaForm(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Descripción del motivo de seguimiento..."
                  rows={3}
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowAgendarCitaModal(false)}
                  disabled={savingCitaSeguimiento}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={savingCitaSeguimiento}
                >
                  {savingCitaSeguimiento ? '⏳ Agendando...' : '📅 Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && viewerImage.src && (
        <div className="image-viewer-overlay" onClick={() => setShowImageViewer(false)}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-header">
              <span className="image-viewer-title">{viewerImage.name}</span>
              <button className="close-btn" onClick={() => setShowImageViewer(false)}>✕</button>
            </div>
            <div className="image-viewer-content">
              <img src={viewerImage.src} alt={viewerImage.name} />
            </div>
            <div className="image-viewer-actions">
              <button 
                className="btn-download-large"
                onClick={() => downloadFile(viewerImage.src, viewerImage.name)}
              >
                📥 Descargar Imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicoDashboard;
