// src/routes/task.routes.ts
// Task routes - All modules (simple task management)

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /tasks - Get tasks for current user
router.get('/', authenticate, async (req, res) => {
  const { status, priority, tipo } = req.query;

  const where: any = { assigneeId: req.user!.userId };
  
  if (status) where.estado = status;
  if (priority) where.prioridad = priority;
  if (tipo) where.tipo = tipo;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { prioridad: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.json({ status: 'success', data: { tasks } });
});

// GET /tasks/pending - Get pending tasks
router.get('/pending', authenticate, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: req.user!.userId,
      estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
    },
    orderBy: [
      { prioridad: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  res.json({ status: 'success', data: { tasks } });
});

// POST /tasks - Create task
router.post('/', authenticate, async (req, res) => {
  const schema = z.object({
    titulo: z.string().min(1),
    descripcion: z.string().optional(),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).default('MEDIA'),
    tipo: z.enum(['TRIAGE', 'CONSULTA', 'LABORATORIO', 'FARMACIA', 'CIRUGIA', 'ALTA', 'GENERAL']),
    assigneeId: z.string().cuid().optional(), // Can assign to another user
    petId: z.string().cuid().optional(),
    visitId: z.string().cuid().optional(),
  });

  const data = schema.parse(req.body);

  const task = await prisma.task.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion,
      prioridad: data.prioridad,
      tipo: data.tipo,
      assigneeId: data.assigneeId || req.user!.userId,
      createdById: req.user!.userId,
      petId: data.petId,
      visitId: data.visitId,
      estado: 'PENDIENTE',
    },
  });

  res.status(201).json({ status: 'success', data: { task } });
});

// PUT /tasks/:id - Update task
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    titulo: z.string().optional(),
    descripcion: z.string().optional(),
    prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
    estado: z.enum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA']).optional(),
  });

  const data = schema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data,
  });

  res.json({ status: 'success', data: { task } });
});

// PUT /tasks/:id/complete - Mark task as complete
router.put('/:id/complete', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const task = await prisma.task.update({
    where: { id },
    data: {
      estado: 'COMPLETADA',
      completedAt: new Date(),
    },
  });

  res.json({ status: 'success', data: { task } });
});

// DELETE /tasks/:id - Delete task
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  await prisma.task.delete({ where: { id } });

  res.json({ status: 'success', message: 'Task deleted' });
});

export default router;
