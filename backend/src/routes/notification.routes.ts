// src/routes/notification.routes.ts
// Notification routes - All modules

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /notifications - Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  const { leida, tipo, limit } = req.query;

  const where: any = { userId: req.user!.id };
  
  if (leida !== undefined) where.leida = leida === 'true';
  if (tipo) where.tipo = tipo;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit ? parseInt(limit as string) : 50,
  });

  res.json({ status: 'success', data: { notifications } });
});

// GET /notifications/unread-count - Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  const count = await prisma.notification.count({
    where: {
      userId: req.user!.id,
      leida: false,
    },
  });

  res.json({ status: 'success', data: { count } });
});

// POST /notifications - Create notification (internal use)
router.post('/', authenticate, async (req, res) => {
  const schema = z.object({
    userId: z.string().cuid(),
    tipo: z.enum(['NUEVO_PACIENTE', 'TRIAGE_COMPLETADO', 'ESTUDIOS_SOLICITADOS', 'RESULTADOS_LISTOS', 'RECETA_PENDIENTE', 'MEDICAMENTOS_LISTOS', 'CIRUGIA_PROGRAMADA', 'ALTA_PENDIENTE', 'STOCK_BAJO', 'GENERAL']),
    titulo: z.string().min(1),
    mensaje: z.string().min(1),
    data: z.record(z.any()).optional(),
  });

  const notifData = schema.parse(req.body);

  const notification = await prisma.notification.create({
    data: notifData,
  });

  res.status(201).json({ status: 'success', data: { notification } });
});

// PUT /notifications/:id/read - Mark as read
router.put('/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;

  const notification = await prisma.notification.update({
    where: { id },
    data: { leida: true },
  });

  res.json({ status: 'success', data: { notification } });
});

// PUT /notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', authenticate, async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user!.id,
      leida: false,
    },
    data: { leida: true },
  });

  res.json({ status: 'success', message: 'All notifications marked as read' });
});

// DELETE /notifications/:id - Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  await prisma.notification.delete({ where: { id } });

  res.json({ status: 'success', message: 'Notification deleted' });
});

// DELETE /notifications/clear - Clear all notifications
router.delete('/clear', authenticate, async (req, res) => {
  await prisma.notification.deleteMany({
    where: { userId: req.user!.id },
  });

  res.json({ status: 'success', message: 'All notifications cleared' });
});

export default router;
