# MÓDULO DE HOSPITALIZACIÓN - Documentación Técnica

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Flujo General del Sistema](#flujo-general-del-sistema)
3. [Corrección del Flujo de Farmacia](#corrección-del-flujo-de-farmacia)
4. [Panel de Administración - Tarifas](#panel-de-administración---tarifas)
5. [Modelo de Datos (Prisma Schema)](#modelo-de-datos-prisma-schema)
6. [Endpoints de API](#endpoints-de-api)
7. [Componentes de Frontend](#componentes-de-frontend)
8. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)

---

## Resumen Ejecutivo

El módulo de hospitalización permite al médico veterinario internar pacientes desde su dashboard, con seguimiento de signos vitales, plan terapéutico con horarios de medicación, y alta médica que culmina en el cobro total en recepción.

### Principios Clave:
- **Farmacia NUNCA entrega al dueño** - Solo a personal clínico (médico en consulta, personal de hospitalización)
- **Recepción cobra TODO al final** - Consulta + Hospitalización + Medicamentos + Estudios
- **Recetas externas se imprimen en Recepción** - El dueño las compra en farmacia externa
- **Tarifas configurables desde Admin** - Hospitalización por día, consultas, estudios

---

## Flujo General del Sistema

### Flujo Completo Actual + Hospitalización:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DEL SISTEMA EVEREST                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐     ┌──────────┐                              ┌──────────────┐   │
│  │RECEPCIÓN │────▶│  MÉDICO  │─────────────────────────────▶│  RECEPCIÓN   │   │
│  │ (Llegada)│     │(Consulta)│                              │   (Salida)   │   │
│  └──────────┘     └────┬─────┘                              └──────┬───────┘   │
│                        │                                           │           │
│                        ├─── Alta Inmediata ───┐                    │           │
│                        │                      │                    │           │
│                        │                      ▼                    │           │
│                        │               ┌──────────┐                │           │
│                        │               │ FARMACIA │                │           │
│                        │               │          │                │           │
│                        │               │ Despacha │                │           │
│                        │               │ al MÉDICO│────────────────┤           │
│                        │               └──────────┘                │           │
│                        │                                           │           │
│                        └─── Hospitalizar ───┐                      │           │
│                                             │                      │           │
│                                             ▼                      │           │
│                        ┌─────────────────────────────────────┐     │           │
│                        │         HOSPITALIZACIÓN             │     │           │
│                        │                                     │     │           │
│                        │  ┌─────────┐  ┌──────────┐  ┌─────┐│     │           │
│                        │  │ INGRESO │─▶│SEGUIMIENTO│─▶│ALTA ││─────┤           │
│                        │  └────┬────┘  └────┬─────┘  └─────┘│     │           │
│                        │       │            │                │     │           │
│                        │       ▼            ▼                │     │           │
│                        │  ┌─────────┐  ┌──────────┐          │     │           │
│                        │  │  Plan   │  │Revisiones│          │     │           │
│                        │  │Terapéut.│  │Periódicas│          │     │           │
│                        │  └────┬────┘  └──────────┘          │     │           │
│                        │       │                             │     │           │
│                        │       ▼                             │     │           │
│                        │  ┌──────────┐                       │     │           │
│                        │  │ FARMACIA │                       │     │           │
│                        │  │ Despacha │                       │     │           │
│                        │  │ a HOSP.  │                       │     │           │
│                        │  └──────────┘                       │     │           │
│                        └─────────────────────────────────────┘     │           │
│                                                                    │           │
│                                                                    ▼           │
│                                                         ┌──────────────────┐   │
│                                                         │ COBRA TODO:      │   │
│                                                         │ • Consulta       │   │
│                                                         │ • Hospitalización│   │
│                                                         │ • Medicamentos   │   │
│                                                         │ • Estudios       │   │
│                                                         │                  │   │
│                                                         │ IMPRIME:         │   │
│                                                         │ • Receta Externa │   │
│                                                         └──────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Corrección del Flujo de Farmacia

### IMPORTANTE: Farmacia NO entrega al dueño

La farmacia interna de la clínica **NUNCA** entrega medicamentos directamente al propietario. Solo entrega a personal clínico:

| Escenario | Farmacia Entrega A | Detalle |
|-----------|-------------------|---------|
| Consulta Normal | **MÉDICO** en área de consulta | Medicamentos USO_INMEDIATO que el médico aplica durante la consulta |
| Hospitalización | **PERSONAL DE HOSPITALIZACIÓN** | Medicamentos del plan terapéutico para administrar según horarios |
| Receta Externa | **NO APLICA** | No pasa por farmacia interna. Recepción imprime receta y dueño compra afuera |

### Tipos de Prescripción (enum existente):
```prisma
enum PrescriptionItemType {
  USO_INMEDIATO    // Farmacia despacha a personal clínico
  RECETA_EXTERNA   // Se imprime en recepción, dueño compra afuera
}
```

### Flujo de Entrega de Farmacia:

```
USO_INMEDIATO en Consulta:
═══════════════════════════
Médico prescribe → Farmacia prepara → Farmacia entrega AL MÉDICO → Médico aplica → Recepción cobra

USO_INMEDIATO en Hospitalización:
═════════════════════════════════
Plan terapéutico → Farmacia prepara → Farmacia entrega A HOSPITALIZACIÓN → Personal administra → Recepción cobra

RECETA_EXTERNA:
═══════════════
Médico prescribe → NO pasa por farmacia → Recepción imprime receta → Dueño compra en farmacia externa
```

---

## Panel de Administración - Tarifas

### Nuevos Campos en BusinessInfo

El panel de administración debe permitir configurar todas las tarifas de la clínica:

#### Sección: Tarifas de Hospitalización
| Campo | Nombre en UI | Tipo | Valor Default |
|-------|--------------|------|---------------|
| `tarifaHospGeneral` | Hospitalización General (por día) | Decimal | $800.00 |
| `tarifaHospUCI` | Hospitalización UCI (por día) | Decimal | $1,500.00 |
| `tarifaHospNeonatos` | Hospitalización Neonatos (por día) | Decimal | $600.00 |
| `tarifaHospInfecciosos` | Hospitalización Infecciosos (por día) | Decimal | $1,200.00 |

#### Sección: Tarifas de Consulta
| Campo | Nombre en UI | Tipo | Valor Default |
|-------|--------------|------|---------------|
| `tarifaConsultaGeneral` | Consulta General | Decimal | $500.00 |
| `tarifaConsultaEspecializada` | Consulta Especializada | Decimal | $700.00 |
| `tarifaUrgencias` | Urgencias | Decimal | $800.00 |

#### Sección: Tarifas de Estudios de Laboratorio
| Campo | Nombre en UI | Tipo | Valor Default |
|-------|--------------|------|---------------|
| `tarifaBH` | Biometría Hemática (BH) | Decimal | $350.00 |
| `tarifaQS` | Química Sanguínea (QS) | Decimal | $450.00 |
| `tarifaRX` | Rayos X | Decimal | $400.00 |
| `tarifaUS` | Ultrasonido | Decimal | $600.00 |
| `tarifaEGO` | Examen General de Orina (EGO) | Decimal | $250.00 |
| `tarifaECG` | Electrocardiograma (ECG) | Decimal | $400.00 |
| `tarifaElectrolitos` | Electrolitos | Decimal | $300.00 |
| `tarifaSNAP` | SNAP Test | Decimal | $500.00 |

---

## Modelo de Datos (Prisma Schema)

### Nuevos Modelos a Crear:

```prisma
// ═══════════════════════════════════════════════════════════════
// ENUMS PARA HOSPITALIZACIÓN
// ═══════════════════════════════════════════════════════════════

enum HospitalizationStatus {
  ACTIVO              // Paciente actualmente hospitalizado
  ALTA_PENDIENTE      // Médico dio alta, espera cobro en recepción
  DADO_DE_ALTA        // Completado, dueño ya recogió
  FALLECIDO           // Paciente falleció durante hospitalización
  TRANSFERIDO         // Transferido a otra institución
}

enum HospitalizationType {
  GENERAL             // Hospitalización estándar
  UCI                 // Unidad de Cuidados Intensivos
  NEONATOS            // Cuidado de neonatos/camadas
  INFECCIOSOS         // Área de aislamiento
}

enum ConsultationType {
  GENERAL
  ESPECIALIZADA
  URGENCIAS
}

enum MedicationAdminStatus {
  PENDIENTE           // Aún no se administra
  ADMINISTRADO        // Se administró correctamente
  OMITIDO             // No se administró por razón válida
  RETRASADO           // Se administró fuera de horario
}

enum NeonateSuction {
  ADECUADA
  DEBIL
}

enum NeonateActivity {
  ACTIVO
  LETARGICO
}

// ═══════════════════════════════════════════════════════════════
// MODELO PRINCIPAL DE HOSPITALIZACIÓN
// ═══════════════════════════════════════════════════════════════

model Hospitalization {
  id                    String                  @id @default(cuid())
  
  // Relaciones principales
  petId                 String
  pet                   Pet                     @relation(fields: [petId], references: [id])
  visitId               String                  @unique
  visit                 Visit                   @relation(fields: [visitId], references: [id])
  consultationId        String?
  consultation          Consultation?           @relation(fields: [consultationId], references: [id])
  
  // Datos de ingreso
  admissionDate         DateTime                @default(now())
  admissionTime         String                  // Hora de ingreso "HH:MM"
  admittedById          String
  admittedBy            User                    @relation("HospAdmittedBy", fields: [admittedById], references: [id])
  
  // Información clínica
  presumptiveDiagnosis  String                  @db.Text
  finalDiagnosis        String?                 @db.Text
  fluidTherapy          String?                 @db.Text // Terapia de líquidos
  admissionNotes        String?                 @db.Text
  
  // Tipo y estado
  type                  HospitalizationType     @default(GENERAL)
  status                HospitalizationStatus   @default(ACTIVO)
  
  // Estudios solicitados (checkboxes del formulario)
  studyBH               Boolean                 @default(false) // Biometría Hemática
  studyQS               Boolean                 @default(false) // Química Sanguínea
  studyRX               Boolean                 @default(false) // Rayos X
  studyUS               Boolean                 @default(false) // Ultrasonido
  studyEGO              Boolean                 @default(false) // Examen General de Orina
  studyECG              Boolean                 @default(false) // Electrocardiograma
  studyElectrolitos     Boolean                 @default(false) // Electrolitos
  studySNAP             Boolean                 @default(false) // SNAP Test
  
  // Datos de alta
  dischargeDate         DateTime?
  dischargeTime         String?
  dischargedById        String?
  dischargedBy          User?                   @relation("HospDischargedBy", fields: [dischargedById], references: [id])
  dischargeSummary      String?                 @db.Text
  dischargeInstructions String?                 @db.Text
  
  // Relaciones hijas
  therapyItems          TherapyPlanItem[]
  vitalSignRecords      VitalSignRecord[]
  medicationAdmins      MedicationAdministration[]
  neonates              Neonate[]               // Solo si type = NEONATOS
  
  // Timestamps
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  @@index([petId])
  @@index([status])
  @@index([admissionDate])
}

// ═══════════════════════════════════════════════════════════════
// PLAN TERAPÉUTICO (Medicamentos con horarios)
// ═══════════════════════════════════════════════════════════════

model TherapyPlanItem {
  id                    String                  @id @default(cuid())
  
  hospitalizationId     String
  hospitalization       Hospitalization         @relation(fields: [hospitalizationId], references: [id], onDelete: Cascade)
  
  // Medicamento
  medicationId          String?
  medication            Medication?             @relation(fields: [medicationId], references: [id])
  medicationName        String                  // Nombre (por si no está en catálogo)
  
  // Dosificación
  dose                  String                  // "10mg", "5ml", etc.
  route                 String                  // "IV", "IM", "SC", "PO"
  frequency             String                  // "cada 8 horas", "BID", "TID"
  
  // Horarios específicos (formato "HH:MM")
  scheduledTimes        String[]                // ["08:00", "16:00", "00:00"]
  
  // Estado
  isActive              Boolean                 @default(true)
  startDate             DateTime                @default(now())
  endDate               DateTime?               // Null = indefinido hasta alta
  
  // Para el despacho de farmacia
  prescriptionId        String?
  prescription          Prescription?           @relation(fields: [prescriptionId], references: [id])
  
  // Quién lo prescribió
  prescribedById        String
  prescribedBy          User                    @relation(fields: [prescribedById], references: [id])
  
  // Historial de administraciones
  administrations       MedicationAdministration[]
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  @@index([hospitalizationId])
  @@index([isActive])
}

// ═══════════════════════════════════════════════════════════════
// REGISTRO DE ADMINISTRACIÓN DE MEDICAMENTOS
// ═══════════════════════════════════════════════════════════════

model MedicationAdministration {
  id                    String                  @id @default(cuid())
  
  therapyItemId         String
  therapyItem           TherapyPlanItem         @relation(fields: [therapyItemId], references: [id], onDelete: Cascade)
  
  hospitalizationId     String
  hospitalization       Hospitalization         @relation(fields: [hospitalizationId], references: [id], onDelete: Cascade)
  
  // Horario programado
  scheduledTime         DateTime                // Fecha y hora programada
  
  // Administración real
  administeredAt        DateTime?               // Fecha y hora real de administración
  administeredById      String?
  administeredBy        User?                   @relation(fields: [administeredById], references: [id])
  
  // Estado
  status                MedicationAdminStatus   @default(PENDIENTE)
  
  // Si fue omitido o retrasado, razón
  reason                String?
  notes                 String?
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  @@index([hospitalizationId])
  @@index([scheduledTime])
  @@index([status])
}

// ═══════════════════════════════════════════════════════════════
// REGISTRO DE SIGNOS VITALES (Revisiones periódicas)
// ═══════════════════════════════════════════════════════════════

model VitalSignRecord {
  id                    String                  @id @default(cuid())
  
  hospitalizationId     String
  hospitalization       Hospitalization         @relation(fields: [hospitalizationId], references: [id], onDelete: Cascade)
  
  // Quién registró
  recordedById          String
  recordedBy            User                    @relation(fields: [recordedById], references: [id])
  recordedAt            DateTime                @default(now())
  
  // Signos vitales
  heartRate             Int?                    // FC - Frecuencia Cardíaca (lpm)
  respiratoryRate       Int?                    // FR - Frecuencia Respiratoria (rpm)
  temperature           Decimal?                // T° - Temperatura (°C) @db.Decimal(4,2)
  capillaryRefillTime   String?                 // TRC - Tiempo Relleno Capilar (ej: "< 2 seg")
  mucousMembranes       String?                 // MM - Membranas Mucosas (ej: "Rosadas", "Pálidas")
  activityLevel         String?                 // NAC - Nivel Actividad/Consciencia
  
  // Evacuaciones y alimentación
  urination             String?                 // Descripción de micción
  defecation            String?                 // Descripción de evacuaciones
  feeding               String?                 // Qué comió / cantidad
  
  // Observaciones
  notes                 String?                 @db.Text
  
  createdAt             DateTime                @default(now())
  
  @@index([hospitalizationId])
  @@index([recordedAt])
}

// ═══════════════════════════════════════════════════════════════
// NEONATOS (Solo para hospitalizaciones tipo NEONATOS)
// ═══════════════════════════════════════════════════════════════

model Neonate {
  id                    String                  @id @default(cuid())
  
  hospitalizationId     String
  hospitalization       Hospitalization         @relation(fields: [hospitalizationId], references: [id], onDelete: Cascade)
  
  // Identificación
  number                Int                     // Neonato No. (1, 2, 3...)
  identification        String?                 // "Collar rojo", "Marca en oreja", etc.
  identificationType    String?                 // "Collar", "Marca", "Color", "Otro"
  sex                   String?                 // "Macho", "Hembra"
  
  // Registros de monitoreo
  records               NeonateRecord[]
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  @@index([hospitalizationId])
}

model NeonateRecord {
  id                    String                  @id @default(cuid())
  
  neonateId             String
  neonate               Neonate                 @relation(fields: [neonateId], references: [id], onDelete: Cascade)
  
  // Quién registró
  recordedById          String
  recordedBy            User                    @relation(fields: [recordedById], references: [id])
  recordedAt            DateTime                @default(now())
  
  // Mediciones
  weight                Decimal?                // Peso en gramos @db.Decimal(6,2)
  temperature           Decimal?                // Temperatura °C @db.Decimal(4,2)
  heartRate             Int?                    // FC (lpm)
  respiratoryRate       Int?                    // FR (rpm)
  
  // Estado
  suction               NeonateSuction?         // ADECUADA | DEBIL
  activity              NeonateActivity?        // ACTIVO | LETARGICO
  
  notes                 String?
  
  createdAt             DateTime                @default(now())
  
  @@index([neonateId])
  @@index([recordedAt])
}

// ═══════════════════════════════════════════════════════════════
// ACTUALIZACIÓN DE BUSINESSINFO (Tarifas)
// ═══════════════════════════════════════════════════════════════

// Agregar estos campos al modelo BusinessInfo existente:

model BusinessInfo {
  // ... campos existentes ...
  
  // TARIFAS DE HOSPITALIZACIÓN
  tarifaHospGeneral       Decimal?              @db.Decimal(10,2)
  tarifaHospUCI           Decimal?              @db.Decimal(10,2)
  tarifaHospNeonatos      Decimal?              @db.Decimal(10,2)
  tarifaHospInfecciosos   Decimal?              @db.Decimal(10,2)
  
  // TARIFAS DE CONSULTA
  tarifaConsultaGeneral       Decimal?          @db.Decimal(10,2)
  tarifaConsultaEspecializada Decimal?          @db.Decimal(10,2)
  tarifaUrgencias             Decimal?          @db.Decimal(10,2)
  
  // TARIFAS DE ESTUDIOS
  tarifaBH                Decimal?              @db.Decimal(10,2)
  tarifaQS                Decimal?              @db.Decimal(10,2)
  tarifaRX                Decimal?              @db.Decimal(10,2)
  tarifaUS                Decimal?              @db.Decimal(10,2)
  tarifaEGO               Decimal?              @db.Decimal(10,2)
  tarifaECG               Decimal?              @db.Decimal(10,2)
  tarifaElectrolitos      Decimal?              @db.Decimal(10,2)
  tarifaSNAP              Decimal?              @db.Decimal(10,2)
}

// ═══════════════════════════════════════════════════════════════
// ACTUALIZACIÓN DE VISIT (Agregar status HOSPITALIZADO)
// ═══════════════════════════════════════════════════════════════

// Agregar al enum VisitStatus:
enum VisitStatus {
  EN_RECEPCION
  CON_MEDICO
  EN_FARMACIA
  HOSPITALIZADO        // NUEVO - Paciente internado
  COMPLETADA
  CANCELADA
}

// Agregar relación a Visit:
model Visit {
  // ... campos existentes ...
  
  hospitalization       Hospitalization?
}

// ═══════════════════════════════════════════════════════════════
// ACTUALIZACIÓN DE CONSULTATION (Tipo de consulta)
// ═══════════════════════════════════════════════════════════════

model Consultation {
  // ... campos existentes ...
  
  type                  ConsultationType        @default(GENERAL)
  hospitalization       Hospitalization?
}
```

---

## Endpoints de API

### Rutas de Hospitalización (`hospitalization.routes.ts`)

```typescript
// ═══════════════════════════════════════════════════════════════
// CRUD PRINCIPAL
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/hospitalizations
// Crear nueva hospitalización (desde dashboard del médico)
// Body: { visitId, petId, consultationId?, presumptiveDiagnosis, type, fluidTherapy?, studies, therapyItems[] }
// Returns: Hospitalization con relaciones

// GET /api/v1/hospitalizations
// Listar hospitalizaciones (filtros: status, date, petId)
// Query: ?status=ACTIVO&date=2026-02-18
// Returns: Hospitalization[] con pet, vitalSignRecords, therapyItems

// GET /api/v1/hospitalizations/:id
// Obtener hospitalización específica con todos los detalles
// Returns: Hospitalization completa con todas las relaciones

// PATCH /api/v1/hospitalizations/:id
// Actualizar hospitalización (diagnóstico, notas, etc.)
// Body: { finalDiagnosis?, fluidTherapy?, notes? }

// POST /api/v1/hospitalizations/:id/discharge
// Dar de alta médica
// Body: { dischargeSummary, dischargeInstructions, externalPrescription?[] }
// Returns: Hospitalization con status = ALTA_PENDIENTE

// ═══════════════════════════════════════════════════════════════
// PLAN TERAPÉUTICO
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/hospitalizations/:id/therapy-items
// Agregar medicamento al plan terapéutico
// Body: { medicationId?, medicationName, dose, route, frequency, scheduledTimes[] }
// Returns: TherapyPlanItem + crea Prescription tipo USO_INMEDIATO

// PATCH /api/v1/hospitalizations/:hospId/therapy-items/:itemId
// Modificar medicamento (dosis, frecuencia, suspender)
// Body: { dose?, frequency?, isActive?, endDate? }

// DELETE /api/v1/hospitalizations/:hospId/therapy-items/:itemId
// Eliminar medicamento del plan (soft delete - isActive = false)

// ═══════════════════════════════════════════════════════════════
// ADMINISTRACIÓN DE MEDICAMENTOS
// ═══════════════════════════════════════════════════════════════

// GET /api/v1/hospitalizations/:id/pending-medications
// Obtener medicamentos pendientes de administrar
// Query: ?date=2026-02-18
// Returns: MedicationAdministration[] con status = PENDIENTE

// POST /api/v1/hospitalizations/:id/administer-medication
// Registrar administración de medicamento
// Body: { administrationId, status: 'ADMINISTRADO' | 'OMITIDO', reason?, notes? }

// ═══════════════════════════════════════════════════════════════
// SIGNOS VITALES
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/hospitalizations/:id/vital-signs
// Registrar signos vitales (revisión periódica)
// Body: { heartRate?, respiratoryRate?, temperature?, capillaryRefillTime?, mucousMembranes?, activityLevel?, urination?, defecation?, feeding?, notes? }

// GET /api/v1/hospitalizations/:id/vital-signs
// Historial de signos vitales
// Query: ?startDate=2026-02-17&endDate=2026-02-18
// Returns: VitalSignRecord[] ordenados por fecha

// ═══════════════════════════════════════════════════════════════
// NEONATOS
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/hospitalizations/:id/neonates
// Agregar neonato a la hospitalización
// Body: { number, identification?, identificationType?, sex? }

// POST /api/v1/hospitalizations/:hospId/neonates/:neonateId/records
// Registrar monitoreo de neonato
// Body: { weight?, temperature?, heartRate?, respiratoryRate?, suction?, activity?, notes? }

// GET /api/v1/hospitalizations/:hospId/neonates/:neonateId/records
// Historial de monitoreo del neonato

// ═══════════════════════════════════════════════════════════════
// COSTOS (Para Recepción)
// ═══════════════════════════════════════════════════════════════

// GET /api/v1/hospitalizations/:id/costs
// Calcular costos totales de hospitalización
// Returns: {
//   hospitalizationDays: number,
//   hospitalizationCost: number,
//   medicationsCost: number,
//   studiesCost: number,
//   consultationCost: number,
//   total: number,
//   breakdown: { item, quantity, unitPrice, subtotal }[]
// }
```

### Actualización de Rutas Existentes

```typescript
// ═══════════════════════════════════════════════════════════════
// businessInfo.routes.ts - Agregar campos de tarifas
// ═══════════════════════════════════════════════════════════════

// PATCH /api/v1/business-info
// Body ahora acepta:
// {
//   ...,
//   tarifaHospGeneral, tarifaHospUCI, tarifaHospNeonatos, tarifaHospInfecciosos,
//   tarifaConsultaGeneral, tarifaConsultaEspecializada, tarifaUrgencias,
//   tarifaBH, tarifaQS, tarifaRX, tarifaUS, tarifaEGO, tarifaECG, tarifaElectrolitos, tarifaSNAP
// }

// ═══════════════════════════════════════════════════════════════
// visit.routes.ts - Actualizar para soportar hospitalización
// ═══════════════════════════════════════════════════════════════

// GET /api/v1/visits/:id/costs
// Actualizar para incluir costos de hospitalización si aplica:
// Returns: {
//   consultation: { type, cost },
//   hospitalization?: { days, dailyRate, cost },
//   medications: { items[], total },
//   studies: { items[], total },
//   grandTotal: number
// }

// ═══════════════════════════════════════════════════════════════
// dispense.routes.ts - Agregar campo de destino
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/dispenses
// Body adicional:
// {
//   ...,
//   deliveryDestination: 'CONSULTA' | 'HOSPITALIZACION',
//   hospitalizationId?: string // Si es para hospitalización
// }
```

---

## Componentes de Frontend

### Nuevos Componentes

```
src/components/
├── dashboards/
│   └── HospitalizacionDashboard.jsx     // Dashboard principal
│   └── HospitalizacionDashboard.css
│
├── hospitalizacion/
│   ├── HospitalizationList.jsx          // Lista de pacientes hospitalizados
│   ├── HospitalizationDetail.jsx        // Vista detallada de un paciente
│   ├── AdmissionForm.jsx                // Formulario de ingreso
│   ├── TherapyPlanCard.jsx              // Card con plan terapéutico
│   ├── TherapyItemForm.jsx              // Modal para agregar medicamento
│   ├── MedicationSchedule.jsx           // Grid de horarios AM/PM
│   ├── VitalSignsForm.jsx               // Formulario de signos vitales
│   ├── VitalSignsHistory.jsx            // Historial/gráficas de signos
│   ├── NeonateMonitoring.jsx            // Monitoreo específico de neonatos
│   ├── DischargeForm.jsx                // Formulario de alta médica
│   └── HospitalizationPrint.jsx         // Impresión de historial
```

### Modificaciones a Componentes Existentes

```
src/components/
├── dashboards/
│   ├── MedicoDashboard.jsx
│   │   └── + Botón "Hospitalizar" en consulta activa
│   │   └── + Vista de pacientes hospitalizados propios
│   │
│   ├── RecepcionDashboard.jsx
│   │   └── + Sección "Hospitalizados Pendientes de Alta"
│   │   └── + Cálculo de costos incluyendo hospitalización
│   │
│   └── FarmaciaDashboard.jsx
│       └── + Indicador de destino (Consulta vs Hospitalización)
│       └── + Filtro por destino
│
├── admin/
│   └── AdminDashboard.jsx
│       └── + Sección "Tarifas" con todas las configuraciones
│       └── + Tabs: Hospitalización | Consultas | Estudios
```

### Hook Personalizado

```javascript
// src/hooks/useHospitalizacion.js

const useHospitalizacion = () => {
  // Estados
  const [hospitalizaciones, setHospitalizaciones] = useState([]);
  const [currentHospitalization, setCurrentHospitalization] = useState(null);
  const [loading, setLoading] = useState({});
  
  // Obtener lista de hospitalizados activos
  const fetchActive = async () => {...};
  
  // Obtener detalle de hospitalización
  const fetchById = async (id) => {...};
  
  // Crear nueva hospitalización
  const admitPatient = async (data) => {...};
  
  // Agregar medicamento al plan
  const addTherapyItem = async (hospId, item) => {...};
  
  // Registrar administración de medicamento
  const administerMedication = async (hospId, adminId, data) => {...};
  
  // Registrar signos vitales
  const recordVitalSigns = async (hospId, data) => {...};
  
  // Dar alta médica
  const dischargePatient = async (hospId, data) => {...};
  
  // Calcular costos
  const calculateCosts = async (hospId) => {...};
  
  return {
    hospitalizaciones,
    currentHospitalization,
    loading,
    fetchActive,
    fetchById,
    admitPatient,
    addTherapyItem,
    administerMedication,
    recordVitalSigns,
    dischargePatient,
    calculateCosts,
  };
};
```

---

## Plan de Implementación por Fases

### FASE 1: Preparación de Base de Datos y Admin (2-3 horas)
**Prioridad: ALTA**

```
□ 1.1 Actualizar Prisma Schema
    □ Agregar campos de tarifas a BusinessInfo
    □ Crear enums de hospitalización
    □ Crear modelo Hospitalization
    □ Crear modelo TherapyPlanItem
    □ Crear modelo MedicationAdministration
    □ Crear modelo VitalSignRecord
    □ Crear modelos Neonate y NeonateRecord
    □ Actualizar VisitStatus con HOSPITALIZADO
    □ Agregar relaciones a Visit y Consultation

□ 1.2 Ejecutar migración
    □ npx prisma migrate dev --name add_hospitalization_module
    □ npx prisma generate

□ 1.3 Actualizar Panel de Admin
    □ Agregar sección "Tarifas" al AdminDashboard
    □ Formulario de tarifas de hospitalización
    □ Formulario de tarifas de consultas
    □ Formulario de tarifas de estudios
    □ Actualizar businessInfo.routes.ts para guardar tarifas
```

### FASE 2: Backend - Rutas de Hospitalización (3-4 horas)
**Prioridad: ALTA**

```
□ 2.1 Crear hospitalization.routes.ts
    □ POST / - Crear hospitalización
    □ GET / - Listar hospitalizaciones
    □ GET /:id - Detalle de hospitalización
    □ PATCH /:id - Actualizar hospitalización
    □ POST /:id/discharge - Alta médica

□ 2.2 Rutas de Plan Terapéutico
    □ POST /:id/therapy-items - Agregar medicamento
    □ PATCH /:hospId/therapy-items/:itemId - Modificar
    □ DELETE /:hospId/therapy-items/:itemId - Suspender

□ 2.3 Rutas de Administración de Medicamentos
    □ GET /:id/pending-medications
    □ POST /:id/administer-medication

□ 2.4 Rutas de Signos Vitales
    □ POST /:id/vital-signs
    □ GET /:id/vital-signs

□ 2.5 Rutas de Neonatos
    □ POST /:id/neonates
    □ POST /:hospId/neonates/:neonateId/records
    □ GET /:hospId/neonates/:neonateId/records

□ 2.6 Rutas de Costos
    □ GET /:id/costs

□ 2.7 Registrar rutas en index.ts
```

### FASE 3: Frontend - Dashboard de Hospitalización (4-5 horas)
**Prioridad: ALTA**

```
□ 3.1 Crear HospitalizacionDashboard.jsx
    □ Layout principal con sidebar
    □ Lista de pacientes hospitalizados (cards)
    □ Filtros por tipo y status
    □ Stats: Total hospitalizados, UCI, etc.

□ 3.2 Crear componentes auxiliares
    □ HospitalizationList.jsx
    □ HospitalizationDetail.jsx
    □ AdmissionForm.jsx

□ 3.3 Crear useHospitalizacion.js hook

□ 3.4 Agregar ruta en App.jsx
    □ /hospitalizacion → HospitalizacionDashboard
    □ Proteger ruta con rol adecuado

□ 3.5 Agregar a navegación
    □ Opción en Navbar para acceder
```

### FASE 4: Plan Terapéutico y Medicación (3-4 horas)
**Prioridad: ALTA**

```
□ 4.1 Crear TherapyPlanCard.jsx
    □ Lista de medicamentos activos
    □ Botón agregar medicamento
    □ Indicador de próxima dosis

□ 4.2 Crear TherapyItemForm.jsx
    □ Selector de medicamento (del catálogo)
    □ Campos: dosis, vía, frecuencia
    □ Selector de horarios

□ 4.3 Crear MedicationSchedule.jsx
    □ Grid AM/PM como en los formularios
    □ Checkmarks para marcar administración
    □ Colores: pendiente, administrado, omitido

□ 4.4 Integrar con Farmacia
    □ Al agregar medicamento → crea Prescription
    □ Farmacia ve destino "HOSPITALIZACION"
    □ Al despachar → confirma recepción en hosp.
```

### FASE 5: Signos Vitales y Monitoreo (2-3 horas)
**Prioridad: MEDIA**

```
□ 5.1 Crear VitalSignsForm.jsx
    □ Campos: FC, FR, T°, TRC, MM, NAC
    □ Campos: Micción, Evacuaciones, Alimento
    □ Notas adicionales

□ 5.2 Crear VitalSignsHistory.jsx
    □ Tabla/timeline de registros
    □ Gráficas de tendencias (opcional)

□ 5.3 Widget de última revisión
    □ Mostrar en card del paciente
    □ Indicador de tiempo desde última revisión
```

### FASE 6: Neonatos (2 horas)
**Prioridad: MEDIA**

```
□ 6.1 Crear NeonateMonitoring.jsx
    □ Lista de neonatos de la camada
    □ Formulario de agregar neonato
    □ Card por neonato con datos

□ 6.2 Crear NeonateRecordForm.jsx
    □ Campos específicos: peso (g), succión, actividad

□ 6.3 Activar solo cuando type = NEONATOS
```

### FASE 7: Alta y Cobro (2-3 horas)
**Prioridad: ALTA**

```
□ 7.1 Crear DischargeForm.jsx
    □ Resumen de hospitalización
    □ Diagnóstico final
    □ Instrucciones de alta
    □ Opción de receta externa

□ 7.2 Actualizar RecepcionDashboard
    □ Sección "Pendientes de Alta"
    □ Vista de costos desglosados
    □ Incluir hospitalización en cuenta final

□ 7.3 Actualizar modal de salida
    □ Mostrar días hospitalizados
    □ Mostrar tarifa aplicada
    □ Mostrar medicamentos usados
    □ Mostrar estudios realizados
```

### FASE 8: Integración con MedicoDashboard (1-2 horas)
**Prioridad: ALTA**

```
□ 8.1 Agregar botón "Hospitalizar"
    □ En consulta activa
    □ Abre modal de ingreso

□ 8.2 Vista de pacientes hospitalizados propios
    □ Lista resumida
    □ Link a detalle completo

□ 8.3 Actualizar flujo de visita
    □ Al hospitalizar → visit.status = HOSPITALIZADO
    □ Bloquear "dar salida" normal
```

### FASE 9: Testing y Refinamiento (2 horas)
**Prioridad: ALTA**

```
□ 9.1 Probar flujo completo
    □ Consulta → Hospitalizar → Tratamiento → Alta → Cobro

□ 9.2 Verificar cálculo de costos
    □ Días correctos
    □ Tarifas aplicadas correctamente
    □ Medicamentos sumados

□ 9.3 Verificar integración con farmacia
    □ Despacho a hospitalización funciona
    □ Stock se descuenta correctamente

□ 9.4 Pruebas de impresión
    □ Historial de hospitalización
    □ Receta externa al alta
```

---

## Resumen de Archivos a Crear/Modificar

### Archivos Nuevos:
```
backend/src/routes/hospitalization.routes.ts
src/components/dashboards/HospitalizacionDashboard.jsx
src/components/dashboards/HospitalizacionDashboard.css
src/components/hospitalizacion/HospitalizationList.jsx
src/components/hospitalizacion/HospitalizationDetail.jsx
src/components/hospitalizacion/AdmissionForm.jsx
src/components/hospitalizacion/TherapyPlanCard.jsx
src/components/hospitalizacion/TherapyItemForm.jsx
src/components/hospitalizacion/MedicationSchedule.jsx
src/components/hospitalizacion/VitalSignsForm.jsx
src/components/hospitalizacion/VitalSignsHistory.jsx
src/components/hospitalizacion/NeonateMonitoring.jsx
src/components/hospitalizacion/DischargeForm.jsx
src/hooks/useHospitalizacion.js
src/services/hospitalizacion.service.js
```

### Archivos a Modificar:
```
backend/prisma/schema.prisma
backend/src/index.ts
backend/src/routes/businessInfo.routes.ts
backend/src/routes/visit.routes.ts
backend/src/routes/dispense.routes.ts
src/App.jsx
src/components/Navbar.jsx
src/components/dashboards/MedicoDashboard.jsx
src/components/dashboards/RecepcionDashboard.jsx
src/components/dashboards/FarmaciaDashboard.jsx
src/components/dashboards/AdminDashboard.jsx
src/i18n/locales/es.json
src/i18n/locales/en.json
```

---

## Notas Importantes

1. **Rol de Hospitalización**: Considerar crear rol `HOSPITALIZACION` o usar `ENFERMERO` para el personal que registra signos vitales y administra medicamentos.

2. **Notificaciones**: Implementar alertas cuando:
   - Medicamento pendiente de administrar
   - Paciente sin revisión de signos en X horas
   - Stock de medicamento bajo en hospitalización

3. **Reportes**: Agregar reportes de:
   - Ocupación de hospitalización
   - Promedio de días internados
   - Ingresos por hospitalización

4. **Impresión**: Generar documentos de:
   - Autorización de hospitalización (firma del dueño)
   - Resumen al alta
   - Historial completo

---

*Documento generado: Febrero 18, 2026*
*Versión: 1.0*
