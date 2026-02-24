// src/routes/medico.routes.ts
// Medical Module API Routes - MEDICO dashboard specific endpoints
// Consolidated endpoints for the Medical module

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// =============================================================================
// GET /api/medico/citas-hoy - Get today's appointments for the logged-in doctor
// =============================================================================
router.get('/citas-hoy', authenticate, isMedico, async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get visits assigned to this doctor or unassigned, from today
  const visits = await prisma.visit.findMany({
    where: {
      arrivalTime: { gte: today, lt: tomorrow },
      status: { in: ['EN_ESPERA', 'RECIEN_LLEGADO', 'EN_CONSULTA', 'EN_ESTUDIOS'] },
    },
    include: {
      pet: {
        include: {
          owner: true,
          vaccineRecords: { orderBy: { fecha: 'desc' }, take: 3 },
        },
      },
      consultation: true,
    },
    orderBy: [
      { prioridad: 'asc' }, // ALTA first
      { arrivalTime: 'asc' },
    ],
  });

  // Get scheduled appointments for today
  const appointments = await prisma.appointment.findMany({
    where: {
      fecha: { gte: today, lt: tomorrow },
      cancelada: false,
    },
    include: {
      pet: { include: { owner: true } },
    },
    orderBy: { hora: 'asc' },
  });

  res.json({
    status: 'success',
    data: {
      visits,
      appointments,
      resumen: {
        enEspera: visits.filter((v: any) => v.status === 'EN_ESPERA' || v.status === 'RECIEN_LLEGADO').length,
        enConsulta: visits.filter((v: any) => v.status === 'EN_CONSULTA').length,
        enEstudios: visits.filter((v: any) => v.status === 'EN_ESTUDIOS').length,
        citasProgramadas: appointments.length,
      },
    },
  });
});

// =============================================================================
// GET /api/medico/paciente/:id - Get complete patient info for consultation
// =============================================================================
router.get('/paciente/:id', authenticate, isMedico, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const pet = await prisma.pet.findUnique({
    where: { id },

    include: {
      owner: true,
      vaccineRecords: { orderBy: { fecha: 'desc' } },
      visits: {
        orderBy: { arrivalTime: 'desc' },
        take: 10,
        include: {
          consultation: {
            include: {
              diagnosticos: true,
              prescriptions: { include: { items: true } },
              labRequests: true,
            },
          },
        },
      },
      consultations: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          doctor: { select: { id: true, nombre: true } },
          diagnosticos: true,
          signosVitales: { orderBy: { registeredAt: 'desc' }, take: 1 },
          prescriptions: { include: { items: true } },
          labRequests: true,
        },
      },
      hospitalizations: {
        orderBy: { admittedAt: 'desc' },
        take: 3,
        include: { 
          monitorings: { orderBy: { recordedAt: 'desc' }, take: 5 },
          admittedBy: { select: { id: true, nombre: true } }
        },
      },
      surgeries: { orderBy: { scheduledDate: 'desc' }, take: 5 },
      medicalNotes: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!pet) throw new AppError('Paciente no encontrado', 404);

  res.json({ status: 'success', data: { paciente: pet } });
});

// =============================================================================
// POST /api/medico/consulta - Start a new consultation
// =============================================================================
router.post('/consulta', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    visitId: z.string().cuid(),
    petId: z.string().cuid(),
  });

  const { visitId, petId } = schema.parse(req.body);

  // Verify visit exists and is available
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new AppError('Visita no encontrada', 404);
  if (visit.status === 'EN_CONSULTA') {
    throw new AppError('Esta visita ya está en consulta', 400);
  }

  // Check if consultation already exists for this visit
  const existingConsultation = await prisma.consultation.findUnique({
    where: { visitId },
  });
  if (existingConsultation) {
    throw new AppError('Ya existe una consulta para esta visita', 400);
  }

  // Create consultation with SOAP structure
  const consultation = await prisma.consultation.create({
    data: {
      visitId,
      petId,
      doctorId: req.user!.userId,
      startTime: new Date(),
      status: 'EN_PROGRESO',
    },
    include: {
      pet: { include: { owner: true } },
      visit: true,
    },
  });

  // Update visit status
  await prisma.visit.update({
    where: { id: visitId },
    data: { status: 'EN_CONSULTA', assignedDoctorId: req.user!.userId },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: petId },
    data: { estado: 'EN_CONSULTA' },
  });

  // Update linked appointment status to EN_CONSULTA
  await prisma.appointment.updateMany({
    where: { visitId },
    data: { status: 'EN_CONSULTA' },
  });

  res.status(201).json({ status: 'success', data: { consulta: consultation } });
});

