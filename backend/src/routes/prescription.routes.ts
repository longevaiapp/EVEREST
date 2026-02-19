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

// GET /prescriptions/external/:consultationId - Get external prescriptions for PDF generation
router.get('/external/:consultationId', authenticate, async (req, res) => {
  const consultationId = req.params.consultationId as string;

  // Get prescriptions with all items (filter external in code after Prisma regenerate)
  const prescriptions = await prisma.prescription.findMany({
    where: {
      consultationId,
    },
    include: {
      items: true,
      prescribedBy: {
        select: {
          id: true,
          nombre: true, // User.nombre
        },
      },
      consultation: {
        include: {
          visit: {
            include: {
              pet: {
                include: {
                  owner: {
                    select: {
                      id: true,
                      nombre: true,    // Owner.nombre
                      telefono: true,  // Owner.telefono
                      direccion: true, // Owner.direccion
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter to only include prescriptions with RECETA_EXTERNA items
  // After Prisma client regenerates, items will have 'type' field
  const filteredPrescriptions = prescriptions.map(p => ({
    ...p,
    items: p.items.filter((item: any) => item.type === 'RECETA_EXTERNA'),
  })).filter(p => p.items.length > 0);

  // Get business info for PDF header/footer
  const businessInfo = await prisma.businessInfo.findFirst();

  res.json({
    status: 'success',
    data: {
      prescriptions: filteredPrescriptions,
      businessInfo,
    },
  });
});

// GET /prescriptions/pending - Get pending for pharmacy (only internal use items)
router.get('/pending', authenticate, async (req, res) => {
  // Get all pending/partial prescriptions
  const prescriptions = await prisma.prescription.findMany({
    where: {
      status: { in: ['PENDIENTE', 'PARCIAL'] },
    },
    include: {
      items: true, // Get all items with type field
      consultation: {
        include: {
          visit: {
            include: {
              pet: { include: { owner: true } },
            },
          },
        },
      },
      prescribedBy: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Return all items with their type - frontend will handle display logic
  // Items without type are treated as USO_INMEDIATO for backward compatibility
  const prescriptionsWithTypes = prescriptions.map(p => ({
    ...p,
    items: p.items.map((item: any) => ({
      ...item,
      type: item.type || 'USO_INMEDIATO',
    })),
    // Count by type for quick reference
    internalCount: p.items.filter((item: any) => !item.type || item.type === 'USO_INMEDIATO').length,
    externalCount: p.items.filter((item: any) => item.type === 'RECETA_EXTERNA').length,
  }));

  res.json({ status: 'success', data: { prescriptions: prescriptionsWithTypes } });
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
    type: z.enum(['USO_INMEDIATO', 'RECETA_EXTERNA']).default('USO_INMEDIATO'),
    medicationId: z.string().cuid().optional(),
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

  // Get unit prices for medications if medicationId is provided
  const itemsWithPrices = await Promise.all(
    data.items.map(async (item) => {
      let unitPrice = null;
      if (item.medicationId) {
        const medication = await prisma.medication.findUnique({
          where: { id: item.medicationId },
          select: { salePrice: true },
        });
        unitPrice = medication?.salePrice || null;
      }
      return { ...item, unitPrice };
    })
  );

  // Create prescription with items
  const prescription = await prisma.prescription.create({
    data: {
      consultationId: data.consultationId,
      petId: data.petId,
      prescribedById: req.user!.userId,
      generalInstructions: data.generalInstructions,
      status: 'PENDIENTE',
      items: {
        create: itemsWithPrices.map((item) => ({
          name: item.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
          type: item.type as any,
          medicationId: item.medicationId || null,
          unitPrice: item.unitPrice,
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
