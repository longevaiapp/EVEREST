// src/routes/medication.routes.ts
// Medication routes - FARMACIA module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isFarmacia } from '../middleware/auth';

const router = Router();

// Category mapping from frontend values to Prisma enum
const CATEGORY_MAP: Record<string, string> = {
  'antibioticos': 'ANTIBIOTICO',
  'antiinflamatorios': 'ANTIINFLAMATORIO',
  'analgesicos': 'ANALGESICO',
  'vacunas': 'VACUNA',
  'corticosteroides': 'HORMONAL',
  'protectores': 'OTRO',
  'antiparasitarios': 'ANTIPARASITARIO',
  'dermatologicos': 'DERMATOLOGICO',
  'vitaminas': 'VITAMINA',
  'otros': 'OTRO',
  // Also support uppercase direct values
  'ANTIBIOTICO': 'ANTIBIOTICO',
  'ANTIINFLAMATORIO': 'ANTIINFLAMATORIO',
  'ANALGESICO': 'ANALGESICO',
  'VACUNA': 'VACUNA',
  'ANTIPARASITARIO': 'ANTIPARASITARIO',
  'VITAMINA': 'VITAMINA',
  'SUERO': 'SUERO',
  'ANESTESICO': 'ANESTESICO',
  'DERMATOLOGICO': 'DERMATOLOGICO',
  'OFTALMICO': 'OFTALMICO',
  'CARDIACO': 'CARDIACO',
  'HORMONAL': 'HORMONAL',
  'OTRO': 'OTRO',
};

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
  
  // Map category to Prisma enum value
  if (category) {
    const mappedCategory = CATEGORY_MAP[category as string];
    if (mappedCategory) {
      where.category = mappedCategory;
    }
    // If category not found in map, don't filter by invalid category
  }
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

