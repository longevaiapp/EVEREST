// src/routes/consultation.routes.ts
// Consultation routes - MEDICO module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// GET /consultations - List consultations for current vet
router.get('/', authenticate, isMedico, async (req, res) => {
  const { status, fecha } = req.query;

  const where: any = { vetId: req.user!.id };
  
  if (status) where.status = status;
  
  if (fecha) {
    const date = new Date(fecha as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.createdAt = { gte: date, lt: nextDay };
  }

  const consultations = await prisma.consultation.findMany({
    where,
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { consultations } });
});

// POST /consultations - Start consultation
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    visitId: z.string().cuid(),
  });

  const { visitId } = schema.parse(req.body);

  // Verify visit exists and is in waiting status
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new AppError('Visit not found', 404);
  if (visit.status !== 'EN_ESPERA') {
    throw new AppError('Visit is not in waiting status', 400);
  }

  // Create consultation
  const consultation = await prisma.consultation.create({
    data: {
      visitId,
      vetId: req.user!.id,
      vetName: req.user!.nombre,
      status: 'EN_PROGRESO',
    },
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
    },
  });

  // Update visit status
  await prisma.visit.update({
    where: { id: visitId },
    data: { status: 'EN_CONSULTA' },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: visit.petId },
    data: { estado: 'EN_CONSULTA' },
  });

  res.status(201).json({ status: 'success', data: { consultation } });
});

// GET /consultations/:id - Get consultation details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      visit: {
        include: {
          pet: { include: { owner: true } },
        },
      },
      prescriptions: {
        include: { items: true },
      },
      labRequests: true,
    },
  });

  if (!consultation) throw new AppError('Consultation not found', 404);

  res.json({ status: 'success', data: { consultation } });
});

// PUT /consultations/:id - Update consultation (SOAP notes, diagnosis, etc.)
router.put('/:id', authenticate, isMedico, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    subjetivo: z.string().optional(),
    objetivo: z.string().optional(),
    analisis: z.string().optional(),
    plan: z.string().optional(),
    diagnostico: z.string().optional(),
    diagnosticosCIE: z.array(z.string()).optional(),
    notasInternas: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const consultation = await prisma.consultation.update({
    where: { id },
    data,
  });

  res.json({ status: 'success', data: { consultation } });
});

// PUT /consultations/:id/complete - Complete consultation
router.put('/:id/complete', authenticate, isMedico, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    diagnostico: z.string().min(1),
    plan: z.string().min(1),
    proximaCita: z.string().datetime().optional(),
    notasAlta: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      ...data,
      proximaCita: data.proximaCita ? new Date(data.proximaCita) : null,
      status: 'COMPLETADA',
    },
  });

  // Update visit status based on prescriptions
  const prescriptions = await prisma.prescription.findMany({
    where: { consultationId: id, status: 'PENDIENTE' },
  });

  const newVisitStatus = prescriptions.length > 0 ? 'PENDIENTE_FARMACIA' : 'LISTO_PARA_PAGO';

  await prisma.visit.update({
    where: { id: consultation.visitId },
    data: { status: newVisitStatus },
  });

  res.json({ status: 'success', data: { consultation } });
});

export default router;