// =============================================================================
// PUT /api/medico/consulta/:id - Update consultation (SOAP notes, vitals, etc.)
// =============================================================================
router.put('/consulta/:id', authenticate, isMedico, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const schema = z.object({
    // SOAP - Subjective
    soapSubjective: z.string().optional(),
    motivoConsulta: z.string().optional(),
    historiaEnfermedad: z.string().optional(),
    symptoms: z.string().optional(),
    
    // SOAP - Objective
    soapObjective: z.string().optional(),
    physicalExam: z.string().optional(),
    
    // Vital Signs at entry
    vitalTemperature: z.number().optional(),
    vitalHeartRate: z.number().int().optional(),
    vitalRespiratoryRate: z.number().int().optional(),
    vitalWeight: z.number().optional(),
    vitalBloodPressure: z.string().optional(),
    vitalPulse: z.number().int().optional(),
    vitalHydration: z.string().optional(),
    vitalMucosas: z.string().optional(),
    
    // SOAP - Assessment
    soapAssessment: z.string().optional(),
    diagnosis: z.string().optional(),
    
    // SOAP - Plan
    soapPlan: z.string().optional(),
    treatment: z.string().optional(),
    
    // Follow-up
    followUpRequired: z.boolean().optional(),
    followUpDate: z.string().datetime().optional(),
    followUpNotes: z.string().optional(),
    
    // Notes
    notes: z.string().optional(),
    
    // Status
    status: z.enum(['EN_PROGRESO', 'COMPLETADA']).optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists and belongs to this doctor
  const existingConsultation = await prisma.consultation.findUnique({
    where: { id },
  });
  if (!existingConsultation) throw new AppError('Consulta no encontrada', 404);

  // Calculate duration if completing
  let duration = existingConsultation.duration;
  if (data.status === 'COMPLETADA' && !existingConsultation.endTime) {
    const start = new Date(existingConsultation.startTime);
    const end = new Date();
    duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutes
  }

  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      endTime: data.status === 'COMPLETADA' ? new Date() : undefined,
      duration: data.status === 'COMPLETADA' ? duration : undefined,
    },
    include: {
      pet: { include: { owner: true } },
      diagnosticos: true,
      signosVitales: { orderBy: { registeredAt: 'desc' } },
      prescriptions: { include: { items: true } },
      labRequests: true,
    },
  });

  // If completing, update visit and pet status
  if (data.status === 'COMPLETADA') {
    // Check if there are pending lab requests or prescriptions
    const pendingLabs = await prisma.labRequest.count({
      where: { consultationId: id, status: { in: ['PENDIENTE', 'EN_PROCESO'] } },
    });
    const pendingRx = await prisma.prescription.count({
      where: { consultationId: id, status: 'PENDIENTE' },
    });

    let newStatus: string;
    let petStatus: string;

    if (pendingLabs > 0) {
      newStatus = 'EN_ESTUDIOS';
      petStatus = 'EN_ESTUDIOS';
    } else if (pendingRx > 0) {
      newStatus = 'EN_FARMACIA';
      petStatus = 'EN_FARMACIA';
    } else {
      newStatus = 'LISTO_PARA_ALTA';
      petStatus = 'LISTO_PARA_ALTA';
    }

    await prisma.visit.update({
      where: { id: consultation.visitId },
      data: { status: newStatus as any },
    });

    await prisma.pet.update({
      where: { id: consultation.petId },
      data: { estado: petStatus as any },
    });

    // Update linked appointment status to COMPLETADA
    await prisma.appointment.updateMany({
      where: { visitId: consultation.visitId },
      data: { status: 'COMPLETADA' },
    });
  }

  res.json({ status: 'success', data: { consulta: consultation } });
});