// GET /medications/alerts - Get all stock alerts
router.get('/alerts', authenticate, async (req, res) => {
  const { status, priority } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const alerts = await prisma.stockAlert.findMany({
    where,
    include: {
      medication: {
        select: {
          id: true,
          name: true,
          genericName: true,
          presentation: true,
          currentStock: true,
          minStock: true,
          expirationDate: true,
          category: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  res.json({ status: 'success', data: { alerts } });
});

// PUT /medications/alerts/:id/resolve - Resolve a stock alert
router.put('/alerts/:id/resolve', authenticate, isFarmacia, async (req, res) => {
  const id = req.params.id as string;
  
  const schema = z.object({
    status: z.enum(['RESUELTA', 'IGNORADA']),
    resolutionNotes: z.string().optional(),
  });

  const { status: newStatus, resolutionNotes } = schema.parse(req.body);

  const alert = await prisma.stockAlert.findUnique({ where: { id } });
  if (!alert) throw new AppError('Alert not found', 404);

  const updatedAlert = await prisma.stockAlert.update({
    where: { id },
    data: {
      status: newStatus,
      resolutionNotes,
      resolvedAt: new Date(),
      resolvedById: req.user!.userId,
    },
    include: {
      medication: {
        select: {
          id: true,
          name: true,
          currentStock: true,
          minStock: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  res.json({ status: 'success', data: { alert: updatedAlert } });
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
    imageUrl: z.string().nullable().optional(),
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
  const id = req.params.id as string;

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
  const id = req.params.id as string;
  const schema = z.object({
    name: z.string().optional(),
    genericName: z.string().optional(),
    presentation: z.string().optional(),
    concentration: z.string().optional(),
    category: z.enum(['ANTIBIOTICO', 'ANALGESICO', 'ANTIINFLAMATORIO', 'ANTIPARASITARIO', 'VACUNA', 'VITAMINA', 'SUERO', 'ANESTESICO', 'DERMATOLOGICO', 'OFTALMICO', 'CARDIACO', 'HORMONAL', 'OTRO']).optional(),
    minStock: z.union([z.number(), z.string().transform(v => parseInt(v))]).optional(),
    maxStock: z.union([z.number(), z.string().transform(v => parseInt(v))]).optional(),
    costPrice: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
    salePrice: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
    location: z.string().optional(),
    activo: z.boolean().optional(),
    imageUrl: z.string().nullable().optional(),
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
  const id = req.params.id as string;
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
      performedById: req.user!.userId,
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
  const id = req.params.id as string;

  await prisma.medication.update({
    where: { id },
    data: { activo: false },
  });

  res.json({ status: 'success', message: 'Medication deactivated' });
});

// POST /medications/check-expiring - Check and create alerts for expiring medications
router.post('/check-expiring', authenticate, isFarmacia, async (req, res) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Find medications expiring in next 30 days
  const expiringMedications = await prisma.medication.findMany({
    where: {
      expirationDate: {
        gte: today,
        lte: thirtyDaysFromNow,
      },
      activo: true,
    },
  });

  // Find already expired medications
  const expiredMedications = await prisma.medication.findMany({
    where: {
      expirationDate: { lt: today },
      activo: true,
    },
  });

  const alertsCreated: string[] = [];

  // Create POR_VENCER alerts
  for (const med of expiringMedications) {
    const existingAlert = await prisma.stockAlert.findFirst({
      where: {
        medicationId: med.id,
        type: 'POR_VENCER',
        status: 'ACTIVA',
      },
    });

    if (!existingAlert) {
      const daysUntilExpiry = Math.ceil(
        (med.expirationDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      await prisma.stockAlert.create({
        data: {
          medicationId: med.id,
          type: 'POR_VENCER',
          message: `${med.name} vence en ${daysUntilExpiry} días (${med.expirationDate!.toISOString().split('T')[0]})`,
          priority: daysUntilExpiry <= 7 ? 'ALTA' : 'MEDIA',
        },
      });
      alertsCreated.push(`POR_VENCER: ${med.name}`);
    }
  }

  // Create VENCIDO alerts
  for (const med of expiredMedications) {
    const existingAlert = await prisma.stockAlert.findFirst({
      where: {
        medicationId: med.id,
        type: 'VENCIDO',
        status: 'ACTIVA',
      },
    });

    if (!existingAlert) {
      await prisma.stockAlert.create({
        data: {
          medicationId: med.id,
          type: 'VENCIDO',
          message: `${med.name} ha expirado el ${med.expirationDate!.toISOString().split('T')[0]}. Requiere retiro del inventario.`,
          priority: 'ALTA',
        },
      });
      alertsCreated.push(`VENCIDO: ${med.name}`);
    }
  }

  res.json({
    status: 'success',
    data: {
      expiringCount: expiringMedications.length,
      expiredCount: expiredMedications.length,
      alertsCreated,
    },
  });
});

// PUT /medications/:id/mark-expired - Mark medication units as expired
router.put('/:id/mark-expired', authenticate, isFarmacia, async (req, res) => {
  const id = req.params.id as string;
  const schema = z.object({
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
    batchNumber: z.string().optional(),
  });

  const { quantity, notes, batchNumber } = schema.parse(req.body);

  const medication = await prisma.medication.findUnique({ where: { id } });
  if (!medication) throw new AppError('Medication not found', 404);

  if (quantity > medication.currentStock) {
    throw new AppError('Cannot mark more units as expired than available in stock', 400);
  }

  const newStock = medication.currentStock - quantity;

  // Transaction: update stock, create movement, create alert
  await prisma.$transaction(async (tx) => {
    // Update medication stock
    await tx.medication.update({
      where: { id },
      data: { currentStock: newStock },
    });

    // Create stock movement
    await tx.stockMovement.create({
      data: {
        medicationId: id,
        type: 'VENCIDO',
        quantity,
        previousStock: medication.currentStock,
        newStock,
        reason: notes || `Marcado como vencido: ${quantity} unidades`,
        batchNumber,
        performedById: req.user!.userId,
      },
    });

    // Create VENCIDO alert
    await tx.stockAlert.create({
      data: {
        medicationId: id,
        type: 'VENCIDO',
        message: `Se retiraron ${quantity} unidades de ${medication.name} por vencimiento`,
        priority: 'ALTA',
      },
    });

    // Check for low stock alert
    if (newStock <= medication.minStock) {
      const existingLowAlert = await tx.stockAlert.findFirst({
        where: { medicationId: id, type: 'STOCK_BAJO', status: 'ACTIVA' },
      });

      if (!existingLowAlert) {
        await tx.stockAlert.create({
          data: {
            medicationId: id,
            type: newStock === 0 ? 'AGOTADO' : 'STOCK_BAJO',
            message: newStock === 0
              ? `${medication.name} se ha agotado`
              : `Stock bajo para ${medication.name}: ${newStock} unidades`,
            priority: newStock === 0 ? 'ALTA' : 'MEDIA',
          },
        });
      }
    }
  });

  const updatedMedication = await prisma.medication.findUnique({
    where: { id },
    include: {
      stockAlerts: {
        where: { status: 'ACTIVA' },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  res.json({ status: 'success', data: { medication: updatedMedication } });
});

// GET /medications/:id/movements - Get stock movements for a medication
router.get('/:id/movements', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const { startDate, endDate, type } = req.query;

  // Verify medication exists
  const medication = await prisma.medication.findUnique({ where: { id } });
  if (!medication) throw new AppError('Medication not found', 404);

  const where: any = { medicationId: id };

  // Date filters
  if (startDate || endDate) {
    where.performedAt = {};
    if (startDate) {
      where.performedAt.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.performedAt.lte = end;
    }
  }

  // Type filter
  if (type) {
    where.type = type;
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    include: {
      performedBy: {
        select: {
          id: true,
          nombre: true,
          rol: true,
        },
      },
    },
    orderBy: { performedAt: 'desc' },
  });

  res.json({ 
    status: 'success', 
    data: { 
      movements,
      medication: {
        id: medication.id,
        name: medication.name,
        currentStock: medication.currentStock,
      }
    } 
  });
});

export default router;
