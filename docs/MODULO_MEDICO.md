# 👨‍⚕️ Módulo Médico - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 2.2 (Tercera revisión exhaustiva Senior Dev)  
**Archivo fuente:** `src/components/dashboards/MedicoDashboard.jsx` (1,407 líneas)

---

## 📋 Índice

1. [Propósito del Módulo](#propósito-del-módulo)
2. [Entidades que Maneja](#entidades-que-maneja)
3. [Estados del Sistema](#estados-del-sistema)
4. [Funciones Principales](#funciones-principales)
5. [Formularios y Modales](#formularios-y-modales)
6. [Secciones de la UI](#secciones-de-la-ui)
7. [Funciones del Contexto](#funciones-del-contexto)
8. [Interacciones con Otros Módulos](#interacciones-con-otros-módulos)
9. [Permisos de Base de Datos](#permisos-de-base-de-datos)
10. [Variables de Estado](#variables-de-estado)
11. [Datos Predefinidos](#datos-predefinidos)
12. [Estructura de Datos del Paciente](#estructura-de-datos-del-paciente)
13. [Validaciones de Formularios](#validaciones-de-formularios)

---

## Propósito del Módulo

**Médico** es el **centro clínico** del sistema veterinario. Es responsable de:

- ✅ Atender consultas médicas
- ✅ Registrar anamnesis, exámenes físicos y diagnósticos
- ✅ Solicitar estudios de laboratorio
- ✅ Generar prescripciones/recetas y enviar a farmacia
- ✅ Programar, iniciar y completar cirugías
- ✅ Gestionar hospitalizaciones con monitoreo EFG
- ✅ Documentar notas médicas y evolución
- ✅ Ver expedientes clínicos completos

---

## Entidades que Maneja

### 1. Consultation (Consulta Médica)

Registro de la consulta médica. Médico es **dueño** de esta entidad.

```typescript
interface Consultation {
  id: string;                    // ID único (cuid)
  visitId: string;               // FK → Visit
  petId: string;                 // FK → Pet
  doctorId: string;              // FK → User (doctor)
  
  // Tiempos
  startTime: Date;               // Inicio de consulta
  endTime?: Date;                // Fin de consulta
  
  // Datos clínicos
  symptoms: string;              // Síntomas reportados por el dueño
  physicalExam: string;          // Hallazgos del examen físico
  vitalSigns: VitalSigns;        // Signos vitales
  diagnosis: string;             // Diagnóstico
  treatment: string;             // Plan de tratamiento
  notes?: string;                // Notas adicionales
  
  // Seguimiento
  followUpRequired: boolean;     // ¿Requiere seguimiento?
  followUpDate?: Date;           // Fecha de seguimiento
  
  // Estado
  status: 'EN_PROGRESO' | 'COMPLETADA';
  
  createdAt: Date;
  updatedAt: Date;
}

interface VitalSigns {
  temperature?: number;          // Temperatura en °C
  heartRate?: number;            // Frecuencia cardíaca (bpm)
  respiratoryRate?: number;      // Frecuencia respiratoria (rpm)
  weight?: number;               // Peso en kg
}
```

**Campos requeridos:** `visitId`, `petId`, `doctorId`, `symptoms`, `physicalExam`, `diagnosis`, `treatment`  
**Campos opcionales:** `endTime`, `vitalSigns`, `notes`, `followUpDate`

---

### 2. LabRequest (Solicitud de Estudios)

Solicitud de estudios de laboratorio. Médico es **dueño** de esta entidad.

```typescript
interface LabRequest {
  id: string;                    // ID único (cuid)
  consultationId: string;        // FK → Consultation
  petId: string;                 // FK → Pet
  requestedBy: string;           // FK → User (doctor solicitante)
  requestedAt: Date;             // Fecha de solicitud
  
  // Tipo de estudio
  type: LabType;                 // Tipo de estudio
  urgency: 'NORMAL' | 'URGENTE'; // Urgencia
  notes?: string;                // Indicaciones especiales
  
  // Resultados (llenado por Laboratorio)
  status: LabRequestStatus;
  results?: string;              // Resultados en texto
  resultFiles?: string[];        // URLs de archivos adjuntos
  completedAt?: Date;            // Fecha de completado
  completedBy?: string;          // FK → User (laboratorista)
  
  createdAt: Date;
  updatedAt: Date;
}

type LabType = 
  | 'HEMOGRAMA'              // Biometría hemática completa
  | 'QUIMICA_SANGUINEA'      // Química sanguínea
  | 'URINALISIS'             // Análisis de orina
  | 'RAYOS_X'                // Radiografía
  | 'ULTRASONIDO'            // Ecografía
  | 'ELECTROCARDIOGRAMA'     // ECG
  | 'CITOLOGIA'              // Citología
  | 'BIOPSIA'                // Biopsia
  | 'COPROLOGIA'             // Análisis de heces
  | 'PERFIL_TIROIDEO';       // Perfil de tiroides

type LabRequestStatus = 
  | 'PENDIENTE'              // Esperando ser procesado
  | 'EN_PROCESO'             // Laboratorio trabajando
  | 'COMPLETADO';            // Resultados listos
```

**Campos requeridos:** `consultationId`, `petId`, `requestedBy`, `type`, `urgency`  
**Campos opcionales:** `notes`, `results`, `resultFiles`

---

### 3. Prescription (Receta/Prescripción)

Receta médica con medicamentos. Médico es **dueño** de esta entidad.

```typescript
interface Prescription {
  id: string;                    // ID único (cuid)
  consultationId: string;        // FK → Consultation
  petId: string;                 // FK → Pet
  prescribedBy: string;          // FK → User (doctor)
  prescribedAt: Date;            // Fecha de prescripción
  
  // Medicamentos
  medications: PrescriptionItem[];
  generalInstructions?: string;  // Instrucciones generales
  
  // Estado
  status: PrescriptionStatus;
  
  createdAt: Date;
  updatedAt: Date;
}

interface PrescriptionItem {
  name: string;                  // Nombre del medicamento
  dosage: string;                // Dosis (ej: "500mg")
  frequency: string;             // Frecuencia (ej: "cada 8 horas")
  duration: string;              // Duración (ej: "7 días")
  quantity: number;              // Cantidad a despachar
  instructions?: string;         // Instrucciones específicas
}

type PrescriptionStatus = 
  | 'PENDIENTE'              // Esperando despacho en farmacia
  | 'DESPACHADA'             // Medicamentos entregados
  | 'PARCIAL'                // Entrega parcial (sin stock)
  | 'CANCELADA';             // Receta cancelada
```

**Campos requeridos:** `consultationId`, `petId`, `prescribedBy`, `medications`  
**Campos opcionales:** `generalInstructions`

---

### 4. Surgery (Cirugía)

Registro de cirugía. Médico es **dueño** de esta entidad.

```typescript
interface Surgery {
  id: string;                    // ID único (cuid)
  petId: string;                 // FK → Pet
  consultationId: string;        // FK → Consultation
  surgeonId: string;             // FK → User (cirujano principal)
  assistants?: string[];         // FK[] → User (asistentes)
  
  // Programación
  type: string;                  // Tipo de cirugía
  scheduledDate: Date;           // Fecha programada
  scheduledTime: string;         // Hora programada
  estimatedDuration?: number;    // Duración estimada (minutos)
  status: SurgeryStatus;
  
  // Pre-operatorio
  preOpNotes?: string;           // Notas pre-operatorias
  sedationAuthorized: boolean;   // ¿Dueño autorizó sedación?
  consentForm: ConsentForm;      // Formulario de consentimiento
  fastingConfirmed: boolean;     // ¿Ayuno confirmado?
  
  // Trans-operatorio
  startTime?: Date;              // Hora real de inicio
  endTime?: Date;                // Hora real de fin
  anesthesiaType?: string;       // Tipo de anestesia usada
  complications?: string;        // Complicaciones (si hubo)
  
  // Post-operatorio
  postOpNotes?: string;          // Notas post-operatorias
  recovery?: string;             // Estado de recuperación
  hospitalizationRequired: boolean;
  followUpDate?: Date;           // Fecha de seguimiento
  
  createdAt: Date;
  updatedAt: Date;
}

interface ConsentForm {
  signed: boolean;               // ¿Firmado?
  signedBy?: string;             // Nombre del firmante
  signedAt?: Date;               // Fecha de firma
  relationship?: string;         // Relación con la mascota
}

type SurgeryStatus = 
  | 'PROGRAMADA'             // Cirugía agendada
  | 'EN_PREPARACION'         // Preparando quirófano
  | 'EN_CURSO'               // En quirófano
  | 'COMPLETADA'             // Cirugía terminada
  | 'CANCELADA';             // Cirugía cancelada
```

**Campos requeridos:** `petId`, `consultationId`, `surgeonId`, `type`, `scheduledDate`, `scheduledTime`, `sedationAuthorized`, `consentForm`  
**Campos opcionales:** `assistants`, `estimatedDuration`, `preOpNotes`, `anesthesiaType`, `complications`, `postOpNotes`

---

### 5. Hospitalization (Hospitalización)

Registro de internamiento. Médico es **dueño** de esta entidad.

```typescript
interface Hospitalization {
  id: string;                    // ID único (cuid)
  petId: string;                 // FK → Pet
  surgeryId?: string;            // FK → Surgery (si aplica)
  consultationId: string;        // FK → Consultation
  
  // Admisión
  admittedBy: string;            // FK → User (doctor)
  admittedAt: Date;              // Fecha de ingreso
  dischargedAt?: Date;           // Fecha de alta
  reason: string;                // Motivo de hospitalización
  location?: string;             // Ubicación (jaula, área)
  status: 'ACTIVA' | 'ALTA';
  
  // Seguimiento
  observations: Observation[];
  vitalSignsHistory: VitalSignsRecord[];
  medicationSchedule: MedicationScheduleItem[];
  
  createdAt: Date;
  updatedAt: Date;
}

interface Observation {
  id: string;
  timestamp: Date;
  note: string;
  recordedBy: string;            // FK → User
}

interface VitalSignsRecord {
  id: string;
  timestamp: Date;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  recordedBy: string;            // FK → User
}

interface MedicationScheduleItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  nextDose: Date;
  administered: boolean;
  administeredAt?: Date;
  administeredBy?: string;       // FK → User
}
```

**Campos requeridos:** `petId`, `consultationId`, `admittedBy`, `reason`  
**Campos opcionales:** `surgeryId`, `location`, `dischargedAt`

---

### 6. MedicalNote (Nota Médica)

Notas médicas adicionales. Médico es **dueño** de esta entidad.

```typescript
interface MedicalNote {
  id: string;                    // ID único (cuid)
  petId: string;                 // FK → Pet
  consultationId?: string;       // FK → Consultation (opcional)
  createdBy: string;             // FK → User (doctor)
  createdAt: Date;
  
  type: MedicalNoteType;
  content: string;               // Contenido de la nota
  isPrivate: boolean;            // ¿Solo visible para médicos?
}

type MedicalNoteType = 
  | 'EVOLUCION'              // Nota de evolución
  | 'INTERCONSULTA'          // Solicitud de interconsulta
  | 'ORDEN'                  // Orden médica
  | 'GENERAL';               // Nota general
```

**Campos requeridos:** `petId`, `createdBy`, `type`, `content`  
**Campos opcionales:** `consultationId`

---

## Estados del Sistema

### Estados que CREA Médico

| Estado | Cuándo se crea | Descripción |
|--------|----------------|-------------|
| `EN_CONSULTA` | Al tomar paciente de cola | Doctor inicia atención |
| `EN_ESTUDIOS` | Al solicitar laboratorios | Esperando resultados |
| `EN_FARMACIA` | Al generar receta | Esperando medicamentos |
| `CIRUGIA_PROGRAMADA` | Al agendar cirugía | Cirugía en agenda |
| `EN_CIRUGIA` | Al iniciar cirugía | En quirófano |
| `HOSPITALIZADO` | Al internar paciente | Paciente internado |
| `LISTO_PARA_ALTA` | Al completar atención | Listo para salir |

### Estados que LEE Médico

| Estado | Para qué lo lee |
|--------|-----------------|
| `EN_ESPERA` | Ver pacientes en cola para atender |

---

## Funciones Principales

### 1. Iniciar Consulta

```typescript
handleStartConsultation(patient: Pet): void
```

**Flujo:**
1. Selecciona paciente para atención
2. Abre modal de consulta médica (`showDiagnostic`)
3. Permite registrar anamnesis, diagnóstico, solicitar estudios o prescribir

---

### 2. Solicitar Estudios de Laboratorio

```typescript
handleRequestStudies(): void
```

**Flujo:**
1. Valida que al menos un estudio esté seleccionado
2. Llama a `requestStudies(patientId, selectedStudies)`
3. Registra en historial: "Examen físico realizado. Estudios solicitados."
4. Cambia estado del paciente a `EN_ESTUDIOS`
5. Cierra modal y limpia selección

---

### 3. Prescribir Medicamentos

```typescript
handlePrescribe(): void
```

**Flujo:**
1. Valida que haya medicamentos ingresados
2. Parsea medicamentos separados por coma
3. Llama a `prescribeMedication(patientId, medsList)`
4. Si hay notas diagnósticas, registra en historial
5. Cambia estado del paciente a `EN_FARMACIA`
6. Muestra alerta: "Receta generada y enviada a farmacia"

---

### 4. Completar Consulta

```typescript
handleCompleteConsultation(): void
```

**Flujo:**
1. Actualiza estado a `LISTO_PARA_ALTA`
2. Registra en historial: "Consulta completada"
3. Cierra modal de consulta

---

### 5. Programar Cirugía

```typescript
handleScheduleSurgery(patient: Pet): void
handleConfirmSurgery(): void
```

**Flujo para programar:**
1. Selecciona paciente
2. Inicializa formulario de cirugía
3. Abre modal `showSurgeryModal`

**Flujo para confirmar:**
1. Valida campos requeridos (tipo, fecha, hora)
2. Llama a `scheduleSurgery(patientId, surgeryData)`
3. Incluye: tipo, fecha, hora, prequirúrgicos, observaciones, prioridad, programadoPor
4. Cambia estado a `CIRUGIA_PROGRAMADA`
5. Cierra modal

---

### 6. Iniciar Cirugía

```typescript
handleStartSurgery(patient: Pet): void
```

**Flujo:**
1. Muestra confirmación
2. Llama a `startSurgery(patientId)`
3. Cambia estado a `EN_CIRUGIA`
4. Registra `fechaInicioCirugia`

---

### 7. Completar Cirugía y Generar Reporte

```typescript
handleCompleteSurgery(patient: Pet): void
handleSubmitSurgeryReport(): void
```

**Flujo para completar:**
1. Selecciona paciente
2. Inicializa formulario de reporte quirúrgico
3. Abre modal `showSurgeryReportModal`

**Flujo para enviar reporte:**
1. Valida campos requeridos (procedimiento, anestesia)
2. Llama a `completeSurgery(patientId, reportData)`
3. Incluye: procedimiento, anestesia, complicaciones, pronóstico, cuidadosPostOperatorios, cirujano, fechaRealizacion
4. Pregunta si requiere hospitalización:
   - Si sí: llama a `hospitalize()` con motivo "Post-operatorio"
   - Si no: cambia a `LISTO_PARA_ALTA`

---

### 8. Abrir Monitoreo (Hospitalización)

```typescript
handleOpenMonitoring(patient: Pet): void
handleSubmitMonitoring(): void
```

**Flujo para abrir:**
1. Selecciona paciente hospitalizado
2. Inicializa formulario de monitoreo EFG
3. Abre modal `showMonitoringModal`

**Flujo para guardar:**
1. Valida campos requeridos: `temperatura`, `frecuenciaCardiaca`, `frecuenciaRespiratoria` (los 3 son obligatorios)
2. Llama a `addMonitoring(patientId, monitoringData)`
3. Incluye: temperatura, FC, FR, PA, nivelConciencia, escalaDolor, observaciones, registradoPor
4. Cierra modal y limpia formulario

---

### 9. Ver Expediente

```typescript
handleViewExpediente(patient: Pet): void
```

**Flujo:**
1. Selecciona paciente
2. Abre modal `showExpediente`
3. Muestra:
   - Datos del paciente (nombre, raza, edad, peso, ficha)
   - Datos del propietario
   - Historial de consultas
   - Vacunas aplicadas
   - Alergias y observaciones

---

### 10. Toggle Estudio

```typescript
toggleStudy(study: string): void
```

**Flujo:**
1. Si estudio está seleccionado, lo quita
2. Si no está seleccionado, lo agrega
3. Actualiza `selectedStudies`

---

### 11. Completar Tarea

```typescript
completeTask('MEDICO', taskId): void
```

**Flujo:**
1. Elimina tarea de `tareasPendientes.MEDICO`
2. Tarea desaparece de la lista

---

### 12. Dar de Alta desde Hospitalización

```typescript
// Inline en el componente
onClick={() => {
  if (confirm(`¿Dar de alta a ${patient.nombre}?`)) {
    updatePatientState(patient.id, 'LISTO_PARA_ALTA', currentUser?.nombre);
  }
}}
```

**Flujo:**
1. Confirma acción
2. Cambia estado a `LISTO_PARA_ALTA`
3. Paciente sale de hospitalizados

---

## Formularios y Modales

### Modal: Consulta Médica (`showDiagnostic`)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `diagnosticNotes` | textarea | ❌ | Anamnesis, examen físico, diagnóstico presuntivo |
| `selectedStudies` | checkbox[] | ❌ | Estudios a solicitar (multiselección) |
| `medications` | textarea | ❌ | Medicamentos separados por comas |

**Opciones de Estudios:**
```typescript
const studiesOptions = [
  'Hematológicos',
  'Coproparasitoscópicos',
  'Uroanálisis',
  'Radiográficos',
  'Ecográficos',
  'Electrocardiográficos'
];
```

**Medicamentos Comunes (chips):**
```typescript
const commonMedications = [
  'Amoxicilina 500mg',
  'Carprofeno 75mg',
  'Metronidazol 250mg',
  'Prednisona 5mg',
  'Tramadol 50mg'
];
```

**Acciones del Modal:**
- "Solicitar Estudios Seleccionados" → `handleRequestStudies()`
- "Generar Receta y Enviar a Farmacia" → `handlePrescribe()`
- "Finalizar Consulta" → `handleCompleteConsultation()`
- "Cancelar" → Cierra modal

---

### Modal: Programar Cirugía (`showSurgeryModal`)

```typescript
interface SurgeryForm {
  tipo: string;               // Tipo de cirugía (select) *
  fecha: string;              // Fecha (date) *
  hora: string;               // Hora (time) *
  prequirurgicos: string[];   // Estudios pre-quirúrgicos (checkboxes)
  observaciones: string;      // Notas adicionales (textarea)
  prioridad: Priority;        // ALTA | MEDIA | BAJA
}
```

**Tipos de Cirugía:**
- Esterilización
- Castración
- Limpieza Dental
- Extracción Dental
- Remoción de Tumor
- Reparación de Fractura
- Cesárea
- Otra (especificar)

**Pre-quirúrgicos Disponibles:**
- Hemograma Completo
- Perfil Renal
- Perfil Hepático
- Radiografía de Tórax
- Electrocardiograma

---

### Modal: Reporte Quirúrgico (`showSurgeryReportModal`)

```typescript
interface SurgeryReport {
  procedimiento: string;           // Descripción del procedimiento *
  anestesia: string;               // Tipo y dosis de anestesia *
  complicaciones: string;          // Complicaciones si hubo
  pronostico: string;              // Excelente | Bueno | Reservado | Grave
  cuidadosPostOperatorios: string; // Instrucciones post-op
}
```

**Opciones de Pronóstico:**
- Excelente
- Bueno
- Reservado
- Grave

---

### Modal: Monitoreo EFG (`showMonitoringModal`)

```typescript
interface MonitoringForm {
  temperatura: string;           // °C (number) *
  frecuenciaCardiaca: string;    // lpm (number) *
  frecuenciaRespiratoria: string; // rpm (number) *
  presionArterial: string;       // mmHg (text, ej: "120/80")
  nivelConciencia: NivelConciencia; // Select
  escalaDolor: string;           // 0-10 (select)
  observaciones: string;         // Textarea
}

type NivelConciencia = 
  | 'Alerta'
  | 'Somnoliento'
  | 'Desorientado'
  | 'Estuporoso'
  | 'Inconsciente';
```

**Escala de Dolor:** 0 a 10 (select numérico)

---

### Modal: Expediente Clínico (`showExpediente`)

**Secciones mostradas:**
1. **Header del Paciente:**
   - Avatar (emoji según especie)
   - Nombre, raza, edad, peso, ficha
   - Propietario con teléfono clickeable

2. **Historial de Consultas:**
   - Fecha/hora
   - Diagnóstico
   - Medicamentos
   - Médico tratante

3. **Vacunas:**
   - Nombre de vacuna
   - Última aplicación
   - Próxima dosis
   - Estado (✅ completa / ⚠️ pendiente)

4. **Alergias y Observaciones:**
   - Alergias conocidas
   - Observaciones especiales

**Acciones:**
- "Cerrar"
- "Imprimir Expediente" → `window.print()`

---

## Secciones de la UI

| Sección | Key | Descripción | Badge |
|---------|-----|-------------|-------|
| Dashboard | `dashboard` | Estadísticas + cirugías del día + tareas + historial | - |
| Mis Consultas | `consultas` | Pacientes en estado EN_CONSULTA | Cantidad |
| En Estudios | `estudios` | Pacientes en estado EN_ESTUDIOS | Cantidad (warning) |
| Hospitalizados | `hospitalizados` | Pacientes en estado HOSPITALIZADO | Cantidad (urgent) |
| Todos los Pacientes | `todos` | Tabla con búsqueda y filtros | - |

### Header Dinámico

```jsx
<div className="dashboard-header">
  <div>
    <h1>
      {activeSection === 'dashboard' && 'Dashboard Médico'}
      {activeSection === 'consultas' && 'Mis Consultas'}
      {activeSection === 'estudios' && 'Pacientes en Estudios'}
      {activeSection === 'hospitalizados' && 'Pacientes Hospitalizados'}
      {activeSection === 'todos' && 'Todos los Pacientes'}
    </h1>
    <p>Dr. {currentUser.nombre} - {currentUser.especialidad}</p>
  </div>
</div>
```

**Nota:** El subtítulo muestra "Dr. {nombre}" seguido de la especialidad del médico actual.

---

## Funciones del Contexto

```typescript
// Desde AppContext (useApp hook)
const {
  currentUser,           // Usuario logueado actual
  systemState,           // Estado global del sistema
  updatePatientState,    // Cambiar estado de paciente
  completeTask,          // Marcar tarea como completada
  requestStudies,        // Solicitar estudios de laboratorio
  prescribeMedication,   // Prescribir y enviar a farmacia
  addToHistory,          // Agregar entrada al historial
  scheduleSurgery,       // Programar cirugía
  startSurgery,          // Iniciar cirugía
  completeSurgery,       // Completar cirugía con reporte
  hospitalize,           // Internar paciente
  addMonitoring          // Registrar monitoreo EFG
} = useApp();
```

**Detalle de cada función:**

| Función | Parámetros | Descripción |
|---------|------------|-------------|
| `updatePatientState` | `(patientId, newState, updatedBy)` | Cambia estado del paciente |
| `completeTask` | `(rol, taskId)` | Elimina tarea de pendientes |
| `requestStudies` | `(patientId, studies[])` | Envía solicitud a laboratorio, cambia a EN_ESTUDIOS |
| `prescribeMedication` | `(patientId, medications[])` | Envía receta a farmacia, cambia a EN_FARMACIA |
| `addToHistory` | `(patientId, entry)` | Agrega entrada al historial del paciente |
| `scheduleSurgery` | `(patientId, surgeryData)` | Programa cirugía, cambia a CIRUGIA_PROGRAMADA |
| `startSurgery` | `(patientId)` | Inicia cirugía, registra timestamp, cambia a EN_CIRUGIA |
| `completeSurgery` | `(patientId, reportData)` | Guarda reporte quirúrgico |
| `hospitalize` | `(patientId, hospitalizationData)` | Interna paciente, cambia a HOSPITALIZADO |
| `addMonitoring` | `(patientId, monitoringData)` | Agrega registro EFG a hospitalización |

---

## Datos Computados (Derivados del Estado)

```typescript
// Tareas pendientes del médico
const myTasks = systemState.tareasPendientes.MEDICO || [];

// Pacientes en consulta activa
const myPatients = systemState.pacientes.filter(p => p.estado === 'EN_CONSULTA');

// Pacientes esperando atención
const waitingPatients = systemState.pacientes.filter(p => p.estado === 'EN_ESPERA');

// Pacientes en laboratorio
const inStudies = systemState.pacientes.filter(p => p.estado === 'EN_ESTUDIOS');

// Cirugías programadas
const scheduledSurgeries = systemState.pacientes.filter(p => p.estado === 'CIRUGIA_PROGRAMADA');

// En quirófano actualmente
const inSurgery = systemState.pacientes.filter(p => p.estado === 'EN_CIRUGIA');

// Hospitalizados
const hospitalized = systemState.pacientes.filter(p => p.estado === 'HOSPITALIZADO');

// Listos para alta (no se muestra en UI, pero está disponible)
const readyForDischarge = systemState.pacientes.filter(p => p.estado === 'LISTO_PARA_ALTA');

// Todos los pacientes
const allPatients = systemState.pacientes;

// ⚠️ VARIABLES DECLARADAS PERO NO USADAS EN LA UI:
// - waitingPatients: Calculada pero nunca renderizada (pacientes EN_ESPERA)
// - readyForDischarge: Calculada pero nunca renderizada (pacientes LISTO_PARA_ALTA)

// Búsqueda filtrada
const filteredPatients = searchQuery
  ? allPatients.filter(p => 
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.numeroFicha.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.propietario.toLowerCase().includes(searchQuery.toLowerCase())
    )
  : allPatients;
```

---

## Interacciones con Otros Módulos

### Datos que RECIBE de otros módulos

| Origen | Dato | Propósito |
|--------|------|-----------|
| **Recepción** | Visit con triage | Cola de pacientes en EN_ESPERA |
| **Recepción** | Datos de Owner y Pet | Info completa del paciente |
| **Recepción** | Motivo y prioridad | Contexto del triage |
| **Laboratorio** | Resultados de estudios | Completar diagnóstico |
| **Farmacia** | Confirmación despacho | Saber que se entregó medicamento |

### Datos que ENVÍA a otros módulos

| Destino | Dato | Propósito |
|---------|------|-----------|
| **Laboratorio** | Solicitud de estudios | Via `requestStudies()` |
| **Farmacia** | Prescripción | Via `prescribeMedication()` |
| **Recepción** | Estado `LISTO_PARA_ALTA` | Procesar alta y cobro |
| **Sistema** | Historial médico | Via `addToHistory()` |

### Notificaciones Generadas

| Función | Notificación | Destino |
|---------|--------------|---------|
| `requestStudies()` | "Nuevos estudios solicitados" | LABORATORIO |
| `prescribeMedication()` | "Nueva receta para preparar" | FARMACIA |
| `scheduleSurgery()` | "Cirugía programada" | MEDICO (recordatorio) |

---

## Permisos de Base de Datos

| Tabla | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| `Consultation` | ✅ | ✅ | ✅ | ❌ |
| `LabRequest` | ✅ | ✅ | ❌ | ❌ |
| `Prescription` | ✅ | ✅ | ❌ | ❌ |
| `Surgery` | ✅ | ✅ | ✅ | ❌ |
| `Hospitalization` | ✅ | ✅ | ✅ | ❌ |
| `Monitoring` | ✅ | ✅ | ❌ | ❌ |
| `MedicalNote` | ✅ | ✅ | ✅ | ❌ |
| `Owner` | ❌ | ✅ | ❌ | ❌ |
| `Pet` | ❌ | ✅ | ✅* | ❌ |
| `Visit` | ❌ | ✅ | ✅* | ❌ |
| `Task` | ❌ | ✅ | ✅ | ✅ |
| `History` | ✅ | ✅ | ❌ | ❌ |
| `Notification` | ✅ | ✅ | ❌ | ❌ |

*Pet: Solo puede actualizar `peso`, `consultaMedica`  
*Visit: Solo puede actualizar `estado`

**Resumen:** Médico es **dueño** de `Consultation`, `LabRequest`, `Prescription`, `Surgery`, `Hospitalization`, `Monitoring`, y `MedicalNote`.

---

## Variables de Estado del Componente

```typescript
// Paciente y modales
const [selectedPatient, setSelectedPatient] = useState(null);
const [showDiagnostic, setShowDiagnostic] = useState(false);
const [showExpediente, setShowExpediente] = useState(false);
const [showSurgeryModal, setShowSurgeryModal] = useState(false);
const [showSurgeryReportModal, setShowSurgeryReportModal] = useState(false);
const [showMonitoringModal, setShowMonitoringModal] = useState(false);

// Navegación y búsqueda
const [activeSection, setActiveSection] = useState('dashboard');
const [searchQuery, setSearchQuery] = useState('');

// Datos de formularios
const [selectedStudies, setSelectedStudies] = useState([]);
const [medications, setMedications] = useState('');
const [diagnosticNotes, setDiagnosticNotes] = useState('');

// Formulario de cirugía
const [surgeryForm, setSurgeryForm] = useState({
  tipo: '',
  fecha: '',
  hora: '',
  prequirurgicos: [],
  observaciones: '',
  prioridad: 'ALTA'
});

// Reporte quirúrgico
const [surgeryReport, setSurgeryReport] = useState({
  procedimiento: '',
  anestesia: '',
  complicaciones: '',
  pronostico: '',
  cuidadosPostOperatorios: ''
});

// Formulario de monitoreo EFG
const [monitoringForm, setMonitoringForm] = useState({
  temperatura: '',
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  presionArterial: '',
  nivelConciencia: 'Alerta',
  escalaDolor: '0',
  observaciones: ''
});
```

---

## Datos Predefinidos

### Opciones de Estudios
```typescript
const studiesOptions = [
  'Hematológicos',
  'Coproparasitoscópicos',
  'Uroanálisis',
  'Radiográficos',
  'Ecográficos',
  'Electrocardiográficos'
];
```

### Medicamentos Comunes
```typescript
const commonMedications = [
  'Amoxicilina 500mg',
  'Carprofeno 75mg',
  'Metronidazol 250mg',
  'Prednisona 5mg',
  'Tramadol 50mg'
];
```

### Tipos de Cirugía
```typescript
const surgeryTypes = [
  'esterilizacion',       // Esterilización
  'castracion',           // Castración
  'limpieza_dental',      // Limpieza Dental
  'extraccion_dental',    // Extracción Dental
  'tumor',                // Remoción de Tumor
  'fractura',             // Reparación de Fractura
  'cesarea',              // Cesárea
  'otra'                  // Otra (especificar)
];
```

### Pre-quirúrgicos
```typescript
const preOperativeStudies = [
  'Hemograma Completo',
  'Perfil Renal',
  'Perfil Hepático',
  'Radiografía de Tórax',
  'Electrocardiograma'
];
```

### Niveles de Conciencia (EFG)
```typescript
const consciousnessLevels = [
  'Alerta',
  'Somnoliento',
  'Desorientado',
  'Estuporoso',
  'Inconsciente'
];
```

### Opciones de Pronóstico
```typescript
const prognosisOptions = [
  'Excelente',
  'Bueno',
  'Reservado',
  'Grave'
];
```

---

## Vista de Dashboard - Estadísticas

```typescript
// Cards de estadísticas mostradas
const dashboardStats = [
  { icon: '🏥', value: myPatients.length, label: 'Pacientes en Consulta', color: '#2196f3' },
  { icon: '📋', value: myTasks.length, label: 'Tareas Pendientes', color: '#ff9800' },
  { icon: '🔪', value: scheduledSurgeries.length, label: 'Cirugías Programadas', color: '#9c27b0' },
  { icon: '🏨', value: hospitalized.length, label: 'Hospitalizados', color: '#4caf50' }
];
```

### Sección: Cirugías del Día

Combina `scheduledSurgeries` + `inSurgery` en una grilla de tarjetas:

**Tarjeta de Cirugía Programada:**
```typescript
{
  patient.nombre,
  status: 'Programada',
  tipo: patient.cirugiaProgramada?.tipo,
  hora: patient.cirugiaProgramada?.hora,
  prioridad: patient.cirugiaProgramada?.prioridad,
  observaciones: patient.cirugiaProgramada?.observaciones
}
// Acciones: "Iniciar Cirugía", "Ver Expediente"
```

**Tarjeta de Cirugía En Progreso:**
```typescript
{
  patient.nombre,
  status: 'En Progreso',
  tipo: patient.cirugiaProgramada?.tipo,
  inicio: new Date(patient.fechaInicioCirugia).toLocaleTimeString()
}
// Acciones: "Completar y Generar Reporte"
```

### Sección: Historial de Consultas Hoy

**Nota:** Actualmente muestra datos estáticos de ejemplo (hardcoded):
```typescript
// Ejemplo hardcoded en el componente
const historialEjemplo = [
  { time: '09:30', nombre: 'Max', raza: 'Labrador', accion: 'Consulta general completada', propietario: 'Juan Pérez' },
  { time: '10:45', nombre: 'Miau', raza: 'Siamés', accion: 'Vacunación Triple Felina', propietario: 'Laura Gómez' }
];
// TODO: Conectar con historial real del sistema
```

---

## Estructura de Hospitalización con Monitoreos

```typescript
interface Hospitalization {
  motivo: string;
  frecuenciaMonitoreo: string;  // "2h", "4h", etc.
  cuidadosEspeciales: string;
  inicioHospitalizacion: string; // ISO date
  monitoreos: MonitoringEntry[];
}

interface MonitoringEntry {
  timestamp: string;           // ISO date
  temperatura: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  presionArterial?: string;
  nivelConciencia: string;
  escalaDolor: string;
  observaciones?: string;
  registradoPor: string;
}
```

---

## Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `src/components/dashboards/MedicoDashboard.jsx` | Componente principal (1,407 líneas) |
| `src/components/dashboards/MedicoDashboard.css` | Estilos del dashboard |
| `src/context/AppContext.jsx` | Estado global y funciones (520 líneas) |
| `src/data/mockUsers.js` | Datos iniciales del sistema |

---

## Estructura de Datos del Paciente

### Campos Específicos para Médico

```typescript
interface PatientMedicoData {
  // Datos base (de Recepción)
  id: string;
  nombre: string;
  especie: 'Perro' | 'Gato';
  raza: string;
  edad: string;
  sexo: string;
  peso: string;
  numeroFicha: string;
  propietario: string;
  telefono: string;
  motivo: string;
  estado: PatientState;
  
  // Datos de cirugía (si aplica)
  cirugiaProgramada?: {
    tipo: string;              // Tipo de cirugía
    fecha: string;             // Fecha programada (YYYY-MM-DD)
    hora: string;              // Hora programada (HH:mm)
    prequirurgicos: string[];  // Estudios pre-quirúrgicos solicitados
    observaciones: string;     // Notas del cirujano
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
    programadoPor: string;     // Nombre del médico que programó
  };
  
  // Timestamp de cirugía en curso
  fechaInicioCirugia?: string;  // ISO date cuando se inicia la cirugía
  
  // Datos de hospitalización (si aplica)
  hospitalizacion?: {
    motivo: string;
    frecuenciaMonitoreo: string;  // "2h", "4h", etc.
    cuidadosEspeciales: string;
    inicioHospitalizacion: string;
    monitoreos: MonitoringEntry[];
  };
}
```

### Información del Usuario (currentUser)

```typescript
interface MedicoUser {
  id: string;
  nombre: string;        // Se muestra en header como "Dr. {nombre}"
  rol: 'MEDICO';
  especialidad: string;  // Se muestra en header bajo el nombre
}
```

---

## Validaciones de Formularios

### Modal: Consulta Médica
| Campo | Validación |
|-------|------------|
| `diagnosticNotes` | Ninguna (opcional) |
| `selectedStudies` | Al menos 1 para solicitar estudios |
| `medications` | No vacío para generar receta |

### Modal: Programar Cirugía
| Campo | Validación |
|-------|------------|
| `tipo` | **Requerido** - Select no vacío |
| `fecha` | **Requerido** - Date válida |
| `hora` | **Requerido** - Time válido |
| `prioridad` | Default: 'ALTA' |
| `prequirurgicos` | Opcional (array) |
| `observaciones` | Opcional |

### Modal: Reporte Quirúrgico
| Campo | Validación |
|-------|------------|
| `procedimiento` | **Requerido** - textarea no vacío |
| `anestesia` | **Requerido** - textarea no vacío |
| `complicaciones` | Opcional |
| `pronostico` | Opcional (select) |
| `cuidadosPostOperatorios` | Opcional |

### Modal: Monitoreo EFG
| Campo | Validación |
|-------|------------|
| `temperatura` | **Requerido** - number |
| `frecuenciaCardiaca` | **Requerido** - number |
| `frecuenciaRespiratoria` | **Requerido** - number |
| `presionArterial` | Opcional - text (formato "120/80") |
| `nivelConciencia` | Default: 'Alerta' |
| `escalaDolor` | Default: '0' (rango 0-10) |
| `observaciones` | Opcional |

### Botones con Estado Disabled

Los modales implementan validación visual deshabilitando botones hasta que se completen los campos requeridos:

| Modal | Condición para Disabled |
|-------|------------------------|
| Programar Cirugía | `!tipo \|\| !fecha \|\| !hora` |
| Reporte Quirúrgico | `!procedimiento \|\| !anestesia` |
| Monitoreo EFG | `!temperatura \|\| !frecuenciaCardiaca \|\| !frecuenciaRespiratoria` |

### Emojis en Formulario de Monitoreo

El formulario de monitoreo EFG usa emojis para identificar cada campo visualmente:

| Emoji | Campo |
|-------|-------|
| 🌡️ | Temperatura (°C) |
| ❤️ | Frecuencia Cardíaca (lpm) |
| 🫁 | Frecuencia Respiratoria (rpm) |
| 🩺 | Presión Arterial (mmHg) |
| 🧠 | Nivel de Conciencia |
| 😣 | Escala de Dolor (0-10) |
| 📋 | Observaciones |

### Enlaces Telefónicos Click-to-Call

En varias partes del módulo se usan enlaces telefónicos clickeables:

```jsx
// En tabla de "Todos los Pacientes"
<a href={`tel:${patient.telefono}`} className="phone-link">
  {patient.telefono}
</a>

// En modal de Expediente Clínico
<p>Tel: <a href={`tel:${selectedPatient.telefono}`}>{selectedPatient.telefono}</a></p>
```

---

## Resumen de Estadísticas

| Métrica | Valor |
|---------|-------|
| Líneas de código | 1,407 |
| Entidades manejadas | 7 |
| Funciones principales | 12 |
| Modales | 5 |
| Secciones UI | 5 |
| Funciones del contexto | 11 |
| Opciones de estudios | 6 |
| Tipos de cirugía | 8 |
| Pre-quirúrgicos | 5 |
| Estados que maneja | 7 |
| Datos computados | 9 (2 no usados) |
| Variables no usadas en UI | 2 (`waitingPatients`, `readyForDischarge`) |
| Datos hardcodeados | 2 (historial consultas, expediente) |

---

---

## Notas de Implementación Pendientes

### TODOs Identificados en el Código

1. **Historial de Consultas Hoy:** Actualmente usa datos hardcoded. Debe conectarse con:
   - `systemState.historial` filtrado por fecha actual
   - O crear nueva propiedad en el contexto

2. **Botón "Ver Resultados" en Estudios:** Actualmente solo muestra `alert('Resultados de estudios')`. Debe:
   - Abrir modal con resultados reales de laboratorio
   - Integrar con respuesta de `LaboratorioDashboard`

3. **Expediente Clínico:** Los datos de historial, vacunas y alergias son estáticos. Debe:
   - Conectar con `patient.historial` real
   - Crear estructura de vacunas en el paciente
   - Manejar alergias en datos del paciente

### Datos que Faltan en el Mock

- `patient.historial` - Array de consultas previas
- `patient.vacunas` - Array de vacunaciones
- `patient.alergias` - Array de alergias conocidas
- `patient.observacionesEspeciales` - String con notas

---

**Documento generado para el Proyecto EVEREST - VET-OS**  
**Revisión Senior Dev - Versión 2.2 FINAL (Tercera Revisión)**  
**Última actualización:** Enero 21, 2026
