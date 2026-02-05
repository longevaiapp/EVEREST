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
      pet: { include: { owner: true } },
    },
  });

  // Notify pharmacy staff about new prescription
  const pharmacyUsers = await prisma.user.findMany({
    where: { rol: 'FARMACIA', activo: true },
  });

  const petName = prescription.pet?.nombre || 'Paciente';
  const ownerName = prescription.pet?.owner?.nombre || 'Propietario';
  const itemCount = prescription.items.length;

  for (const pharmacist of pharmacyUsers) {
    await prisma.notification.create({
      data: {
        userId: pharmacist.id,
        tipo: 'RECETA_PENDIENTE',
        titulo: 'Nueva Receta Pendiente',
        mensaje: `${petName} (propietario: ${ownerName}) tiene una nueva receta con ${itemCount} medicamento(s).`,
        data: {
          prescriptionId: prescription.id,
          petId: data.petId,
          petName,
          ownerName,
          itemCount,
        },
      },
    });
  }

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

// PUT /prescriptions/:id/reject - Reject prescription (from pharmacy)
router.put('/:id/reject', authenticate, async (req, res) => {
  const id = req.params.id as string;
  
  const schema = z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
    notes: z.string().optional(),
  });

  const { reason, notes } = schema.parse(req.body);

  // Find the prescription
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      consultation: {
        include: {
          doctor: { select: { id: true, nombre: true } },
          visit: {
            include: {
              pet: { select: { nombre: true } },
            },
          },
        },
      },
    },
  });

  if (!prescription) throw new AppError('Prescription not found', 404);

  // Update prescription status
  const updatedPrescription = await prisma.prescription.update({
    where: { id },
    data: { 
      status: 'CANCELADA',
      generalInstructions: prescription.generalInstructions 
        ? `${prescription.generalInstructions}\n\n[REJECTED BY PHARMACY: ${reason}]${notes ? ` - ${notes}` : ''}`
        : `[REJECTED BY PHARMACY: ${reason}]${notes ? ` - ${notes}` : ''}`,
    },
    include: {
      items: true,
    },
  });

  // Create notification for the prescribing doctor
  if (prescription.consultation?.doctor?.id) {
    await prisma.notification.create({
      data: {
        userId: prescription.consultation.doctor.id,
        tipo: 'RECETA_PENDIENTE',
        titulo: 'Receta Rechazada',
        mensaje: `La receta para ${prescription.consultation.visit?.pet?.nombre || 'paciente'} fue rechazada por farmacia: ${reason}`,
        data: {
          prescriptionId: id,
          reason,
          notes,
        },
      },
    });
  }

  res.json({ status: 'success', data: { prescription: updatedPrescription } });
});

export default router;
