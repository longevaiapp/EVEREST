# 👨‍⚕️ Módulo Médico - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 1.0  
**Archivo fuente:** `src/components/dashboards/MedicoDashboard.jsx` (1,407 líneas)

---

## 📋 Índice

1. [Propósito del Módulo](#propósito-del-módulo)
2. [Entidades que Maneja](#entidades-que-maneja)
3. [Estados del Sistema](#estados-del-sistema)
4. [Funciones Principales](#funciones-principales)
5. [Formularios](#formularios)
6. [Interacciones con Otros Módulos](#interacciones-con-otros-módulos)
7. [Permisos de Base de Datos](#permisos-de-base-de-datos)

---

## Propósito del Módulo

**Médico** es el **centro clínico** del sistema veterinario. Es responsable de:

- ✅ Atender consultas médicas
- ✅ Registrar síntomas, exámenes físicos y diagnósticos
- ✅ Solicitar estudios de laboratorio
- ✅ Generar prescripciones/recetas
- ✅ Programar y realizar cirugías
- ✅ Gestionar hospitalizaciones
- ✅ Documentar notas médicas y evolución

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

### 1. Tomar Paciente de Cola

```typescript
handleTakePatient(visitId: string): void
```

**Flujo:**
1. Cambia status de Visit a `EN_CONSULTA`
2. Crea registro de Consultation
3. Quita paciente de cola de espera de Recepción

---

### 2. Guardar Consulta

```typescript
handleSaveConsultation(consultationData: ConsultationInput): void
```

**Flujo:**
1. Valida datos requeridos
2. Guarda/actualiza registro de Consultation
3. Actualiza peso en Pet si se registró

---

### 3. Registrar Signos Vitales

```typescript
handleRecordVitalSigns(consultationId: string, vitalSigns: VitalSigns): void
```

**Flujo:**
1. Actualiza vitalSigns en Consultation
2. Si hay hospitalización activa, agrega a vitalSignsHistory

---

### 4. Solicitar Estudios de Laboratorio

```typescript
handleRequestLab(consultationId: string, labRequest: LabRequestInput): void
```

**Flujo:**
1. Crea registro de LabRequest con status `PENDIENTE`
2. Cambia status de Visit a `EN_ESTUDIOS`
3. Envía notificación a Laboratorio

---

### 5. Crear Prescripción

```typescript
handleCreatePrescription(consultationId: string, prescription: PrescriptionInput): void
```

**Flujo:**
1. Crea registro de Prescription con status `PENDIENTE`
2. Cambia status de Visit a `EN_FARMACIA`
3. Envía notificación a Farmacia

---

### 6. Programar Cirugía

```typescript
handleScheduleSurgery(consultationId: string, surgery: SurgeryInput): void
```

**Flujo:**
1. Valida consentimiento firmado
2. Crea registro de Surgery con status `PROGRAMADA`
3. Cambia status de Visit a `CIRUGIA_PROGRAMADA`
4. Envía notificación a Recepción

---

### 7. Iniciar Cirugía

```typescript
handleStartSurgery(surgeryId: string): void
```

**Flujo:**
1. Verifica ayuno confirmado
2. Cambia status de Surgery a `EN_CURSO`
3. Registra startTime
4. Cambia status de Visit a `EN_CIRUGIA`

---

### 8. Completar Cirugía

```typescript
handleCompleteSurgery(surgeryId: string, postOpData: PostOpInput): void
```

**Flujo:**
1. Registra endTime y postOpNotes
2. Cambia status de Surgery a `COMPLETADA`
3. Si requiere hospitalización, llama a handleAdmitPatient
4. Si no, cambia Visit a `LISTO_PARA_ALTA`

---

### 9. Internar Paciente

```typescript
handleAdmitPatient(consultationId: string, hospitalizationData: HospitalizationInput): void
```

**Flujo:**
1. Crea registro de Hospitalization con status `ACTIVA`
2. Cambia status de Visit a `HOSPITALIZADO`
3. Inicializa arrays de observations, vitalSignsHistory, medicationSchedule

---

### 10. Agregar Nota Médica

```typescript
handleAddMedicalNote(petId: string, note: MedicalNoteInput): void
```

**Flujo:**
1. Crea registro de MedicalNote
2. Si es interconsulta, notifica a especialista

---

### 11. Ver Historial Clínico

```typescript
handleViewMedicalHistory(petId: string): MedicalHistory
```

**Retorna:**
- Todas las Consultations del paciente
- Todos los LabRequests y resultados
- Todas las Prescriptions
- Todas las Surgeries
- Todas las Hospitalizations
- Todas las MedicalNotes

---

### 12. Marcar Listo para Alta

```typescript
handleReadyForDischarge(visitId: string, recommendations?: string): void
```

**Flujo:**
1. Verifica que no haya pendientes (labs, recetas, etc.)
2. Cambia status de Visit a `LISTO_PARA_ALTA`
3. Envía notificación a Recepción

---

### 13-17. Funciones Adicionales

```typescript
// 13. Cancelar cirugía
handleCancelSurgery(surgeryId: string, reason: string): void

// 14. Agregar observación a hospitalizado
handleAddHospitalizationObservation(hospitalizationId: string, observation: string): void

// 15. Administrar medicamento a hospitalizado
handleAdministerMedication(hospitalizationId: string, medicationItemId: string): void

// 16. Dar alta de hospitalización
handleDischargeHospitalization(hospitalizationId: string, notes?: string): void

// 17. Solicitar interconsulta
handleRequestInterconsult(petId: string, specialty: string, reason: string): void
```

---

## Formularios

### Formulario: Consulta Médica

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `symptoms` | textarea | ✅ |
| `physicalExam` | textarea | ✅ |
| `vitalSigns.temperature` | number | ❌ |
| `vitalSigns.heartRate` | number | ❌ |
| `vitalSigns.respiratoryRate` | number | ❌ |
| `vitalSigns.weight` | number | ❌ |
| `diagnosis` | textarea | ✅ |
| `treatment` | textarea | ✅ |
| `notes` | textarea | ❌ |
| `followUpRequired` | checkbox | ❌ |
| `followUpDate` | date | ❌ |

---

### Formulario: Solicitud de Laboratorio

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| `type` | select | ✅ | Ver LabType |
| `urgency` | select | ✅ | NORMAL, URGENTE |
| `notes` | textarea | ❌ | - |

---

### Formulario: Prescripción

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `medications` | array | ✅ |
| `medications[].name` | text | ✅ |
| `medications[].dosage` | text | ✅ |
| `medications[].frequency` | text | ✅ |
| `medications[].duration` | text | ✅ |
| `medications[].quantity` | number | ✅ |
| `medications[].instructions` | textarea | ❌ |
| `generalInstructions` | textarea | ❌ |

---

### Formulario: Cirugía

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `type` | text | ✅ |
| `scheduledDate` | date | ✅ |
| `scheduledTime` | time | ✅ |
| `estimatedDuration` | number | ❌ |
| `preOpNotes` | textarea | ❌ |
| `sedationAuthorized` | checkbox | ✅ |
| `consentForm.signedBy` | text | ✅ |
| `consentForm.relationship` | text | ❌ |

---

### Formulario: Hospitalización

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `reason` | textarea | ✅ |
| `location` | text | ❌ |
| `initialObservation` | textarea | ❌ |

---

## Interacciones con Otros Módulos

### Datos que RECIBE de otros módulos

| Origen | Dato | Propósito |
|--------|------|-----------|
| **Recepción** | Visit con triage | Cola de pacientes |
| **Recepción** | Datos de Owner y Pet | Info del paciente |
| **Recepción** | Motivo de visita | Contexto inicial |
| **Laboratorio** | Resultados de estudios | Completar diagnóstico |
| **Farmacia** | Confirmación despacho | Saber que se entregó |

### Datos que ENVÍA a otros módulos

| Destino | Dato | Propósito |
|---------|------|-----------|
| **Laboratorio** | LabRequest | Solicitar estudios |
| **Farmacia** | Prescription | Despachar medicamentos |
| **Recepción** | Status `LISTO_PARA_ALTA` | Procesar salida |
| **Recepción** | Recomendaciones de alta | Entregar al dueño |

---

## Permisos de Base de Datos

| Tabla | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| `Consultation` | ✅ | ✅ | ✅ | ❌ |
| `LabRequest` | ✅ | ✅ | ✅ | ❌ |
| `Prescription` | ✅ | ✅ | ✅ | ❌ |
| `Surgery` | ✅ | ✅ | ✅ | ❌ |
| `Hospitalization` | ✅ | ✅ | ✅ | ❌ |
| `MedicalNote` | ✅ | ✅ | ✅ | ❌ |
| `Owner` | ❌ | ✅ | ❌ | ❌ |
| `Pet` | ❌ | ✅ | ✅* | ❌ |
| `Visit` | ❌ | ✅ | ✅* | ❌ |
| `User` | ❌ | ✅ | ❌ | ❌ |
| `Notification` | ✅ | ✅ | ❌ | ❌ |

*Pet: Solo puede actualizar `weight`  
*Visit: Solo puede actualizar `status`

**Resumen:** Médico es **dueño** de `Consultation`, `LabRequest`, `Prescription`, `Surgery`, `Hospitalization`, y `MedicalNote`.

---

## Vistas/Secciones del Dashboard

1. **Dashboard** - Resumen del día (consultas, cirugías, hospitalizados)
2. **Cola de Consultas** - Pacientes en espera
3. **En Atención** - Consulta activa con formulario
4. **Estudios** - LabRequests y resultados
5. **Cirugías** - Programación y estado de cirugías
6. **Hospitalizados** - Pacientes internados con monitoreo
7. **Historial** - Búsqueda de expedientes

---

## Notas de Implementación

### Medicamentos Comunes (Sugerencias)
```typescript
const commonMedications = [
  'Amoxicilina 500mg',
  'Carprofeno 75mg',
  'Metronidazol 250mg',
  'Prednisona 5mg',
  'Tramadol 50mg',
  'Doxiciclina 100mg',
  'Meloxicam 15mg',
  'Enrofloxacina 150mg'
];
```

### Tipos de Cirugía Comunes
```typescript
const commonSurgeries = [
  'Esterilización',
  'Castración',
  'Limpieza dental',
  'Extracción de tumor',
  'Cirugía ortopédica',
  'Cesárea',
  'Gastropexia'
];
```

---

**Documento generado para el Proyecto EVEREST - VET-OS**
