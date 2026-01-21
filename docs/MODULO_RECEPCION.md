# 🏥 Módulo Recepción - VET-OS (EVEREST)

## Documentación Técnica Completa

**Fecha:** Enero 21, 2026  
**Versión:** 1.0  
**Archivo fuente:** `src/components/dashboards/RecepcionDashboard.jsx` (2,141 líneas)

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

**Recepción** es el **punto de entrada** del sistema veterinario. Es responsable de:

- ✅ Registrar la llegada de pacientes (check-in)
- ✅ Crear nuevos propietarios y mascotas en el sistema
- ✅ Realizar el triage (clasificación de urgencia)
- ✅ Asignar pacientes a doctores
- ✅ Gestionar la agenda de citas
- ✅ Procesar el alta de pacientes
- ✅ Generar códigos QR para auto-registro de clientes

---

## Entidades que Maneja

### 1. Owner (Propietario)

El dueño de la mascota. Recepción es **dueño** de esta entidad.

```typescript
interface Owner {
  id: string;              // ID único (cuid)
  name: string;            // Nombre completo del propietario
  phone: string;           // Teléfono de contacto
  email?: string;          // Correo electrónico (opcional)
  address?: string;        // Dirección (opcional)
  createdAt: Date;         // Fecha de registro
  updatedAt: Date;         // Última actualización
}
```

**Campos requeridos:** `name`, `phone`  
**Campos opcionales:** `email`, `address`

---

### 2. Pet (Mascota/Paciente)

La mascota que recibe atención. Recepción es **dueño** de esta entidad.

```typescript
interface Pet {
  id: string;              // ID único (cuid)
  ownerId: string;         // FK → Owner (propietario)
  name: string;            // Nombre de la mascota
  species: string;         // Especie (perro, gato, ave, etc.)
  breed?: string;          // Raza (opcional)
  age?: string;            // Edad (ej: "5 años", "3 meses")
  weight?: number;         // Peso en kg (opcional)
  photoUrl?: string;       // URL de foto (opcional)
  createdAt: Date;         // Fecha de registro
  updatedAt: Date;         // Última actualización
}
```

**Campos requeridos:** `ownerId`, `name`, `species`  
**Campos opcionales:** `breed`, `age`, `weight`, `photoUrl`

**Especies soportadas:**
- Perro
- Gato
- Ave
- Conejo
- Hamster
- Reptil
- Otro

---

### 3. Visit (Visita)

Representa una visita/atención del paciente. Recepción es **dueño** de esta entidad.

```typescript
interface Visit {
  id: string;              // ID único (cuid)
  petId: string;           // FK → Pet (mascota)
  arrivalTime: Date;       // Hora de llegada
  reason: string;          // Motivo de la visita
  priority: Priority;      // Prioridad del triage
  status: VisitStatus;     // Estado actual de la visita
  assignedTo?: string;     // FK → User (doctor asignado)
  triageNotes?: string;    // Notas del triage
  dischargeNotes?: string; // Notas de alta
  dischargedAt?: Date;     // Fecha/hora de alta
  createdAt: Date;         // Fecha de creación
  updatedAt: Date;         // Última actualización
}

type Priority = 'ALTA' | 'MEDIA' | 'BAJA';

type VisitStatus = 
  | 'RECIEN_LLEGADO'       // Acaba de llegar
  | 'EN_ESPERA'            // Triage completado, esperando doctor
  | 'EN_CONSULTA'          // Doctor atendiendo
  | 'EN_ESTUDIOS'          // En laboratorio
  | 'EN_FARMACIA'          // Esperando medicamentos
  | 'CIRUGIA_PROGRAMADA'   // Cirugía agendada
  | 'EN_CIRUGIA'           // En quirófano
  | 'HOSPITALIZADO'        // Internado
  | 'LISTO_PARA_ALTA'      // Todo completado
  | 'ALTA';                // Caso cerrado
```

**Campos requeridos:** `petId`, `arrivalTime`, `reason`, `priority`, `status`  
**Campos opcionales:** `assignedTo`, `triageNotes`, `dischargeNotes`, `dischargedAt`

---

### 4. Appointment (Cita)

Citas programadas. Recepción es **dueño** de esta entidad.

