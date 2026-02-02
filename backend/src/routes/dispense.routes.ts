// src/routes/dispense.routes.ts
// Dispense routes - FARMACIA module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isFarmacia } from '../middleware/auth';

const router = Router();

// GET /dispenses - List dispenses
router.get('/', authenticate, async (req, res) => {
  const { fecha, date, startDate, endDate, prescriptionId } = req.query;

  const where: any = {};
  
  if (prescriptionId) where.prescriptionId = prescriptionId as string;
  
  // Support both 'fecha' and 'date' parameters for single date filter
  const singleDate = fecha || date;
  if (singleDate) {
    // Parse date as UTC to avoid timezone issues
    const dateStr = singleDate as string;
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  } else if (startDate && endDate) {
    // Date range filter - parse as UTC
    const start = new Date(`${startDate as string}T00:00:00.000Z`);
    const end = new Date(`${endDate as string}T23:59:59.999Z`);
    where.createdAt = { gte: start, lte: end };
  }

  const dispenses = await prisma.dispense.findMany({
    where,
    include: {
      prescription: {
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
        },
      },
      items: {
        include: { medication: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { dispenses } });
});

// POST /dispenses - Create dispense (fulfill prescription)
router.post('/', authenticate, isFarmacia, async (req, res) => {
  const itemSchema = z.object({
    medicationId: z.string().cuid(),
    medicationName: z.string(),
    requestedQty: z.number().int().positive(),
    dispensedQty: z.number().int().nonnegative(),
    reason: z.string().optional(),
    unitPrice: z.number().positive(),
  });

  const schema = z.object({
    prescriptionId: z.string().cuid(),
    petId: z.string().cuid(),
    items: z.array(itemSchema).min(1),
    notes: z.string().optional(),
    deliveredTo: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Verify prescription exists and is pending
  const prescription = await prisma.prescription.findUnique({
    where: { id: data.prescriptionId },
    include: { items: true },
  });

  if (!prescription) throw new AppError('Prescription not found', 404);
  if (prescription.status === 'DESPACHADA') {
    throw new AppError('Prescription already dispensed', 400);
  }

  // Start transaction
  const dispense = await prisma.$transaction(async (tx) => {
    // Create dispense record
    const dispenseRecord = await tx.dispense.create({
      data: {
        prescriptionId: data.prescriptionId,
        petId: data.petId,
        dispensedById: req.user!.userId,
        notes: data.notes,
        deliveredTo: data.deliveredTo,
        status: 'COMPLETO',
      },
    });

    // Process each item
    for (const item of data.items) {
      // Verify stock
      const medication = await tx.medication.findUnique({
        where: { id: item.medicationId },
      });

      if (!medication) {
        throw new AppError(`Medication not found`, 404);
      }

      if (medication.currentStock < item.dispensedQty) {
        throw new AppError(`Insufficient stock for ${medication.name}`, 400);
      }

      const subtotal = item.unitPrice * item.dispensedQty;

      // Create dispense item
      await tx.dispenseItem.create({
        data: {
          dispenseId: dispenseRecord.id,
          medicationId: item.medicationId,
          medicationName: item.medicationName,
          requestedQty: item.requestedQty,
          dispensedQty: item.dispensedQty,
          reason: item.reason,
          unitPrice: item.unitPrice,
          subtotal: subtotal,
        },
      });

      // Decrease stock
      const newStock = medication.currentStock - item.dispensedQty;
      await tx.medication.update({
        where: { id: item.medicationId },
        data: { currentStock: newStock },
      });

      // Log stock movement
      await tx.stockMovement.create({
        data: {
          medicationId: item.medicationId,
          type: 'SALIDA',
          quantity: item.dispensedQty,
          previousStock: medication.currentStock,
          newStock: newStock,
          reason: `Dispense for prescription ${prescription.id}`,
          performedById: req.user!.userId,
        },
      });

      // Check for low stock alert
      if (newStock <= medication.minStock) {
        const existingAlert = await tx.stockAlert.findFirst({
          where: { medicationId: item.medicationId, status: 'ACTIVA' },
        });

        if (!existingAlert) {
          await tx.stockAlert.create({
            data: {
              medicationId: item.medicationId,
              type: 'STOCK_BAJO',
              message: `Low stock for ${medication.name}: ${newStock} units`,
              priority: 'MEDIA',
            },
          });
        }
      }
    }

    // Update prescription status
    await tx.prescription.update({
      where: { id: data.prescriptionId },
      data: { status: 'DESPACHADA' },
    });

    return dispenseRecord;
  });

  // Fetch complete dispense with relations
  const completeDispense = await prisma.dispense.findUnique({
    where: { id: dispense.id },
    include: {
      items: {
        include: { medication: true },
      },
      prescription: {
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
        },
      },
    },
  });

  // Update visit status if all prescriptions are dispensed
  const pendingPrescriptions = await prisma.prescription.findMany({
    where: {
      consultationId: prescription.consultationId,
      status: { in: ['PENDIENTE', 'PARCIAL'] },
    },
  });

  if (pendingPrescriptions.length === 0) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: prescription.consultationId },
      include: {
        visit: {
          include: {
            pet: {
              include: { owner: true },
            },
          },
        },
      },
    });

    if (consultation) {
      await prisma.visit.update({
        where: { id: consultation.visitId },
        data: { status: 'LISTO_PARA_ALTA' },
      });

      // Notify reception staff that patient is ready for checkout
      const receptionUsers = await prisma.user.findMany({
        where: { rol: 'RECEPCION', activo: true },
      });

      const petName = consultation.visit?.pet?.nombre || 'Paciente';
      const ownerName = consultation.visit?.pet?.owner?.nombre || 'Propietario';

      for (const receptionist of receptionUsers) {
        await prisma.notification.create({
          data: {
            userId: receptionist.id,
            tipo: 'MEDICAMENTOS_LISTOS',
            titulo: 'Paciente Listo para Alta',
            mensaje: `${petName} (propietario: ${ownerName}) ha recibido todos sus medicamentos y está listo para el alta.`,
            data: {
              visitId: consultation.visitId,
              petName,
              ownerName,
            },
          },
        });
      }
    }
  }

  res.status(201).json({ status: 'success', data: { dispense: completeDispense } });
});

// GET /dispenses/:id - Get dispense details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const dispense = await prisma.dispense.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: true },
      },
      prescription: {
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
      },
    },
  });

  if (!dispense) throw new AppError('Dispense not found', 404);

  res.json({ status: 'success', data: { dispense } });
});

// GET /dispenses/prescription/:prescriptionId - Get dispense by prescription
router.get('/prescription/:prescriptionId', authenticate, async (req, res) => {
  const prescriptionId = req.params.prescriptionId as string;

  const dispense = await prisma.dispense.findFirst({
    where: { prescriptionId },
    include: {
      items: {
        include: { medication: true },
      },
    },
  });

  res.json({ status: 'success', data: { dispense } });
});

export default router;
