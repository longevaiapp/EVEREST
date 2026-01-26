// src/routes/visit.routes.ts
// Visit routes - RECEPCION module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isRecepcion } from '../middleware/auth';

const router = Router();

// POST /visits - Create new visit (check-in)
router.post('/', authenticate, isRecepcion, async (req, res) => {
  const schema = z.object({
    petId: z.string().or(z.number()).transform(val => String(val)),
    appointmentId: z.string().cuid().optional(), // Link to scheduled appointment
  });

  const { petId, appointmentId } = schema.parse(req.body);

  // Verify pet exists
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new AppError('Pet not found', 404);

  // Create visit and update pet status
  const visit = await prisma.visit.create({
    data: {
      petId,
      status: 'RECIEN_LLEGADO',
    },
    include: {
      pet: { include: { owner: true } },
    },
  });

  // If linked to an appointment, update the appointment
  if (appointmentId) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: 'CONFIRMADA',
        visitId: visit.id,
      },
    });
  }

  await prisma.pet.update({
    where: { id: petId },
    data: { estado: 'RECIEN_LLEGADO' },
  });

  res.status(201).json({ status: 'success', data: { visit } });
});

// PUT /visits/:id/triage - Complete triage
router.put('/:id/triage', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    tipoVisita: z.enum(['CONSULTA_GENERAL', 'SEGUIMIENTO', 'MEDICINA_PREVENTIVA', 'EMERGENCIA']),
    motivo: z.string().min(1),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']),
    peso: z.number().positive(),
    temperatura: z.number().optional(),
    antecedentes: z.string().optional(),
    primeraVisita: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  const visit = await prisma.visit.update({
    where: { id },
    data: {
      ...data,
      status: 'EN_ESPERA',
    },
    include: { pet: true },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: visit.petId },
    data: { estado: 'EN_ESPERA', peso: data.peso },
  });

  res.json({ status: 'success', data: { visit } });
});

// GET /visits/today - Get today's visits
router.get('/today', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const visits = await prisma.visit.findMany({
    where: {
      arrivalTime: { gte: today, lt: tomorrow },
    },
    include: {
      pet: { include: { owner: true } },
    },
    orderBy: { arrivalTime: 'desc' },
  });

  res.json({ status: 'success', data: { visits } });
});

// PUT /visits/:id/discharge - Process discharge
router.put('/:id/discharge', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    dischargeNotes: z.string().optional(),
    total: z.number().positive(),
    metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  });

  const data = schema.parse(req.body);

  // Update visit
  const visit = await prisma.visit.update({
    where: { id },
    data: {
      status: 'ALTA',
      dischargeNotes: data.dischargeNotes,
      dischargedAt: new Date(),
    },
  });

  // Create payment
  await prisma.payment.create({
    data: {
      visitId: id,
      total: data.total,
      metodoPago: data.metodoPago,
    },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: visit.petId },
    data: { estado: 'ALTA' },
  });

  res.json({ status: 'success', data: { visit } });
});

export default router;
