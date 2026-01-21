# 🏥 Módulo Recepción - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 2.0 (Revisión exhaustiva Senior Dev)  
**Archivo fuente:** `src/components/dashboards/RecepcionDashboard.jsx` (2,141 líneas)

---

## 📋 Índice

1. [Propósito del Módulo](#propósito-del-módulo)
2. [Entidades que Maneja](#entidades-que-maneja)
   - [Owner (Propietario)](#1-owner-propietario)
   - [Pet (Mascota/Paciente)](#2-pet-mascotapaciente)
   - [Visit (Visita/Triage)](#3-visit-visitatriage)
   - [Appointment (Cita)](#4-appointment-cita)
   - [Payment (Pago)](#5-payment-pago)
   - [ExpedienteEntry (Historial)](#6-expedienteentry-historial-clínico)
3. [Estados del Sistema](#estados-del-sistema)
4. [Funciones Principales](#funciones-principales)
5. [Formularios y Wizards](#formularios-y-wizards)
6. [Modales del Sistema](#modales-del-sistema)
7. [Secciones de la UI](#secciones-de-la-ui)
8. [Interacciones con Otros Módulos](#interacciones-con-otros-módulos)
9. [Permisos de Base de Datos](#permisos-de-base-de-datos)

---

## Propósito del Módulo

**Recepción** es el **punto de entrada** del sistema veterinario. Es responsable de:

- ✅ Registrar la llegada de pacientes (check-in)
- ✅ Crear nuevos propietarios y mascotas en el sistema
- ✅ Realizar el triage (clasificación de urgencia)
- ✅ Asignar pacientes a doctores
- ✅ Gestionar la agenda de citas
- ✅ Procesar el alta de pacientes (incluyendo cobro)
- ✅ Generar códigos QR para auto-registro de clientes
- ✅ Gestionar calendario de medicina preventiva
- ✅ Búsqueda de clientes por teléfono para check-in rápido

---

## Entidades que Maneja

### 1. Owner (Propietario)

El dueño de la mascota. Recepción es **dueño** de esta entidad.

```typescript
interface Owner {
  id: string;              // ID único (cuid)
  nombre: string;          // Nombre completo del propietario
  telefono: string;        // Teléfono de contacto (usado para búsqueda)
  email?: string;          // Correo electrónico (opcional)
  direccion?: string;      // Calle, número, colonia, ciudad
  createdAt: Date;         // Fecha de registro
  updatedAt: Date;         // Última actualización
}
```

**Campos requeridos:** `nombre`, `telefono`  
**Campos opcionales:** `email`, `direccion`

---

### 2. Pet (Mascota/Paciente)

La mascota que recibe atención. Recepción es **dueño** de esta entidad.

**⚠️ IMPORTANTE:** Esta entidad tiene 45+ campos organizados en 7 categorías del wizard de registro.

```typescript
interface Pet {
  // === IDENTIFICACIÓN ===
  id: string;                    // ID único (cuid)
  numeroFicha: string;           // Código único (ej: "VET-001")
  ownerId: string;               // FK → Owner (propietario)
  
  // === DATOS BÁSICOS (Wizard Paso 2) ===
  nombre: string;                // Nombre de la mascota *
  especie: Species;              // Especie *
  raza?: string;                 // Raza o "mestizo"
  sexo: 'Macho' | 'Hembra';      // Sexo *
  fechaNacimiento?: Date;        // Fecha de nacimiento
  peso?: number;                 // Peso en kg
  color?: string;                // Color del pelaje
  condicionCorporal?: BodyCondition; // Escala 1-5
  foto?: File;                   // Archivo de imagen
  fotoPreview?: string;          // Base64 para preview
  
  // === HISTORIAL MÉDICO (Wizard Paso 3) ===
  snapTest?: string;             // Resultados de Snap Test
  analisisClinicos?: string;     // Análisis clínicos previos
  antecedentes?: string;         // Antecedentes generales
  
  // === VACUNAS Y DESPARASITACIÓN (Wizard Paso 4) ===
  desparasitacionExterna?: boolean;  // ¿Tiene desparasitación externa?
  ultimaDesparasitacion?: Date;      // Fecha última desparasitación
  vacunas?: string;                  // Lista de vacunas (texto)
  vacunasActualizadas?: boolean;     // ¿Vacunas al día?
  ultimaVacuna?: Date;               // Fecha última vacuna
  
  // === CIRUGÍAS (Wizard Paso 5) ===
  esterilizado?: 'Si' | 'No';        // ¿Está esterilizado?
  otrasCirugias?: 'Si' | 'No';       // ¿Tiene otras cirugías?
  detalleCirugias?: string;          // Descripción de cirugías previas
  
  // === INFO REPRODUCTIVA - Solo Hembras (Wizard Paso 5) ===
  ultimoCelo?: Date;                 // Fecha del último celo
  cantidadPartos?: number;           // Número de partos
  ultimoParto?: Date;                // Fecha del último parto
  
  // === ALIMENTACIÓN Y PATOLOGÍAS (Wizard Paso 6) ===
  alimento?: string;                 // Marca/tipo de alimento
  porcionesPorDia?: string;          // Ej: "2 tazas"
  otrosAlimentos?: string;           // Premios, sobras, etc.
  frecuenciaOtrosAlimentos?: string; // Diario, semanal, etc.
  alergias?: string;                 // Alergias conocidas (comma-separated)
  enfermedadesCronicas?: string;     // Condiciones médicas crónicas
  
  // === ESTILO DE VIDA (Wizard Paso 7) ===
  conviveOtrasMascotas?: 'Si' | 'No';
  cualesMascotas?: string;           // Perros, gatos, etc.
  actividadFisica?: 'Si' | 'No';
  frecuenciaActividad?: string;      // Diario, 3 veces/semana, etc.
  saleViaPublica?: 'Si' | 'No';
  frecuenciaSalida?: string;         // Paseos diarios, etc.
  otrosDatos?: string;               // Información adicional
  
  // === METADATA ===
  estado: PatientStatus;             // Estado actual en el sistema
  fechaIngreso: Date;                // Fecha de primer registro
  primeraVisita: boolean;            // ¿Es primera visita?
  expediente: ExpedienteEntry[];     // Historial de consultas
  cirugiasPrevias: Surgery[];        // Array de cirugías
  createdAt: Date;
  updatedAt: Date;
}

type Species = 'Perro' | 'Gato' | 'Ave' | 'Roedor' | 'Reptil' | 'Otro';

type BodyCondition = '1' | '2' | '3' | '4' | '5';
// 1 = Muy delgado
// 2 = Delgado  
// 3 = Ideal
// 4 = Sobrepeso
// 5 = Obeso
```

**Campos requeridos:** `nombre`, `especie`, `sexo`, `ownerId`  
**Campos opcionales:** Todos los demás

---

### 3. Visit (Visita/Triage)

Representa una visita/atención del paciente. Recepción es **dueño** de esta entidad.

```typescript
interface Visit {
  id: string;              // ID único (cuid)
  petId: string;           // FK → Pet (mascota)
  arrivalTime: Date;       // Hora de llegada
  status: VisitStatus;     // Estado actual de la visita
  
  // === DATOS DE TRIAGE ===
  tipoVisita: VisitType;   // Tipo de visita
  motivo: string;          // Motivo de la visita (descripción)
  prioridad: Priority;     // Prioridad del triage
  peso: number;            // Peso en kg (obligatorio en triage)
  temperatura?: number;    // Temperatura en °C
  primeraVisita: boolean;  // ¿Es primera visita del paciente?
  antecedentes?: string;   // Alergias, cirugías previas, medicamentos actuales
  
  // === ASIGNACIÓN ===
  assignedTo?: string;     // FK → User (doctor asignado)
  
  // === ALTA ===
  dischargeNotes?: string; // Notas de alta
  dischargedAt?: Date;     // Fecha/hora de alta
  
  // === METADATA ===
  createdAt: Date;         // Fecha de creación
  updatedAt: Date;         // Última actualización
}

type Priority = 'ALTA' | 'MEDIA' | 'BAJA';

type VisitType = 
  | 'consulta_general'     // Consulta de rutina
  | 'seguimiento'          // Revisión de caso previo
  | 'medicina_preventiva'  // Vacunación, desparasitación
  | 'emergencia';          // Caso urgente

type VisitStatus = 
  | 'RECIEN_LLEGADO'       // Acaba de llegar, pendiente de triage
  | 'EN_ESPERA'            // Triage completado, esperando doctor
  | 'EN_CONSULTA'          // Doctor atendiendo
  | 'EN_ESTUDIOS'          // En laboratorio
  | 'EN_FARMACIA'          // Esperando medicamentos
  | 'CIRUGIA_PROGRAMADA'   // Cirugía agendada
  | 'EN_CIRUGIA'           // En quirófano
  | 'HOSPITALIZADO'        // Internado
  | 'LISTO_PARA_ALTA'      // Todo completado, pendiente de cobro
  | 'ALTA';                // Caso cerrado
```

**Campos requeridos en triage:** `tipoVisita`, `motivo`, `prioridad`, `peso`  
**Campos opcionales:** `temperatura`, `antecedentes`

---

### 4. Appointment (Cita)

Citas programadas. Recepción es **dueño** de esta entidad.

```typescript
interface Appointment {
  id: string;              // ID único (cuid)
  pacienteId: string;      // FK → Pet (mascota)
  pacienteNombre: string;  // Nombre del paciente (denormalizado)
  fecha: Date;             // Fecha de la cita (YYYY-MM-DD)
  hora: string;            // Hora (ej: "10:30")
  tipo: AppointmentType;   // Tipo de cita
  motivo: string;          // Motivo de la cita
  confirmada: boolean;     // ¿Cliente confirmó asistencia?
  createdBy: string;       // FK → User (quien creó la cita)
  createdAt: Date;         // Fecha de creación
}

type AppointmentType = 
  | 'consulta_general'     // Consulta de rutina
  | 'seguimiento'          // Revisión de caso previo
  | 'vacunacion'           // Aplicación de vacunas
  | 'cirugia'              // Procedimiento quirúrgico
  | 'emergencia';          // Caso urgente
```

**Campos requeridos:** `pacienteId`, `pacienteNombre`, `fecha`, `hora`, `tipo`, `motivo`  
**Campos opcionales:** `confirmada` (default: false)

---

### 5. Payment (Pago)

Registro de pagos al momento del alta. Recepción es **dueño** de esta entidad.

```typescript
interface Payment {
  id: string;              // ID único (cuid)
  visitId: string;         // FK → Visit
  patientId: string;       // FK → Pet
  total: number;           // Monto total cobrado
  metodoPago: PaymentMethod; // Método de pago
  fecha: Date;             // Fecha del pago
  createdAt: Date;
}

type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
```

**Campos requeridos:** `visitId`, `patientId`, `total`, `metodoPago`, `fecha`

---

### 6. ExpedienteEntry (Historial Clínico)

Entradas del expediente clínico del paciente.

```typescript
interface ExpedienteEntry {
  fecha: Date;             // Fecha de la consulta
  tipo?: string;           // Tipo de consulta (ej: "Consulta General")
  motivo: string;          // Motivo de la visita
  diagnostico?: string;    // Diagnóstico del médico
  tratamiento?: string;    // Tratamiento indicado
  medico: string;          // Nombre del médico que atendió
}

// Usado en Pet.expediente: ExpedienteEntry[]
```

---

### 7. Vaccine (Vacuna Aplicada)

Registro de vacunas del paciente.

```typescript
interface Vaccine {
  nombre: string;          // Nombre de la vacuna
  fecha: Date;             // Fecha de aplicación
  proximaDosis?: Date;     // Fecha de próxima dosis (para calendario preventivo)
}

// Usado en Pet.vacunas: Vaccine[]
```

---

### 8. Surgery (Cirugía Previa)

Registro de cirugías del paciente.

```typescript
interface Surgery {
  tipo: string;            // Tipo de cirugía
  fecha: Date;             // Fecha de la cirugía
  notas?: string;          // Notas adicionales
}

// Usado en Pet.cirugiasPrevias: Surgery[]
```

---

## Estados del Sistema

### Estados que CREA Recepción

| Estado | Cuándo se crea | Descripción |
|--------|----------------|-------------|
| `RECIEN_LLEGADO` | Al hacer check-in | Paciente acaba de llegar, pendiente triage |
| `EN_ESPERA` | Después del triage | Listo para ser atendido por doctor |
| `ALTA` | Al procesar salida + cobro | Caso completamente cerrado |

### Estados que LEE Recepción

| Estado | Para qué lo lee |
|--------|-----------------|
| `EN_CONSULTA` | Ver que el doctor tomó al paciente |
| `EN_ESTUDIOS` | Ver que está en laboratorio |
| `EN_FARMACIA` | Ver que está esperando medicamentos |
| `CIRUGIA_PROGRAMADA` | Ver cirugías programadas |
| `EN_CIRUGIA` | Ver que está en quirófano |
| `HOSPITALIZADO` | Ver pacientes internados |
| `LISTO_PARA_ALTA` | Saber que puede procesar la salida y cobro |

---

## Funciones Principales

### 1. Búsqueda de Cliente por Teléfono

```typescript
handleSearchClient(e: FormEvent): void
```

**Flujo:**
1. Recibe número de teléfono del formulario
2. Busca pacientes donde `telefono` coincida (normalizado sin caracteres especiales)
3. Si encuentra, muestra datos del cliente y sus mascotas
4. Permite hacer check-in rápido de cualquier mascota encontrada

**Estados relacionados:**
- `clientSearchPhone` - Número ingresado
- `foundClient` - Cliente encontrado con sus mascotas
- `showClientPets` - Mostrar lista de mascotas
- `clientSearchError` - Mensaje de error si no encuentra

---

### 2. Check-in de Paciente Existente

```typescript
handleCheckInExistingPet(pet: Pet): void
```

**Flujo:**
1. Recibe mascota seleccionada de la búsqueda
2. Actualiza estado del paciente a `RECIEN_LLEGADO`
3. Muestra confirmación
4. Limpia formulario de búsqueda
5. Redirige a sección de Triage

---

### 3. Iniciar Triage

```typescript
handleStartTriage(patient: Pet): void
```

**Flujo:**
1. Selecciona paciente
2. Inicializa datos de triage con valores por defecto
3. Abre modal de triage

**Estado inicial de triage:**
```typescript
{
  tipoVisita: 'consulta_general',
  motivo: '',
  prioridad: 'MEDIA',
  peso: '',
  temperatura: '',
  primeraVisita: false,
  antecedentes: ''
}
```

---

### 4. Completar Triage

```typescript
handleSubmitTriage(e: FormEvent): void
```

**Flujo:**
1. Valida datos del formulario
2. Actualiza paciente con información del triage:
   - `prioridad`
   - `tipoVisita`
   - `motivo`
   - `peso`
   - `temperatura`
3. Cambia estado a `EN_ESPERA`
4. Cierra modal
5. Paciente aparece en cola de espera ordenado por prioridad

---

### 5. Agendar Nueva Cita

```typescript
handleNewAppointment(): void
handleSubmitNewAppointment(e: FormEvent): void
```

**Flujo:**
1. Abre modal con formulario de cita
2. Selecciona paciente de lista existente
3. Ingresa fecha, hora, tipo y motivo
4. Opcionalmente marca como confirmada
5. Crea registro de cita

---

### 6. Confirmar Cita Existente

```typescript
handleConfirmAppointment(citaId: string): void
```

**Flujo:**
1. Recibe ID de cita
2. Actualiza `confirmada = true`
3. Muestra confirmación

---

### 7. Llamar a Paciente

```typescript
handleCallPatient(telefono: string): void
```

**Flujo:**
1. Abre integración nativa de teléfono
2. Usa protocolo `tel:` para iniciar llamada

---

### 8. Ver Expediente

```typescript
handleViewExpediente(patient: Pet): void
```

**Flujo:**
1. Selecciona paciente
2. Abre modal con expediente clínico completo:
   - Información general
   - Datos del propietario
   - Antecedentes médicos
   - Alergias (con alerta visual)
   - Vacunas aplicadas
   - Cirugías previas
   - Historial de consultas (timeline)

---

### 9. Ver Calendario Medicina Preventiva

```typescript
handleViewCalendar(): void
```

**Flujo:**
1. Abre modal con pacientes que requieren atención preventiva
2. Muestra vacunas pendientes por paciente
3. Permite llamar para agendar

---

### 10. Iniciar Alta

```typescript
handleStartDischarge(patient: Pet): void
```

**Flujo:**
1. Verifica que paciente esté en `LISTO_PARA_ALTA`
2. Inicializa datos de alta con valores por defecto
3. Abre modal de alta/cobro

**Estado inicial de alta:**
```typescript
{
  fechaSeguimiento: '',
  horaSeguimiento: '',
  total: '1200',        // Valor por defecto
  metodoPago: 'efectivo'
}
```

---

### 11. Procesar Alta y Cobro

```typescript
handleSubmitDischarge(e: FormEvent): void
```

**Flujo:**
1. Registra pago usando `registerPayment()`:
   ```typescript
   registerPayment(patientId, {
     total: number,
     metodoPago: string,
     fecha: Date
   })
   ```
2. Si hay fecha de seguimiento, programa cita:
   ```typescript
   scheduleFollowUp(patientId, {
     fecha: Date,
     hora: string,
     tipo: 'Seguimiento'
   })
   ```
3. Ejecuta alta del paciente: `dischargePatient(patientId)`
4. Cambia estado a `ALTA`
5. Cierra modal

---

### 12. Registrar Nueva Mascota (Wizard)

```typescript
handleSubmitNewPatient(e: FormEvent): void
```

**Flujo:**
1. Genera número de ficha único: `VET-XXX`
2. Crea objeto de paciente con todos los datos del wizard
3. Parsea alergias de string a array
4. Establece estado inicial como `RECIEN_LLEGADO`
5. Agrega al contexto global

---

### 13. Buscar Pacientes (Filtro)

```typescript
// Implementado como filteredPatients
const filteredPatients = allPatients.filter(patient => 
  patient.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  patient.numeroFicha?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  patient.propietario?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  patient.telefono?.includes(searchQuery)
);
```

**Busca por:**
- Nombre de la mascota
- Número de ficha (VET-XXX)
- Nombre del propietario
- Teléfono

---

### 14. Generar QR para Auto-registro

```typescript
const clientFormURL = `${window.location.origin}/registro-cliente`
```

**Flujo:**
1. Genera URL del formulario de registro
2. Renderiza código QR usando `QRCodeSVG`
3. Cliente escanea y llena formulario desde su celular

---

## Formularios y Wizards

### Wizard: Nueva Mascota (7 Pasos)

#### Paso 1: Datos del Propietario

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `propietario` | text | ✅ | Nombre completo |
| `direccion` | text | ❌ | Calle, número, colonia, ciudad |
| `telefono` | tel | ✅ | 10 dígitos |
| `email` | email | ❌ | Formato email válido |

#### Paso 2: Datos del Paciente

| Campo | Tipo | Requerido | Opciones/Validación |
|-------|------|-----------|---------------------|
| `foto` | file | ❌ | Imagen (acepta image/*) |
| `nombre` | text | ✅ | Nombre de la mascota |
| `fechaNacimiento` | date | ❌ | - |
| `sexo` | select | ✅ | Macho, Hembra |
| `peso` | number | ❌ | Step 0.1 |
| `especie` | select | ✅ | Perro, Gato, Ave, Roedor, Reptil, Otro |
| `raza` | text | ❌ | Raza o mestizo |
| `color` | text | ❌ | Color del pelaje |
| `condicionCorporal` | select | ❌ | 1-Muy delgado, 2-Delgado, 3-Ideal, 4-Sobrepeso, 5-Obeso |

#### Paso 3: Historial Médico

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `snapTest` | text | ❌ |
| `analisisClinicos` | textarea | ❌ |

#### Paso 4: Desparasitaciones y Vacunas

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `desparasitacionExterna` | checkbox | ❌ |
| `ultimaDesparasitacion` | date | ❌ |
| `vacunas` | textarea | ❌ |
| `vacunasActualizadas` | checkbox | ❌ |
| `ultimaVacuna` | date | ❌ |

#### Paso 5: Cirugías y Tratamientos

| Campo | Tipo | Requerido | Condición |
|-------|------|-----------|-----------|
| `esterilizado` | radio | ❌ | Si / No |
| `otrasCirugias` | radio | ❌ | Si / No |
| `detalleCirugias` | textarea | ❌ | Solo si otrasCirugias = Si |
| `ultimoCelo` | date | ❌ | Solo si sexo = Hembra |
| `cantidadPartos` | number | ❌ | Solo si sexo = Hembra |
| `ultimoParto` | date | ❌ | Solo si sexo = Hembra |

#### Paso 6: Alimentación y Patologías

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `alimento` | text | ❌ |
| `porcionesPorDia` | text | ❌ |
| `otrosAlimentos` | text | ❌ |
| `frecuenciaOtrosAlimentos` | text | ❌ |
| `alergias` | text | ❌ |
| `enfermedadesCronicas` | textarea | ❌ |

#### Paso 7: Otros Datos

| Campo | Tipo | Requerido | Condición |
|-------|------|-----------|-----------|
| `conviveOtrasMascotas` | radio | ❌ | Si / No |
| `cualesMascotas` | text | ❌ | Solo si convive = Si |
| `actividadFisica` | radio | ❌ | Si / No |
| `frecuenciaActividad` | text | ❌ | Solo si actividad = Si |
| `saleViaPublica` | radio | ❌ | Si / No |
| `frecuenciaSalida` | text | ❌ | Solo si sale = Si |
| `otrosDatos` | textarea | ❌ | - |

---

### Formulario: Triage

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| `tipoVisita` | select | ✅ | consulta_general, seguimiento, medicina_preventiva, emergencia |
| `motivo` | textarea | ✅ | Descripción del motivo |
| `prioridad` | radio | ✅ | ALTA (rojo), MEDIA (naranja), BAJA (verde) |
| `peso` | number | ✅ | Step 0.1, placeholder "25.5" |
| `temperatura` | number | ❌ | Step 0.1, placeholder "38.5" |
| `primeraVisita` | checkbox | ❌ | Crea expediente nuevo |
| `antecedentes` | textarea | ❌ | Alergias, cirugías previas, medicamentos |

---

### Formulario: Nueva Cita

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| `pacienteNombre` | select | ✅ | Lista de pacientes existentes |
| `fecha` | date | ✅ | - |
| `hora` | time | ✅ | - |
| `tipo` | select | ✅ | consulta_general, seguimiento, vacunacion, cirugia, emergencia |
| `motivo` | textarea | ✅ | - |
| `confirmada` | checkbox | ❌ | Confirmar inmediatamente |

---

### Formulario: Alta y Cobro

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| `total` | number | ✅ | Monto a cobrar |
| `metodoPago` | select | ✅ | efectivo, tarjeta, transferencia |
| `fechaSeguimiento` | date | ❌ | Para agendar cita |
| `horaSeguimiento` | time | ❌ | Para agendar cita |

---

## Modales del Sistema

| Modal | Variable de Estado | Propósito |
|-------|-------------------|-----------|
| Triage | `showTriageModal` | Clasificar urgencia y registrar signos vitales |
| Alta/Cobro | `showDischargeModal` | Procesar pago y programar seguimiento |
| Expediente | `showExpedienteModal` | Ver historial clínico completo |
| Nueva Cita | `showNewAppointmentModal` | Agendar cita futura |
| Calendario Preventivo | `showCalendarModal` | Ver pacientes con vacunas pendientes |
| Detalles Paciente | `selectedPatient` (sin modal específico) | Ver información básica |

---

## Secciones de la UI

| Sección | Key | Descripción | Badge |
|---------|-----|-------------|-------|
| Dashboard | `dashboard` | Resumen general con estadísticas | - |
| Check-in Cliente | `checkin` | QR para nuevos + búsqueda por teléfono | - |
| Nueva Mascota | `nueva-mascota` | Wizard de 7 pasos para registro completo | - |
| Citas del Día | `citas` | Lista de citas programadas para hoy | Cantidad |
| Medicina Preventiva | `preventiva` | Pacientes con vacunas pendientes | Cantidad (warning) |
| Triage Urgente | `triage` | Pacientes recién llegados pendientes | Cantidad (urgent) |
| Todos los Pacientes | `todos` | Tabla completa con filtros | - |
| Listos para Alta | `alta` | Pacientes pendientes de cobro y salida | Cantidad (success) |

---

## Interacciones con Otros Módulos

### Datos que ENVÍA a otros módulos

| Destino | Dato | Propósito |
|---------|------|-----------|
| **Médico** | Visit con triage completado | Cola de pacientes a atender |
| **Médico** | Datos completos de Pet | 45+ campos del paciente |
| **Médico** | Datos de Owner | Información de contacto |
| **Laboratorio** | Pet ID | Referencia para estudios |
| **Farmacia** | Visit ID | Para despacho de medicamentos |

### Datos que RECIBE de otros módulos

| Origen | Dato | Propósito |
|--------|------|-----------|
| **Médico** | Cambio a `LISTO_PARA_ALTA` | Procesar salida y cobro |
| **Médico** | Expediente actualizado | Mostrar en modal de expediente |
| **Farmacia** | Confirmación de despacho | Saber que medicamentos entregados |
| **Sistema** | Lista de doctores disponibles | Para info de asignación |

### Funciones del Contexto Utilizadas

```typescript
// Desde AppContext
const {
  systemState,           // Estado global del sistema
  updatePatientState,    // Cambiar estado de paciente
  registerPayment,       // Registrar pago al alta
  scheduleFollowUp,      // Agendar cita de seguimiento
  dischargePatient,      // Procesar alta final
  currentUser            // Usuario logueado actual
} = useAppContext();
```

---

## Permisos de Base de Datos

| Tabla | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| `Owner` | ✅ | ✅ | ✅ | ✅ |
| `Pet` | ✅ | ✅ | ✅ | ✅ |
| `Visit` | ✅ | ✅ | ✅ | ❌ |
| `Appointment` | ✅ | ✅ | ✅ | ✅ |
| `Payment` | ✅ | ✅ | ❌ | ❌ |
| `User` | ❌ | ✅ | ❌ | ❌ |
| `Notification` | ✅ | ✅ | ❌ | ❌ |

**Resumen:** Recepción es **dueño** de `Owner`, `Pet`, `Visit`, `Appointment`, y `Payment`.

---

## Variables de Estado del Componente

```typescript
// Navegación
const [activeSection, setActiveSection] = useState('dashboard');
const [mascotaWizardStep, setMascotaWizardStep] = useState(1);

// Búsqueda y filtros
const [searchQuery, setSearchQuery] = useState('');
const [clientSearchPhone, setClientSearchPhone] = useState('');
const [clientSearchError, setClientSearchError] = useState('');
const [foundClient, setFoundClient] = useState(null);
const [showClientPets, setShowClientPets] = useState(false);

// Modales
const [showTriageModal, setShowTriageModal] = useState(false);
const [showDischargeModal, setShowDischargeModal] = useState(false);
const [showExpedienteModal, setShowExpedienteModal] = useState(false);
const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
const [showCalendarModal, setShowCalendarModal] = useState(false);

// Datos de formularios
const [selectedPatient, setSelectedPatient] = useState(null);
const [triageData, setTriageData] = useState({...});
const [dischargeData, setDischargeData] = useState({...});
const [newPatientData, setNewPatientData] = useState({...});
const [newAppointmentData, setNewAppointmentData] = useState({...});
```

---

## Notas de Implementación

### Prioridades en Cola de Espera
```typescript
const priorityOrder = { ALTA: 1, MEDIA: 2, BAJA: 3 };
// Ordenar primero por prioridad, luego por hora de llegada
```

### Colores de Prioridad
```typescript
const priorityColors = {
  ALTA: '#f44336',    // Rojo
  MEDIA: '#ff9800',   // Naranja  
  BAJA: '#4caf50'     // Verde
};
```

### Colores de Estado
```typescript
function getStatusColor(status) {
  // Implementación para mapear estado a color
}
```

### Generación de Número de Ficha
```typescript
const nuevoNumeroFicha = `VET-${String(allPatients.length + 1).padStart(3, '0')}`;
// Ejemplo: VET-001, VET-002, etc.
```

### URL del Formulario QR
```typescript
const clientFormURL = `${window.location.origin}/registro-cliente`;
// Componente: RegistroCliente.jsx
```

---

## Dependencias Externas

```javascript
import { QRCodeSVG } from 'qrcode.react';  // Para generar códigos QR
```

---

**Documento generado para el Proyecto EVEREST - VET-OS**  
**Revisión Senior Dev - Versión 2.0 Completa**
