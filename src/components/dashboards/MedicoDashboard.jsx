import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useMedico from '../../hooks/useMedico';
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
  
  // Estado para historial completo desde API
  const [historialData, setHistorialData] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Form states
  const [consultationNotes, setConsultationNotes] = useState({
    subjetivo: '',
    objetivo: '',
    analisis: '',
    plan: ''
  });
  
  // Track which SOAP sections have been saved
  const [savedSections, setSavedSections] = useState({
    subjetivo: false,
    objetivo: false,
    analisis: false,
    plan: false
  });

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
    nombre: '',
    dosis: '',
    frecuencia: '',
    via: 'ORAL',
    duracion: ''
  });

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

  // Opciones de estudios (enums del backend)
  const studiesOptions = [
    { id: 'HEMOGRAMA', name: t('medico.studies.hemograma', 'Hemograma Completo') },
    { id: 'QUIMICA_SANGUINEA', name: t('medico.studies.bioquimica', 'Química Sanguínea') },
    { id: 'URINALISIS', name: t('medico.studies.urinalisis', 'Uroanálisis') },
    { id: 'COPROLOGIA', name: t('medico.studies.coprologico', 'Coproparasitoscópico') },
    { id: 'RAYOS_X', name: t('medico.studies.radiografia', 'Radiografía') },
    { id: 'ULTRASONIDO', name: t('medico.studies.ecografia', 'Ecografía') },
    { id: 'ELECTROCARDIOGRAMA', name: t('medico.studies.electrocardiograma', 'Electrocardiograma') },
    { id: 'PERFIL_TIROIDEO', name: t('medico.studies.tiroideo', 'Perfil Tiroideo') },
    { id: 'CITOLOGIA', name: t('medico.studies.citologia', 'Citología') },
    { id: 'BIOPSIA', name: t('medico.studies.biopsia', 'Biopsia') }
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
      setLocalError(t('medico.errors.noVisitId', 'El paciente no tiene una visita activa'));
      return;
    }
    
    // Si ya tiene una consulta activa, solo establecerla sin crear nueva
    if (patient.consultationId) {
      console.log('[handleStartConsultation] Paciente ya tiene consulta, estableciendo como activa:', patient.consultationId);
      setActiveConsultation({
        id: patient.consultationId,
        patientId: patient.id,
        visitId: patient.visitId,
        status: 'IN_PROGRESS'
      });
      setSelectedPatient(patient);
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
        setConsultationNotes({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
        setSavedSections({ subjetivo: false, objetivo: false, analisis: false, plan: false });
      }
    } catch (err) {
      console.error('[handleStartConsultation] Error:', err);
      setLocalError(err.message || t('medico.errors.startConsultation', 'Error al iniciar consulta'));
    } finally {
      setLocalLoading(false);
    }
  }, [iniciarConsulta, t]);

  const handleEndConsultation = useCallback(async () => {
    if (!selectedPatient || !activeConsultation?.id) {
      setLocalError(t('medico.errors.noActiveConsultation', 'No hay consulta activa'));
      return;
    }
    
    setLocalLoading(true);
    try {
      await completarConsulta(activeConsultation.id, {
        diagnosis: consultationNotes.analisis || 'Consulta completada',
        soapPlan: consultationNotes.plan || 'Seguimiento según indicaciones',
      });
      
      setActiveConsultation(null);
      setSelectedPatient(null);
      setConsultationNotes({ subjetivo: '', objetivo: '', analisis: '', plan: '' });
      setSavedSections({ subjetivo: false, objetivo: false, analisis: false, plan: false });
    } catch (err) {
      setLocalError(err.message || t('medico.errors.endConsultation', 'Error al finalizar consulta'));
    } finally {
      setLocalLoading(false);
    }
  }, [selectedPatient, activeConsultation, consultationNotes, completarConsulta, t]);

  // Guardar sección SOAP individual
  const handleSaveSOAPSection = useCallback(async (section) => {
    if (!activeConsultation?.id) {
      setLocalError(t('medico.errors.noActiveConsultation', 'No hay consulta activa'));
      return;
    }
    
    const value = consultationNotes[section];
    if (!value || value.trim() === '') {
      return; // No guardar si está vacío
    }
    
    setLocalLoading(true);
    try {
      // Mapear nombres de campo frontend a backend
      const fieldMap = {
        subjetivo: 'soapSubjective',
        objetivo: 'soapObjective',
        analisis: 'soapAssessment',
        plan: 'soapPlan'
      };
      
      await actualizarConsulta(activeConsultation.id, {
        [fieldMap[section]]: value
      });
      
      // Marcar la sección como guardada
      setSavedSections(prev => ({ ...prev, [section]: true }));
    } catch (err) {
      console.error(`Error guardando ${section}:`, err);
      setLocalError(err.message || t('medico.errors.saveSOAP', 'Error al guardar notas'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, consultationNotes, actualizarConsulta, t]);

  const handleSaveVitals = useCallback(async () => {
    if (!activeConsultation) {
      setLocalError(t('medico.errors.noActiveConsultation', 'No hay consulta activa'));
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
      setLocalError(err.message || t('medico.errors.saveVitals', 'Error al guardar signos vitales'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, vitalsForm, guardarSignosVitales, t]);

  const handleAddDiagnosis = useCallback(async () => {
    if (!activeConsultation || !diagnosisForm.descripcion) {
      setLocalError(t('medico.errors.diagnosisRequired', 'Descripción del diagnóstico requerida'));
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
      setLocalError(err.message || t('medico.errors.addDiagnosis', 'Error al agregar diagnóstico'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, diagnosisForm, agregarDiagnostico, t]);

  const handleAddMedication = useCallback(() => {
    if (!currentMedication.nombre || !currentMedication.dosis) return;
    
    setPrescriptionForm(prev => ({
      ...prev,
      medicamentos: [...prev.medicamentos, { ...currentMedication, id: Date.now() }]
    }));
    
    setCurrentMedication({
      nombre: '',
      dosis: '',
      frecuencia: '',
      via: 'ORAL',
      duracion: ''
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
      setLocalError(t('medico.errors.noMedications', 'Debe agregar al menos un medicamento'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No hay paciente seleccionado'));
      return;
    }
    
    setLocalLoading(true);
    try {
      console.log('[handleCreatePrescription] calling crearReceta with:', activeConsultation.id);
      await crearReceta(activeConsultation.id, {
        petId: selectedPatient.id,
        items: prescriptionForm.medicamentos.map(m => ({
          nombre: m.nombre,
          dosis: m.dosis,
          frecuencia: m.frecuencia,
          duracion: m.duracion || '7 días',
          cantidad: 1
        })),
        instruccionesGenerales: prescriptionForm.instrucciones || undefined
      });
      
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicamentos: [], instrucciones: '', duracion: '' });
    } catch (err) {
      setLocalError(err.message || t('medico.errors.createPrescription', 'Error al crear receta'));
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
      setLocalError(t('medico.errors.noStudies', 'Debe seleccionar al menos un estudio'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No hay paciente seleccionado'));
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
      setLocalError(err.message || t('medico.errors.createLabOrder', 'Error al crear orden de laboratorio'));
    } finally {
      setLocalLoading(false);
    }
  }, [activeConsultation, selectedPatient, labOrderForm, crearOrdenLab, t]);

  const handleCreateHospitalization = useCallback(async () => {
    if (!activeConsultation || !hospitalizationForm.motivo) {
      setLocalError(t('medico.errors.hospitalizationReasonRequired', 'Motivo de hospitalización requerido'));
      return;
    }
    if (!selectedPatient?.id) {
      setLocalError(t('medico.errors.noPatient', 'No hay paciente seleccionado'));
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
      setLocalError(err.message || t('medico.errors.hospitalize', 'Error al hospitalizar paciente'));
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
          soap: {},
          diagnosticos: [],
          signosVitales: null,
          recetas: [],
          laboratorios: [],
          notas: consulta.notes || null
        };
        
        // SOAP Notes
        if (consulta.soapSubjective) detalles.soap.subjetivo = consulta.soapSubjective;
        if (consulta.soapObjective) detalles.soap.objetivo = consulta.soapObjective;
        if (consulta.soapAssessment) detalles.soap.analisis = consulta.soapAssessment;
        if (consulta.soapPlan) detalles.soap.plan = consulta.soapPlan;
        
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
          accion: `Consulta${consulta.status === 'COMPLETADA' ? ' Completada' : ''}`,
          tipo: 'consulta',
          status: consulta.status,
          detalles: detalles,
          doctor: consulta.doctor?.nombre || 'Médico',
          duracion: consulta.duration ? `${consulta.duration} min` : null
        });
      });
    }
    
    // Agregar hospitalizaciones con detalles
    if (hospitalizaciones && Array.isArray(hospitalizaciones)) {
      hospitalizaciones.forEach(hosp => {
        history.push({
          timestamp: hosp.admittedAt,
          accion: `Hospitalización${hosp.status === 'ALTA' ? ' (Alta)' : ''}`,
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
          doctor: hosp.admittedBy?.nombre || 'Médico'
        });
      });
    }
    
    // Agregar cirugías
    if (cirugias && Array.isArray(cirugias)) {
      cirugias.forEach(surgery => {
        history.push({
          timestamp: surgery.scheduledDate,
          accion: `Cirugía - ${surgery.type || surgery.procedureName || 'Procedimiento'}`,
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
          doctor: surgery.surgeon?.nombre || 'Cirujano'
        });
      });
    }
    
    // Agregar vacunas
    if (vacunas && Array.isArray(vacunas)) {
      vacunas.forEach(vacuna => {
        history.push({
          timestamp: vacuna.fecha,
          accion: `Vacuna - ${vacuna.nombre || vacuna.tipo}`,
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
          soap: {},
          diagnosticos: [],
          signosVitales: null,
          recetas: [],
          laboratorios: [],
          notas: consulta.notes || null
        };
        
        // SOAP Notes
        if (consulta.soapSubjective) detalles.soap.subjetivo = consulta.soapSubjective;
        if (consulta.soapObjective) detalles.soap.objetivo = consulta.soapObjective;;
        if (consulta.soapAssessment) detalles.soap.analisis = consulta.soapAssessment;
        if (consulta.soapPlan) detalles.soap.plan = consulta.soapPlan;
        
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
          accion: `Consulta${consulta.status === 'COMPLETADA' ? ' Completada' : ' en curso'}`,
          tipo: 'consulta',
          status: consulta.status,
          detalles: detalles,
          doctor: consulta.doctor?.nombre || 'Médico',
          duracion: consulta.duration ? `${consulta.duration} min` : null
        });
      });
    }
    
    // Agregar visitas sin consulta
    if (selectedPatient.visits && Array.isArray(selectedPatient.visits)) {
      selectedPatient.visits.forEach(visit => {
        // Solo agregar si no tiene consulta (para evitar duplicados)
        if (!visit.consultation) {
          history.push({
            timestamp: visit.arrivalTime,
            accion: `Visita - ${visit.tipoVisita || 'Consulta'} (${visit.status})`,
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
    
    // Agregar hospitalizaciones con detalles
    if (selectedPatient.hospitalizations && Array.isArray(selectedPatient.hospitalizations)) {
      selectedPatient.hospitalizations.forEach(hosp => {
        history.push({
          timestamp: hosp.admittedAt,
          accion: `Hospitalización${hosp.status === 'ALTA' ? ' (Alta)' : ' (Activa)'}`,
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
          doctor: hosp.admittedBy?.nombre || 'Médico'
        });
      });
    }
    
    // Agregar cirugías
    if (selectedPatient.surgeries && Array.isArray(selectedPatient.surgeries)) {
      selectedPatient.surgeries.forEach(surgery => {
        history.push({
          timestamp: surgery.scheduledDate,
          accion: `Cirugía - ${surgery.type || surgery.procedureName || 'Procedimiento'}`,
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
          doctor: surgery.surgeon?.nombre || 'Cirujano'
        });
      });
    }
    
    // Ordenar por fecha descendente
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
      'PENDIENTE': t('medico.status.pending', 'Pendiente'),
      'CONFIRMADA': t('medico.status.confirmed', 'Confirmada'),
      'EN_CONSULTA': t('medico.status.inConsultation', 'En Consulta'),
      'COMPLETADA': t('medico.status.completed', 'Completada'),
      'NO_ASISTIO': t('medico.status.noShow', 'No Asistió'),
      'CANCELADA': t('medico.status.cancelled', 'Cancelada')
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="dashboard medico-dashboard">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{t('common.loading', 'Cargando...')}</p>
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
                      <div className="patient-details-small">{cita.tipo} • {patient?.propietario?.nombre || 'Propietario'}</div>
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
              : `👨‍⚕️ ${t('medico.consultationWorkspace', 'Área de Consulta')}`
            }
          </h2>
          <p>{t('medico.doctor', 'Dr.')} {user?.nombre} - {user?.especialidad || t('medico.generalPractice', 'Medicina General')}</p>
        </div>

        {!selectedPatient && !activeConsultation && (
          <div className="consultation-empty">
            <div className="empty-consultation-content">
              <span className="empty-icon-large">👨‍⚕️</span>
              <h3>{t('medico.selectPatient', 'Selecciona un paciente')}</h3>
              <p>{t('medico.selectPatientDesc', 'Selecciona un paciente del panel izquierdo para iniciar una consulta')}</p>
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
            
            {/* Sección: Visita Actual */}
            <div className="info-section">
              <h4 className="section-label">🏥 Visita Actual</h4>
              <div className="preview-details-grid">
                <div className="detail-card highlight">
                  <span className="detail-icon">📝</span>
                  <div className="detail-content">
                    <span className="detail-label">Motivo de Consulta</span>
                    <span className="detail-value">{selectedPatient.motivo || 'No especificado'}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🎯</span>
                  <div className="detail-content">
                    <span className="detail-label">Prioridad</span>
                    <span className={`priority-badge ${selectedPatient.prioridad?.toLowerCase() || 'media'}`}>
                      {selectedPatient.prioridad || 'MEDIA'}
                    </span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">⚖️</span>
                  <div className="detail-content">
                    <span className="detail-label">Peso Actual</span>
                    <span className="detail-value">{selectedPatient.peso ? `${selectedPatient.peso} kg` : 'No registrado'}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🌡️</span>
                  <div className="detail-content">
                    <span className="detail-label">Temperatura</span>
                    <span className="detail-value">{selectedPatient.temperatura ? `${selectedPatient.temperatura}°C` : 'No registrada'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Datos del Paciente */}
            <div className="info-section">
              <h4 className="section-label">🐾 Datos del Paciente</h4>
              <div className="preview-details-grid three-cols">
                <div className="detail-card compact">
                  <span className="detail-icon-small">🏷️</span>
                  <div className="detail-content">
                    <span className="detail-label">Especie</span>
                    <span className="detail-value">{selectedPatient.especie}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">🐕</span>
                  <div className="detail-content">
                    <span className="detail-label">Raza</span>
                    <span className="detail-value">{selectedPatient.raza || 'Sin especificar'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">📅</span>
                  <div className="detail-content">
                    <span className="detail-label">Edad</span>
                    <span className="detail-value">{selectedPatient.edad || 'No registrada'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">⚧</span>
                  <div className="detail-content">
                    <span className="detail-label">Sexo</span>
                    <span className="detail-value">{selectedPatient.sexo}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">🎨</span>
                  <div className="detail-content">
                    <span className="detail-label">Color</span>
                    <span className="detail-value">{selectedPatient.color || 'No especificado'}</span>
                  </div>
                </div>
                <div className="detail-card compact">
                  <span className="detail-icon-small">💉</span>
                  <div className="detail-content">
                    <span className="detail-label">Esterilizado</span>
                    <span className="detail-value">{selectedPatient.esterilizado ? 'Sí' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Propietario */}
            <div className="info-section">
              <h4 className="section-label">👤 Propietario</h4>
              <div className="preview-details-grid">
                <div className="detail-card">
                  <span className="detail-icon">👤</span>
                  <div className="detail-content">
                    <span className="detail-label">Nombre</span>
                    <span className="detail-value">{selectedPatient.propietario}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">📱</span>
                  <div className="detail-content">
                    <span className="detail-label">Teléfono</span>
                    <span className="detail-value clickable">{selectedPatient.telefono || 'No registrado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas/Antecedentes si existen */}
            {selectedPatient.antecedentes && (
              <div className="info-section">
                <h4 className="section-label">📋 Antecedentes</h4>
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
                <span className="timer-value">{new Date(activeConsultation.startTime).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="soap-notes">
              <div className="soap-section">
                <div className="soap-header">
                  <label><span className="soap-letter">S</span>{t('medico.subjective', 'Subjetivo')}</label>
                  <button 
                    className={`soap-save-btn ${savedSections.subjetivo ? 'saved' : ''}`}
                    onClick={() => handleSaveSOAPSection('subjetivo')}
                    disabled={!consultationNotes.subjetivo || localLoading}
                    title={savedSections.subjetivo ? 'Guardado' : 'Guardar'}
                  >
                    {savedSections.subjetivo ? '✓' : '💾'}
                  </button>
                </div>
                <textarea
                  placeholder={t('medico.subjectivePlaceholder', 'Historia clínica, síntomas reportados por el dueño...')}
                  value={consultationNotes.subjetivo}
                  onChange={(e) => {
                    setConsultationNotes(prev => ({ ...prev, subjetivo: e.target.value }));
                    setSavedSections(prev => ({ ...prev, subjetivo: false }));
                  }}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <div className="soap-header">
                  <label><span className="soap-letter">O</span>{t('medico.objective', 'Objetivo')}</label>
                  <button 
                    className={`soap-save-btn ${savedSections.objetivo ? 'saved' : ''}`}
                    onClick={() => handleSaveSOAPSection('objetivo')}
                    disabled={!consultationNotes.objetivo || localLoading}
                    title={savedSections.objetivo ? 'Guardado' : 'Guardar'}
                  >
                    {savedSections.objetivo ? '✓' : '💾'}
                  </button>
                </div>
                <textarea
                  placeholder={t('medico.objectivePlaceholder', 'Hallazgos del examen físico, signos vitales...')}
                  value={consultationNotes.objetivo}
                  onChange={(e) => {
                    setConsultationNotes(prev => ({ ...prev, objetivo: e.target.value }));
                    setSavedSections(prev => ({ ...prev, objetivo: false }));
                  }}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <div className="soap-header">
                  <label><span className="soap-letter">A</span>{t('medico.assessment', 'Análisis')}</label>
                  <button 
                    className={`soap-save-btn ${savedSections.analisis ? 'saved' : ''}`}
                    onClick={() => handleSaveSOAPSection('analisis')}
                    disabled={!consultationNotes.analisis || localLoading}
                    title={savedSections.analisis ? 'Guardado' : 'Guardar'}
                  >
                    {savedSections.analisis ? '✓' : '💾'}
                  </button>
                </div>
                <textarea
                  placeholder={t('medico.assessmentPlaceholder', 'Diagnóstico diferencial, interpretación...')}
                  value={consultationNotes.analisis}
                  onChange={(e) => {
                    setConsultationNotes(prev => ({ ...prev, analisis: e.target.value }));
                    setSavedSections(prev => ({ ...prev, analisis: false }));
                  }}
                  rows="3"
                />
              </div>
              
              <div className="soap-section">
                <div className="soap-header">
                  <label><span className="soap-letter">P</span>{t('medico.plan', 'Plan')}</label>
                  <button 
                    className={`soap-save-btn ${savedSections.plan ? 'saved' : ''}`}
                    onClick={() => handleSaveSOAPSection('plan')}
                    disabled={!consultationNotes.plan || localLoading}
                    title={savedSections.plan ? 'Guardado' : 'Guardar'}
                  >
                    {savedSections.plan ? '✓' : '💾'}
                  </button>
                </div>
                <textarea
                  placeholder={t('medico.planPlaceholder', 'Plan de tratamiento, seguimiento...')}
                  value={consultationNotes.plan}
                  onChange={(e) => {
                    setConsultationNotes(prev => ({ ...prev, plan: e.target.value }));
                    setSavedSections(prev => ({ ...prev, plan: false }));
                  }}
                  rows="3"
                />
              </div>
            </div>

            <div className="quick-actions">
              <button className="action-btn vitals" onClick={() => setShowVitalsModal(true)}>
                🌡️ {t('medico.recordVitals', 'Signos Vitales')}
              </button>
              <button className="action-btn diagnosis" onClick={() => setShowDiagnosisModal(true)}>
                🔍 {t('medico.addDiagnosis', 'Diagnóstico')}
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
            </div>

            <div className="consultation-footer">
              <button className="btn-secondary" onClick={() => { setActiveConsultation(null); setSelectedPatient(null); }}>
                {t('common.cancel', 'Cancelar')}
              </button>
              <button className="btn-end-consultation" onClick={handleEndConsultation}>
                ✅ {t('medico.endConsultation', 'Finalizar Consulta')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL - Patient Information */}
      <aside className="right-panel">
        <div className="panel-header">
          <h3>📋 {t('medico.patientInfo', 'Información del Paciente')}</h3>
        </div>

        {!selectedPatient ? (
          <div className="patient-info-empty">
            <span className="empty-icon">🐾</span>
            <p>{t('medico.noPatientSelected', 'Selecciona un paciente para ver su información')}</p>
          </div>
        ) : (
          <div className="patient-info-content">
            <div className="info-card">
              <h4>{t('medico.patientDetails', 'Datos del Paciente')}</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('medico.species', 'Especie')}</span>
                  <span className="info-value">{selectedPatient.especie}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.breed', 'Raza')}</span>
                  <span className="info-value">{selectedPatient.raza}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.age', 'Edad')}</span>
                  <span className="info-value">{selectedPatient.edad}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.sex', 'Sexo')}</span>
                  <span className="info-value">{selectedPatient.sexo}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.weight', 'Peso')}</span>
                  <span className="info-value">{selectedPatient.peso}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('medico.fileNumber', 'Ficha')}</span>
                  <span className="info-value ficha">{selectedPatient.numeroFicha}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.ownerDetails', 'Datos del Propietario')}</h4>
              <div className="owner-info">
                <p className="owner-name">{selectedPatient.propietario}</p>
                <a href={`tel:${selectedPatient.telefono}`} className="owner-phone">📞 {selectedPatient.telefono}</a>
              </div>
            </div>

            <div className="info-card">
              <h4>{t('medico.currentVisit', 'Visita Actual')}</h4>
              <div className="visit-info">
                <div className="visit-item">
                  <span className="visit-label">{t('medico.reason', 'Motivo')}</span>
                  <span className="visit-value">{selectedPatient.motivo || '-'}</span>
                </div>
                <div className="visit-item">
                  <span className="visit-label">{t('medico.priority', 'Prioridad')}</span>
                  <span className={`priority-badge ${selectedPatient.prioridad?.toLowerCase() || 'normal'}`}>
                    {selectedPatient.prioridad || 'Normal'}
                  </span>
                </div>
                {selectedPatient.antecedentes && (
                  <div className="visit-item full">
                    <span className="visit-label">{t('medico.history', 'Antecedentes')}</span>
                    <span className="visit-value">{selectedPatient.antecedentes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card actions">
              <h4>{t('medico.quickActions', 'Acciones Rápidas')}</h4>
              <div className="quick-action-buttons">
                <button className="quick-action-btn" onClick={handleOpenHistory}>
                  📋 {t('medico.viewFullHistory', 'Ver Historial Completo')}
                </button>
                {selectedPatient.estado === 'HOSPITALIZADO' && (
                  <button className="quick-action-btn" onClick={() => setShowVitalsModal(true)}>
                    📝 {t('medico.recordMonitoring', 'Registrar Monitoreo')}
                  </button>
                )}
                {!activeConsultation && selectedPatient.estado !== 'HOSPITALIZADO' && (
                  <button className="quick-action-btn primary" onClick={() => handleStartConsultation(selectedPatient)}>
                    🏥 {t('medico.startConsultation', 'Iniciar Consulta')}
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
                  <p className="no-history">{t('medico.noRecentHistory', 'Sin historial reciente')}</p>
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
            <h2>🌡️ {t('medico.recordVitalSigns', 'Registrar Signos Vitales')}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>🌡️ {t('medico.temperature', 'Temperatura')} (°C)</label>
                <input type="number" step="0.1" className="form-control" placeholder="38.5" value={vitalsForm.temperatura} onChange={(e) => setVitalsForm(prev => ({ ...prev, temperatura: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>❤️ {t('medico.heartRate', 'Frecuencia Cardíaca')} (lpm)</label>
                <input type="number" className="form-control" placeholder="80" value={vitalsForm.frecuenciaCardiaca} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaCardiaca: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🫁 {t('medico.respiratoryRate', 'Frecuencia Respiratoria')} (rpm)</label>
                <input type="number" className="form-control" placeholder="20" value={vitalsForm.frecuenciaRespiratoria} onChange={(e) => setVitalsForm(prev => ({ ...prev, frecuenciaRespiratoria: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🩺 {t('medico.bloodPressure', 'Presión Arterial')} (mmHg)</label>
                <input type="text" className="form-control" placeholder="120/80" value={vitalsForm.presionArterial} onChange={(e) => setVitalsForm(prev => ({ ...prev, presionArterial: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>⚖️ {t('medico.weight', 'Peso')} (kg)</label>
                <input type="number" step="0.1" className="form-control" placeholder="15.5" value={vitalsForm.peso} onChange={(e) => setVitalsForm(prev => ({ ...prev, peso: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>🧠 {t('medico.consciousnessLevel', 'Nivel de Conciencia')}</label>
                <select className="form-control" value={vitalsForm.nivelConciencia} onChange={(e) => setVitalsForm(prev => ({ ...prev, nivelConciencia: e.target.value }))}>
                  <option value="Alerta">Alerta</option>
                  <option value="Somnoliento">Somnoliento</option>
                  <option value="Desorientado">Desorientado</option>
                  <option value="Estuporoso">Estuporoso</option>
                  <option value="Inconsciente">Inconsciente</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>😣 {t('medico.painScale', 'Escala de Dolor')} (0-10)</label>
                <input type="range" min="0" max="10" className="pain-scale-input" value={vitalsForm.escalaDolor} onChange={(e) => setVitalsForm(prev => ({ ...prev, escalaDolor: e.target.value }))} />
                <span className="pain-value">{vitalsForm.escalaDolor}/10</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowVitalsModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleSaveVitals} disabled={!vitalsForm.temperatura || !vitalsForm.frecuenciaCardiaca}>{t('common.save', 'Guardar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔍 {t('medico.addDiagnosis', 'Agregar Diagnóstico')}</h2>
            <div className="form-group">
              <label>{t('medico.diagnosisCode', 'Código (CIE-10)')}</label>
              <input type="text" className="form-control" placeholder="Ej: J06.9" value={diagnosisForm.codigo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, codigo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>{t('medico.diagnosisDescription', 'Descripción')} *</label>
              <textarea className="form-control" placeholder={t('medico.diagnosisDescPlaceholder', 'Describa el diagnóstico...')} rows="3" value={diagnosisForm.descripcion} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.diagnosisType', 'Tipo')}</label>
                <select className="form-control" value={diagnosisForm.tipo} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, tipo: e.target.value }))}>
                  <option value="PRESUNTIVO">{t('medico.presumptive', 'Presuntivo')}</option>
                  <option value="DEFINITIVO">{t('medico.definitive', 'Definitivo')}</option>
                  <option value="DIFERENCIAL">{t('medico.differential', 'Diferencial')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.severity', 'Severidad')}</label>
                <select className="form-control" value={diagnosisForm.severidad} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, severidad: e.target.value }))}>
                  <option value="LEVE">{t('medico.mild', 'Leve')}</option>
                  <option value="MODERADO">{t('medico.moderate', 'Moderado')}</option>
                  <option value="SEVERO">{t('medico.severe', 'Severo')}</option>
                  <option value="CRITICO">{t('medico.critical', 'Crítico')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.additionalNotes', 'Notas adicionales')}</label>
              <textarea className="form-control" placeholder={t('medico.additionalNotesPlaceholder', 'Observaciones adicionales...')} rows="2" value={diagnosisForm.notas} onChange={(e) => setDiagnosisForm(prev => ({ ...prev, notas: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDiagnosisModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleAddDiagnosis} disabled={!diagnosisForm.descripcion}>{t('medico.addDiagnosis', 'Agregar Diagnóstico')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <h2>💊 {t('medico.createPrescription', 'Crear Receta')}</h2>
            <div className="quick-medications">
              <p>{t('medico.commonMedications', 'Medicamentos comunes')}:</p>
              <div className="med-chips">
                {commonMedications.map(med => (
                  <button key={med} className="med-chip" onClick={() => setCurrentMedication(prev => ({ ...prev, nombre: med }))}>+ {med}</button>
                ))}
              </div>
            </div>
            <div className="add-medication-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('medico.medicationName', 'Medicamento')}</label>
                  <input type="text" className="form-control" placeholder={t('medico.medicationNamePlaceholder', 'Nombre del medicamento')} value={currentMedication.nombre} onChange={(e) => setCurrentMedication(prev => ({ ...prev, nombre: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('medico.dose', 'Dosis')}</label>
                  <input type="text" className="form-control" placeholder="Ej: 500mg" value={currentMedication.dosis} onChange={(e) => setCurrentMedication(prev => ({ ...prev, dosis: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('medico.frequency', 'Frecuencia')}</label>
                  <input type="text" className="form-control" placeholder="Ej: Cada 8 horas" value={currentMedication.frecuencia} onChange={(e) => setCurrentMedication(prev => ({ ...prev, frecuencia: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('medico.route', 'Vía')}</label>
                  <select className="form-control" value={currentMedication.via} onChange={(e) => setCurrentMedication(prev => ({ ...prev, via: e.target.value }))}>
                    <option value="ORAL">Oral</option>
                    <option value="INYECTABLE">Inyectable</option>
                    <option value="TOPICO">Tópico</option>
                    <option value="OFTALMICA">Oftálmica</option>
                    <option value="OTICA">Ótica</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('medico.duration', 'Duración')}</label>
                  <input type="text" className="form-control" placeholder="Ej: 7 días" value={currentMedication.duracion} onChange={(e) => setCurrentMedication(prev => ({ ...prev, duracion: e.target.value }))} />
                </div>
              </div>
              <button className="btn-add-medication" onClick={handleAddMedication} disabled={!currentMedication.nombre || !currentMedication.dosis}>+ {t('medico.addMedication', 'Agregar Medicamento')}</button>
            </div>
            {prescriptionForm.medicamentos.length > 0 && (
              <div className="medications-list">
                <h4>{t('medico.prescribedMedications', 'Medicamentos en la receta')}:</h4>
                {prescriptionForm.medicamentos.map(med => (
                  <div key={med.id} className="medication-item">
                    <div className="medication-info">
                      <strong>{med.nombre}</strong>
                      <span>{med.dosis} - {med.frecuencia} ({med.via})</span>
                      {med.duracion && <span>{t('medico.duration', 'Duración')}: {med.duracion}</span>}
                    </div>
                    <button className="btn-remove" onClick={() => handleRemoveMedication(med.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-group">
              <label>{t('medico.generalInstructions', 'Instrucciones generales')}</label>
              <textarea className="form-control" placeholder={t('medico.instructionsPlaceholder', 'Instrucciones adicionales para el propietario...')} rows="2" value={prescriptionForm.instrucciones} onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instrucciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPrescriptionModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleCreatePrescription} disabled={prescriptionForm.medicamentos.length === 0}>💊 {t('medico.sendToPharmacy', 'Enviar a Farmacia')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lab Order Modal */}
      {showLabOrderModal && (
        <div className="modal-overlay" onClick={() => setShowLabOrderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🔬 {t('medico.createLabOrder', 'Orden de Laboratorio')}</h2>
            <div className="studies-selection">
              <label>{t('medico.selectStudies', 'Selecciona los estudios')}:</label>
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
              <label>{t('medico.priority', 'Prioridad')}</label>
              <select className="form-control" value={labOrderForm.prioridad} onChange={(e) => setLabOrderForm(prev => ({ ...prev, prioridad: e.target.value }))}>
                <option value="NORMAL">{t('medico.normal', 'Normal')}</option>
                <option value="URGENTE">{t('medico.urgent', 'Urgente')}</option>
                <option value="STAT">{t('medico.stat', 'STAT')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('medico.clinicalIndications', 'Indicaciones clínicas')}</label>
              <textarea className="form-control" placeholder={t('medico.indicationsPlaceholder', 'Diagnóstico presuntivo, razón del estudio...')} rows="3" value={labOrderForm.indicaciones} onChange={(e) => setLabOrderForm(prev => ({ ...prev, indicaciones: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLabOrderModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-primary" onClick={handleCreateLabOrder} disabled={labOrderForm.estudios.length === 0}>🔬 {t('medico.sendToLab', 'Enviar a Laboratorio')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Hospitalization Modal */}
      {showHospitalizationModal && (
        <div className="modal-overlay" onClick={() => setShowHospitalizationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🏥 {t('medico.hospitalizePatient', 'Hospitalizar Paciente')}</h2>
            <div className="form-group">
              <label>{t('medico.hospitalizationReason', 'Motivo de hospitalización')} *</label>
              <textarea className="form-control" placeholder={t('medico.hospitalizationReasonPlaceholder', 'Razón para hospitalizar al paciente...')} rows="3" value={hospitalizationForm.motivo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, motivo: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t('medico.monitoringFrequency', 'Frecuencia de monitoreo')}</label>
                <select className="form-control" value={hospitalizationForm.frecuenciaMonitoreo} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, frecuenciaMonitoreo: e.target.value }))}>
                  <option value="1h">{t('medico.every1Hour', 'Cada 1 hora')}</option>
                  <option value="2h">{t('medico.every2Hours', 'Cada 2 horas')}</option>
                  <option value="4h">{t('medico.every4Hours', 'Cada 4 horas')}</option>
                  <option value="6h">{t('medico.every6Hours', 'Cada 6 horas')}</option>
                  <option value="8h">{t('medico.every8Hours', 'Cada 8 horas')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('medico.estimatedDays', 'Días estimados')}</label>
                <input type="number" className="form-control" placeholder="3" min="1" value={hospitalizationForm.estimacionDias} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, estimacionDias: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('medico.specialCare', 'Cuidados especiales')}</label>
              <textarea className="form-control" placeholder={t('medico.specialCarePlaceholder', 'Instrucciones especiales de cuidado...')} rows="3" value={hospitalizationForm.cuidadosEspeciales} onChange={(e) => setHospitalizationForm(prev => ({ ...prev, cuidadosEspeciales: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowHospitalizationModal(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button className="btn-warning" onClick={handleCreateHospitalization} disabled={!hospitalizationForm.motivo}>🏥 {t('medico.confirmHospitalization', 'Confirmar Hospitalización')}</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal - Historial Médico Completo */}
      {showHistoryModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>📋 {t('medico.medicalHistory', 'Historial Médico')}</h2>
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
                <p><strong>Propietario:</strong> {selectedPatient.propietario || historialData?.paciente?.owner?.nombre}</p>
                <p><strong>Teléfono:</strong> {selectedPatient.telefono || historialData?.paciente?.owner?.telefono}</p>
              </div>
            </div>

            <div className="history-timeline">
              {loadingHistorial ? (
                <div className="loading-history">
                  <div className="loading-spinner"></div>
                  <p>Cargando historial...</p>
                </div>
              ) : getFormattedHistory().length === 0 ? (
                <div className="empty-history">
                  <span className="empty-icon">📭</span>
                  <p>{t('medico.noHistoryFound', 'No se encontró historial para este paciente')}</p>
                  <p className="empty-sub">Las consultas y procedimientos aparecerán aquí</p>
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
                        {/* SOAP Notes */}
                        {entry.detalles.soap && Object.keys(entry.detalles.soap).length > 0 && (
                          <div className="history-section soap-section">
                            <h5>📝 Notas SOAP</h5>
                            <div className="soap-grid">
                              {entry.detalles.soap.subjetivo && (
                                <div className="soap-item">
                                  <span className="soap-letter">S</span>
                                  <div>
                                    <strong>Subjetivo</strong>
                                    <p>{entry.detalles.soap.subjetivo}</p>
                                  </div>
                                </div>
                              )}
                              {entry.detalles.soap.objetivo && (
                                <div className="soap-item">
                                  <span className="soap-letter">O</span>
                                  <div>
                                    <strong>Objetivo</strong>
                                    <p>{entry.detalles.soap.objetivo}</p>
                                  </div>
                                </div>
                              )}
                              {entry.detalles.soap.analisis && (
                                <div className="soap-item">
                                  <span className="soap-letter">A</span>
                                  <div>
                                    <strong>Análisis</strong>
                                    <p>{entry.detalles.soap.analisis}</p>
                                  </div>
                                </div>
                              )}
                              {entry.detalles.soap.plan && (
                                <div className="soap-item">
                                  <span className="soap-letter">P</span>
                                  <div>
                                    <strong>Plan</strong>
                                    <p>{entry.detalles.soap.plan}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Signos Vitales */}
                        {entry.detalles.signosVitales && (
                          <div className="history-section vitals-section">
                            <h5>🌡️ Signos Vitales</h5>
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
                                  <span className="vital-label">Peso</span>
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
                        
                        {/* Diagnósticos */}
                        {entry.detalles.diagnosticos && entry.detalles.diagnosticos.length > 0 && (
                          <div className="history-section diagnosis-section">
                            <h5>🔍 Diagnósticos</h5>
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
                        
                        {/* Recetas/Prescripciones */}
                        {entry.detalles.recetas && entry.detalles.recetas.length > 0 && (
                          <div className="history-section prescription-section">
                            <h5>💊 Recetas</h5>
                            {entry.detalles.recetas.map((receta, ri) => (
                              <div key={ri} className="prescription-card">
                                {receta.items.map((item, ii) => (
                                  <div key={ii} className="medication-item">
                                    <div className="med-name">{item.medicamento}</div>
                                    <div className="med-details">
                                      {item.dosis && <span>📏 {item.dosis}</span>}
                                      {item.frecuencia && <span>⏰ {item.frecuencia}</span>}
                                      {item.duracion && <span>📅 {item.duracion}</span>}
                                      {item.via && <span>💉 Vía: {item.via}</span>}
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
                        
                        {/* Laboratorios */}
                        {entry.detalles.laboratorios && entry.detalles.laboratorios.length > 0 && (
                          <div className="history-section lab-section">
                            <h5>🔬 Estudios de Laboratorio</h5>
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
                                      <strong>Resultados:</strong> {lab.resultados}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Hospitalización detalles */}
                        {entry.tipo === 'hospitalizacion' && (
                          <div className="history-section hosp-section">
                            {entry.detalles.motivo && (
                              <p><strong>📝 Motivo:</strong> {entry.detalles.motivo}</p>
                            )}
                            {entry.detalles.ubicacion && (
                              <p><strong>📍 Ubicación:</strong> {entry.detalles.ubicacion}</p>
                            )}
                            {entry.detalles.cuidadosEspeciales && (
                              <p><strong>⚠️ Cuidados:</strong> {entry.detalles.cuidadosEspeciales}</p>
                            )}
                            {entry.detalles.dieta && (
                              <p><strong>🍽️ Dieta:</strong> {entry.detalles.dieta}</p>
                            )}
                            {entry.detalles.monitoreos && entry.detalles.monitoreos.length > 0 && (
                              <div className="monitoring-history">
                                <h6>📊 Monitoreos ({entry.detalles.monitoreos.length})</h6>
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
                        
                        {/* Cirugía detalles */}
                        {entry.tipo === 'cirugia' && entry.detalles && (
                          <div className="history-section surgery-section">
                            {entry.detalles.anestesia && (
                              <p><strong>💉 Anestesia:</strong> {entry.detalles.anestesia}</p>
                            )}
                            {entry.detalles.duracion && (
                              <p><strong>⏱️ Duración:</strong> {entry.detalles.duracion} min</p>
                            )}
                            {entry.detalles.notasPreOp && (
                              <p><strong>📋 Pre-Op:</strong> {entry.detalles.notasPreOp}</p>
                            )}
                            {entry.detalles.notas && (
                              <p><strong>📝 Notas:</strong> {entry.detalles.notas}</p>
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
    </div>
  );
}

export default MedicoDashboard;
