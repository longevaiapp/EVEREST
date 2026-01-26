// src/routes/surgery.routes.ts
// Surgery routes - MEDICO module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// GET /surgeries - List surgeries
router.get('/', authenticate, async (req, res) => {
  const { status, fecha, surgeonId } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (surgeonId) where.surgeonId = surgeonId;
  
  if (fecha) {
    const date = new Date(fecha as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.scheduledDate = { gte: date, lt: nextDay };
  }

  const surgeries = await prisma.surgery.findMany({
    where,
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  res.json({ status: 'success', data: { surgeries } });
});

// GET /surgeries/today - Today's surgeries
router.get('/today', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const surgeries = await prisma.surgery.findMany({
    where: {
      scheduledDate: { gte: today, lt: tomorrow },
    },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  res.json({ status: 'success', data: { surgeries } });
});

// POST /surgeries - Schedule surgery
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    petId: z.string().cuid(),
    consultationId: z.string().cuid(),
    type: z.string().min(1),
    scheduledDate: z.string(), // Date string
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
    estimatedDuration: z.number().int().positive().optional(),
    preOpNotes: z.string().optional(),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).default('MEDIA'),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
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
      scheduledDate: new Date(data.scheduledDate),
      scheduledTime: data.scheduledTime,
      estimatedDuration: data.estimatedDuration,
      preOpNotes: data.preOpNotes,
      prioridad: data.prioridad,
      status: 'PROGRAMADA',
    },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
  });

  res.status(201).json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/start - Start surgery
router.put('/:id/start', authenticate, isMedico, async (req, res) => {
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
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: surgery.petId },
    data: { estado: 'EN_CIRUGIA' },
  });

  res.json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/complete - Complete surgery
router.put('/:id/complete', authenticate, isMedico, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    procedure: z.string().min(1),
    complications: z.string().optional(),
    postOpNotes: z.string().optional(),
    prognosis: z.enum(['EXCELENTE', 'BUENO', 'RESERVADO', 'GRAVE']).optional(),
    hospitalizationRequired: z.boolean().default(false),
    followUpDate: z.string().datetime().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      procedure: data.procedure,
      complications: data.complications,
      postOpNotes: data.postOpNotes,
      prognosis: data.prognosis,
      hospitalizationRequired: data.hospitalizationRequired,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      status: 'COMPLETADA',
      endTime: new Date(),
    },
  });

  // Update pet status based on hospitalization
  const newStatus = data.hospitalizationRequired ? 'HOSPITALIZADO' : 'LISTO_PARA_ALTA';
  await prisma.pet.update({
    where: { id: surgery.petId },
    data: { estado: newStatus },
  });

  res.json({ status: 'success', data: { surgery } });
});

// GET /surgeries/:id - Get surgery details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const surgery = await prisma.surgery.findUnique({
    where: { id },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
  });

  if (!surgery) throw new AppError('Surgery not found', 404);

  res.json({ status: 'success', data: { surgery } });
});

export default router;