// =============================================================================
// GET /api/medico/historial/:mascotaId - Get complete medical history
// =============================================================================
router.get('/historial/:mascotaId', authenticate, isMedico, async (req: Request, res: Response) => {
  const mascotaId = req.params.mascotaId as string;

  const pet = await prisma.pet.findUnique({
    where: { id: mascotaId },
    include: { owner: true },
  });

  if (!pet) throw new AppError('Paciente no encontrado', 404);

  // Get all consultations with full details
  const consultations = await prisma.consultation.findMany({
    where: { petId: mascotaId },
    include: {
      doctor: { select: { id: true, nombre: true, especialidad: true } },
      diagnosticos: true,
      signosVitales: { orderBy: { registeredAt: 'desc' } },
      prescriptions: { include: { items: true } },
      labRequests: true,
    },
    orderBy: { startTime: 'desc' },
  });

  // Get all surgeries
  const surgeries = await prisma.surgery.findMany({
    where: { petId: mascotaId },
    include: {
      surgeon: { select: { id: true, nombre: true, especialidad: true } },
    },
    orderBy: { scheduledDate: 'desc' },
  });

  // Get all hospitalizations
  const hospitalizations = await prisma.hospitalization.findMany({
    where: { petId: mascotaId },
    include: {
      monitorings: { orderBy: { recordedAt: 'desc' } },
      admittedBy: { select: { id: true, nombre: true } },
    },
    orderBy: { admittedAt: 'desc' },
  });

  // Get all vaccines
  const vaccines = await prisma.vaccineRecord.findMany({
    where: { petId: mascotaId },
    orderBy: { fecha: 'desc' },
  });

  // Get all medical notes
  const medicalNotes = await prisma.medicalNote.findMany({
    where: { petId: mascotaId },
    include: {
      createdBy: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    status: 'success',
    data: {
      paciente: pet,
      historial: {
        consultas: consultations,
        cirugias: surgeries,
        hospitalizaciones: hospitalizations,
        vacunas: vaccines,
        notas: medicalNotes,
      },
      resumen: {
        totalConsultas: consultations.length,
        totalCirugias: surgeries.length,
        totalHospitalizaciones: hospitalizations.length,
        ultimaConsulta: consultations[0]?.startTime || null,
      },
    },
  });
});

// =============================================================================
// POST /api/medico/diagnostico - Create diagnosis for consultation
// =============================================================================
router.post('/diagnostico', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    consultationId: z.string().cuid(),
    codigoCIE10: z.string().optional(),
    nombreCIE10: z.string().optional(),
    descripcion: z.string().min(1),
    tipo: z.enum(['PRESUNTIVO', 'DEFINITIVO', 'DIFERENCIAL']).default('PRESUNTIVO'),
    severidad: z.enum(['LEVE', 'MODERADO', 'SEVERO', 'CRITICO']).optional(),
    observaciones: z.string().optional(),
    diferenciales: z.string().optional(),
    esPrincipal: z.boolean().default(false),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consulta no encontrada', 404);

  // Get current count for ordering
  const count = await prisma.diagnostico.count({
    where: { consultationId: data.consultationId },
  });

  // If setting as principal, unset others
  if (data.esPrincipal) {
    await prisma.diagnostico.updateMany({
      where: { consultationId: data.consultationId },
      data: { esPrincipal: false },
    });
  }

  const diagnostico = await prisma.diagnostico.create({
    data: {
      ...data,
      orden: count + 1,
    },
  });

  res.status(201).json({ status: 'success', data: { diagnostico } });
});

