// Usuarios mock del sistema
export const mockUsers = [
  {
    id: 1,
    username: "recepcion",
    password: "123",
    nombre: "María González",
    rol: "RECEPCION",
    avatar: "👩‍💼"
  },
  {
    id: 2,
    username: "doctor",
    password: "123",
    nombre: "Dr. Carlos Martínez",
    rol: "MEDICO",
    especialidad: "Medicina General",
    avatar: "👨‍⚕️"
  },
  {
    id: 3,
    username: "farmacia",
    password: "123",
    nombre: "Ana López",
    rol: "FARMACIA",
    avatar: "👩‍🔬"
  },
  {
    id: 4,
    username: "admin",
    password: "123",
    nombre: "Administrador",
    rol: "ADMIN",
    avatar: "👨‍💼"
  },
  {
    id: 5,
    username: "laboratorio",
    password: "123",
    nombre: "Dr. Roberto Silva",
    rol: "LABORATORIO",
    avatar: "🔬"
  }
];

// Pacientes mock
export const mockPatients = [
  {
    id: 1,
    nombre: "Max",
    especie: "Perro",
    raza: "Labrador",
    edad: "5 años",
    sexo: "Macho",
    peso: "28 kg",
    propietario: "Juan Pérez",
    telefono: "555-1234",
    email: "juan.perez@email.com",
    direccion: "Calle Principal 123",
    estado: "RECIEN_LLEGADO",
    motivo: null,
    tipoVisita: null,
    prioridad: null,
    numeroFicha: "VET-001",
    fechaIngreso: new Date().toISOString(),
    primeraVisita: false,
    antecedentes: "Historia de displasia de cadera. Tratamiento controlado.",
    vacunas: [
      { nombre: "Rabia", fecha: "2024-01-15", proximaDosis: "2025-01-15" },
      { nombre: "Quíntuple (DHPPL)", fecha: "2024-02-10", proximaDosis: "2025-02-10" }
    ],
    alergias: ["Penicilina"],
    cirugiasPrevias: [
      { tipo: "Esterilización", fecha: "2020-06-15", notas: "Sin complicaciones" }
    ],
    expediente: [
      {
        fecha: "2024-11-15",
        tipo: "Control de rutina",
        motivo: "Revisión general",
        diagnostico: "Estado de salud bueno",
        tratamiento: "Continuar con alimentación balanceada",
        medico: "Martínez"
      },
      {
        fecha: "2024-09-20",
        tipo: "Consulta General",
        motivo: "Cojera leve",
        diagnostico: "Desgaste articular leve",
        tratamiento: "Condroprotectores por 30 días",
        medico: "García"
      }
    ]
  },
  {
    id: 2,
    nombre: "Luna",
    especie: "Gato",
    raza: "Persa",
    edad: "3 años",
    sexo: "Hembra",
    peso: "4.5 kg",
    propietario: "María Sánchez",
    telefono: "555-5678",
    email: "maria.sanchez@email.com",
    direccion: "Avenida Central 456",
    estado: "EN_CONSULTA",
    motivo: "Vacunación anual",
    tipoVisita: "medicina_preventiva",
    prioridad: "BAJA",
    numeroFicha: "VET-002",
    fechaIngreso: new Date().toISOString(),
    primeraVisita: false,
    antecedentes: "Saludable, sin problemas previos",
    vacunas: [
      { nombre: "Triple Felina", fecha: "2023-11-20", proximaDosis: "2024-12-20" }
    ],
    alergias: [],
    cirugiasPrevias: [
      { tipo: "Esterilización", fecha: "2022-05-10", notas: "Recuperación normal" }
    ],
    medicoAsignado: "Dr. Carlos Martínez",
    expediente: [
      {
        fecha: "2024-12-11",
        tipo: "Medicina Preventiva",
        motivo: "Vacunación anual",
        diagnostico: "Buen estado general",
        tratamiento: "Vacuna Triple Felina aplicada",
        medico: "Martínez"
      }
    ]
  },
  {
    id: 3,
    nombre: "Rocky",
    especie: "Perro",
    raza: "Bulldog",
    edad: "7 años",
    peso: "28 kg",
    propietario: "Pedro Ramírez",
    telefono: "555-9012",
    email: "pedro.ramirez@email.com",
    direccion: "Plaza Norte 789",
    estado: "EN_FARMACIA",
    motivo: "Seguimiento post-cirugía",
    tipoVisita: "seguimiento",
    prioridad: "ALTA",
    numeroFicha: "VET-003",
    fechaIngreso: new Date().toISOString(),
    primeraVisita: false,
    antecedentes: "Cirugía de tumor hace 2 semanas",
    vacunas: ["Rabia (2024)", "Sextuple (2024)"],
    alergias: ["Penicilina"],
    cirugiasPrevias: ["Extirpación de tumor (2024-11-25)"],
    medicoAsignado: "Dr. Carlos Martínez",
    expediente: {
      creado: "2020-01-08",
      ultimaVisita: "2024-12-11"
    }
  }
];

// Estado inicial del sistema
export const initialSystemState = {
  pacientes: mockPatients,
  citas: [
    {
      id: 1,
      pacienteId: 1,
      paciente: "Max",
      fecha: new Date().toISOString().split('T')[0],
      hora: "10:00",
      tipo: "Consulta General",
      motivo: "Revisión de rutina",
      estado: "EN_CURSO",
      confirmada: true
    },
    {
      id: 2,
      pacienteId: 2,
      paciente: "Luna",
      fecha: new Date().toISOString().split('T')[0],
      hora: "11:30",
      tipo: "Vacunación",
      motivo: "Vacuna anual",
      estado: "EN_CURSO",
      confirmada: true
    },
    {
      id: 3,
      pacienteId: 3,
      paciente: "Rocky",
      fecha: new Date().toISOString().split('T')[0],
      hora: "14:00",
      tipo: "Seguimiento",
      motivo: "Control post-cirugía",
      estado: "PENDIENTE",
      confirmada: false
    },
    {
      id: 4,
      pacienteId: 4,
      paciente: "Bella",
      fecha: new Date().toISOString().split('T')[0],
      hora: "16:00",
      tipo: "Medicina Preventiva",
      motivo: "Desparasitación",
      estado: "PENDIENTE",
      confirmada: true
    }
  ],
  tareasPendientes: {
    RECEPCION: [
      {
        id: 1,
        pacienteId: 1,
        titulo: "Completar admisión de Max",
        descripcion: "Registrar antecedentes clínicos",
        prioridad: "ALTA",
        timestamp: new Date().toISOString()
      }
    ],
    MEDICO: [
      {
        id: 2,
        pacienteId: 2,
        titulo: "Atender a Luna",
        descripcion: "Vacunación anual programada",
        prioridad: "MEDIA",
        timestamp: new Date().toISOString()
      }
    ],
    FARMACIA: [
      {
        id: 3,
        pacienteId: 3,
        titulo: "Preparar medicamentos para Rocky",
        descripcion: "Antibióticos post-cirugía",
        prioridad: "ALTA",
        timestamp: new Date().toISOString()
      }
    ],
    LABORATORIO: []
  },
  notificaciones: [],
  historiales: {}
};
