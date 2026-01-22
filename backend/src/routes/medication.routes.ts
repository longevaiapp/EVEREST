// src/routes/medication.routes.ts
// Medication routes - FARMACIA module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isFarmacia } from '../middleware/auth';

const router = Router();

// GET /medications - List medications
router.get('/', authenticate, async (req, res) => {
  const { search, category, activo, lowStock } = req.query;

  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { genericName: { contains: search as string } },
    ];
  }
  
  if (category) where.category = category;
  if (activo !== undefined) where.activo = activo === 'true';

  const medications = await prisma.medication.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  // Filter low stock if requested
  let result = medications;
  if (lowStock === 'true') {
    result = medications.filter(m => m.currentStock <= m.minStock);
  }

  res.json({ status: 'success', data: { medications: result } });
});

// GET /medications/low-stock - Get medications with low stock
router.get('/low-stock', authenticate, async (req, res) => {
  const medications = await prisma.medication.findMany({
    where: { activo: true },
    orderBy: { name: 'asc' },
  });

  const lowStock = medications.filter(m => m.currentStock <= m.minStock);

  res.json({ status: 'success', data: { medications: lowStock } });
});

// GET /medications/expiring - Get medications expiring soon
router.get('/expiring', authenticate, async (req, res) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const medications = await prisma.medication.findMany({
    where: {
      expirationDate: { lte: thirtyDaysFromNow },
      activo: true,
    },
    orderBy: { expirationDate: 'asc' },
  });

  res.json({ status: 'success', data: { medications } });
});

// POST /medications - Create medication
router.post('/', authenticate, isFarmacia, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    genericName: z.string().optional(),
    presentation: z.string().min(1),
    concentration: z.string().optional(),
    category: z.enum(['ANTIBIOTICO', 'ANALGESICO', 'ANTIINFLAMATORIO', 'ANTIPARASITARIO', 'VACUNA', 'VITAMINA', 'SUERO', 'ANESTESICO', 'DERMATOLOGICO', 'OFTALMICO', 'CARDIACO', 'HORMONAL', 'OTRO']),
    unit: z.string().min(1),
    requiresRefrigeration: z.boolean().default(false),
    isControlled: z.boolean().default(false),
    currentStock: z.number().int().nonnegative(),
    minStock: z.number().int().nonnegative(),
    maxStock: z.number().int().positive().optional(),
    costPrice: z.number().positive().optional(),
    salePrice: z.number().positive(),
    supplier: z.string().optional(),
    supplierCode: z.string().optional(),
    expirationDate: z.string().datetime().optional(),
    location: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const medication = await prisma.medication.create({
    data: {
      ...data,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
    },
  });

  // Create stock alert if needed
  if (medication.currentStock <= medication.minStock) {
    await prisma.stockAlert.create({
      data: {
        medicationId: medication.id,
        type: 'STOCK_BAJO',
        message: `Stock bajo para ${medication.name}: ${medication.currentStock} unidades`,
        priority: 'MEDIA',
      },
    });
  }

  res.status(201).json({ status: 'success', data: { medication } });
});

// GET /medications/:id - Get medication details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  const medication = await prisma.medication.findUnique({
    where: { id },
    include: {
      stockAlerts: {
        where: { status: 'ACTIVA' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!medication) throw new AppError('Medication not found', 404);

  res.json({ status: 'success', data: { medication } });
});

// PUT /medications/:id - Update medication
router.put('/:id', authenticate, isFarmacia, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    name: z.string().optional(),
    genericName: z.string().optional(),
    presentation: z.string().optional(),
    concentration: z.string().optional(),
    category: z.enum(['ANTIBIOTICO', 'ANALGESICO', 'ANTIINFLAMATORIO', 'ANTIPARASITARIO', 'VACUNA', 'VITAMINA', 'SUERO', 'ANESTESICO', 'DERMATOLOGICO', 'OFTALMICO', 'CARDIACO', 'HORMONAL', 'OTRO']).optional(),
    minStock: z.number().int().nonnegative().optional(),
    maxStock: z.number().int().positive().optional(),
    costPrice: z.number().positive().optional(),
    salePrice: z.number().positive().optional(),
    location: z.string().optional(),
    activo: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  const medication = await prisma.medication.update({
    where: { id },
    data,
  });

  res.json({ status: 'success', data: { medication } });
});

// PUT /medications/:id/adjust-stock - Adjust stock (manual adjustment)
router.put('/:id/adjust-stock', authenticate, isFarmacia, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({
    quantity: z.number().int(), // Positive for addition, negative for subtraction
    reason: z.string().min(1),
    batchNumber: z.string().optional(),
  });

  const { quantity, reason, batchNumber } = schema.parse(req.body);

  const medication = await prisma.medication.findUnique({ where: { id } });
  if (!medication) throw new AppError('Medication not found', 404);

  const newStock = medication.currentStock + quantity;
  if (newStock < 0) throw new AppError('Stock cannot be negative', 400);

  // Update medication
  const updated = await prisma.medication.update({
    where: { id },
    data: { currentStock: newStock },
  });

  // Log the movement
  await prisma.stockMovement.create({
    data: {
      medicationId: id,
      type: quantity > 0 ? 'ENTRADA' : 'SALIDA',
      quantity: Math.abs(quantity),
      previousStock: medication.currentStock,
      newStock,
      reason,
      batchNumber,
      performedById: req.user!.id,
    },
  });

  // Check if stock alert needed
  if (newStock <= updated.minStock) {
    const existingAlert = await prisma.stockAlert.findFirst({
      where: { medicationId: id, status: 'ACTIVA' },
    });

    if (!existingAlert) {
      await prisma.stockAlert.create({
        data: {
          medicationId: id,
          type: 'STOCK_BAJO',
          message: `Stock bajo para ${updated.name}: ${newStock} unidades`,
          priority: 'MEDIA',
        },
      });
    }
  }

  res.json({ status: 'success', data: { medication: updated } });
});

// DELETE /medications/:id - Deactivate medication (soft delete)
router.delete('/:id', authenticate, isFarmacia, async (req, res) => {
  const { id } = req.params;

  await prisma.medication.update({
    where: { id },
    data: { activo: false },
  });

  res.json({ status: 'success', message: 'Medication deactivated' });
});

export default router;