```typescript
interface Appointment {
  id: string;              // ID único (cuid)
  petId: string;           // FK → Pet (mascota)
  date: Date;              // Fecha de la cita
  time: string;            // Hora (ej: "10:30")
  reason: string;          // Motivo de la cita
  status: AppointmentStatus;
  createdBy: string;       // FK → User (quien creó la cita)
  notes?: string;          // Notas adicionales
  createdAt: Date;         // Fecha de creación
  updatedAt: Date;         // Última actualización
}

type AppointmentStatus = 
  | 'PROGRAMADA'           // Cita agendada
  | 'CONFIRMADA'           // Cliente confirmó asistencia
  | 'COMPLETADA'           // Cita realizada
  | 'CANCELADA'            // Cita cancelada
  | 'NO_ASISTIO';          // Cliente no asistió
```

**Campos requeridos:** `petId`, `date`, `time`, `reason`, `status`, `createdBy`  
**Campos opcionales:** `notes`

---

## Estados del Sistema

### Estados que CREA Recepción

| Estado | Cuándo se crea | Descripción |
|--------|----------------|-------------|
| `RECIEN_LLEGADO` | Al hacer check-in | Paciente acaba de llegar |
| `EN_ESPERA` | Después del triage | Listo para ser atendido por doctor |
| `ALTA` | Al procesar salida | Caso completamente cerrado |

### Estados que LEE Recepción

| Estado | Para qué lo lee |
|--------|-----------------|
| `EN_CONSULTA` | Ver que el doctor tomó al paciente |
| `EN_ESTUDIOS` | Ver que está en laboratorio |
| `EN_FARMACIA` | Ver que está esperando medicamentos |
| `CIRUGIA_PROGRAMADA` | Ver cirugías programadas |
| `EN_CIRUGIA` | Ver que está en quirófano |
| `HOSPITALIZADO` | Ver pacientes internados |
| `LISTO_PARA_ALTA` | Saber que puede procesar la salida |

---

## Funciones Principales

### 1. Check-in de Paciente Nuevo

```typescript
handleCheckIn(ownerData: OwnerInput, petData: PetInput, visitReason: string): void
```

**Flujo:**
1. Crea registro de Owner
2. Crea registro de Pet vinculado al Owner
3. Crea registro de Visit con status `RECIEN_LLEGADO`
4. Muestra en pantalla de sala de espera

---

### 2. Check-in de Paciente Existente

```typescript
handleExistingPatientCheckIn(petId: string, visitReason: string): void
```

**Flujo:**
1. Busca Pet existente
2. Crea nuevo registro de Visit con status `RECIEN_LLEGADO`
3. Muestra en pantalla de sala de espera

---

### 3. Triage (Clasificación de Urgencia)

```typescript
handleTriage(visitId: string, priority: Priority, notes?: string): void
```

**Flujo:**
1. Actualiza Visit con prioridad (`ALTA`, `MEDIA`, `BAJA`)
2. Agrega notas de triage si las hay
3. Cambia status a `EN_ESPERA`
4. Ordena cola por prioridad

**Criterios de prioridad:**
- 🔴 **ALTA:** Emergencia, riesgo vital, dolor severo
- 🟡 **MEDIA:** Urgente pero estable, dolor moderado
- 🟢 **BAJA:** Consulta de rutina, vacunación, control

---

### 4. Asignar a Doctor

```typescript
handleAssignToDoctor(visitId: string, doctorId: string): void
```

**Flujo:**
1. Actualiza Visit con `assignedTo = doctorId`
2. Cambia status a `EN_CONSULTA`
3. Envía notificación al doctor
4. Quita de cola de espera

---

### 5. Programar Cita

```typescript
handleScheduleAppointment(
  petId: string, 
  date: Date, 
  time: string, 
  reason: string
): void
```

**Flujo:**
1. Valida disponibilidad de horario
2. Crea registro de Appointment con status `PROGRAMADA`
3. Opcionalmente envía recordatorio al cliente

---

### 6. Procesar Alta

```typescript
handleDischarge(visitId: string, notes?: string): void
```

**Flujo:**
1. Verifica que status sea `LISTO_PARA_ALTA`
2. Agrega notas de alta si las hay
3. Cambia status a `ALTA`
4. Registra `dischargedAt` con fecha/hora actual

