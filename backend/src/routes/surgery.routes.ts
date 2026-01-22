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
  const { status, fecha, vetId } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (vetId) where.cirujanoId = vetId;
  
  if (fecha) {
    const date = new Date(fecha as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.fechaProgramada = { gte: date, lt: nextDay };
  }

  const surgeries = await prisma.surgery.findMany({
    where,
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
    orderBy: { fechaProgramada: 'asc' },
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
      fechaProgramada: { gte: today, lt: tomorrow },
    },
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
    orderBy: { fechaProgramada: 'asc' },
  });

  res.json({ status: 'success', data: { surgeries } });
});

// POST /surgeries - Schedule surgery
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    visitId: z.string().cuid(),
    tipoCirugia: z.enum(['ESTERILIZACION', 'CASTRACION', 'TRAUMATOLOGIA', 'ONCOLOGICA', 'OFTALMOLOGICA', 'DENTAL', 'ABDOMINAL', 'TORACICA', 'BIOPSIA', 'LIMPIEZA_DENTAL', 'OTRA']),
    descripcion: z.string().min(1),
    fechaProgramada: z.string().datetime(),
    duracionEstimada: z.number().int().positive(), // minutes
    anestesia: z.enum(['LOCAL', 'GENERAL', 'SEDACION']),
    preparacion: z.string().optional(),
    riesgoQuirurgico: z.enum(['BAJO', 'MEDIO', 'ALTO']).default('MEDIO'),
  });

  const data = schema.parse(req.body);

  // Verify visit exists
  const visit = await prisma.visit.findUnique({ where: { id: data.visitId } });
  if (!visit) throw new AppError('Visit not found', 404);

  const surgery = await prisma.surgery.create({
    data: {
      ...data,
      fechaProgramada: new Date(data.fechaProgramada),
      cirujanoId: req.user!.id,
      cirujanoName: req.user!.nombre,
      status: 'PROGRAMADA',
    },
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
  });

  res.status(201).json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/start - Start surgery
router.put('/:id/start', authenticate, isMedico, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    ayudanteId: z.string().cuid().optional(),
    ayudanteName: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      ...data,
      status: 'EN_PROCESO',
      horaInicio: new Date(),
    },
  });

  // Update pet status
  const visit = await prisma.visit.findUnique({ where: { id: surgery.visitId } });
  if (visit) {
    await prisma.pet.update({
      where: { id: visit.petId },
      data: { estado: 'EN_CIRUGIA' },
    });
  }

  res.json({ status: 'success', data: { surgery } });
});

// PUT /surgeries/:id/complete - Complete surgery
router.put('/:id/complete', authenticate, isMedico, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    hallazgos: z.string().optional(),
    procedimientoRealizado: z.string().min(1),
    complicaciones: z.string().optional(),
    indicacionesPostOp: z.string().min(1),
    medicamentosAplicados: z.array(z.object({
      nombre: z.string(),
      dosis: z.string(),
    })).optional(),
  });

  const data = schema.parse(req.body);

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      ...data,
      status: 'COMPLETADA',
      horaFin: new Date(),
    },
  });

  // Update pet status to recovery
  const visit = await prisma.visit.findUnique({ where: { id: surgery.visitId } });
  if (visit) {
    await prisma.pet.update({
      where: { id: visit.petId },
      data: { estado: 'EN_RECUPERACION' },
    });
  }

  res.json({ status: 'success', data: { surgery } });
});

// GET /surgeries/:id - Get surgery details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const surgery = await prisma.surgery.findUnique({
    where: { id },
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
  });

  if (!surgery) throw new AppError('Surgery not found', 404);

  res.json({ status: 'success', data: { surgery } });
});

export default router;
