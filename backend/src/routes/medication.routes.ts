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

// ============================================================================
// DOSIFICACIÓN - Fichas de dosificación por medicamento y especie
// ============================================================================

// GET /medications/:id/dosing - Get dosing info for a medication
router.get('/:id/dosing', authenticate, async (req, res) => {
  const dosings = await prisma.medicationDosing.findMany({
    where: { medicationId: req.params.id as string },
    orderBy: { species: 'asc' },
  });
  res.json({ status: 'success', data: dosings });
});

// GET /medications/:id/dosing/:species - Get dosing for specific species
router.get('/:id/dosing/:species', authenticate, async (req, res) => {
  const species = (req.params.species as string).toUpperCase();
  const dosing = await prisma.medicationDosing.findUnique({
    where: {
      medicationId_species: {
        medicationId: req.params.id as string,
        species: species as any,
      },
    },
  });
  if (!dosing) {
    res.json({ status: 'success', data: null });
    return;
  }
  res.json({ status: 'success', data: dosing });
});

// POST /medications/:id/dosing - Create/update dosing for a species
router.post('/:id/dosing', authenticate, async (req, res) => {
  const schema = z.object({
    species: z.string(),
    doseMin: z.number().positive(),
    doseMax: z.number().positive(),
    doseUnit: z.string().default('mg/kg'),
    routes: z.string(), // JSON array string
    frequencyHours: z.number().int().positive().optional(),
    maxDailyDoses: z.number().int().positive().optional(),
    durationDays: z.number().int().positive().optional(),
    minWeightKg: z.number().positive().optional(),
    maxWeightKg: z.number().positive().optional(),
    minAgeMonths: z.number().int().nonnegative().optional(),
    safeInPregnancy: z.boolean().default(false),
    safeInLactation: z.boolean().default(false),
    safeInPediatric: z.boolean().default(true),
    safeInGeriatric: z.boolean().default(true),
    renalAdjustment: z.string().optional(),
    hepaticAdjustment: z.string().optional(),
    cardiacAdjustment: z.string().optional(),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const medId = req.params.id as string;
  const medication = await prisma.medication.findUnique({ where: { id: medId } });
  if (!medication) throw new AppError('Medicamento no encontrado', 404);

  if (data.doseMin > data.doseMax) {
    throw new AppError('Dosis mínima no puede ser mayor que la máxima', 400);
  }

  const dosing = await prisma.medicationDosing.upsert({
    where: {
      medicationId_species: {
        medicationId: medId,
        species: data.species.toUpperCase() as any,
      },
    },
    create: {
      medicationId: medId,
      ...data,
      species: data.species.toUpperCase() as any,
    },
    update: {
      ...data,
      species: data.species.toUpperCase() as any,
    },
  });

  res.json({ status: 'success', data: dosing });
});

// DELETE /medications/:id/dosing/:species - Delete dosing for a species
router.delete('/:id/dosing/:species', authenticate, async (req, res) => {
  const species = (req.params.species as string).toUpperCase();
  await prisma.medicationDosing.delete({
    where: {
      medicationId_species: {
        medicationId: req.params.id as string,
        species: species as any,
      },
    },
  });
  res.json({ status: 'success', message: 'Dosificación eliminada' });
});

// ===== Narrow Therapeutic Index drugs (require precise dosing) =====
const NARROW_THERAPEUTIC_INDEX: string[] = [
  'fenobarbital', 'phenobarbital', 'digoxina', 'digoxin',
  'ciclosporina', 'cyclosporine', 'metotrexato', 'methotrexate',
  'gentamicina', 'gentamycin', 'amikacina', 'amikacin',
  'tobramicina', 'tobramycin', 'vancomicina', 'vancomycin',
  'teofilina', 'theophylline', 'warfarina', 'warfarin',
  'litio', 'lithium', 'cisplatino', 'cisplatin',
];

// ===== Common veterinary drug interactions =====
const DRUG_INTERACTIONS: Record<string, { drugs: string[]; severity: 'alta' | 'media' | 'baja'; message: string }[]> = {
  'meloxicam': [
    { drugs: ['carprofeno', 'ibuprofeno', 'piroxicam', 'ketoprofeno', 'firocoxib'], severity: 'alta', message: 'No combinar AINEs — riesgo de úlcera GI y nefrotoxicidad' },
    { drugs: ['dexametasona', 'prednisolona', 'prednisona', 'metilprednisolona'], severity: 'alta', message: 'AINE + corticoide: riesgo alto de úlcera gastrointestinal' },
    { drugs: ['furosemida'], severity: 'media', message: 'AINEs reducen eficacia de furosemida' },
  ],
  'carprofeno': [
    { drugs: ['meloxicam', 'ibuprofeno', 'piroxicam', 'ketoprofeno', 'firocoxib'], severity: 'alta', message: 'No combinar AINEs — riesgo de úlcera GI y nefrotoxicidad' },
    { drugs: ['dexametasona', 'prednisolona', 'prednisona', 'metilprednisolona'], severity: 'alta', message: 'AINE + corticoide: riesgo alto de úlcera gastrointestinal' },
  ],
  'dexametasona': [
    { drugs: ['meloxicam', 'carprofeno', 'ibuprofeno', 'piroxicam', 'firocoxib'], severity: 'alta', message: 'Corticoide + AINE: riesgo de úlcera GI' },
    { drugs: ['insulina'], severity: 'media', message: 'Corticoides aumentan glucemia — ajustar insulina' },
  ],
  'prednisolona': [
    { drugs: ['meloxicam', 'carprofeno', 'ibuprofeno', 'piroxicam', 'firocoxib'], severity: 'alta', message: 'Corticoide + AINE: riesgo de úlcera GI' },
    { drugs: ['insulina'], severity: 'media', message: 'Corticoides aumentan glucemia — ajustar insulina' },
  ],
  'metronidazol': [
    { drugs: ['fenobarbital', 'phenobarbital'], severity: 'media', message: 'Fenobarbital acelera metabolismo de metronidazol — puede requerir mayor dosis' },
  ],
  'enrofloxacina': [
    { drugs: ['teofilina', 'theophylline'], severity: 'media', message: 'Fluoroquinolonas aumentan niveles de teofilina' },
    { drugs: ['sucralfato'], severity: 'media', message: 'Sucralfato reduce absorción de fluoroquinolonas — administrar con 2h de separación' },
  ],
  'doxiciclina': [
    { drugs: ['sucralfato'], severity: 'media', message: 'Sucralfato reduce absorción de doxiciclina — separar 2h' },
    { drugs: ['metoxiflurano'], severity: 'media', message: 'Tetraciclinas potencian nefrotoxicidad de anestésicos' },
  ],
  'furosemida': [
    { drugs: ['gentamicina', 'amikacina', 'tobramicina'], severity: 'alta', message: 'Furosemida + aminoglucósido: riesgo de ototoxicidad y nefrotoxicidad' },
    { drugs: ['enalapril'], severity: 'media', message: 'Monitorear presión arterial y función renal con esta combinación' },
  ],
  'gentamicina': [
    { drugs: ['furosemida'], severity: 'alta', message: 'Aminoglucósido + furosemida: riesgo de ototoxicidad y nefrotoxicidad' },
    { drugs: ['amikacina', 'tobramicina'], severity: 'alta', message: 'No combinar aminoglucósidos' },
  ],
  'fenobarbital': [
    { drugs: ['metronidazol'], severity: 'media', message: 'Fenobarbital reduce niveles de metronidazol' },
    { drugs: ['doxiciclina'], severity: 'media', message: 'Fenobarbital reduce vida media de doxiciclina' },
  ],
  'tramadol': [
    { drugs: ['acepromazina', 'xilacina'], severity: 'media', message: 'Sedación potenciada — reducir dosis de sedante' },
  ],
  'acepromazina': [
    { drugs: ['tramadol', 'gabapentina'], severity: 'media', message: 'Sedación potenciada — monitorear depresión respiratoria' },
  ],
  'ketamina': [
    { drugs: ['tramadol'], severity: 'media', message: 'Riesgo de síndrome serotoninérgico con la combinación' },
  ],
  'enalapril': [
    { drugs: ['furosemida'], severity: 'media', message: 'IECA + diurético: monitorear función renal y presión arterial' },
  ],
  'ciclosporina': [
    { drugs: ['ketoconazol', 'itraconazol'], severity: 'media', message: 'Azoles aumentan niveles de ciclosporina — puede ser intencional pero monitorear' },
  ],
};

// POST /medications/:id/calculate-dose - Calculate dose for a patient
router.post('/:id/calculate-dose', authenticate, async (req, res) => {
  const schema = z.object({
    petId: z.string().optional(),
    weightKg: z.number().positive().optional(),
    species: z.string().optional(),
    route: z.string().optional(),
    bodyCondition: z.string().optional(),
    adjustments: z.object({
      renal: z.boolean().default(false),
      hepatic: z.boolean().default(false),
      cardiac: z.boolean().default(false),
      geriatric: z.boolean().default(false),
      pediatric: z.boolean().default(false),
      pregnant: z.boolean().default(false),
      lactating: z.boolean().default(false),
      neonatal: z.boolean().default(false),
    }).optional(),
  });

  const input = schema.parse(req.body);

  // Get medication with concentration
  const medication = await prisma.medication.findUnique({
    where: { id: req.params.id as string },
    include: { dosings: true },
  });
  if (!medication) throw new AppError('Medicamento no encontrado', 404);

  // Get patient data if petId provided
  let patientWeight = input.weightKg;
  let patientSpecies = input.species?.toUpperCase();
  let patientName = '';
  let patientAge = '';
  let patientConditions: string[] = [];
  let patientAllergies = '';
  let patientBodyCondition = input.bodyCondition || '';
  let currentMedications: string[] = [];

  if (input.petId) {
    const pet = await prisma.pet.findUnique({ where: { id: input.petId } });
    if (pet) {
      patientName = pet.nombre;
      patientSpecies = patientSpecies || pet.especie;
      patientWeight = patientWeight || pet.peso || undefined;
      patientAllergies = pet.alergias || '';
      patientBodyCondition = patientBodyCondition || (pet as any).condicionCorporal || '';
      if (pet.enfermedadesCronicas) {
        const conds = pet.enfermedadesCronicas.toLowerCase();
        if (conds.includes('renal')) patientConditions.push('renal');
        if (conds.includes('hep') || conds.includes('higado') || conds.includes('hígado')) patientConditions.push('hepatic');
        if (conds.includes('cardi') || conds.includes('coraz')) patientConditions.push('cardiac');
      }
      if (pet.fechaNacimiento) {
        const ageMs = Date.now() - new Date(pet.fechaNacimiento).getTime();
        const ageMonths = Math.floor(ageMs / (30.44 * 24 * 60 * 60 * 1000));
        const ageYears = Math.floor(ageMonths / 12);
        const remainMonths = ageMonths % 12;
        patientAge = ageYears > 0 ? `${ageYears} año${ageYears > 1 ? 's' : ''}${remainMonths > 0 ? ` ${remainMonths} mes${remainMonths > 1 ? 'es' : ''}` : ''}` : `${ageMonths} mes${ageMonths > 1 ? 'es' : ''}`;
      }

      // Look up patient's ACTIVE prescriptions for drug interaction checking
      try {
        const activePrescriptions = await prisma.prescription.findMany({
          where: {
            petId: pet.id,
            status: { in: ['PENDIENTE', 'PARCIAL'] },
            prescribedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
          },
          include: { items: true },
        });
        for (const rx of activePrescriptions) {
          for (const item of rx.items) {
            if (item.name && item.medicationId !== req.params.id) {
              currentMedications.push(item.name.toLowerCase());
            }
          }
        }
      } catch (e) {
        // Non-critical: if we can't fetch prescriptions, continue without interaction check
        console.warn('Could not fetch active prescriptions for interaction check:', e);
      }
    }
  }

  if (!patientSpecies) {
    throw new AppError('Se requiere especie del paciente', 400);
  }

  // Find dosing for this species
  const dosing = (medication as any).dosings?.find((d: any) => d.species === patientSpecies);

  // Parse concentration to get numeric value (e.g., "50 mg/ml" -> 50)
  let concentrationValue: number | null = null;
  let concentrationUnit = '';
  if (medication.concentration) {
    const match = medication.concentration.match(/([\d.]+)\s*(mg|mcg|g|UI)\s*\/\s*(ml|cc)/i);
    if (match) {
      concentrationValue = parseFloat(match[1]);
      concentrationUnit = `${match[2]}/${match[3]}`;
    }
  }

  // Parse tablet mg (e.g., "500mg tabs" -> 500)
  let tabletMg: number | null = null;
  if (medication.presentation) {
    const match = medication.presentation.match(/([\d.]+)\s*(mg|g)/i);
    if (match) {
      let val = parseFloat(match[1]);
      if (match[2].toLowerCase() === 'g') val *= 1000; // convert g to mg
      tabletMg = val;
    }
  }

  // Build response
  const warnings: string[] = [];
  const result: any = {
    medication: {
      id: medication.id,
      name: medication.name,
      genericName: medication.genericName,
      presentation: medication.presentation,
      concentration: medication.concentration,
      category: medication.category,
      currentStock: medication.currentStock,
    },
    patient: {
      name: patientName,
      species: patientSpecies,
      weight: patientWeight || null,
      age: patientAge,
      conditions: patientConditions,
      allergies: patientAllergies,
      bodyCondition: patientBodyCondition,
      currentMedications,
    },
    dosing: null as any,
    interactions: [] as any[],
    narrowTherapeuticIndex: false,
    warnings,
  };

  // ===== NARROW THERAPEUTIC INDEX CHECK =====
  const medNameLower = (medication.name || '').toLowerCase();
  const medGenericLower = (medication.genericName || '').toLowerCase();
  const isNTI = NARROW_THERAPEUTIC_INDEX.some(nti => medNameLower.includes(nti) || medGenericLower.includes(nti));
  if (isNTI) {
    result.narrowTherapeuticIndex = true;
    warnings.push('⚠️ MARGEN TERAPÉUTICO ESTRECHO: Este fármaco requiere dosificación precisa. No redondear dosis.');
  }

  // ===== DRUG INTERACTION CHECK =====
  if (currentMedications.length > 0) {
    // Normalize current medication name to match interaction keys
    const checkInteractions = (drugKey: string) => {
      const interactions = DRUG_INTERACTIONS[drugKey];
      if (!interactions) return;
      for (const interaction of interactions) {
        for (const interactingDrug of interaction.drugs) {
          if (currentMedications.some(cm => cm.includes(interactingDrug))) {
            result.interactions.push({
              drug: interactingDrug,
              severity: interaction.severity,
              message: interaction.message,
            });
            const severityIcon = interaction.severity === 'alta' ? '🚨' : '⚠️';
            warnings.push(`${severityIcon} INTERACCIÓN (${interaction.severity.toUpperCase()}): ${interaction.message}`);
          }
        }
      }
    };

    // Check interactions for this medication (by name and generic)
    for (const key of Object.keys(DRUG_INTERACTIONS)) {
      if (medNameLower.includes(key) || medGenericLower.includes(key)) {
        checkInteractions(key);
      }
    }
  }

  // ===== UNIT VALIDATION (mg vs mcg) =====
  if (medication.concentration) {
    const concLower = medication.concentration.toLowerCase();
    if (concLower.includes('mcg') || concLower.includes('µg') || concLower.includes('ug')) {
      warnings.push('⚠️ ATENCIÓN UNIDADES: La concentración está en mcg (microgramos), no mg. Verificar que la dosis use las mismas unidades.');
    }
  }

  // Check dosing unit mismatch
  if (dosing) {
    const dosingUnit = (dosing.doseUnit || 'mg/kg').toLowerCase();
    if (dosingUnit.includes('mcg') || dosingUnit.includes('µg')) {
      warnings.push('⚠️ La dosis de referencia está en mcg/kg (microgramos). 1 mg = 1000 mcg. No confundir.');
    }
    if (medication.concentration) {
      const concHasMcg = medication.concentration.toLowerCase().includes('mcg') || medication.concentration.toLowerCase().includes('µg');
      const dosHasMcg = dosingUnit.includes('mcg') || dosingUnit.includes('µg');
      if (concHasMcg !== dosHasMcg) {
        warnings.push('🚨 UNIDADES DIFERENTES: La concentración y la dosis usan unidades distintas (mg vs mcg). Convertir antes de calcular.');
      }
    }
  }

  if (!dosing) {
    warnings.push('No hay ficha de dosificación para esta especie. Ingrese la dosis manualmente.');
    res.json({ status: 'success', data: result });
    return;
  }

  if (!patientWeight) {
    result.dosing = {
      doseMinMgKg: dosing.doseMin,
      doseMaxMgKg: dosing.doseMax,
      doseUnit: dosing.doseUnit,
      routes: JSON.parse(dosing.routes || '[]'),
      frequencyHours: dosing.frequencyHours,
      maxDailyDoses: dosing.maxDailyDoses,
      durationDays: dosing.durationDays,
      needsWeight: true,
    };
    warnings.push('Se requiere el peso del paciente para calcular la dosis.');
    res.json({ status: 'success', data: result });
    return;
  }

  // Calculate dose
  const doseMinMg = patientWeight * dosing.doseMin;
  const doseMaxMg = patientWeight * dosing.doseMax;
  const recommendedMg = (doseMinMg + doseMaxMg) / 2; // midpoint

  let adjustmentFactor = 1.0;
  const adjustmentReasons: string[] = [];
  const adjustments = input.adjustments || { renal: false, hepatic: false, cardiac: false, geriatric: false, pediatric: false, pregnant: false, lactating: false, neonatal: false };

  // Clinical adjustments
  if (adjustments.geriatric || patientConditions.includes('geriatric')) {
    adjustmentFactor *= 0.75;
    adjustmentReasons.push('Geriátrico: -25% (metabolismo reducido)');
  }
  if (adjustments.renal || patientConditions.includes('renal')) {
    adjustmentFactor *= 0.5;
    adjustmentReasons.push('Insuficiencia renal: -50%');
    if (dosing.renalAdjustment) warnings.push(`Ajuste renal: ${dosing.renalAdjustment}`);
  }
  if (adjustments.hepatic || patientConditions.includes('hepatic')) {
    adjustmentFactor *= 0.7;
    adjustmentReasons.push('Insuficiencia hepática: -30%');
    if (dosing.hepaticAdjustment) warnings.push(`Ajuste hepático: ${dosing.hepaticAdjustment}`);
  }
  if (adjustments.cardiac || patientConditions.includes('cardiac')) {
    if (dosing.cardiacAdjustment?.toLowerCase().includes('contraindicado')) {
      warnings.push('⚠️ CONTRAINDICADO en pacientes cardíacos');
    } else {
      adjustmentFactor *= 0.8;
      adjustmentReasons.push('Cardiopatía: -20%');
    }
  }
  if (adjustments.pediatric) {
    adjustmentFactor *= 0.75;
    adjustmentReasons.push('Pediátrico: -25% (usar dosis mínima)');
    if (!dosing.safeInPediatric) {
      warnings.push('⚠️ No confirmado seguro para pacientes pediátricos — usar con precaución');
    }
    if (dosing.minAgeMonths && patientAge) {
      warnings.push(`Edad mínima recomendada: ${dosing.minAgeMonths} meses`);
    }
  }
  if (adjustments.neonatal) {
    adjustmentFactor *= 0.5;
    adjustmentReasons.push('Neonato: -50% (función hepática/renal inmadura)');
    if (!dosing.safeInPediatric) {
      warnings.push('🚨 Precaución extrema en neonatos — confirmar seguridad del fármaco');
    }
  }
  if (adjustments.pregnant) {
    if (!dosing.safeInPregnancy) {
      warnings.push('⚠️ No confirmado seguro durante gestación');
    }
  }
  if (adjustments.lactating) {
    if (!dosing.safeInLactation) {
      warnings.push('⚠️ No confirmado seguro durante lactancia — puede pasar a crías');
    }
  }

  // ===== BODY CONDITION ADJUSTMENT =====
  if (patientBodyCondition) {
    if (patientBodyCondition === 'OBESO') {
      adjustmentFactor *= 0.85;
      adjustmentReasons.push('Obeso: -15% (dosificar sobre peso magro estimado)');
      warnings.push('⚠️ Paciente obeso: la dosis se basa en peso magro estimado, no peso total');
    } else if (patientBodyCondition === 'SOBREPESO') {
      adjustmentFactor *= 0.9;
      adjustmentReasons.push('Sobrepeso: -10%');
    } else if (patientBodyCondition === 'MUY_DELGADO') {
      warnings.push('⚠️ Paciente muy delgado/emaciado: verificar hidratación y estado metabólico antes de dosificar');
    }
  }

  // Weight restrictions
  if (dosing.minWeightKg && patientWeight < dosing.minWeightKg) {
    warnings.push(`⚠️ Peso (${patientWeight}kg) por debajo del mínimo recomendado (${dosing.minWeightKg}kg)`);
  }
  if (dosing.maxWeightKg && patientWeight > dosing.maxWeightKg) {
    warnings.push(`⚠️ Peso (${patientWeight}kg) por encima del máximo recomendado (${dosing.maxWeightKg}kg)`);
  }

  // Volume calculations
  let volumeMinMl: number | null = null;
  let volumeMaxMl: number | null = null;
  let volumeRecommendedMl: number | null = null;
  if (concentrationValue) {
    volumeMinMl = Math.round((doseMinMg / concentrationValue) * 100) / 100;
    volumeMaxMl = Math.round((doseMaxMg / concentrationValue) * 100) / 100;
    volumeRecommendedMl = Math.round(((recommendedMg * adjustmentFactor) / concentrationValue) * 100) / 100;
  }

  // Tablet calculations
  let tabletsMin: number | null = null;
  let tabletsMax: number | null = null;
  let tabletsRecommended: number | null = null;
  if (tabletMg) {
    tabletsMin = Math.round((doseMinMg / tabletMg) * 100) / 100;
    tabletsMax = Math.round((doseMaxMg / tabletMg) * 100) / 100;
    tabletsRecommended = Math.round(((recommendedMg * adjustmentFactor) / tabletMg) * 100) / 100;
  }

  // Auto-calculate quantity for treatment
  let estimatedQuantity: number | null = null;
  if (dosing.frequencyHours && dosing.durationDays) {
    const dosesPerDay = Math.ceil(24 / dosing.frequencyHours);
    estimatedQuantity = dosesPerDay * dosing.durationDays;
  }

  result.dosing = {
    doseMinMgKg: dosing.doseMin,
    doseMaxMgKg: dosing.doseMax,
    doseUnit: dosing.doseUnit,
    rangeMinMg: Math.round(doseMinMg * 100) / 100,
    rangeMaxMg: Math.round(doseMaxMg * 100) / 100,
    recommendedMg: Math.round(recommendedMg * 100) / 100,
    adjustedMg: adjustmentFactor < 1 ? Math.round(recommendedMg * adjustmentFactor * 100) / 100 : null,
    adjustmentFactor: adjustmentFactor < 1 ? adjustmentFactor : null,
    adjustmentReasons,
    routes: JSON.parse(dosing.routes || '[]'),
    frequencyHours: dosing.frequencyHours,
    maxDailyDoses: dosing.maxDailyDoses,
    durationDays: dosing.durationDays,
    // Volume (for injectables/suspensions)
    volumeMinMl,
    volumeMaxMl,
    volumeRecommendedMl,
    concentrationValue,
    concentrationUnit,
    // Tablets
    tabletMg,
    tabletsMin,
    tabletsMax,
    tabletsRecommended,
    // Quantity
    estimatedQuantity,
    needsWeight: false,
  };

  // Notes from dosing record
  if (dosing.notes) {
    warnings.push(`Nota: ${dosing.notes}`);
  }

  res.json({ status: 'success', data: result });
});

// POST /medications/dosing/bulk - Bulk create dosing records (for seeding)
router.post('/dosing/bulk', authenticate, async (req, res) => {
  const schema = z.object({
    records: z.array(z.object({
      medicationName: z.string(),
      species: z.string(),
      doseMin: z.number(),
      doseMax: z.number(),
      doseUnit: z.string().default('mg/kg'),
      routes: z.string(),
      frequencyHours: z.number().optional(),
      notes: z.string().optional(),
    })),
  });

  const { records } = schema.parse(req.body);
  let created = 0;
  let skipped = 0;

  for (const rec of records) {
    const medication = await prisma.medication.findFirst({
      where: { name: { contains: rec.medicationName } },
    });
    if (!medication) { skipped++; continue; }

    try {
      await prisma.medicationDosing.upsert({
        where: {
          medicationId_species: {
            medicationId: medication.id,
            species: rec.species.toUpperCase() as any,
          },
        },
        create: {
          medicationId: medication.id,
          species: rec.species.toUpperCase() as any,
          doseMin: rec.doseMin,
          doseMax: rec.doseMax,
          doseUnit: rec.doseUnit,
          routes: rec.routes,
          frequencyHours: rec.frequencyHours || null,
          notes: rec.notes || null,
        },
        update: {
          doseMin: rec.doseMin,
          doseMax: rec.doseMax,
          doseUnit: rec.doseUnit,
          routes: rec.routes,
          frequencyHours: rec.frequencyHours || null,
          notes: rec.notes || null,
        },
      });
      created++;
    } catch (e) { skipped++; }
  }

  res.json({ status: 'success', data: { created, skipped } });
});

export default router;
