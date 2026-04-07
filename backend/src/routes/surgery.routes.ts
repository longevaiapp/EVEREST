// src/routes/surgery.routes.ts
// Surgery / Quirófano routes

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

const surgeriesInclude = {
  pet: { include: { owner: true } },
  consultation: true,
  surgeryVitals: { orderBy: { recordedAt: 'asc' as const } },
  surgeryPreMeds: { orderBy: { createdAt: 'asc' as const } },
  hospitalization: { select: { id: true, status: true } },
};

// GET /surgeries - List surgeries
router.get('/', authenticate, async (req, res) => {
  const { status, fecha, surgeonId } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (surgeonId) where.surgeonId = surgeonId;
  
  if (fecha) {
    const date = new Date((fecha as string) + 'T00:00:00');
    const nextDay = new Date((fecha as string) + 'T23:59:59');
    where.scheduledDate = { gte: date, lte: nextDay };
  }

  const surgeries = await prisma.surgery.findMany({
    where,
    include: surgeriesInclude,
    orderBy: { scheduledDate: 'asc' },
  });

  res.json({ status: 'success', data: { surgeries } });
});

// GET /surgeries/today - Today's + active surgeries
router.get('/today', authenticate, async (req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const surgeries = await prisma.surgery.findMany({
    where: {
      OR: [
        // Today's surgeries (any status)
        { scheduledDate: { gte: today, lt: tomorrow } },
        // Active surgeries regardless of date
        { status: { in: ['EN_CURSO', 'EN_PREPARACION'] } },
        // Upcoming programmed surgeries
        { status: 'PROGRAMADA', scheduledDate: { gte: today } },
      ],
    },
    include: surgeriesInclude,
    orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
  });

  res.json({ status: 'success', data: { surgeries } });
});

// GET /surgeries/board - Board summary (counts by status)
router.get('/board', authenticate, async (req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [programadas, enPreparacion, enCurso, completadas] = await Promise.all([
    prisma.surgery.count({ where: { status: 'PROGRAMADA', scheduledDate: { gte: today } } }),
    prisma.surgery.count({ where: { status: 'EN_PREPARACION' } }),
    prisma.surgery.count({ where: { status: 'EN_CURSO' } }),
    prisma.surgery.count({ where: { status: 'COMPLETADA', scheduledDate: { gte: today, lt: tomorrow } } }),
  ]);

  res.json({
    status: 'success',
    data: { stats: { programadas, enPreparacion, enCurso, completadas, total: programadas + enPreparacion + enCurso + completadas } },
  });
});

// POST /surgeries - Schedule surgery
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    petId: z.string().cuid(),
    consultationId: z.string().cuid(),
    type: z.string().min(1),
    scheduledDate: z.string(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
    estimatedDuration: z.number().int().positive().optional(),
    preOpNotes: z.string().optional(),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).default('MEDIA'),
  });

  const data = schema.parse(req.body);

  const consultation = await prisma.consultation.findUnique({ 
    where: { id: data.consultationId } 
  });
  if (!consultation) throw new AppError('Consultation not found', 404);

  const surgery = await prisma.surgery.create({
    data: {
      petId: data.petId,
      consultationId: data.consultationId,
      surgeonId: req.user!.userId,
      type: data.type,
      scheduledDate: new Date(data.scheduledDate + 'T12:00:00'),
      scheduledTime: data.scheduledTime,
      estimatedDuration: data.estimatedDuration,
      preOpNotes: data.preOpNotes,
      prioridad: data.prioridad,
      status: 'PROGRAMADA',
    },
    include: surgeriesInclude,
  });

  // Update pet and visit status
  await prisma.pet.update({
    where: { id: data.petId },
    data: { estado: 'CIRUGIA_PROGRAMADA' },
  });

  // Update visit if exists
  const visit = await prisma.visit.findFirst({
    where: { petId: data.petId, status: { in: ['EN_CONSULTA', 'EN_ESPERA'] } },
    orderBy: { arrivalTime: 'desc' },
  });
  if (visit) {
    await prisma.visit.update({
      where: { id: visit.id },
      data: { status: 'CIRUGIA_PROGRAMADA' },
    });
  }

  res.status(201).json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/prepare - Pre-op checklist
