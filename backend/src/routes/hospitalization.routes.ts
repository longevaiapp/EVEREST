// src/routes/hospitalization.routes.ts
// Hospitalization routes - MEDICO module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// GET /hospitalizations - List active hospitalizations
router.get('/', authenticate, async (req, res) => {
  const { status } = req.query;

  const where: any = {};
  if (status) {
    where.status = status;
  } else {
    where.status = { not: 'ALTA' }; // By default, show active only
  }

  const hospitalizations = await prisma.hospitalization.findMany({
    where,
    include: {
      pet: { include: { owner: true } },
      consultation: true,
      monitorings: {
        orderBy: { recordedAt: 'desc' },
        take: 1, // Latest monitoring
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { hospitalizations } });
});

// POST /hospitalizations - Admit patient
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    petId: z.string().cuid(),
    consultationId: z.string().cuid(),
    reason: z.string().min(1),
    location: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({ 
    where: { id: data.consultationId },
    include: { visit: true }
  });
  if (!consultation) throw new AppError('Consultation not found', 404);

  const hospitalization = await prisma.hospitalization.create({
    data: {
      petId: data.petId,
      consultationId: data.consultationId,
      reason: data.reason,
      location: data.location,
      admittedById: req.user!.userId,
      status: 'ACTIVA',
    },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: data.petId },
    data: { estado: 'HOSPITALIZADO' },
  });

  // Update visit status
  if (consultation.visit) {
    await prisma.visit.update({
      where: { id: consultation.visitId },
      data: { status: 'HOSPITALIZADO' },
    });
  }

  res.status(201).json({ status: 'success', data: { hospitalization } });
});

// GET /hospitalizations/:id - Get hospitalization details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const hospitalization = await prisma.hospitalization.findUnique({
    where: { id },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
      monitorings: {
        orderBy: { recordedAt: 'desc' },
      },
    },
  });

  if (!hospitalization) throw new AppError('Hospitalization not found', 404);

  res.json({ status: 'success', data: { hospitalization } });
});

// POST /hospitalizations/:id/monitorings - Add monitoring record
router.post('/:id/monitorings', authenticate, isMedico, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    temperatura: z.number().optional(),
    frecuenciaCardiaca: z.number().int().optional(),
    frecuenciaRespiratoria: z.number().int().optional(),
    presionArterial: z.string().optional(),
    nivelConciencia: z.enum(['ALERTA', 'SOMNOLIENTO', 'DESORIENTADO', 'ESTUPOROSO', 'INCONSCIENTE']).optional(),
    escalaDolor: z.number().int().min(0).max(10).optional(),
    observaciones: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify hospitalization exists
  const hospitalization = await prisma.hospitalization.findUnique({
    where: { id },
  });
  if (!hospitalization) throw new AppError('Hospitalization not found', 404);

  const monitoring = await prisma.monitoring.create({
    data: {
      ...data,
      hospitalizationId: id,
      recordedById: req.user!.userId,
    },
  });

  res.status(201).json({ status: 'success', data: { monitoring } });
});

// PUT /hospitalizations/:id/discharge - Discharge patient
router.put('/:id/discharge', authenticate, isMedico, async (req, res) => {
  const id = req.params.id as string;

  const hospitalization = await prisma.hospitalization.update({
    where: { id },
    data: {
      status: 'ALTA',
      dischargedAt: new Date(),
    },
    include: {
      consultation: { include: { visit: true } },
      pet: true,
    },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: hospitalization.petId },
    data: { estado: 'LISTO_PARA_ALTA' },
  });

  // Update visit status
  if (hospitalization.consultation?.visit) {
    await prisma.visit.update({
      where: { id: hospitalization.consultation.visitId },
      data: { status: 'LISTO_PARA_ALTA' },
    });
  }

  res.json({ status: 'success', data: { hospitalization } });
});

export default router;