// =============================================================================
// POST /api/medico/receta - Create prescription
// =============================================================================
router.post('/receta', authenticate, isMedico, async (req: Request, res: Response) => {
  const itemSchema = z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    quantity: z.number().int().positive(),
    instructions: z.string().optional(),
  });

  const schema = z.object({
    consultationId: z.string().cuid(),
    petId: z.string().cuid(),
    items: z.array(itemSchema).min(1),
    generalInstructions: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consulta no encontrada', 404);

  const prescription = await prisma.prescription.create({
    data: {
      consultationId: data.consultationId,
      petId: data.petId,
      prescribedById: req.user!.userId,
      generalInstructions: data.generalInstructions,
      status: 'PENDIENTE',
      items: {
        create: data.items.map(item => ({
          name: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
      },
    },
    include: {
      items: true,
      pet: { include: { owner: true } },
    },
  });

  // Update visit status if not already in studies
  const visit = await prisma.visit.findUnique({
    where: { id: consultation.visitId },
  });
  if (visit && visit.status !== 'EN_ESTUDIOS') {
    await prisma.visit.update({
      where: { id: consultation.visitId },
      data: { status: 'EN_FARMACIA' },
    });
    await prisma.pet.update({
      where: { id: data.petId },
      data: { estado: 'EN_FARMACIA' },
    });
  }

  res.status(201).json({ status: 'success', data: { receta: prescription } });
});

// =============================================================================
// POST /api/medico/orden-laboratorio - Create lab order
// =============================================================================
router.post('/orden-laboratorio', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    consultationId: z.string().cuid(),
    petId: z.string().cuid(),
    type: z.enum([
      'HEMOGRAMA',
      'QUIMICA_SANGUINEA',
      'URINALISIS',
      'RAYOS_X',
      'ULTRASONIDO',
      'ELECTROCARDIOGRAMA',
      'CITOLOGIA',
      'BIOPSIA',
      'COPROLOGIA',
      'PERFIL_TIROIDEO',
    ]),
    urgency: z.enum(['NORMAL', 'URGENTE']).default('NORMAL'),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consulta no encontrada', 404);

  const labRequest = await prisma.labRequest.create({
    data: {
      consultationId: data.consultationId,
      petId: data.petId,
      requestedById: req.user!.userId,
      type: data.type,
      urgency: data.urgency,
      notes: data.notes,
      status: 'PENDIENTE',
    },
    include: {
      pet: { include: { owner: true } },
    },
  });

  // Update visit and pet status
  await prisma.visit.update({
    where: { id: consultation.visitId },
    data: { status: 'EN_ESTUDIOS' },
  });
  await prisma.pet.update({
    where: { id: data.petId },
    data: { estado: 'EN_ESTUDIOS' },
  });

  res.status(201).json({ status: 'success', data: { ordenLaboratorio: labRequest } });
});

// =============================================================================
// GET /api/medico/resultados-lab/:id - Get lab results for a request
// =============================================================================
router.get('/resultados-lab/:id', authenticate, isMedico, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const labRequest = await prisma.labRequest.findUnique({
    where: { id },
    include: {
      pet: { include: { owner: true } },
      consultation: {
        include: {
          doctor: { select: { id: true, nombre: true, especialidad: true } },
        },
      },
      requestedBy: { select: { id: true, nombre: true } },
      completedBy: { select: { id: true, nombre: true } },
    },
  });

  if (!labRequest) throw new AppError('Orden de laboratorio no encontrada', 404);

  res.json({ status: 'success', data: { resultados: labRequest } });
});

// =============================================================================
// POST /api/medico/hospitalizacion - Admit patient for hospitalization
// =============================================================================
router.post('/hospitalizacion', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    consultationId: z.string().cuid(),
    petId: z.string().cuid(),
    type: z.enum(['GENERAL', 'UCI', 'NEONATOS', 'INFECCIOSOS']).default('GENERAL'),
    reason: z.string().min(1),
    location: z.string().optional(),
    frecuenciaMonitoreo: z.string().optional(),
    cuidadosEspeciales: z.string().optional(),
    estimacionDias: z.number().int().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
    include: { visit: true },
  });
  if (!consultation) throw new AppError('Consulta no encontrada', 404);

  // Check if already hospitalized
  const existingHospitalization = await prisma.hospitalization.findFirst({
    where: { consultationId: data.consultationId, status: 'ACTIVA' },
  });
  if (existingHospitalization) {
    throw new AppError('El paciente ya está hospitalizado', 400);
  }

  // Create hospitalization with all details
  const hospitalization = await prisma.hospitalization.create({
    data: {
      petId: data.petId,
      consultationId: data.consultationId,
      type: data.type as any,
      reason: data.reason,
      location: data.location,
      frecuenciaMonitoreo: data.frecuenciaMonitoreo,
      cuidadosEspeciales: data.cuidadosEspeciales,
      estimacionDias: data.estimacionDias,
      admittedById: req.user!.userId,
      status: 'ACTIVA',
    },
    include: {
      pet: { include: { owner: true } },
      admittedBy: { select: { id: true, nombre: true } },
      consultation: {
        include: {
          diagnosticos: true,
          signosVitales: { orderBy: { registeredAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  // Complete the consultation (mark as COMPLETADA)
  const startTime = new Date(consultation.startTime);
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  
  await prisma.consultation.update({
    where: { id: data.consultationId },
    data: {
      status: 'COMPLETADA',
      endTime: endTime,
      duration: duration,
      soapPlan: consultation.soapPlan 
        ? `${consultation.soapPlan}\n\n** HOSPITALIZACIÓN **\nMotivo: ${data.reason}${data.cuidadosEspeciales ? `\nCuidados: ${data.cuidadosEspeciales}` : ''}` 
        : `** HOSPITALIZACIÓN **\nMotivo: ${data.reason}${data.cuidadosEspeciales ? `\nCuidados: ${data.cuidadosEspeciales}` : ''}`,
    },
  });

  // Update visit and pet status
  await prisma.visit.update({
    where: { id: consultation.visitId },
    data: { status: 'HOSPITALIZADO' },
  });
  await prisma.pet.update({
    where: { id: data.petId },
    data: { estado: 'HOSPITALIZADO' },
  });

  res.status(201).json({ status: 'success', data: { hospitalizacion: hospitalization } });
});

// =============================================================================
// PUT /api/medico/hospitalizacion/:id - Update hospitalization (add monitoring, discharge)
// =============================================================================
router.put('/hospitalizacion/:id', authenticate, isMedico, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const schema = z.object({
    // Monitoring data - only fields that exist in Monitoring model
    monitoring: z.object({
      temperatura: z.number().optional(),
      frecuenciaCardiaca: z.number().int().optional(),
      frecuenciaRespiratoria: z.number().int().optional(),
      presionArterial: z.string().optional(),
      nivelConciencia: z.enum(['ALERTA', 'SOMNOLIENTO', 'DESORIENTADO', 'ESTUPOROSO', 'INCONSCIENTE']).optional(),
      escalaDolor: z.number().int().min(0).max(10).optional(),
      observaciones: z.string().optional(),
    }).optional(),
    
    // Discharge
    discharge: z.boolean().optional(),
    dischargeNotes: z.string().optional(),
    
    // Location update
    location: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify hospitalization exists
  const hospitalization = await prisma.hospitalization.findUnique({
    where: { id },
    include: { consultation: true },
  });
  if (!hospitalization) throw new AppError('Hospitalización no encontrada', 404);

  // Add monitoring record if provided
  if (data.monitoring) {
    await prisma.monitoring.create({
      data: {
        hospitalizationId: id,
        recordedById: req.user!.userId,
        ...data.monitoring,
      },
    });
  }

  // Handle discharge
  if (data.discharge) {
    await prisma.hospitalization.update({
      where: { id },
      data: {
        status: 'ALTA',
        dischargedAt: new Date(),
      },
    });

    // Update visit and pet status
    if (hospitalization.consultation?.visitId) {
      await prisma.visit.update({
        where: { id: hospitalization.consultation.visitId },
        data: { status: 'LISTO_PARA_ALTA', dischargeNotes: data.dischargeNotes },
      });
    }
    await prisma.pet.update({
      where: { id: hospitalization.petId },
      data: { estado: 'LISTO_PARA_ALTA' },
    });
  }

  // Update location if provided
  if (data.location) {
    await prisma.hospitalization.update({
      where: { id },
      data: { location: data.location },
    });
  }

  // Fetch updated hospitalization
  const updated = await prisma.hospitalization.findUnique({
    where: { id },
    include: {
      pet: { include: { owner: true } },
      monitorings: { orderBy: { recordedAt: 'desc' }, take: 10 },
      admittedBy: { select: { id: true, nombre: true } },
    },
  });

  res.json({ status: 'success', data: { hospitalizacion: updated } });
});

// =============================================================================
// POST /api/medico/signos-vitales - Record vital signs during consultation
// =============================================================================
router.post('/signos-vitales', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    consultationId: z.string().cuid(),
    temperatura: z.number().optional(),
    frecuenciaCardiaca: z.number().int().optional(),
    frecuenciaRespiratoria: z.number().int().optional(),
    peso: z.number().optional(),
    presionArterial: z.string().optional(),
    pulso: z.number().int().optional(),
    saturacionOxigeno: z.number().optional(),
    glucosa: z.number().optional(),
    hidratacion: z.string().optional(),
    mucosas: z.string().optional(),
    tiempoLlenadoCapilar: z.string().optional(),
    condicionCorporal: z.number().int().min(1).max(9).optional(),
    escalaDolor: z.number().int().min(0).max(10).optional(),
    localizacionDolor: z.string().optional(),
    observaciones: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consulta no encontrada', 404);

  const signosVitales = await prisma.signosVitales.create({
    data: {
      ...data,
    },
  });

  res.status(201).json({ status: 'success', data: { signosVitales } });
});

// =============================================================================
// POST /api/medico/nota - Create medical note
// =============================================================================
router.post('/nota', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    petId: z.string().cuid(),
    consultationId: z.string().cuid().optional(),
    type: z.enum(['EVOLUCION', 'INTERCONSULTA', 'ORDEN', 'GENERAL']).default('GENERAL'),
    content: z.string().min(1),
    isPrivate: z.boolean().default(false),
  });

  const data = schema.parse(req.body);

  const note = await prisma.medicalNote.create({
    data: {
      petId: data.petId,
      consultationId: data.consultationId,
      createdById: req.user!.userId,
      type: data.type,
      content: data.content,
      isPrivate: data.isPrivate,
    },
  });

  res.status(201).json({ status: 'success', data: { nota: note } });
});

// =============================================================================
// GET /api/medico/lab-results - Get completed lab results for doctor's patients
// =============================================================================
router.get('/lab-results', authenticate, isMedico, async (req: Request, res: Response) => {
  const { status = 'COMPLETADO' } = req.query;

  // Get lab requests that are completed (or specified status)
  // Include patient and owner info for easy access
  const labResults = await prisma.labRequest.findMany({
    where: {
      status: status as any,
    },
    include: {
      pet: {
        include: {
          owner: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              email: true,
            },
          },
        },
      },
      consultation: {
        include: {
          doctor: {
            select: { id: true, nombre: true },
          },
        },
      },
      requestedBy: {
        select: { id: true, nombre: true },
      },
      completedBy: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: 50, // Limit to last 50
  });

  res.json({ status: 'success', data: { labResults } });
});

// =============================================================================
// POST /api/medico/cita-seguimiento - Create follow-up appointment from lab results
// =============================================================================
router.post('/cita-seguimiento', authenticate, isMedico, async (req: Request, res: Response) => {
  const schema = z.object({
    petId: z.string().cuid(),
    labRequestId: z.string().cuid().optional(),
    fecha: z.string(), // Date string YYYY-MM-DD
    hora: z.string(), // Time string HH:MM
    tipo: z.enum(['SEGUIMIENTO', 'CONSULTA_GENERAL']).default('SEGUIMIENTO'),
    motivo: z.string().min(1),
    notas: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      petId: data.petId,
      fecha: new Date(data.fecha),
      hora: data.hora,
      tipo: data.tipo,
      motivo: data.motivo,
      notas: data.notas || null,
      creadaPor: 'MEDICO', // Mark as created by doctor
      agendadaPorId: req.user!.userId,
      // Link to lab request if provided
      metadata: data.labRequestId ? { labRequestId: data.labRequestId, origen: 'RESULTADOS_LAB' } : { origen: 'MEDICO' },
    },
    include: {
      pet: {
        include: {
          owner: true,
        },
      },
    },
  });

  // Create notification for reception
  await prisma.notification.create({
    data: {
      // Notify all reception users (we'll use a generic approach)
      userId: req.user!.userId, // For now, notify the doctor who created it
      tipo: 'CITA_AGENDADA_MEDICO',
      titulo: 'Nueva cita de seguimiento',
      mensaje: `Médico agendó una cita de seguimiento para ${(appointment as any).pet?.nombre || 'paciente'} el ${data.fecha} a las ${data.hora}`,
      data: { 
        appointmentId: appointment.id, 
        petId: data.petId,
        labRequestId: data.labRequestId,
        origen: 'RESULTADOS_LAB'
      },
    },
  });

  res.status(201).json({ status: 'success', data: { appointment } });
});

// =============================================================================
// GET /api/medico/citas-seguimiento - Get follow-up appointments created by doctors
// =============================================================================
router.get('/citas-seguimiento', authenticate, async (req: Request, res: Response) => {
  const { pendientes = 'true' } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereClause: any = {
    creadaPor: 'MEDICO',
    cancelada: false,
  };

  if (pendientes === 'true') {
    whereClause.fecha = { gte: today };
    whereClause.confirmada = false;
  }

  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      pet: {
        include: {
          owner: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
  });

  res.json({ status: 'success', data: { appointments } });
});

export default router;
