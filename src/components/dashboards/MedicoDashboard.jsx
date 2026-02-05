import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useMedico from '../../hooks/useMedico';
import farmaciaService from '../../services/farmacia.service';
import recepcionService from '../../services/recepcion.service';
import ExamenFisico from '../medico/ExamenFisico';
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
    cantidad: 1
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

  const [labOrderForm, setLabOrderForm] = useState({
    estudios: [],
    prioridad: 'NORMAL',
    indicaciones: ''
  });

  const [hospitalizationForm, setHospitalizationForm] = useState({
    motivo: '',
    frecuenciaMonitoreo: '4h',
    cuidadosEspeciales: '',
    estimacionDias: ''
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
      await completarConsulta(activeConsultation.id, {
        diagnosis: 'Consulta completada',
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
      cantidad: 1
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
          cantidad: m.cantidad || 1
        })),
        instruccionesGenerales: prescriptionForm.instrucciones || undefined
      });
      
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicamentos: [], instrucciones: '', duracion: '' });
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
    if (!activeConsultation || !hospitalizationForm.motivo) {
      setLocalError(t('medico.errors.hospitalizationReasonRequired', 'Hospitalization reason required'));
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
        motivo: hospitalizationForm.motivo,
        frecuenciaMonitoreo: hospitalizationForm.frecuenciaMonitoreo,
        cuidadosEspeciales: hospitalizationForm.cuidadosEspeciales || null,
        estimacionDias: hospitalizationForm.estimacionDias ? parseInt(hospitalizationForm.estimacionDias) : null
      });
      
      setShowHospitalizationModal(false);
      setHospitalizationForm({
        motivo: '',
        frecuenciaMonitoreo: '4h',
        cuidadosEspeciales: '',
        estimacionDias: ''
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
    if (!historialData?.historial) return [];
    
    const history = [];
    const { consultas, cirugias, hospitalizaciones, vacunas, notas } = historialData.historial;
    
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
            tipo: lab.testType,
            prioridad: lab.priority,
            estado: lab.status,
            notas: lab.notes,
            resultados: lab.results,
            fechaSolicitud: lab.requestedAt,
            fechaResultado: lab.completedAt
          }));
        }
        
        history.push({
          timestamp: consulta.startTime,
          endTime: consulta.endTime,
          accion: `Consultation${consulta.status === 'COMPLETADA' ? ' Completed' : ''}`,
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
            tipo: lab.testType,
            prioridad: lab.priority,
            estado: lab.status,
            notas: lab.notes,
            resultados: lab.results,
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
                  className={`appointment-card waiting ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient)}
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
      </aside>

      {/* CENTER PANEL - Active Consultation Workspace */}
      <main className="center-panel">
        <div className="panel-header">
          <h2>
            {activeConsultation 
              ? `🏥 ${t('medico.activeConsultation', 'Consulta Activa')}`
              : `👨‍⚕️ ${t('medico.consultationWorkspace', 'Consultation Area')}`
            }
          </h2>
          <p>{t('medico.doctor', 'Dr.')} {user?.nombre} - {user?.especialidad || t('medico.generalPractice', 'Medicina General')}</p>
        </div>

        {!selectedPatient && !activeConsultation && (
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

        {selectedPatient && !activeConsultation && (
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

        {selectedPatient && activeConsultation && (
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
                  <div key={med.id} className="medication-item">
                    <div className="medication-info">
                      <strong>{med.nombre}</strong>
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
            <h2>🏥 {t('medico.hospitalizePatient', 'Hospitalize Patient')}</h2>
            <div className="form-group">
              <label>{t('medico.hospitalizationReason', 'Hospitalization Reason')} *</label>
              <textarea className="form-control" placeholder={t('medico.hospitalizationReasonPlaceholder', 'Reason for hospitalizing the patient...')} rows="3" value={hospitalizationForm.motivo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, motivo: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.monitoringFrequency', 'Monitoring Frequency')}</label>
                <select className="form-control" value={hospitalizationForm.frecuenciaMonitoreo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, frecuenciaMonitoreo: e.target.value }))}>
                  <option value="1h">{t('medico.every1Hour', 'Every 1 hour')}</option>
                  <option value="2h">{t('medico.every2Hours', 'Every 2 hours')}</option>
                  <option value="4h">{t('medico.every4Hours', 'Every 4 hours')}</option>
                  <option value="6h">{t('medico.every6Hours', 'Every 6 hours')}</option>
                  <option value="8h">{t('medico.every8Hours', 'Every 8 hours')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.estimatedDays', 'Estimated Days')}</label>
                <input type="number" className="form-control" placeholder="3" min="1" value={hospitalizationForm.estimacionDias} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, estimacionDias: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.specialCare', 'Special Care')}</label>
              <textarea className="form-control" placeholder={t('medico.specialCarePlaceholder', 'Special care instructions...')} rows="3" value={hospitalizationForm.cuidadosEspeciales} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, cuidadosEspeciales: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHospitalizationModal(false)}>{t('common.cancel', 'Cancel')}</button>
              <button className="btn-warning" onClick={handleCreateHospitalization} disabled={!hospitalizationForm.motivo}>🏥 {t('medico.confirmHospitalization', 'Confirm Hospitalization')}</button>
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
                  <p>Loading history...</p>
                </div>
              ) : getFormattedHistory().length === 0 ? (
                <div className="empty-history">
                  <span className="empty-icon">📭</span>
                  <p>{t('medico.noHistoryFound', 'No history found for this patient')}</p>
                  <p className="empty-sub">Consultations and procedures will appear here</p>
                </div>
              ) : (
                getFormattedHistory().map((entry, idx) => (
                  <div key={idx} className={`history-card history-${entry.tipo}`}>
                    <div className="history-card-header">
                      <div className="history-icon">
                        {entry.tipo === 'consulta' && '🩺'}
                        {entry.tipo === 'vacuna' && '💉'}
                        {entry.tipo === 'hospitalizacion' && '🏥'}
                        {entry.tipo === 'cirugia' && '⚕️'}
                        {entry.tipo === 'visita' && '📋'}
                      </div>
                      <div className="history-title">
                        <h4>{entry.accion}</h4>
                        <span className="history-date">
                          {new Date(entry.timestamp).toLocaleDateString('es-MX', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {' - '}
                          {new Date(entry.timestamp).toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className="history-meta">
                        {entry.doctor && <span className="doctor-badge">👨‍⚕️ {entry.doctor}</span>}
                        {entry.duracion && <span className="duration-badge">⏱️ {entry.duracion}</span>}
                      </div>
                    </div>
                    
                    {entry.detalles && (
                      <div className="history-card-body">
                        {/* Examen Físico - Solo mostrar secciones con datos */}
                        {entry.detalles.examenFisico && (
                          <div className="history-section exam-section">
                            <h5>🩺 Examen Físico</h5>
                            <div className="exam-summary">
                              {/* Signos Vitales del Examen General - solo si hay alguno */}
                              {entry.detalles.examenFisico.general && (
                                entry.detalles.examenFisico.general.peso ||
                                entry.detalles.examenFisico.general.temperatura ||
                                entry.detalles.examenFisico.general.frecuenciaCardiaca ||
                                entry.detalles.examenFisico.general.frecuenciaRespiratoria ||
                                entry.detalles.examenFisico.general.condicionCorporal ||
                                entry.detalles.examenFisico.general.hidratacion
                              ) ? (
                                <div className="exam-subsection">
                                  <h6>Signos Vitales</h6>
                                  <div className="exam-vitals-grid">
                                    {entry.detalles.examenFisico.general.peso && (
                                      <span>Peso: {entry.detalles.examenFisico.general.peso} kg</span>
                                    )}
                                    {entry.detalles.examenFisico.general.temperatura && (
                                      <span>Temp: {entry.detalles.examenFisico.general.temperatura}°C</span>
                                    )}
                                    {entry.detalles.examenFisico.general.frecuenciaCardiaca && (
                                      <span>FC: {entry.detalles.examenFisico.general.frecuenciaCardiaca} bpm</span>
                                    )}
                                    {entry.detalles.examenFisico.general.frecuenciaRespiratoria && (
                                      <span>FR: {entry.detalles.examenFisico.general.frecuenciaRespiratoria} rpm</span>
                                    )}
                                    {entry.detalles.examenFisico.general.condicionCorporal && (
                                      <span>BCS: {entry.detalles.examenFisico.general.condicionCorporal}/9</span>
                                    )}
                                    {entry.detalles.examenFisico.general.hidratacion && (
                                      <span>Hidratación: {entry.detalles.examenFisico.general.hidratacion}</span>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                              
                              {/* Estado Mental y Actitud */}
                              {entry.detalles.examenFisico.general?.estadoMental?.length > 0 && (
                                <div className="exam-subsection">
                                  <h6>Estado Mental</h6>
                                  <p>{entry.detalles.examenFisico.general.estadoMental.join(', ')}</p>
                                </div>
                              )}
                              
                              {/* Hallazgos del Examen General */}
                              {entry.detalles.examenFisico.general && (
                                <div className="exam-subsection">
                                  <h6>Hallazgos</h6>
                                  {(() => {
                                    const findings = [];
                                    const g = entry.detalles.examenFisico.general;
                                    
                                    // Ojos
                                    if (g.ojos?.length > 0) findings.push(`Ojos: ${g.ojos.join(', ')}`);
                                    // Oídos
                                    if (g.oidos?.length > 0) findings.push(`Oídos: ${g.oidos.join(', ')}`);
                                    // Nariz
                                    if (g.nariz?.length > 0) findings.push(`Nariz: ${g.nariz.join(', ')}`);
                                    // Boca
                                    if (g.boca?.length > 0) findings.push(`Boca: ${g.boca.join(', ')}`);
                                    // Linfonodos
                                    if (g.linfonodos?.length > 0) findings.push(`Linfonodos: ${g.linfonodos.join(', ')}`);
                                    // Piel/Pelo
                                    if (g.pielPelo?.length > 0) findings.push(`Piel/Pelo: ${g.pielPelo.join(', ')}`);
                                    // Cardiovascular
                                    if (g.cardiovascular?.length > 0) findings.push(`Cardiovascular: ${g.cardiovascular.join(', ')}`);
                                    // Respiratorio
                                    if (g.respiratorio?.length > 0) findings.push(`Respiratorio: ${g.respiratorio.join(', ')}`);
                                    // Digestivo
                                    if (g.digestivo?.length > 0) findings.push(`Digestivo: ${g.digestivo.join(', ')}`);
                                    // Urogenital
                                    if (g.urogenital?.length > 0) findings.push(`Urogenital: ${g.urogenital.join(', ')}`);
                                    // Musculoesquelético
                                    if (g.musculoEsqueletico?.length > 0) findings.push(`Musculoesquelético: ${g.musculoEsqueletico.join(', ')}`);
                                    // Neurológico
                                    if (g.neurologico?.length > 0) findings.push(`Neurológico: ${g.neurologico.join(', ')}`);
                                    
                                    return findings.length > 0 ? (
                                      <ul className="exam-findings">
                                        {findings.map((f, idx) => <li key={idx}>{f}</li>)}
                                      </ul>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                              
                              {/* Exámenes Especializados - Solo mostrar si tienen datos reales */}
                              {(() => {
                                // Función para verificar si un examen tiene datos reales
                                const hasRealData = (exam) => {
                                  if (!exam || typeof exam !== 'object') return false;
                                  return Object.values(exam).some(val => {
                                    if (Array.isArray(val)) return val.length > 0;
                                    if (typeof val === 'string') return val.trim() !== '';
                                    if (typeof val === 'number') return true;
                                    if (typeof val === 'boolean') return val === true;
                                    return false;
                                  });
                                };
                                
                                const hasNeuro = hasRealData(entry.detalles.examenFisico.neurologico);
                                const hasDerma = hasRealData(entry.detalles.examenFisico.dermatologico);
                                const hasOftalmo = hasRealData(entry.detalles.examenFisico.oftalmologico);
                                const hasOrto = hasRealData(entry.detalles.examenFisico.ortopedico);
                                
                                if (!hasNeuro && !hasDerma && !hasOftalmo && !hasOrto) return null;
                                
                                // Función para renderizar hallazgos de un ojo
                                const renderEyeFindings = (exam, side) => {
                                  const findings = [];
                                  const suffix = side === 'OD' ? 'OD' : 'OI';
                                  
                                  if (exam[`parpados${suffix}`]?.length > 0) findings.push(`Párpados: ${exam[`parpados${suffix}`].join(', ')}`);
                                  if (exam[`conjuntiva${suffix}`]?.length > 0) findings.push(`Conjuntiva: ${exam[`conjuntiva${suffix}`].join(', ')}`);
                                  if (exam[`cornea${suffix}`]?.length > 0) findings.push(`Córnea: ${exam[`cornea${suffix}`].join(', ')}`);
                                  if (exam[`camaraAnterior${suffix}`]?.length > 0) findings.push(`Cámara Ant.: ${exam[`camaraAnterior${suffix}`].join(', ')}`);
                                  if (exam[`irisPupila${suffix}`]?.length > 0) findings.push(`Iris/Pupila: ${exam[`irisPupila${suffix}`].join(', ')}`);
                                  if (exam[`reflejosPupilares${suffix}`]?.length > 0) findings.push(`Reflejos: ${exam[`reflejosPupilares${suffix}`].join(', ')}`);
                                  if (exam[`cristalino${suffix}`]?.length > 0) findings.push(`Cristalino: ${exam[`cristalino${suffix}`].join(', ')}`);
                                  if (exam[`presionIntraocular${suffix}`]) findings.push(`PIO: ${exam[`presionIntraocular${suffix}`]}${exam[`pioValor${suffix}`] ? ` (${exam[`pioValor${suffix}`]} mmHg)` : ''}`);
                                  if (exam[`fondoOjo${suffix}`]?.length > 0) findings.push(`Fondo: ${exam[`fondoOjo${suffix}`].join(', ')}`);
                                  
                                  return findings;
                                };
                                
                                return (
                                  <div className="exam-subsection specialized-details">
                                    <h6>Exámenes Especializados Realizados</h6>
                                    <div className="specialized-exams">
                                      {hasNeuro && <span className="exam-badge">🧠 Neurológico</span>}
                                      {hasDerma && <span className="exam-badge">🔬 Dermatológico</span>}
                                      {hasOftalmo && <span className="exam-badge">👁️ Oftalmológico</span>}
                                      {hasOrto && <span className="exam-badge">🦴 Ortopédico</span>}
                                    </div>
                                    
                                    {/* Detalle Oftalmológico con OD/OI */}
                                    {hasOftalmo && entry.detalles.examenFisico.oftalmologico && (
                                      <div className="exam-detail oftalmo-detail">
                                        <h6>👁️ Detalle Oftalmológico</h6>
                                        {entry.detalles.examenFisico.oftalmologico.observacionGeneral?.length > 0 && (
                                          <p><strong>Observación:</strong> {entry.detalles.examenFisico.oftalmologico.observacionGeneral.join(', ')}</p>
                                        )}
                                        <div className="eyes-comparison">
                                          <div className="eye-findings">
                                            <span className="eye-header">OD (Derecho)</span>
                                            {(() => {
                                              const findings = renderEyeFindings(entry.detalles.examenFisico.oftalmologico, 'OD');
                                              return findings.length > 0 ? (
                                                <ul>{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                              ) : <span className="no-findings">Sin hallazgos</span>;
                                            })()}
                                          </div>
                                          <div className="eye-findings">
                                            <span className="eye-header">OI (Izquierdo)</span>
                                            {(() => {
                                              const findings = renderEyeFindings(entry.detalles.examenFisico.oftalmologico, 'OI');
                                              return findings.length > 0 ? (
                                                <ul>{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                              ) : <span className="no-findings">Sin hallazgos</span>;
                                            })()}
                                          </div>
                                        </div>
                                        {entry.detalles.examenFisico.oftalmologico.impresion?.length > 0 && (
                                          <p><strong>Impresión:</strong> {entry.detalles.examenFisico.oftalmologico.impresion.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.oftalmologico.observaciones && (
                                          <p><strong>Observaciones:</strong> {entry.detalles.examenFisico.oftalmologico.observaciones}</p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Detalle Ortopédico con D/I */}
                                    {hasOrto && entry.detalles.examenFisico.ortopedico && (
                                      <div className="exam-detail orto-detail">
                                        <h6>🦴 Detalle Ortopédico</h6>
                                        {entry.detalles.examenFisico.ortopedico.marcha?.length > 0 && (
                                          <p><strong>Marcha:</strong> {entry.detalles.examenFisico.ortopedico.marcha.join(', ')}</p>
                                        )}
                                        {(() => {
                                          const orto = entry.detalles.examenFisico.ortopedico;
                                          const joints = [];
                                          // Torácicas
                                          if (orto.hombroD?.length > 0 || orto.hombroI?.length > 0) {
                                            joints.push({ name: 'Hombro', d: orto.hombroD, i: orto.hombroI });
                                          }
                                          if (orto.codoD?.length > 0 || orto.codoI?.length > 0) {
                                            joints.push({ name: 'Codo', d: orto.codoD, i: orto.codoI });
                                          }
                                          if (orto.carpoD?.length > 0 || orto.carpoI?.length > 0) {
                                            joints.push({ name: 'Carpo', d: orto.carpoD, i: orto.carpoI });
                                          }
                                          // Pélvicas
                                          if (orto.caderaD?.length > 0 || orto.caderaI?.length > 0) {
                                            joints.push({ name: 'Cadera', d: orto.caderaD, i: orto.caderaI });
                                          }
                                          if (orto.rodillaD?.length > 0 || orto.rodillaI?.length > 0) {
                                            joints.push({ name: 'Rodilla', d: orto.rodillaD, i: orto.rodillaI });
                                          }
                                          if (orto.tarsoD?.length > 0 || orto.tarsoI?.length > 0) {
                                            joints.push({ name: 'Tarso', d: orto.tarsoD, i: orto.tarsoI });
                                          }
                                          
                                          return joints.length > 0 ? (
                                            <div className="joints-summary">
                                              {joints.map((j, idx) => (
                                                <div key={idx} className="joint-item">
                                                  <strong>{j.name}:</strong>
                                                  {j.d?.length > 0 && <span> D: {j.d.join(', ')}</span>}
                                                  {j.i?.length > 0 && <span> I: {j.i.join(', ')}</span>}
                                                </div>
                                              ))}
                                            </div>
                                          ) : null;
                                        })()}
                                        {entry.detalles.examenFisico.ortopedico.columna?.length > 0 && (
                                          <p><strong>Columna:</strong> {entry.detalles.examenFisico.ortopedico.columna.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.ortopedico.impresion?.length > 0 && (
                                          <p><strong>Impresión:</strong> {entry.detalles.examenFisico.ortopedico.impresion.join(', ')}</p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Detalle Neurológico */}
                                    {hasNeuro && entry.detalles.examenFisico.neurologico && (
                                      <div className="exam-detail neuro-detail">
                                        <h6>🧠 Detalle Neurológico</h6>
                                        {entry.detalles.examenFisico.neurologico.estadoMental && (
                                          <p><strong>Estado Mental:</strong> {entry.detalles.examenFisico.neurologico.estadoMental}</p>
                                        )}
                                        {entry.detalles.examenFisico.neurologico.postura?.length > 0 && (
                                          <p><strong>Postura:</strong> {entry.detalles.examenFisico.neurologico.postura.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.neurologico.marcha?.length > 0 && (
                                          <p><strong>Marcha:</strong> {entry.detalles.examenFisico.neurologico.marcha.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.neurologico.localizacion?.length > 0 && (
                                          <p><strong>Localización:</strong> {entry.detalles.examenFisico.neurologico.localizacion.join(', ')}</p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Detalle Dermatológico */}
                                    {hasDerma && entry.detalles.examenFisico.dermatologico && (
                                      <div className="exam-detail derma-detail">
                                        <h6>🔬 Detalle Dermatológico</h6>
                                        {entry.detalles.examenFisico.dermatologico.condicionPiel?.length > 0 && (
                                          <p><strong>Condición:</strong> {entry.detalles.examenFisico.dermatologico.condicionPiel.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.dermatologico.pelaje?.length > 0 && (
                                          <p><strong>Pelaje:</strong> {entry.detalles.examenFisico.dermatologico.pelaje.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.dermatologico.lesionesPrimarias?.length > 0 && (
                                          <p><strong>Lesiones Primarias:</strong> {entry.detalles.examenFisico.dermatologico.lesionesPrimarias.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.dermatologico.lesionesSecundarias?.length > 0 && (
                                          <p><strong>Lesiones Secundarias:</strong> {entry.detalles.examenFisico.dermatologico.lesionesSecundarias.join(', ')}</p>
                                        )}
                                        {entry.detalles.examenFisico.dermatologico.impresion?.length > 0 && (
                                          <p><strong>Impresión:</strong> {entry.detalles.examenFisico.dermatologico.impresion.join(', ')}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {/* Vital Signs */}
                        {entry.detalles.signosVitales && (
                          <div className="history-section vitals-section">
                            <h5>🌡️ Vital Signs</h5>
                            <div className="vitals-grid">
                              {entry.detalles.signosVitales.temperatura && (
                                <div className="vital-item">
                                  <span className="vital-icon">🌡️</span>
                                  <span className="vital-value">{entry.detalles.signosVitales.temperatura}°C</span>
                                  <span className="vital-label">Temp.</span>
                                </div>
                              )}
                              {entry.detalles.signosVitales.frecuenciaCardiaca && (
                                <div className="vital-item">
                                  <span className="vital-icon">❤️</span>
                                  <span className="vital-value">{entry.detalles.signosVitales.frecuenciaCardiaca}</span>
                                  <span className="vital-label">FC (bpm)</span>
                                </div>
                              )}
                              {entry.detalles.signosVitales.frecuenciaRespiratoria && (
                                <div className="vital-item">
                                  <span className="vital-icon">💨</span>
                                  <span className="vital-value">{entry.detalles.signosVitales.frecuenciaRespiratoria}</span>
                                  <span className="vital-label">FR (rpm)</span>
                                </div>
                              )}
                              {entry.detalles.signosVitales.peso && (
                                <div className="vital-item">
                                  <span className="vital-icon">⚖️</span>
                                  <span className="vital-value">{entry.detalles.signosVitales.peso} kg</span>
                                  <span className="vital-label">Weight</span>
                                </div>
                              )}
                              {(entry.detalles.signosVitales.presionSistolica || entry.detalles.signosVitales.presionDiastolica) && (
                                <div className="vital-item">
                                  <span className="vital-icon">🩺</span>
                                  <span className="vital-value">
                                    {entry.detalles.signosVitales.presionSistolica}/{entry.detalles.signosVitales.presionDiastolica}
                                  </span>
                                  <span className="vital-label">PA (mmHg)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Diagnoses */}
                        {entry.detalles.diagnosticos && entry.detalles.diagnosticos.length > 0 && (
                          <div className="history-section diagnosis-section">
                            <h5>🔍 Diagnoses</h5>
                            <div className="diagnosis-list">
                              {entry.detalles.diagnosticos.map((d, i) => (
                                <div key={i} className="diagnosis-item">
                                  <span className="diagnosis-text">{d.descripcion}</span>
                                  <div className="diagnosis-badges">
                                    <span className={`badge tipo-${d.tipo?.toLowerCase()}`}>{d.tipo}</span>
                                    {d.severidad && <span className={`badge severity-${d.severidad?.toLowerCase()}`}>{d.severidad}</span>}
                                    {d.codigoCIE10 && <span className="badge code">{d.codigoCIE10}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Prescriptions */}
                        {entry.detalles.recetas && entry.detalles.recetas.length > 0 && (
                          <div className="history-section prescription-section">
                            <h5>💊 Prescriptions</h5>
                            {entry.detalles.recetas.map((receta, ri) => (
                              <div key={ri} className="prescription-card">
                                {receta.items.map((item, ii) => (
                                  <div key={ii} className="medication-item">
                                    <div className="med-name">{item.medicamento}</div>
                                    <div className="med-details">
                                      {item.dosis && <span>📏 {item.dosis}</span>}
                                      {item.frecuencia && <span>⏰ {item.frecuencia}</span>}
                                      {item.duracion && <span>📅 {item.duracion}</span>}
                                      {item.via && <span>💉 Route: {item.via}</span>}
                                    </div>
                                    {item.instrucciones && (
                                      <div className="med-instructions">📝 {item.instrucciones}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Laboratory Studies */}
                        {entry.detalles.laboratorios && entry.detalles.laboratorios.length > 0 && (
                          <div className="history-section lab-section">
                            <h5>🔬 Laboratory Studies</h5>
                            <div className="lab-list">
                              {entry.detalles.laboratorios.map((lab, li) => (
                                <div key={li} className={`lab-item status-${lab.estado?.toLowerCase()}`}>
                                  <div className="lab-header">
                                    <span className="lab-type">{lab.tipo}</span>
                                    <span className={`lab-status ${lab.estado?.toLowerCase()}`}>{lab.estado}</span>
                                  </div>
                                  {lab.notas && <p className="lab-notes">{lab.notas}</p>}
                                  {lab.resultados && (
                                    <div className="lab-results">
                                      <strong>Results:</strong> {lab.resultados}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Hospitalization details */}
                        {entry.tipo === 'hospitalizacion' && (
                          <div className="history-section hosp-section">
                            {entry.detalles.motivo && (
                              <p><strong>📝 Reason:</strong> {entry.detalles.motivo}</p>
                            )}
                            {entry.detalles.ubicacion && (
                              <p><strong>📍 Location:</strong> {entry.detalles.ubicacion}</p>
                            )}
                            {entry.detalles.cuidadosEspeciales && (
                              <p><strong>⚠️ Special Care:</strong> {entry.detalles.cuidadosEspeciales}</p>
                            )}
                            {entry.detalles.dieta && (
                              <p><strong>🍽️ Diet:</strong> {entry.detalles.dieta}</p>
                            )}
                            {entry.detalles.monitoreos && entry.detalles.monitoreos.length > 0 && (
                              <div className="monitoring-history">
                                <h6>📊 Monitoring ({entry.detalles.monitoreos.length})</h6>
                                <div className="monitoring-list">
                                  {entry.detalles.monitoreos.slice(-3).map((m, mi) => (
                                    <div key={mi} className="monitoring-item">
                                      <span className="monitoring-date">
                                        {new Date(m.fecha).toLocaleString('es-MX')}
                                      </span>
                                      <span>
                                        {m.temperatura && `🌡️${m.temperatura}°C `}
                                        {m.frecuenciaCardiaca && `❤️${m.frecuenciaCardiaca} `}
                                        {m.estado}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.detalles.fechaAlta && (
                              <p className="discharge-info">
                                <strong>✅ Alta:</strong> {entry.detalles.fechaAlta}
                                {entry.detalles.notasAlta && ` - ${entry.detalles.notasAlta}`}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Surgery details */}
                        {entry.tipo === 'cirugia' && entry.detalles && (
                          <div className="history-section surgery-section">
                            {entry.detalles.anestesia && (
                              <p><strong>💉 Anesthesia:</strong> {entry.detalles.anestesia}</p>
                            )}
                            {entry.detalles.duracion && (
                              <p><strong>⏱️ Duration:</strong> {entry.detalles.duracion} min</p>
                            )}
                            {entry.detalles.notasPreOp && (
                              <p><strong>📋 Pre-Op:</strong> {entry.detalles.notasPreOp}</p>
                            )}
                            {entry.detalles.notas && (
                              <p><strong>📝 Notes:</strong> {entry.detalles.notas}</p>
                            )}
                            {entry.detalles.notasPostOp && (
                              <p><strong>✅ Post-Op:</strong> {entry.detalles.notasPostOp}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
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
    </div>
  );
}

export default MedicoDashboard;
