// src/routes/labRequest.routes.ts
// Laboratory Request routes - MEDICO/LABORATORIO modules

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico, isLaboratorio } from '../middleware/auth';

const router = Router();

// GET /lab-requests - List lab requests
router.get('/', authenticate, async (req, res) => {
  const { status, urgency, consultationId } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (consultationId) where.consultationId = consultationId;

  const labRequests = await prisma.labRequest.findMany({
    where,
    include: {
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
      pet: { include: { owner: true } },
    },
    orderBy: [
      { urgency: 'asc' }, // URGENTE first
      { createdAt: 'asc' },
    ],
  });

  res.json({ status: 'success', data: { labRequests } });
});

// GET /lab-requests/pending - Get pending requests for lab
router.get('/pending', authenticate, isLaboratorio, async (req, res) => {
  const labRequests = await prisma.labRequest.findMany({
    where: {
      status: { in: ['PENDIENTE', 'EN_PROCESO'] },
    },
    include: {
      pet: { include: { owner: true } },
      consultation: true,
    },
    orderBy: [
      { urgency: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  res.json({ status: 'success', data: { labRequests } });
});

// POST /lab-requests - Create lab request (from consultation)
router.post('/', authenticate, isMedico, async (req, res) => {
  const schema = z.object({
    consultationId: z.string().cuid(),
    petId: z.string().cuid(),
    type: z.enum(['HEMOGRAMA', 'QUIMICA_SANGUINEA', 'URINALISIS', 'RAYOS_X', 'ULTRASONIDO', 'ELECTROCARDIOGRAMA', 'CITOLOGIA', 'BIOPSIA', 'COPROLOGIA', 'PERFIL_TIROIDEO']),
    urgency: z.enum(['NORMAL', 'URGENTE']).default('NORMAL'),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const labRequest = await prisma.labRequest.create({
    data: {
      ...data,
      requestedById: req.user!.id,
      status: 'PENDIENTE',
    },
  });

  res.status(201).json({ status: 'success', data: { labRequest } });
});

// PUT /lab-requests/:id/start - Start processing
router.put('/:id/start', authenticate, isLaboratorio, async (req, res) => {
  const { id } = req.params;

  const labRequest = await prisma.labRequest.update({
    where: { id },
    data: {
      status: 'EN_PROCESO',
    },
  });

  res.json({ status: 'success', data: { labRequest } });
});

// PUT /lab-requests/:id/results - Add results
router.put('/:id/results', authenticate, isLaboratorio, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    results: z.string().min(1),
    resultFiles: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  const labRequest = await prisma.labRequest.update({
    where: { id },
    data: {
      results: data.results,
      resultFiles: data.resultFiles,
      status: 'COMPLETADO',
      completedAt: new Date(),
      completedById: req.user!.id,
    },
  });

  // Create notification for requesting vet
  const request = await prisma.labRequest.findUnique({
    where: { id },
    include: { consultation: true },
  });

  if (request?.consultation) {
    await prisma.notification.create({
      data: {
        userId: request.consultation.doctorId,
        tipo: 'RESULTADOS_LISTOS',
        titulo: 'Resultados de laboratorio listos',
        mensaje: `Los resultados del examen ${request.type} están disponibles`,
        data: { labRequestId: id, consultationId: request.consultationId },
      },
    });
  }

  res.json({ status: 'success', data: { labRequest } });
});

// GET /lab-requests/:id - Get lab request details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const labRequest = await prisma.labRequest.findUnique({
    where: { id },
    include: {
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
      pet: { include: { owner: true } },
    },
  });

  if (!labRequest) throw new AppError('Lab request not found', 404);

  res.json({ status: 'success', data: { labRequest } });
});

export default router;
