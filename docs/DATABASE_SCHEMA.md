# 🗄️ VET-OS Database Schema - EVEREST

## Esquema de Base de Datos Unificado

**Fecha:** Enero 21, 2026  
**Versión:** 1.0  
**Base de datos:** MySQL (Hostinger)  
**ORM:** Prisma  
**Basado en:** MODULO_RECEPCION v2.1, MODULO_MEDICO v2.2, MODULO_FARMACIA v2.3

---

## 📋 Índice

1. [Resumen de Entidades](#resumen-de-entidades)
2. [Diagrama de Relaciones](#diagrama-de-relaciones)
3. [Schema Prisma Completo](#schema-prisma-completo)
4. [Enums](#enums)
5. [Índices y Optimizaciones](#índices-y-optimizaciones)
6. [Ownership por Módulo](#ownership-por-módulo)
7. [Notas de Implementación](#notas-de-implementación)

---

## Resumen de Entidades

### Por Módulo Propietario

| Módulo | Entidades |
|--------|-----------|
| **Sistema** | User, Notification, Task |
| **Recepción** | Owner, Pet, Visit, Appointment, Payment |
| **Médico** | Consultation, LabRequest, Prescription, PrescriptionItem, Surgery, Hospitalization, Monitoring, MedicalNote |
| **Farmacia** | Medication, Dispense, DispenseItem, StockMovement, StockAlert, PurchaseOrder, PurchaseOrderItem |

### Total: 21 Tablas

---

## Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SISTEMA                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  User ◄──────────────────────────────────────────────────────────────────┐  │
│    │                                                                      │  │
│    ├── Notification (1:N)                                                │  │
│    └── Task (1:N)                                                        │  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RECEPCIÓN                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Owner ◄─────────────┐                                                      │
│    │                 │                                                      │
│    └── Pet (1:N) ────┼──► Visit (1:N) ──► Payment (1:1)                    │
│           │          │        │                                             │
│           │          │        └── Appointment (N:1)                         │
│           │          │                                                      │
└───────────┼──────────┼──────────────────────────────────────────────────────┘
            │          │
┌───────────┼──────────┼──────────────────────────────────────────────────────┐
│           │          │              MÉDICO                                   │
├───────────┼──────────┼──────────────────────────────────────────────────────┤
│           │          │                                                      │
│           ▼          │                                                      │
│        Consultation ◄┴─────► LabRequest                                     │
│           │                                                                 │
│           ├──────────────────► Prescription ──► PrescriptionItem            │
│           │                                                                 │
│           ├──────────────────► Surgery                                      │
│           │                         │                                       │
│           │                         ▼                                       │
│           └──────────────────► Hospitalization ──► Monitoring (1:N)         │
│                                                                             │
│        MedicalNote ◄───────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FARMACIA                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Medication ◄────────────────────────────────────────────────────────────┐  │
│      │                                                                    │  │
│      ├── StockMovement (1:N)                                             │  │
│      │                                                                    │  │
│      ├── StockAlert (1:N)                                                │  │
│      │                                                                    │  │
│      └── DispenseItem (1:N) ◄── Dispense ◄── Prescription                │  │
│                                                                           │  │
│  PurchaseOrder ──► PurchaseOrderItem ──► Medication                       │  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Prisma Completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// SISTEMA - Entidades base del sistema
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // Hashed
  nombre        String
  rol           UserRole
  especialidad  String?   // Solo para médicos
  telefono      String?
  activo        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relaciones
  notifications     Notification[]
  tasksAssigned     Task[]           @relation("TaskAssignee")
  tasksCreated      Task[]           @relation("TaskCreator")
  consultations     Consultation[]
  labRequestsMade   LabRequest[]     @relation("LabRequestedBy")
  labRequestsDone   LabRequest[]     @relation("LabCompletedBy")
  prescriptions     Prescription[]
  surgeriesLead     Surgery[]        @relation("SurgeonLead")
  surgeriesAssist   Surgery[]        @relation("SurgeonAssistant")
  hospitalizations  Hospitalization[]
  monitorings       Monitoring[]
  medicalNotes      MedicalNote[]
  dispenses         Dispense[]
  stockMovements    StockMovement[]
  alertsResolved    StockAlert[]
  purchaseOrders    PurchaseOrder[]  @relation("POCreator")
  purchaseReceived  PurchaseOrder[]  @relation("POReceiver")

  @@index([email])
  @@index([rol])
}

enum UserRole {
  ADMIN
  RECEPCION
  MEDICO
  LABORATORIO
  FARMACIA
}

model Notification {
  id        String             @id @default(cuid())
  userId    String
  user      User               @relation(fields: [userId], references: [id])
  tipo      NotificationType
  titulo    String
  mensaje   String             @db.Text
  leida     Boolean            @default(false)
  data      Json?              // Datos adicionales (patientId, etc.)
  createdAt DateTime           @default(now())

  @@index([userId, leida])
  @@index([createdAt])
}

enum NotificationType {
  NUEVO_PACIENTE
  TRIAGE_COMPLETADO
  ESTUDIOS_SOLICITADOS
  RESULTADOS_LISTOS
  RECETA_PENDIENTE
  MEDICAMENTOS_LISTOS
  CIRUGIA_PROGRAMADA
  ALTA_PENDIENTE
  STOCK_BAJO
  GENERAL
}

model Task {
  id          String       @id @default(cuid())
  titulo      String
  descripcion String?      @db.Text
  tipo        TaskType
  prioridad   Priority
  estado      TaskStatus   @default(PENDIENTE)
  
  // Asignación
  assigneeId  String?
  assignee    User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdById String
  createdBy   User         @relation("TaskCreator", fields: [createdById], references: [id])
  
  // Referencias opcionales
  petId       String?
  pet         Pet?         @relation(fields: [petId], references: [id])
  visitId     String?
  visit       Visit?       @relation(fields: [visitId], references: [id])
  
  createdAt   DateTime     @default(now())
  completedAt DateTime?

  @@index([assigneeId, estado])
  @@index([tipo, prioridad])
}

enum TaskType {
  TRIAGE
  CONSULTA
  LABORATORIO
  FARMACIA
  CIRUGIA
  ALTA
  GENERAL
}

enum TaskStatus {
  PENDIENTE
  EN_PROGRESO
  COMPLETADA
  CANCELADA
}

enum Priority {
  ALTA
  MEDIA
  BAJA
}

// ============================================================================
// RECEPCIÓN - Propietarios, Mascotas, Visitas, Citas, Pagos
// ============================================================================

model Owner {
  id           String   @id @default(cuid())
  nombre       String
  telefono     String   @unique
  email        String?
  direccion    String?  @db.Text
  ciudad       String?
  codigoPostal String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relaciones
  pets Pet[]

  @@index([telefono])
  @@index([nombre])
}

model Pet {
  id           String   @id @default(cuid())
  numeroFicha  String   @unique  // VET-001, VET-002...
  ownerId      String
  owner        Owner    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  
  // === DATOS BÁSICOS ===
  nombre       String
  especie      Species
  raza         String?
  sexo         Sexo
  fechaNacimiento DateTime?
  peso         Float?
  color        String?
  condicionCorporal BodyCondition?
  fotoUrl      String?
  
  // === HISTORIAL MÉDICO ===
  snapTest         String?   @db.Text
  analisisClinicos String?   @db.Text
  antecedentes     String?   @db.Text
  
  // === VACUNAS Y DESPARASITACIÓN ===
  desparasitacionExterna Boolean?
  ultimaDesparasitacion  DateTime?
  vacunasTexto           String?   @db.Text  // Descripción general
  vacunasActualizadas    Boolean?
  ultimaVacuna           DateTime?
  
  // === CIRUGÍAS ===
  esterilizado    Boolean?
  otrasCirugias   Boolean?
  detalleCirugias String?   @db.Text
  
  // === INFO REPRODUCTIVA (Hembras) ===
  ultimoCelo      DateTime?
  cantidadPartos  Int?
  ultimoParto     DateTime?
  
  // === ALIMENTACIÓN ===
  alimento                 String?
  porcionesPorDia          String?
  otrosAlimentos           String?
  frecuenciaOtrosAlimentos String?
  
  // === ALERGIAS Y PATOLOGÍAS ===
  alergias             String?   @db.Text  // Comma-separated
  enfermedadesCronicas String?   @db.Text
  
  // === ESTILO DE VIDA ===
  conviveOtrasMascotas Boolean?
  cualesMascotas       String?
  actividadFisica      Boolean?
  frecuenciaActividad  String?
  saleViaPublica       Boolean?
  frecuenciaSalida     String?
  otrosDatos           String?   @db.Text
  
  // === METADATA ===
  estado        PatientStatus @default(RECIEN_LLEGADO)
  fechaIngreso  DateTime      @default(now())
  primeraVisita Boolean       @default(true)
  activo        Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relaciones
  visits          Visit[]
  appointments    Appointment[]
  consultations   Consultation[]
  labRequests     LabRequest[]
  prescriptions   Prescription[]
  surgeries       Surgery[]
  hospitalizations Hospitalization[]
  medicalNotes    MedicalNote[]
  dispenses       Dispense[]
  vaccineRecords  VaccineRecord[]
  tasks           Task[]

  @@index([ownerId])
  @@index([numeroFicha])
  @@index([nombre])
  @@index([estado])
}

model VaccineRecord {
  id          String    @id @default(cuid())
  petId       String
  pet         Pet       @relation(fields: [petId], references: [id], onDelete: Cascade)
  nombre      String    // Nombre de la vacuna
  fecha       DateTime  // Fecha de aplicación
  proximaDosis DateTime? // Próxima dosis programada
  lote        String?   // Número de lote
  aplicadaPor String?   // Nombre del médico
  notas       String?   @db.Text
  createdAt   DateTime  @default(now())

  @@index([petId, proximaDosis])
}

enum Species {
  PERRO
  GATO
  AVE
  ROEDOR
  REPTIL
  OTRO
}

enum Sexo {
  MACHO
  HEMBRA
}

enum BodyCondition {
  MUY_DELGADO   // 1
  DELGADO       // 2
  IDEAL         // 3
  SOBREPESO     // 4
  OBESO         // 5
}

enum PatientStatus {
  RECIEN_LLEGADO
  EN_ESPERA
  EN_CONSULTA
  EN_ESTUDIOS
  EN_FARMACIA
  CIRUGIA_PROGRAMADA
  EN_CIRUGIA
  HOSPITALIZADO
  LISTO_PARA_ALTA
  ALTA
}

model Visit {
  id           String      @id @default(cuid())
  petId        String
  pet          Pet         @relation(fields: [petId], references: [id])
  arrivalTime  DateTime    @default(now())
  status       VisitStatus @default(RECIEN_LLEGADO)
  
  // === TRIAGE ===
  tipoVisita   VisitType?
  motivo       String?     @db.Text
  prioridad    Priority?
  peso         Float?
  temperatura  Float?
  primeraVisita Boolean    @default(false)
  antecedentes String?     @db.Text
  
  // === ASIGNACIÓN ===
  assignedDoctorId String?
  
  // === ALTA ===
  dischargeNotes String?   @db.Text
  dischargedAt   DateTime?
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // Relaciones
  consultation Consultation?
  payment      Payment?
  tasks        Task[]

  @@index([petId])
  @@index([status])
  @@index([arrivalTime])
}

enum VisitStatus {
  RECIEN_LLEGADO
  EN_ESPERA
  EN_CONSULTA
  EN_ESTUDIOS
  EN_FARMACIA
  CIRUGIA_PROGRAMADA
  EN_CIRUGIA
  HOSPITALIZADO
  LISTO_PARA_ALTA
  ALTA
}

enum VisitType {
  CONSULTA_GENERAL
  SEGUIMIENTO
  MEDICINA_PREVENTIVA
  EMERGENCIA
}

model Appointment {
  id             String          @id @default(cuid())
  petId          String
  pet            Pet             @relation(fields: [petId], references: [id])
  fecha          DateTime        @db.Date
  hora           String          // "10:30"
  tipo           AppointmentType
  motivo         String          @db.Text
  confirmada     Boolean         @default(false)
  cancelada      Boolean         @default(false)
  notas          String?         @db.Text
  createdById    String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([fecha])
  @@index([petId])
}

enum AppointmentType {
  CONSULTA_GENERAL
  SEGUIMIENTO
  VACUNACION
  CIRUGIA
  EMERGENCIA
}

model Payment {
  id          String        @id @default(cuid())
  visitId     String        @unique
  visit       Visit         @relation(fields: [visitId], references: [id])
  total       Decimal       @db.Decimal(10, 2)
  metodoPago  PaymentMethod
  fecha       DateTime      @default(now())
  recibidoPor String?
  notas       String?       @db.Text
  createdAt   DateTime      @default(now())

  @@index([fecha])
}

enum PaymentMethod {
  EFECTIVO
  TARJETA
  TRANSFERENCIA
}

// ============================================================================
// MÉDICO - Consultas, Laboratorio, Recetas, Cirugías, Hospitalización
// ============================================================================

model Consultation {
  id          String             @id @default(cuid())
  visitId     String             @unique
  visit       Visit              @relation(fields: [visitId], references: [id])
  petId       String
  pet         Pet                @relation(fields: [petId], references: [id])
  doctorId    String
  doctor      User               @relation(fields: [doctorId], references: [id])
  
  // === TIEMPOS ===
  startTime   DateTime           @default(now())
  endTime     DateTime?
  
  // === DATOS CLÍNICOS ===
  symptoms       String?         @db.Text  // Síntomas reportados
  physicalExam   String?         @db.Text  // Examen físico
  diagnosis      String?         @db.Text  // Diagnóstico
  treatment      String?         @db.Text  // Tratamiento
  notes          String?         @db.Text  // Notas adicionales
  
  // === SIGNOS VITALES ===
  vitalTemperature    Float?     // °C
  vitalHeartRate      Int?       // bpm
  vitalRespiratoryRate Int?      // rpm
  vitalWeight         Float?     // kg
  
  // === SEGUIMIENTO ===
  followUpRequired Boolean       @default(false)
  followUpDate     DateTime?
  
  // === ESTADO ===
  status       ConsultationStatus @default(EN_PROGRESO)
  
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  // Relaciones
  labRequests   LabRequest[]
  prescriptions Prescription[]
  surgeries     Surgery[]
  hospitalization Hospitalization?

  @@index([petId])
  @@index([doctorId])
  @@index([startTime])
}

enum ConsultationStatus {
  EN_PROGRESO
  COMPLETADA
}

model LabRequest {
  id              String           @id @default(cuid())
  consultationId  String
  consultation    Consultation     @relation(fields: [consultationId], references: [id])
  petId           String
  pet             Pet              @relation(fields: [petId], references: [id])
  requestedById   String
  requestedBy     User             @relation("LabRequestedBy", fields: [requestedById], references: [id])
  requestedAt     DateTime         @default(now())
  
  // === ESTUDIO ===
  type            LabType
  urgency         LabUrgency       @default(NORMAL)
  notes           String?          @db.Text
  
  // === RESULTADOS ===
  status          LabRequestStatus @default(PENDIENTE)
  results         String?          @db.Text
  resultFiles     Json?            // Array de URLs
  completedAt     DateTime?
  completedById   String?
  completedBy     User?            @relation("LabCompletedBy", fields: [completedById], references: [id])
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([petId])
  @@index([status])
  @@index([consultationId])
}

enum LabType {
  HEMOGRAMA
  QUIMICA_SANGUINEA
  URINALISIS
  RAYOS_X
  ULTRASONIDO
  ELECTROCARDIOGRAMA
  CITOLOGIA
  BIOPSIA
  COPROLOGIA
  PERFIL_TIROIDEO
}

enum LabUrgency {
  NORMAL
  URGENTE
}

enum LabRequestStatus {
  PENDIENTE
  EN_PROCESO
  COMPLETADO
}

model Prescription {
  id               String             @id @default(cuid())
  consultationId   String
  consultation     Consultation       @relation(fields: [consultationId], references: [id])
  petId            String
  pet              Pet                @relation(fields: [petId], references: [id])
  prescribedById   String
  prescribedBy     User               @relation(fields: [prescribedById], references: [id])
  prescribedAt     DateTime           @default(now())
  
  // === INSTRUCCIONES ===
  generalInstructions String?         @db.Text
  
  // === ESTADO ===
  status           PrescriptionStatus @default(PENDIENTE)
  
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  // Relaciones
  items            PrescriptionItem[]
  dispenses        Dispense[]

  @@index([petId])
  @@index([status])
  @@index([consultationId])
}

model PrescriptionItem {
  id             String       @id @default(cuid())
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  
  name           String       // Nombre del medicamento
  dosage         String       // "500mg"
  frequency      String       // "cada 8 horas"
  duration       String       // "7 días"
  quantity       Int          // Cantidad a despachar
  instructions   String?      @db.Text
  
  createdAt      DateTime     @default(now())

  @@index([prescriptionId])
}

enum PrescriptionStatus {
  PENDIENTE
  DESPACHADA
  PARCIAL
  CANCELADA
}

model Surgery {
  id              String        @id @default(cuid())
  petId           String
  pet             Pet           @relation(fields: [petId], references: [id])
  consultationId  String
  consultation    Consultation  @relation(fields: [consultationId], references: [id])
  surgeonId       String
  surgeon         User          @relation("SurgeonLead", fields: [surgeonId], references: [id])
  
  // === ASISTENTES (relación many-to-many simplificada) ===
  assistants      User[]        @relation("SurgeonAssistant")
  
  // === PROGRAMACIÓN ===
  type            String
  scheduledDate   DateTime      @db.Date
  scheduledTime   String        // "14:00"
  estimatedDuration Int?        // minutos
  status          SurgeryStatus @default(PROGRAMADA)
  prioridad       Priority      @default(MEDIA)
  
  // === PRE-OPERATORIO ===
  preOpNotes          String?   @db.Text
  preOpStudies        Json?     // Array de estudios pre-quirúrgicos requeridos
  sedationAuthorized  Boolean   @default(false)
  consentSigned       Boolean   @default(false)
  consentSignedBy     String?
  consentSignedAt     DateTime?
  fastingConfirmed    Boolean   @default(false)
  
  // === TRANS-OPERATORIO ===
  startTime       DateTime?
  endTime         DateTime?
  anesthesiaType  String?
  complications   String?       @db.Text
  
  // === POST-OPERATORIO ===
  postOpNotes             String?   @db.Text
  procedure               String?   @db.Text  // Descripción del procedimiento realizado
  prognosis               Prognosis?
  postOpCare              String?   @db.Text  // Cuidados post-operatorios
  hospitalizationRequired Boolean   @default(false)
  followUpDate            DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relaciones
  hospitalization Hospitalization?

  @@index([petId])
  @@index([scheduledDate])
  @@index([status])
}

enum SurgeryStatus {
  PROGRAMADA
  EN_PREPARACION
  EN_CURSO
  COMPLETADA
  CANCELADA
}

enum Prognosis {
  EXCELENTE
  BUENO
  RESERVADO
  GRAVE
}

model Hospitalization {
  id              String              @id @default(cuid())
  petId           String
  pet             Pet                 @relation(fields: [petId], references: [id])
  consultationId  String              @unique
  consultation    Consultation        @relation(fields: [consultationId], references: [id])
  surgeryId       String?             @unique
  surgery         Surgery?            @relation(fields: [surgeryId], references: [id])
  
  // === ADMISIÓN ===
  admittedById    String
  admittedBy      User                @relation(fields: [admittedById], references: [id])
  admittedAt      DateTime            @default(now())
  dischargedAt    DateTime?
  reason          String              @db.Text
  location        String?             // Jaula, área
  
  // === ESTADO ===
  status          HospitalizationStatus @default(ACTIVA)
  
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relaciones
  monitorings     Monitoring[]

  @@index([petId])
  @@index([status])
}

enum HospitalizationStatus {
  ACTIVA
  ALTA
}

model Monitoring {
  id                  String          @id @default(cuid())
  hospitalizationId   String
  hospitalization     Hospitalization @relation(fields: [hospitalizationId], references: [id], onDelete: Cascade)
  recordedById        String
  recordedBy          User            @relation(fields: [recordedById], references: [id])
  recordedAt          DateTime        @default(now())
  
  // === SIGNOS VITALES (EFG) ===
  temperatura           Float?        // °C
  frecuenciaCardiaca    Int?          // lpm
  frecuenciaRespiratoria Int?         // rpm
  presionArterial       String?       // "120/80"
  
  // === ESTADO GENERAL ===
  nivelConciencia       ConsciousnessLevel?
  escalaDolor           Int?          // 0-10
  
  // === OBSERVACIONES ===
  observaciones         String?       @db.Text
  
  createdAt             DateTime      @default(now())

  @@index([hospitalizationId])
  @@index([recordedAt])
}

enum ConsciousnessLevel {
  ALERTA
  SOMNOLIENTO
  DESORIENTADO
  ESTUPOROSO
  INCONSCIENTE
}

model MedicalNote {
  id              String          @id @default(cuid())
  petId           String
  pet             Pet             @relation(fields: [petId], references: [id])
  consultationId  String?
  createdById     String
  createdBy       User            @relation(fields: [createdById], references: [id])
  
  type            MedicalNoteType
  content         String          @db.Text
  isPrivate       Boolean         @default(false)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([petId])
  @@index([type])
}

enum MedicalNoteType {
  EVOLUCION
  INTERCONSULTA
  ORDEN
  GENERAL
}

// ============================================================================
// FARMACIA - Medicamentos, Despachos, Inventario, Alertas
// ============================================================================

model Medication {
  id                    String             @id @default(cuid())
  
  // === IDENTIFICACIÓN ===
  name                  String
  genericName           String?
  category              MedicationCategory
  
  // === PRESENTACIÓN ===
  presentation          String             // Tabletas, jarabe, etc.
  concentration         String?            // "500mg"
  unit                  String             // tableta, ml, ampolla
  
  // === STOCK ===
  currentStock          Int                @default(0)
  minStock              Int
  maxStock              Int?
  location              String?            // Estante A, refrigerador
  
  // === CONTROL ===
  requiresRefrigeration Boolean            @default(false)
  isControlled          Boolean            @default(false)
  
  // === COSTOS ===
  costPrice             Decimal?           @db.Decimal(10, 2)
  salePrice             Decimal            @db.Decimal(10, 2)
  
  // === FECHAS ===
  expirationDate        DateTime?
  lastRestocked         DateTime?
  
  // === PROVEEDOR ===
  supplier              String?
  supplierCode          String?
  
  // === ESTADO ===
  activo                Boolean            @default(true)
  
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  // Relaciones
  stockMovements        StockMovement[]
  stockAlerts           StockAlert[]
  dispenseItems         DispenseItem[]
  purchaseOrderItems    PurchaseOrderItem[]

  @@index([name])
  @@index([category])
  @@index([currentStock])
}

enum MedicationCategory {
  ANTIBIOTICO
  ANALGESICO
  ANTIINFLAMATORIO
  ANTIPARASITARIO
  VACUNA
  VITAMINA
  SUERO
  ANESTESICO
  DERMATOLOGICO
  OFTALMICO
  CARDIACO
  HORMONAL
  OTRO
}

model Dispense {
  id              String        @id @default(cuid())
  prescriptionId  String
  prescription    Prescription  @relation(fields: [prescriptionId], references: [id])
  petId           String
  pet             Pet           @relation(fields: [petId], references: [id])
  dispensedById   String
  dispensedBy     User          @relation(fields: [dispensedById], references: [id])
  dispensedAt     DateTime      @default(now())
  
  // === DESPACHO ===
  status          DispenseStatus @default(PENDIENTE)
  
  // === ENTREGA ===
  notes           String?        @db.Text
  deliveredTo     String?
  signature       String?        @db.LongText  // Base64
  
  createdAt       DateTime       @default(now())

  // Relaciones
  items           DispenseItem[]

  @@index([prescriptionId])
  @@index([petId])
  @@index([status])
}

model DispenseItem {
  id              String     @id @default(cuid())
  dispenseId      String
  dispense        Dispense   @relation(fields: [dispenseId], references: [id], onDelete: Cascade)
  medicationId    String
  medication      Medication @relation(fields: [medicationId], references: [id])
  
  medicationName  String     // Desnormalizado para historial
  requestedQty    Int
  dispensedQty    Int
  reason          String?    // Razón si cantidades difieren
  unitPrice       Decimal    @db.Decimal(10, 2)
  subtotal        Decimal    @db.Decimal(10, 2)
  
  createdAt       DateTime   @default(now())

  @@index([dispenseId])
  @@index([medicationId])
}

enum DispenseStatus {
  PENDIENTE
  COMPLETO
  PARCIAL
}

model StockMovement {
  id              String       @id @default(cuid())
  medicationId    String
  medication      Medication   @relation(fields: [medicationId], references: [id])
  
  // === MOVIMIENTO ===
  type            MovementType
  quantity        Int          // Positivo para entradas, negativo para salidas
  previousStock   Int
  newStock        Int
  
  // === DETALLES ===
  reason          String?      @db.Text
  reference       String?      // prescriptionId, # orden, etc.
  batchNumber     String?
  expirationDate  DateTime?
  
  // === AUDITORÍA ===
  performedById   String
  performedBy     User         @relation(fields: [performedById], references: [id])
  performedAt     DateTime     @default(now())

  @@index([medicationId])
  @@index([type])
  @@index([performedAt])
}

enum MovementType {
  ENTRADA
  SALIDA
  AJUSTE
  DEVOLUCION
  VENCIDO
  MERMA
}

model StockAlert {
  id              String        @id @default(cuid())
  medicationId    String
  medication      Medication    @relation(fields: [medicationId], references: [id])
  
  // === ALERTA ===
  type            AlertType
  message         String        @db.Text
  priority        Priority
  
  // === ESTADO ===
  status          AlertStatus   @default(ACTIVA)
  resolvedAt      DateTime?
  resolvedById    String?
  resolvedBy      User?         @relation(fields: [resolvedById], references: [id])
  resolutionNotes String?       @db.Text
  
  createdAt       DateTime      @default(now())

  @@index([medicationId])
  @@index([status, priority])
}

enum AlertType {
  STOCK_BAJO
  AGOTADO
  POR_VENCER
  VENCIDO
}

enum AlertStatus {
  ACTIVA
  RESUELTA
  IGNORADA
}

model PurchaseOrder {
  id               String              @id @default(cuid())
  
  // === PROVEEDOR ===
  supplier         String
  supplierContact  String?
  
  // === TOTALES ===
  totalAmount      Decimal             @db.Decimal(10, 2)
  
  // === ESTADO ===
  status           PurchaseOrderStatus @default(BORRADOR)
  
  // === FECHAS ===
  createdById      String
  createdBy        User                @relation("POCreator", fields: [createdById], references: [id])
  sentAt           DateTime?
  expectedDelivery DateTime?
  receivedAt       DateTime?
  receivedById     String?
  receivedBy       User?               @relation("POReceiver", fields: [receivedById], references: [id])
  
  notes            String?             @db.Text
  
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  // Relaciones
  items            PurchaseOrderItem[]

  @@index([status])
  @@index([supplier])
}

model PurchaseOrderItem {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  medicationId    String
  medication      Medication    @relation(fields: [medicationId], references: [id])
  
  medicationName  String        // Desnormalizado
  quantity        Int
  unitCost        Decimal       @db.Decimal(10, 2)
  subtotal        Decimal       @db.Decimal(10, 2)
  receivedQty     Int?
  
  createdAt       DateTime      @default(now())

  @@index([purchaseOrderId])
  @@index([medicationId])
}

enum PurchaseOrderStatus {
  BORRADOR
  PENDIENTE
  ENVIADA
  PARCIAL
  RECIBIDA
  CANCELADA
}
```

---

## Índices y Optimizaciones

### Índices Principales

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_pet_estado ON Pet(estado);
CREATE INDEX idx_pet_numero_ficha ON Pet(numeroFicha);
CREATE INDEX idx_owner_telefono ON Owner(telefono);

-- Consultas de fecha
CREATE INDEX idx_visit_arrival ON Visit(arrivalTime);
CREATE INDEX idx_appointment_fecha ON Appointment(fecha);
CREATE INDEX idx_surgery_scheduled ON Surgery(scheduledDate);

-- Relaciones frecuentes
CREATE INDEX idx_consultation_pet ON Consultation(petId);
CREATE INDEX idx_prescription_pet ON Prescription(petId);
CREATE INDEX idx_hospitalization_pet ON Hospitalization(petId);

-- Stock y alertas
CREATE INDEX idx_medication_stock ON Medication(currentStock);
CREATE INDEX idx_stockalert_status ON StockAlert(status, priority);
```

### Queries Frecuentes Optimizadas

```typescript
// 1. Pacientes en cola (Recepción)
const colaEspera = await prisma.pet.findMany({
  where: { estado: 'EN_ESPERA' },
  include: { owner: true },
  orderBy: [{ visits: { arrivalTime: 'asc' } }]
});

// 2. Mis pacientes (Médico)
const misConsultas = await prisma.pet.findMany({
  where: { estado: 'EN_CONSULTA' },
  include: { 
    consultations: { 
      where: { doctorId: userId },
      orderBy: { startTime: 'desc' },
      take: 1 
    }
  }
});

// 3. Recetas pendientes (Farmacia)
const recetasPendientes = await prisma.prescription.findMany({
  where: { status: 'PENDIENTE' },
  include: { 
    pet: { include: { owner: true } },
    items: true 
  },
  orderBy: { prescribedAt: 'asc' }
});

// 4. Stock bajo (Farmacia)
const stockBajo = await prisma.medication.findMany({
  where: {
    currentStock: { lte: prisma.medication.fields.minStock }
  }
});
```

---

## Ownership por Módulo

### SISTEMA
| Tabla | Descripción |
|-------|-------------|
| `User` | Usuarios del sistema |
| `Notification` | Notificaciones |
| `Task` | Tareas pendientes |

### RECEPCIÓN (CRUD Completo)
| Tabla | Descripción |
|-------|-------------|
| `Owner` | Propietarios |
| `Pet` | Mascotas |
| `Visit` | Visitas |
| `Appointment` | Citas |
| `Payment` | Pagos |
| `VaccineRecord` | Registro de vacunas |

### MÉDICO (CRUD Completo)
| Tabla | Descripción |
|-------|-------------|
| `Consultation` | Consultas médicas |
| `LabRequest` | Solicitudes de laboratorio |
| `Prescription` | Recetas |
| `PrescriptionItem` | Items de receta |
| `Surgery` | Cirugías |
| `Hospitalization` | Hospitalizaciones |
| `Monitoring` | Monitoreo EFG |
| `MedicalNote` | Notas médicas |

### FARMACIA (CRUD Completo)
| Tabla | Descripción |
|-------|-------------|
| `Medication` | Inventario |
| `Dispense` | Despachos |
| `DispenseItem` | Items despachados |
| `StockMovement` | Movimientos de stock |
| `StockAlert` | Alertas de stock |
| `PurchaseOrder` | Órdenes de compra |
| `PurchaseOrderItem` | Items de orden |

---

## Notas de Implementación

### 1. Migraciones

```bash
# Generar migración inicial
npx prisma migrate dev --name init

# Aplicar en producción
npx prisma migrate deploy

# Generar cliente
npx prisma generate
```

### 2. Seeders Recomendados

```typescript
// prisma/seed.ts
async function main() {
  // 1. Crear usuarios del sistema
  await prisma.user.createMany({
    data: [
      { email: 'admin@vetos.com', nombre: 'Admin', rol: 'ADMIN', password: hash('admin123') },
      { email: 'recepcion@vetos.com', nombre: 'María López', rol: 'RECEPCION', password: hash('recepcion123') },
      { email: 'drgarcia@vetos.com', nombre: 'Dr. García', rol: 'MEDICO', especialidad: 'Cirugía', password: hash('medico123') },
      { email: 'farmacia@vetos.com', nombre: 'Carlos Ruiz', rol: 'FARMACIA', password: hash('farmacia123') },
    ]
  });
  
  // 2. Crear medicamentos iniciales
  await prisma.medication.createMany({
    data: [
      { name: 'Amoxicilina 500mg', category: 'ANTIBIOTICO', presentation: 'Tabletas', unit: 'tableta', currentStock: 150, minStock: 50, salePrice: 25.00 },
      { name: 'Carprofeno 75mg', category: 'ANTIINFLAMATORIO', presentation: 'Tabletas', unit: 'tableta', currentStock: 80, minStock: 30, salePrice: 35.00 },
      // ... más medicamentos
    ]
  });
}
```

### 3. Triggers Recomendados (MySQL)

```sql
-- Trigger: Crear alerta cuando stock baja del mínimo
DELIMITER //
CREATE TRIGGER after_stock_update
AFTER UPDATE ON Medication
FOR EACH ROW
BEGIN
  IF NEW.currentStock <= NEW.minStock AND OLD.currentStock > OLD.minStock THEN
    INSERT INTO StockAlert (id, medicationId, type, message, priority, status, createdAt)
    VALUES (UUID(), NEW.id, 'STOCK_BAJO', CONCAT('Stock bajo para ', NEW.name), 'MEDIA', 'ACTIVA', NOW());
  END IF;
  
  IF NEW.currentStock = 0 AND OLD.currentStock > 0 THEN
    INSERT INTO StockAlert (id, medicationId, type, message, priority, status, createdAt)
    VALUES (UUID(), NEW.id, 'AGOTADO', CONCAT('Agotado: ', NEW.name), 'ALTA', 'ACTIVA', NOW());
  END IF;
END //
DELIMITER ;
```

### 4. Consideraciones de Seguridad

- Passwords hasheados con bcrypt (cost factor 12)
- Campos sensibles como `signature` en base64 encriptados
- Auditoría completa con `createdAt`, `updatedAt`, `performedBy`
- Row-level security recomendado para datos de pacientes

---

## Estadísticas del Schema

| Métrica | Valor |
|---------|-------|
| **Total Tablas** | 21 |
| **Total Enums** | 28 |
| **Total Relaciones** | 45+ |
| **Tablas Sistema** | 3 |
| **Tablas Recepción** | 6 |
| **Tablas Médico** | 8 |
| **Tablas Farmacia** | 7 |

---

**Documento generado para el Proyecto EVEREST - VET-OS**  
**Schema de Base de Datos - Versión 1.0**  
**Última actualización:** Enero 21, 2026
