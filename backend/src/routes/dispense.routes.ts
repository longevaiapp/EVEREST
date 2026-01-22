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
  const { fecha, prescriptionId } = req.query;

  const where: any = {};
  
  if (prescriptionId) where.prescriptionId = prescriptionId;
  
  if (fecha) {
    const date = new Date(fecha as string);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.createdAt = { gte: date, lt: nextDay };
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
    prescriptionItemId: z.string().cuid(),
    cantidadDespachada: z.number().int().positive(),
    lote: z.string().optional(),
    sustitucion: z.object({
      medicationId: z.string().cuid(),
      motivo: z.string(),
    }).optional(),
  });

  const schema = z.object({
    prescriptionId: z.string().cuid(),
    items: z.array(itemSchema).min(1),
    observaciones: z.string().optional(),
    firmaDigital: z.string().optional(), // Base64
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
        farmaceuticoId: req.user!.id,
        farmaceuticoName: req.user!.nombre,
        observaciones: data.observaciones,
        firmaDigital: data.firmaDigital,
      },
    });

    // Process each item
    for (const item of data.items) {
      const prescriptionItem = prescription.items.find(
        (pi) => pi.id === item.prescriptionItemId
      );

      if (!prescriptionItem) {
        throw new AppError(`Prescription item ${item.prescriptionItemId} not found`, 404);
      }

      const medicationId = item.sustitucion?.medicationId || prescriptionItem.medicationId;

      // Verify stock
      const medication = await tx.medication.findUnique({
        where: { id: medicationId },
      });

      if (!medication) {
        throw new AppError(`Medication not found`, 404);
      }

      if (medication.stockActual < item.cantidadDespachada) {
        throw new AppError(`Insufficient stock for ${medication.nombre}`, 400);
      }

      // Create dispense item
      await tx.dispenseItem.create({
        data: {
          dispenseId: dispenseRecord.id,
          prescriptionItemId: item.prescriptionItemId,
          medicationId,
          cantidadDespachada: item.cantidadDespachada,
          lote: item.lote || medication.lote,
          precioUnitario: medication.precioVenta,
          subtotal: medication.precioVenta * item.cantidadDespachada,
          esSustitucion: !!item.sustitucion,
          motivoSustitucion: item.sustitucion?.motivo,
        },
      });

      // Decrease stock
      const newStock = medication.stockActual - item.cantidadDespachada;
      await tx.medication.update({
        where: { id: medicationId },
        data: { stockActual: newStock },
      });

      // Log stock movement
      await tx.stockMovement.create({
        data: {
          medicationId,
          tipo: 'SALIDA',
          cantidad: item.cantidadDespachada,
          stockAnterior: medication.stockActual,
          stockNuevo: newStock,
          motivo: `Despacho receta ${prescription.id}`,
          dispenseId: dispenseRecord.id,
          userId: req.user!.id,
          userName: req.user!.nombre,
        },
      });

      // Check for low stock alert
      if (newStock <= medication.stockMinimo) {
        const existingAlert = await tx.stockAlert.findFirst({
          where: { medicationId, resuelta: false },
        });

        if (!existingAlert) {
          await tx.stockAlert.create({
            data: {
              medicationId,
              tipoAlerta: 'STOCK_BAJO',
              mensaje: `Stock bajo para ${medication.nombre}: ${newStock} unidades`,
              nivelActual: newStock,
              nivelMinimo: medication.stockMinimo,
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
      status: { in: ['PENDIENTE', 'EN_PREPARACION'] },
    },
  });

  if (pendingPrescriptions.length === 0) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: prescription.consultationId },
    });

    if (consultation) {
      await prisma.visit.update({
        where: { id: consultation.visitId },
        data: { status: 'LISTO_PARA_PAGO' },
      });
    }
  }

  res.status(201).json({ status: 'success', data: { dispense: completeDispense } });
});

// GET /dispenses/:id - Get dispense details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const dispense = await prisma.dispense.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: true },
      },
      prescription: {
        include: {
          items: { include: { medication: true } },
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
  const { prescriptionId } = req.params;

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
