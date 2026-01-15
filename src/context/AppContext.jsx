import { createContext, useContext, useState, useEffect } from 'react';
import { initialSystemState } from '../data/mockUsers';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Cargar datos desde localStorage o usar initialSystemState
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  const [currentUser, setCurrentUser] = useState(() => loadFromStorage('currentUser', null));
  const [systemState, setSystemState] = useState(() => loadFromStorage('systemState', initialSystemState));
  const [notifications, setNotifications] = useState(() => loadFromStorage('notifications', []));

  // Guardar en localStorage cuando cambie el estado
  useEffect(() => {
    try {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
      console.error('Error saving currentUser to localStorage:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('systemState', JSON.stringify(systemState));
    } catch (error) {
      console.error('Error saving systemState to localStorage:', error);
    }
  }, [systemState]);

  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  // Agregar notificación
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      leida: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Marcar notificación como leída
  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, leida: true } : n)
    );
  };

  // Actualizar estado de paciente
  const updatePatientState = (patientId, newState, updatedBy) => {
    setSystemState(prev => ({
      ...prev,
      pacientes: prev.pacientes.map(p =>
        p.id === patientId ? { ...p, estado: newState } : p
      )
    }));

    // Agregar al historial
    addToHistory(patientId, {
      accion: `Estado cambiado a: ${newState}`,
      usuario: updatedBy,
      timestamp: new Date().toISOString()
    });
  };

  // Actualizar datos del paciente
  const updatePatientData = (patientId, data) => {
    setSystemState(prev => ({
      ...prev,
      pacientes: prev.pacientes.map(p =>
        p.id === patientId ? { ...p, ...data } : p
      )
    }));
  };

  // Registrar Triage
  const registerTriage = (patientId, triageData) => {
    updatePatientData(patientId, {
      motivo: triageData.motivo,
      tipoVisita: triageData.tipoVisita,
      prioridad: triageData.prioridad,
      peso: triageData.peso,
      antecedentes: triageData.antecedentes,
      estado: 'EN_ESPERA'
    });

    addToHistory(patientId, {
      accion: 'Triage completado',
      detalles: triageData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Agregar tarea pendiente
  const addTask = (rol, task) => {
    setSystemState(prev => ({
      ...prev,
      tareasPendientes: {
        ...prev.tareasPendientes,
        [rol]: [...(prev.tareasPendientes[rol] || []), {
          ...task,
          id: Date.now(),
          timestamp: new Date().toISOString()
        }]
      }
    }));

    // Notificar al usuario correspondiente
    addNotification({
      para: rol,
      tipo: 'NUEVA_TAREA',
      titulo: 'Nueva tarea asignada',
      mensaje: task.titulo,
      prioridad: task.prioridad
    });
  };

  // Completar tarea
  const completeTask = (rol, taskId) => {
    setSystemState(prev => ({
      ...prev,
      tareasPendientes: {
        ...prev.tareasPendientes,
        [rol]: prev.tareasPendientes[rol].filter(t => t.id !== taskId)
      }
    }));
  };

  // Agregar al historial
  const addToHistory = (patientId, entry) => {
    setSystemState(prev => ({
      ...prev,
      historiales: {
        ...prev.historiales,
        [patientId]: [
          ...(prev.historiales[patientId] || []),
          entry
        ]
      }
    }));
  };

  // Asignar paciente a médico
  const assignToDoctor = (patientId, doctorName) => {
    updatePatientState(patientId, 'EN_CONSULTA', currentUser?.nombre);
    addTask('MEDICO', {
      pacienteId: patientId,
      titulo: `Atender paciente`,
      descripcion: `Paciente asignado por ${currentUser?.nombre}`,
      prioridad: 'ALTA'
    });
  };

  // Solicitar estudios
  const requestStudies = (patientId, studies) => {
    updatePatientState(patientId, 'EN_ESTUDIOS', currentUser?.nombre);
    
    // Crear tareas para Laboratorio
    studies.forEach(study => {
      addTask('LABORATORIO', {
        pacienteId: patientId,
        titulo: `Estudio solicitado por Dr. ${currentUser?.nombre}`,
        descripcion: study,
        prioridad: 'ALTA'
      });
    });

    addToHistory(patientId, {
      accion: `Estudios solicitados: ${studies.join(', ')}`,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });

    addNotification({
      para: 'LABORATORIO',
      tipo: 'ESTUDIOS_SOLICITADOS',
      titulo: 'Nuevos estudios solicitados',
      mensaje: `Dr. ${currentUser?.nombre} solicitó ${studies.length} estudio(s)`,
      prioridad: 'ALTA'
    });
  };

  // Prescribir medicamentos
  const prescribeMedication = (patientId, medications) => {
    updatePatientState(patientId, 'EN_FARMACIA', currentUser?.nombre);
    
    addTask('FARMACIA', {
      pacienteId: patientId,
      titulo: 'Preparar medicamentos',
      descripcion: medications.join(', '),
      prioridad: 'ALTA'
    });

    addNotification({
      para: 'FARMACIA',
      tipo: 'NUEVA_TAREA',
      titulo: 'Nueva receta para preparar',
      mensaje: `${medications.length} medicamento(s) prescritos por Dr. ${currentUser?.nombre}`,
      prioridad: 'ALTA'
    });

    addToHistory(patientId, {
      accion: `Medicamentos prescritos: ${medications.join(', ')}`,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Entregar medicamentos
  const deliverMedication = (patientId) => {
    updatePatientState(patientId, 'LISTO_PARA_ALTA', currentUser?.nombre);
    
    addTask('RECEPCION', {
      pacienteId: patientId,
      titulo: 'Procesar alta del paciente',
      descripcion: 'Medicamentos entregados, listo para cobro y alta',
      prioridad: 'ALTA'
    });

    addNotification({
      para: 'RECEPCION',
      tipo: 'PACIENTE_LISTO_ALTA',
      titulo: 'Paciente listo para alta',
      mensaje: `Medicamentos entregados, proceder con cobro y alta`,
      prioridad: 'ALTA'
    });
  };

  // Dar de alta
  const dischargePatient = (patientId) => {
    updatePatientState(patientId, 'ALTA', currentUser?.nombre);
    
    addToHistory(patientId, {
      accion: 'Paciente dado de alta',
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Registrar consulta médica
  const registerConsultation = (patientId, consultationData) => {
    updatePatientData(patientId, {
      consultaMedica: consultationData
    });

    addToHistory(patientId, {
      accion: 'Consulta médica realizada',
      detalles: consultationData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Programar cirugía
  const scheduleSurgery = (patientId, surgeryData) => {
    updatePatientData(patientId, {
      cirugiaProgramada: surgeryData,
      estado: 'CIRUGIA_PROGRAMADA'
    });

    addToHistory(patientId, {
      accion: 'Cirugía programada',
      detalles: surgeryData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });

    addTask('MEDICO', {
      pacienteId: patientId,
      titulo: `Cirugía programada: ${surgeryData.tipo}`,
      descripcion: `Fecha: ${surgeryData.fecha} ${surgeryData.hora} - Prioridad: ${surgeryData.prioridad}`,
      prioridad: surgeryData.prioridad
    });

    addNotification({
      para: 'MEDICO',
      tipo: 'CIRUGIA_PROGRAMADA',
      titulo: 'Cirugía programada',
      mensaje: `${surgeryData.tipo} - ${surgeryData.fecha} ${surgeryData.hora}`,
      prioridad: surgeryData.prioridad
    });
  };

  // Iniciar cirugía
  const startSurgery = (patientId) => {
    updatePatientState(patientId, 'EN_CIRUGIA', currentUser?.nombre);
    
    // Guardar fecha de inicio
    setSystemState(prev => ({
      ...prev,
      pacientes: prev.pacientes.map(p =>
        p.id === patientId ? { ...p, fechaInicioCirugia: new Date().toISOString() } : p
      )
    }));
    
    addToHistory(patientId, {
      accion: 'Cirugía iniciada',
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Completar cirugía
  const completeSurgery = (patientId, surgeryReport) => {
    updatePatientData(patientId, {
      reporteQuirurgico: surgeryReport
    });

    addToHistory(patientId, {
      accion: 'Cirugía completada',
      detalles: surgeryReport,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Hospitalizar paciente
  const hospitalize = (patientId, hospitalizationData) => {
    updatePatientData(patientId, {
      estado: 'HOSPITALIZADO',
      hospitalizacion: {
        ...hospitalizationData,
        inicioHospitalizacion: new Date().toISOString(),
        monitoreos: []
      }
    });

    addToHistory(patientId, {
      accion: 'Paciente hospitalizado',
      detalles: hospitalizationData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });

    addTask('MEDICO', {
      pacienteId: patientId,
      titulo: 'Monitoreo de paciente hospitalizado',
      descripcion: `Realizar EFG según frecuencia indicada`,
      prioridad: 'ALTA'
    });
  };

  // Agregar monitoreo de hospitalización
  const addMonitoring = (patientId, monitoringData) => {
    setSystemState(prev => ({
      ...prev,
      pacientes: prev.pacientes.map(p => {
        if (p.id === patientId && p.hospitalizacion) {
          return {
            ...p,
            hospitalizacion: {
              ...p.hospitalizacion,
              monitoreos: [...(p.hospitalizacion.monitoreos || []), {
                ...monitoringData,
                timestamp: new Date().toISOString()
              }]
            }
          };
        }
        return p;
      })
    }));

    addToHistory(patientId, {
      accion: 'Monitoreo registrado',
      detalles: monitoringData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Programar cita de seguimiento
  const scheduleFollowUp = (patientId, appointmentData) => {
    const newCita = {
      id: Date.now(),
      pacienteId: patientId,
      ...appointmentData,
      estado: 'PROGRAMADA'
    };

    setSystemState(prev => ({
      ...prev,
      citas: [...prev.citas, newCita]
    }));

    addToHistory(patientId, {
      accion: 'Cita de seguimiento programada',
      detalles: appointmentData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Registrar cobro
  const registerPayment = (patientId, paymentData) => {
    updatePatientData(patientId, {
      cobro: paymentData,
      pagado: true
    });

    addToHistory(patientId, {
      accion: 'Pago registrado',
      detalles: paymentData,
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Agregar paciente a la cola (desde formulario de registro cliente)
  const agregarPacienteACola = (pacienteData) => {
    const nuevoPaciente = {
      ...pacienteData,
      id: pacienteData.id || `PAC-${Date.now()}`,
      estado: 'PENDIENTE_CHECKIN',
      fechaRegistro: new Date().toISOString()
    };

    setSystemState(prev => ({
      ...prev,
      pacientes: [...prev.pacientes, nuevoPaciente],
      pacientesPendientesCheckin: [...(prev.pacientesPendientesCheckin || []), nuevoPaciente]
    }));

    addNotification({
      para: 'RECEPCION',
      tipo: 'NUEVO_REGISTRO',
      titulo: 'Nuevo registro de cliente',
      mensaje: `${nuevoPaciente.nombre} (${nuevoPaciente.propietario}) completó el formulario de registro`,
      prioridad: 'NORMAL'
    });
  };

  // Confirmar check-in de paciente
  const confirmarCheckin = (pacienteId) => {
    setSystemState(prev => ({
      ...prev,
      pacientes: prev.pacientes.map(p =>
        p.id === pacienteId ? { ...p, estado: 'REGISTRADO', checkinConfirmado: true } : p
      ),
      pacientesPendientesCheckin: (prev.pacientesPendientesCheckin || []).filter(p => p.id !== pacienteId)
    }));

    addToHistory(pacienteId, {
      accion: 'Check-in confirmado por recepción',
      usuario: currentUser?.nombre,
      timestamp: new Date().toISOString()
    });
  };

  // Resetear demo (limpiar localStorage y recargar datos iniciales)
  const resetDemo = () => {
    localStorage.clear();
    setCurrentUser(null);
    setSystemState(initialSystemState);
    setNotifications([]);
  };

  const value = {
    currentUser,
    setCurrentUser,
    systemState,
    setSystemState,
    pacientes: systemState?.pacientes || [],
    setPacientes: (pacientes) => setSystemState(prev => ({ ...prev, pacientes })),
    pacientesPendientesCheckin: systemState?.pacientesPendientesCheckin || [],
    notifications,
    addNotification,
    markAsRead,
    updatePatientState,
    updatePatientData,
    registerTriage,
    addTask,
    completeTask,
    addToHistory,
    assignToDoctor,
    requestStudies,
    prescribeMedication,
    deliverMedication,
    dischargePatient,
    registerConsultation,
    scheduleSurgery,
    startSurgery,
    completeSurgery,
    hospitalize,
    addMonitoring,
    scheduleFollowUp,
    registerPayment,
    agregarPacienteACola,
    confirmarCheckin,
    resetDemo
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
