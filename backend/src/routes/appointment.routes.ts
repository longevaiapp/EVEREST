// src/routes/appointment.routes.ts
// Appointment routes - RECEPCION module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isRecepcion } from '../middleware/auth';

const router = Router();

// GET /appointments - List appointments
router.get('/', authenticate, async (req, res) => {
  const { fecha, status } = req.query;

  const where: any = {};
  
  if (fecha) {
    const date = new Date(fecha as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.fecha = { gte: date, lt: nextDay };
  }
  
  if (status) {
    where.status = status;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      pet: { include: { owner: true } },
    },
    orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
  });

  res.json({ status: 'success', data: { appointments } });
});

// POST /appointments - Create appointment
router.post('/', authenticate, isRecepcion, async (req, res) => {
  const schema = z.object({
    petId: z.string().or(z.number()).transform(val => String(val)),
    fecha: z.string(),
    hora: z.string().regex(/^\d{2}:\d{2}$/),
    tipo: z.enum(['CONSULTA_GENERAL', 'SEGUIMIENTO', 'VACUNACION', 'CIRUGIA', 'EMERGENCIA', 'ESTETICA']),
    motivo: z.string().min(1),
    notas: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Check for conflicts - only check non-cancelled appointments
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      fecha: new Date(data.fecha),
      hora: data.hora,
      cancelada: false,
    },
  });

  if (existingAppointment) {
    throw new AppError('Horario no disponible', 409);
  }

  const appointment = await prisma.appointment.create({
    data: {
      petId: data.petId,
      fecha: new Date(data.fecha),
      hora: data.hora,
      tipo: data.tipo,
      motivo: data.motivo,
      notas: data.notas,
      confirmada: false,
      cancelada: false,
      status: 'PENDIENTE',
    },
    include: {
      pet: { include: { owner: true } },
    },
  });

  res.status(201).json({ status: 'success', data: { appointment } });
});

// PUT /appointments/:id - Update appointment
router.put('/:id', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    fecha: z.string().optional(),
    hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    motivo: z.string().optional(),
    notas: z.string().optional(),
    confirmada: z.boolean().optional(),
    cancelada: z.boolean().optional(),
  });

  const data = schema.parse(req.body);
  
  const updateData: any = { ...data };
  if (data.fecha) {
    updateData.fecha = new Date(data.fecha);
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      pet: { include: { owner: true } },
    },
  });

  res.json({ status: 'success', data: { appointment } });
});

// PUT /appointments/:id/confirm - Confirm appointment
router.put('/:id/confirm', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { confirmada: true, status: 'CONFIRMADA' },
  });

  res.json({ status: 'success', data: { appointment } });
});

// PUT /appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { cancelada: true, status: 'CANCELADA' },
  });

  res.json({ status: 'success', data: { appointment } });
});

// PUT /appointments/:id/checkin - Check-in patient (create visit from appointment)
router.put('/:id/checkin', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  // Get the appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { pet: true },
  });

  if (!appointment) {
    throw new AppError('Cita no encontrada', 404);
  }

  if (appointment.cancelada) {
    throw new AppError('No se puede registrar una cita cancelada', 400);
  }

  if (appointment.visitId) {
    throw new AppError('Esta cita ya fue registrada', 400);
  }

  // Create visit
  const visit = await prisma.visit.create({
    data: {
      petId: appointment.petId,
      status: 'RECIEN_LLEGADO',
      tipoVisita: appointment.tipo as any,
      motivo: appointment.motivo,
    },
    include: {
      pet: { include: { owner: true } },
    },
  });

  // Update appointment with visitId and status
  await prisma.appointment.update({
    where: { id },
    data: {
      visitId: visit.id,
      status: 'CONFIRMADA',
      confirmada: true,
    },
  });

  // Update pet status
  await prisma.pet.update({
    where: { id: appointment.petId },
    data: { estado: 'RECIEN_LLEGADO' },
  });

  res.json({ status: 'success', data: { visit, appointment: { ...appointment, visitId: visit.id } } });
});

// PUT /appointments/:id/no-show - Mark as no-show
router.put('/:id/no-show', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'NO_ASISTIO' },
  });

  res.json({ status: 'success', data: { appointment } });
});

// DELETE /appointments/:id
router.delete('/:id', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  await prisma.appointment.delete({ where: { id } });

  res.json({ status: 'success', message: 'Appointment deleted' });
});

export default router;
