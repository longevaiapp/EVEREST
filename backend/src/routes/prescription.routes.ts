// src/routes/prescription.routes.ts
// Prescription routes - MEDICO module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// GET /prescriptions - List prescriptions
router.get('/', authenticate, async (req, res) => {
  const { consultationId, status, prescribedById } = req.query;

  const where: any = {};
  if (consultationId) where.consultationId = consultationId;
  if (status) where.status = status;
  if (prescribedById) where.prescribedById = prescribedById;

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      items: true,
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { prescriptions } });
});

// GET /prescriptions/pending - Get pending for pharmacy
router.get('/pending', authenticate, async (req, res) => {
  const prescriptions = await prisma.prescription.findMany({
    where: {
      status: { in: ['PENDIENTE', 'PARCIAL'] },
    },
    include: {
      items: true,
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ status: 'success', data: { prescriptions } });
});

// POST /prescriptions - Create prescription
router.post('/', authenticate, isMedico, async (req, res) => {
  const itemSchema = z.object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    quantity: z.number().int().positive(),
    instructions: z.string().optional(),
  });

  const schema = z.object({
    consultationId: z.string().cuid(),
    petId: z.string().cuid(),
    items: z.array(itemSchema).min(1),
    generalInstructions: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consultation not found', 404);

  // Create prescription with items
  const prescription = await prisma.prescription.create({
    data: {
      consultationId: data.consultationId,
      petId: data.petId,
      prescribedById: req.user!.userId,
      generalInstructions: data.generalInstructions,
      status: 'PENDIENTE',
      items: {
        create: data.items.map((item) => ({
          name: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  res.status(201).json({ status: 'success', data: { prescription } });
});

// GET /prescriptions/:id - Get prescription details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      items: true,
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
    },
  });

  if (!prescription) throw new AppError('Prescription not found', 404);

  res.json({ status: 'success', data: { prescription } });
});

// PUT /prescriptions/:id/cancel - Cancel prescription
router.put('/:id/cancel', authenticate, isMedico, async (req, res) => {
  const id = req.params.id as string;

  const prescription = await prisma.prescription.update({
    where: { id },
    data: { status: 'CANCELADA' },
  });

  res.json({ status: 'success', data: { prescription } });
});

export default router;