router.put('/:id/prepare', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    sedationAuthorized: z.boolean().optional(),
    consentSigned: z.boolean().optional(),
    consentSignedBy: z.string().optional(),
    fastingConfirmed: z.boolean().optional(),
    preOpStudies: z.any().optional(),
    preOpNotes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.findUnique({ where: { id } });
  if (!surgery) throw new AppError('Surgery not found', 404);

  const updateData: any = { ...data, status: 'EN_PREPARACION' };
  if (data.consentSigned) {
    updateData.consentSignedAt = new Date();
  }

  const updated = await prisma.surgery.update({
    where: { id },
    data: updateData,
    include: surgeriesInclude,
  });

  res.json({ status: 'success', data: { surgery: updated } });
});

// PUT /surgeries/:id/start - Start surgery
router.put('/:id/start', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    anesthesiaType: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      ...data,
      status: 'EN_CURSO',
      startTime: new Date(),
    },
    include: surgeriesInclude,
  });

  // Update pet and visit status
  await prisma.pet.update({
    where: { id: surgery.petId },
    data: { estado: 'EN_CIRUGIA' },
  });

  const visit = await prisma.visit.findFirst({
    where: { petId: surgery.petId, status: { in: ['CIRUGIA_PROGRAMADA', 'EN_CONSULTA'] } },
    orderBy: { arrivalTime: 'desc' },
  });
  if (visit) {
    await prisma.visit.update({
      where: { id: visit.id },
      data: { status: 'EN_CIRUGIA' },
    });
  }

  res.json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/complete - Complete surgery
router.put('/:id/complete', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    procedure: z.string().min(1),
    complications: z.string().optional(),
    postOpNotes: z.string().optional(),
    postOpCare: z.string().optional(),
    prognosis: z.union([z.enum(['EXCELENTE', 'BUENO', 'RESERVADO', 'GRAVE']), z.literal('')]).optional().transform(v => v === '' ? undefined : v),
    hospitalizationRequired: z.boolean().default(false),
    hospitalizationType: z.string().optional(),
    followUpDate: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      procedure: data.procedure,
      complications: data.complications,
      postOpNotes: data.postOpNotes,
      postOpCare: data.postOpCare,
      prognosis: data.prognosis,
      hospitalizationRequired: data.hospitalizationRequired,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      status: 'COMPLETADA',
      endTime: new Date(),
    },
  });

  // Auto-sync esterilizado
  const tipo = (surgery.type || '').toLowerCase();
  const petUpdate: any = {};
  if (
    tipo.includes('esteriliz') ||
    tipo.includes('castrac') ||
    tipo.includes('ovariohisterect') ||
    tipo.includes('orquiect')
  ) {
    petUpdate.esterilizado = true;
  }

  if (data.hospitalizationRequired) {
    // Auto-create hospitalization linked to surgery
    await prisma.hospitalization.create({
      data: {
        petId: surgery.petId,
        surgeryId: surgery.id,
        admittedById: req.user!.userId,
        reason: `Post-quirúrgico: ${surgery.type} — ${data.procedure}`,
        type: (data.hospitalizationType as any) || 'GENERAL',
        frecuenciaMonitoreo: '1h',
        cuidadosEspeciales: data.postOpCare || '',
        status: 'ACTIVA',
      },
    });
    petUpdate.estado = 'HOSPITALIZADO';

    // Update visit
    const visit = await prisma.visit.findFirst({
      where: { petId: surgery.petId, status: { in: ['EN_CIRUGIA', 'CIRUGIA_PROGRAMADA'] } },
      orderBy: { arrivalTime: 'desc' },
    });
    if (visit) {
      await prisma.visit.update({
        where: { id: visit.id },
        data: { status: 'HOSPITALIZADO' },
      });
    }
  } else {
    petUpdate.estado = 'LISTO_PARA_ALTA';

    const visit = await prisma.visit.findFirst({
      where: { petId: surgery.petId, status: { in: ['EN_CIRUGIA', 'CIRUGIA_PROGRAMADA'] } },
      orderBy: { arrivalTime: 'desc' },
    });
    if (visit) {
      await prisma.visit.update({
        where: { id: visit.id },
        data: { status: 'LISTO_PARA_ALTA' },
      });
    }
  }

  await prisma.pet.update({
    where: { id: surgery.petId },
    data: petUpdate,
  });

  const updatedSurgery = await prisma.surgery.findUnique({
    where: { id },
    include: surgeriesInclude,
  });

  res.json({ status: 'success', data: { surgery: updatedSurgery } });
});