---

### 7. Generar QR para Auto-registro

```typescript
generateQRCode(): string
```

**Flujo:**
1. Genera URL única para `/registro-cliente`
2. Crea código QR con la URL
3. Cliente escanea y llena formulario desde su celular

---

### 8. Buscar Paciente

```typescript
searchPatient(query: string): Pet[]
```

**Busca por:**
- Nombre de la mascota
- Nombre del propietario
- Teléfono del propietario
- Número de ficha

---

## Formularios

### Formulario: Check-in Nuevo

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `owner.name` | text | ✅ | Mínimo 2 caracteres |
| `owner.phone` | tel | ✅ | Formato de teléfono válido |
| `owner.email` | email | ❌ | Formato de email válido |
| `owner.address` | text | ❌ | - |
| `pet.name` | text | ✅ | Mínimo 2 caracteres |
| `pet.species` | select | ✅ | Valor de lista predefinida |
| `pet.breed` | text | ❌ | - |
| `pet.age` | text | ❌ | - |
| `pet.weight` | number | ❌ | Número positivo |
| `visitReason` | textarea | ✅ | Mínimo 10 caracteres |

---

### Formulario: Triage

| Campo | Tipo | Requerido | Opciones |
|-------|------|-----------|----------|
| `priority` | select | ✅ | ALTA, MEDIA, BAJA |
| `triageNotes` | textarea | ❌ | - |

---

### Formulario: Nueva Cita

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `date` | date | ✅ | Fecha futura |
| `time` | time | ✅ | Horario de atención |
| `reason` | textarea | ✅ | Mínimo 5 caracteres |

---

## Interacciones con Otros Módulos

### Datos que ENVÍA a otros módulos

| Destino | Dato | Propósito |
|---------|------|-----------|
| **Médico** | Visit con triage | Cola de pacientes a atender |
| **Médico** | Datos de Owner y Pet | Información del paciente |
| **Sistema** | Nuevo Owner/Pet | Base de datos central |

### Datos que RECIBE de otros módulos

| Origen | Dato | Propósito |
|--------|------|-----------|
| **Médico** | Notificación `LISTO_PARA_ALTA` | Procesar salida |
| **Farmacia** | Confirmación de despacho | Saber que medicamentos entregados |
| **Sistema** | Lista de doctores disponibles | Asignar paciente |

---

## Permisos de Base de Datos

| Tabla | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| `Owner` | ✅ | ✅ | ✅ | ✅ |
| `Pet` | ✅ | ✅ | ✅ | ✅ |
| `Visit` | ✅ | ✅ | ✅ | ❌ |
| `Appointment` | ✅ | ✅ | ✅ | ✅ |
| `User` | ❌ | ✅ | ❌ | ❌ |
| `Notification` | ✅ | ✅ | ❌ | ❌ |

**Resumen:** Recepción es **dueño** de `Owner`, `Pet`, `Visit`, y `Appointment`.

---

## Vistas/Secciones del Dashboard

1. **Dashboard** - Resumen del día (estadísticas)
2. **Sala de Espera** - Pacientes pendientes ordenados por prioridad
3. **Check-in** - Formulario de nuevo ingreso
4. **Citas** - Agenda del día y programación
5. **Alta** - Pacientes listos para salir
6. **Búsqueda** - Buscar pacientes existentes
7. **Notificaciones** - Alertas del sistema

---

## Notas de Implementación

### Prioridades en Cola de Espera
```typescript
// Orden de visualización
const sortByPriority = (visits: Visit[]) => {
  const priorityOrder = { ALTA: 1, MEDIA: 2, BAJA: 3 };
  return visits.sort((a, b) => {
    // Primero por prioridad
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // Luego por hora de llegada
    return a.arrivalTime.getTime() - b.arrivalTime.getTime();
  });
};
```

### Colores de Prioridad
```typescript
const priorityColors = {
  ALTA: '#f44336',    // Rojo
  MEDIA: '#ff9800',   // Naranja
  BAJA: '#4caf50'     // Verde
};
```

---

**Documento generado para el Proyecto EVEREST - VET-OS**
