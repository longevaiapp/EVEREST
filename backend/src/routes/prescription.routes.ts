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
  const { consultationId, status, vetId } = req.query;

  const where: any = {};
  if (consultationId) where.consultationId = consultationId;
  if (status) where.status = status;
  if (vetId) where.vetId = vetId;

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      items: {
        include: { medication: true },
      },
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
      status: { in: ['PENDIENTE', 'EN_PREPARACION'] },
    },
    include: {
      items: {
        include: { medication: true },
      },
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
    medicationId: z.string().cuid(),
    cantidad: z.number().int().positive(),
    dosis: z.string().min(1),
    frecuencia: z.string().min(1),
    duracion: z.string().min(1),
    viaAdministracion: z.enum(['ORAL', 'TOPICA', 'INYECTABLE_SC', 'INYECTABLE_IM', 'INYECTABLE_IV', 'OFTALMICA', 'OTICA', 'INHALATORIA']),
    instrucciones: z.string().optional(),
  });

  const schema = z.object({
    consultationId: z.string().cuid(),
    tipo: z.enum(['NORMAL', 'CONTROLADA']).default('NORMAL'),
    items: z.array(itemSchema).min(1),
    indicacionesGenerales: z.string().optional(),
    alertasEspeciales: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify consultation exists
  const consultation = await prisma.consultation.findUnique({
    where: { id: data.consultationId },
  });
  if (!consultation) throw new AppError('Consultation not found', 404);

  // Verify all medications exist and have stock
  for (const item of data.items) {
    const medication = await prisma.medication.findUnique({
      where: { id: item.medicationId },
    });
    if (!medication) {
      throw new AppError(`Medication ${item.medicationId} not found`, 404);
    }
    if (medication.stockActual < item.cantidad) {
      throw new AppError(`Insufficient stock for ${medication.nombre}`, 400);
    }
  }

  // Create prescription with items
  const prescription = await prisma.prescription.create({
    data: {
      consultationId: data.consultationId,
      vetId: req.user!.id,
      vetName: req.user!.nombre,
      tipo: data.tipo,
      indicacionesGenerales: data.indicacionesGenerales,
      alertasEspeciales: data.alertasEspeciales,
      status: 'PENDIENTE',
      items: {
        create: data.items.map((item) => ({
          medicationId: item.medicationId,
          cantidad: item.cantidad,
          dosis: item.dosis,
          frecuencia: item.frecuencia,
          duracion: item.duracion,
          viaAdministracion: item.viaAdministracion,
          instrucciones: item.instrucciones,
        })),
      },
    },
    include: {
      items: {
        include: { medication: true },
      },
    },
  });

  res.status(201).json({ status: 'success', data: { prescription } });
});

// GET /prescriptions/:id - Get prescription details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: true },
      },
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
  const { id } = req.params;

  const prescription = await prisma.prescription.update({
    where: { id },
    data: { status: 'CANCELADA' },
  });

  res.json({ status: 'success', data: { prescription } });
});

export default router;