// PUT /surgeries/:id/cancel - Cancel surgery
router.put('/:id/cancel', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    reason: z.string().optional(),
  });
  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      status: 'CANCELADA',
      postOpNotes: data.reason ? `CANCELADA: ${data.reason}` : undefined,
    },
  });

  // Restore pet status
  await prisma.pet.update({
    where: { id: surgery.petId },
    data: { estado: 'EN_CONSULTA' },
  });

  res.json({ status: 'success', data: { surgery } });
});

// ============================================================================
// SURGERY VITALS (intra-operative monitoring)
// ============================================================================

// POST /surgeries/:id/vitals - Record vitals during surgery
router.post('/:id/vitals', authenticate, async (req, res) => {
  const surgeryId = req.params.id as string;
  const schema = z.object({
    frecuenciaCardiaca: z.number().int().optional(),
    frecuenciaRespiratoria: z.number().int().optional(),
    temperatura: z.number().optional(),
    presionArterial: z.string().optional(),
    saturacionOxigeno: z.number().optional(),
    etCO2: z.number().optional(),
    capnografia: z.string().optional(),
    planoAnestesico: z.string().optional(),
    observaciones: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } });
  if (!surgery) throw new AppError('Surgery not found', 404);

  const vitals = await prisma.surgeryVitals.create({
    data: { surgeryId, ...data },
  });

  res.status(201).json({ status: 'success', data: { vitals } });
});

// GET /surgeries/:id/vitals - Get surgery vitals
router.get('/:id/vitals', authenticate, async (req, res) => {
  const surgeryId = req.params.id as string;

  const vitals = await prisma.surgeryVitals.findMany({
    where: { surgeryId },
    orderBy: { recordedAt: 'asc' },
  });

  res.json({ status: 'success', data: { vitals } });
});

// ============================================================================
// PRE-MEDICATION
// ============================================================================

// POST /surgeries/:id/pre-meds - Add pre-medication
router.post('/:id/pre-meds', authenticate, async (req, res) => {
  const surgeryId = req.params.id as string;
  const schema = z.object({
    medicamento: z.string().min(1),
    dosis: z.string().min(1),
    via: z.string().min(1),
    horaAplicacion: z.string().optional(),
    observaciones: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.findUnique({ where: { id: surgeryId } });
  if (!surgery) throw new AppError('Surgery not found', 404);

  const preMed = await prisma.surgeryPreMedication.create({
    data: {
      surgeryId,
      medicamento: data.medicamento,
      dosis: data.dosis,
      via: data.via,
      horaAplicacion: data.horaAplicacion ? new Date(data.horaAplicacion) : null,
      observaciones: data.observaciones,
    },
  });

  res.status(201).json({ status: 'success', data: { preMed } });
});

// GET /surgeries/:id/pre-meds - Get pre-medications
router.get('/:id/pre-meds', authenticate, async (req, res) => {
  const surgeryId = req.params.id as string;

  const preMeds = await prisma.surgeryPreMedication.findMany({
    where: { surgeryId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ status: 'success', data: { preMeds } });
});

// DELETE /surgeries/:id/pre-meds/:preMedId - Remove pre-medication
router.delete('/:id/pre-meds/:preMedId', authenticate, async (req, res) => {
  const preMedId = req.params.preMedId as string;

  await prisma.surgeryPreMedication.delete({ where: { id: preMedId } });

  res.json({ status: 'success', message: 'Pre-medication removed' });
});

// GET /surgeries/:id - Get surgery details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const surgery = await prisma.surgery.findUnique({
    where: { id },
    include: surgeriesInclude,
  });

  if (!surgery) throw new AppError('Surgery not found', 404);

  res.json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id - Update surgery details
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    type: z.string().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    estimatedDuration: z.number().int().positive().optional(),
    preOpNotes: z.string().optional(),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  });

  const data = schema.parse(req.body);
  const updateData: any = { ...data };
  if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate + 'T12:00:00');

  const surgery = await prisma.surgery.update({
    where: { id },
    data: updateData,
    include: surgeriesInclude,
  });

  res.json({ status: 'success', data: { surgery } });
});

export default router;
