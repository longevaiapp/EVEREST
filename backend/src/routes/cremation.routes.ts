// src/routes/cremation.routes.ts
// Cremation system routes - orders, urns, packaging, payments, delivery

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router: any = Router();

// ============================================================================
// PACKAGING RANGES (configurable)
// ============================================================================

// GET /cremation/packaging-ranges
router.get('/packaging-ranges', async (_req: Request, res: Response) => {
  const ranges = await prisma.packagingRange.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ status: 'success', data: { ranges } });
});

// POST /cremation/packaging-ranges (admin only)
router.post('/packaging-ranges', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    minKg: z.number().min(0),
    maxKg: z.number().positive(),
    label: z.string().min(1),
    requiresTwoOperators: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  });
  const data = schema.parse(req.body);
  const range = await prisma.packagingRange.create({ data: data as any });
  res.status(201).json({ status: 'success', data: { range } });
});

// PUT /cremation/packaging-ranges/:id (admin only)
router.put('/packaging-ranges/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    minKg: z.number().min(0).optional(),
    maxKg: z.number().positive().optional(),
    label: z.string().min(1).optional(),
    requiresTwoOperators: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });
  const data = schema.parse(req.body);
  const range = await prisma.packagingRange.update({
    where: { id },
    data: data as any,
  });
  res.json({ status: 'success', data: { range } });
});

// DELETE /cremation/packaging-ranges/:id (admin only)
router.delete('/packaging-ranges/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.packagingRange.delete({ where: { id } });
  res.json({ status: 'success', message: 'Range deleted' });
});

// ============================================================================
// URNS CATALOG
// ============================================================================

// GET /cremation/urns/public - Public catalog without prices
router.get('/urns/public', async (_req: Request, res: Response) => {
  const urns = await prisma.urn.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      size: true,
    },
    orderBy: { name: 'asc' },
  });
  res.json({ status: 'success', data: { urns } });
});

// GET /cremation/urns - Full catalog with prices (authenticated or aliado)
router.get('/urns', async (_req: Request, res: Response) => {
  const urns = await prisma.urn.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  res.json({ status: 'success', data: { urns } });
});

// GET /cremation/urns/all - Admin: all urns including inactive
router.get('/urns/all', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const urns = await prisma.urn.findMany({ orderBy: { name: 'asc' } });
  res.json({ status: 'success', data: { urns } });
});

// POST /cremation/urns (admin only)
router.post('/urns', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    price: z.number().positive(),
    size: z.enum(['CHICA', 'MEDIANA', 'GRANDE', 'EXTRA_GRANDE']),
  });
  const data = schema.parse(req.body);
  const urn = await prisma.urn.create({ data: data as any });
  res.status(201).json({ status: 'success', data: { urn } });
});

// PUT /cremation/urns/:id (admin only)
router.put('/urns/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    price: z.number().positive().optional(),
    size: z.enum(['CHICA', 'MEDIANA', 'GRANDE', 'EXTRA_GRANDE']).optional(),
    active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const urn = await prisma.urn.update({
    where: { id },
    data: data as any,
  });
  res.json({ status: 'success', data: { urn } });
});

// ============================================================================
// ORDERS
// ============================================================================

// Helper: generate folio CREM-YYYYMMDD-NNN
async function generateFolio(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `CREM-${dateStr}-`;

  const lastOrder = await prisma.cremationOrder.findFirst({
    where: { folio: { startsWith: prefix } },
    orderBy: { folio: 'desc' },
    select: { folio: true },
  });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.folio.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// Helper: determine packaging from weight
async function getPackaging(weightKg: number) {
  const range = await prisma.packagingRange.findFirst({
    where: {
      minKg: { lte: weightKg },
      maxKg: { gte: weightKg },
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (range) {
    return { label: range.label, requiresTwoOps: range.requiresTwoOperators };
  }

  // Fallback: largest range or special
  if (weightKg > 80) {
    return { label: 'Servicio especial', requiresTwoOps: true };
  }
  return { label: 'Sin clasificar', requiresTwoOps: false };
}

// POST /cremation/orders - Create order (public endpoint for aliados)
router.post('/orders', async (req: Request, res: Response) => {
  // Helper: treat empty strings as undefined for optional fields
  const emptyToUndefined = z.string().transform(v => v === '' ? undefined : v);
  const optionalString = z.union([z.string().min(1), z.literal('')]).optional().transform(v => v === '' ? undefined : v);

  const schema = z.object({
    petName: z.string().min(1),
    species: z.string().min(1),
    breed: optionalString,
    sex: optionalString,
    age: optionalString,
    color: optionalString,
    characteristics: optionalString,
    weightKg: z.number().positive(),
    clientName: z.string().min(1),
    clientPhone: z.string().min(1),
    clientEmail: z.union([z.string().email(), z.literal('')]).optional().transform(v => v === '' ? undefined : v),
    originType: z.enum(['CLINICA', 'ALIADO', 'DIRECTO']).default('DIRECTO'),
    originName: optionalString,
    pickupAddress: optionalString,
    pickupDate: optionalString,
    pickupTimeSlot: optionalString,
    pickupNotes: optionalString,
    urnId: optionalString,
    notes: optionalString,
  });

  const data = schema.parse(req.body);
  const folio = await generateFolio();
  const packaging = await getPackaging(data.weightKg);

  const order = await prisma.cremationOrder.create({
    data: {
      folio,
      petName: data.petName,
      species: data.species,
      breed: data.breed,
      sex: data.sex,
      age: data.age,
      color: data.color,
      characteristics: data.characteristics,
      weightKg: data.weightKg,
      packagingLabel: packaging.label,
      requiresTwoOps: packaging.requiresTwoOps,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail,
      originType: data.originType as any,
      originName: data.originName,
      pickupAddress: data.pickupAddress || '',
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
      pickupTimeSlot: data.pickupTimeSlot,
      pickupNotes: data.pickupNotes,
      urnId: data.urnId || null,
      notes: data.notes,
      status: data.pickupDate ? 'RECOLECCION_PROGRAMADA' as any : 'SOLICITADA' as any,
    },
    include: { urn: true },
  });

  // Log initial status
  await prisma.cremationStatusLog.create({
    data: {
      orderId: order.id,
      newStatus: order.status as any,
      notes: 'Orden creada',
    },
  });

  res.status(201).json({ status: 'success', data: { order } });
});

// GET /cremation/orders - List orders with filters (authenticated)
router.get('/orders', authenticate, async (req: Request, res: Response) => {
  const { status, search, size, dateFrom, dateTo, assignedTo } = req.query;

  const where: any = {};

  if (status && status !== 'all') {
    where.status = status;
  }
  if (search) {
    const s = String(search);
    where.OR = [
      { folio: { contains: s } },
      { petName: { contains: s } },
      { clientName: { contains: s } },
      { clientPhone: { contains: s } },
    ];
  }
  if (size) {
    where.packagingLabel = { contains: String(size) };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (assignedTo) {
    where.assignedToId = String(assignedTo);
  }

  const orders = await prisma.cremationOrder.findMany({
    where,
    include: {
      urn: true,
      assignedTo: { select: { id: true, nombre: true } },
      operator: { select: { id: true, nombre: true } },
      deliveredBy: { select: { id: true, nombre: true } },
      payments: true,
      _count: { select: { statusLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { orders } });
});

// GET /cremation/orders/:id - Order detail
router.get('/orders/:id', authenticate, async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  const order = await prisma.cremationOrder.findUnique({
    where: { id },
    include: {
      urn: true,
      assignedTo: { select: { id: true, nombre: true } },
      operator: { select: { id: true, nombre: true } },
      deliveredBy: { select: { id: true, nombre: true } },
      payments: {
        include: { registeredBy: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' },
      },
      statusLogs: {
        include: { changedBy: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }

  res.json({ status: 'success', data: { order } });
});

// PATCH /cremation/orders/:id/status - Change order status
router.patch('/orders/:id/status', authenticate, async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  const schema = z.object({
    status: z.enum([
      'SOLICITADA', 'RECOLECCION_PROGRAMADA', 'RECOLECCION_REALIZADA',
      'EN_CREMATORIO', 'EN_PROCESO', 'LISTA_PARA_ENTREGA', 'ENTREGADA', 'CANCELADA',
    ]),
    notes: z.string().optional(),
    // Optional fields for specific transitions
    assignedToId: z.string().optional(),
    pickupDate: z.string().optional(),
    pickupTimeSlot: z.string().optional(),
    receiverName: z.string().optional(),
    receiverPhone: z.string().optional(),
    deliveryDate: z.string().optional(),
    deliveryEvidence: z.string().optional(),
    deliveryNotes: z.string().optional(),
    signatureData: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const order = await prisma.cremationOrder.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }

  // Build update data based on the new status
  const updateData: any = { status: data.status };
  const now = new Date();

  switch (data.status) {
    case 'RECOLECCION_PROGRAMADA':
      if (data.assignedToId) updateData.assignedToId = data.assignedToId;
      if (data.pickupDate) updateData.pickupDate = new Date(data.pickupDate);
      if (data.pickupTimeSlot) updateData.pickupTimeSlot = data.pickupTimeSlot;
      break;
    case 'RECOLECCION_REALIZADA':
      updateData.pickedUpAt = now;
      break;
    case 'EN_CREMATORIO':
      updateData.receivedAt = now;
      updateData.operatorId = req.user!.userId;
      break;
    case 'EN_PROCESO':
      updateData.cremationStartAt = now;
      break;
    case 'LISTA_PARA_ENTREGA':
      updateData.cremationEndAt = now;
      if (data.deliveryDate) updateData.deliveryDate = new Date(data.deliveryDate);
      break;
    case 'ENTREGADA':
      updateData.deliveredAt = now;
      updateData.deliveredById = req.user!.userId;
      if (data.receiverName) updateData.receiverName = data.receiverName;
      if (data.receiverPhone) updateData.receiverPhone = data.receiverPhone;
      if (data.deliveryEvidence) updateData.deliveryEvidence = data.deliveryEvidence;
      if (data.deliveryNotes) updateData.deliveryNotes = data.deliveryNotes;
      if (data.signatureData) updateData.signatureData = data.signatureData;
      break;
  }

  const [updated, _log] = await prisma.$transaction([
    prisma.cremationOrder.update({
      where: { id },
      data: updateData,
      include: { urn: true, assignedTo: { select: { id: true, nombre: true } } },
    }),
    prisma.cremationStatusLog.create({
      data: {
        orderId: id,
        previousStatus: order.status as any,
        newStatus: data.status as any,
        changedById: req.user!.userId,
        notes: data.notes,
      },
    }),
  ]);

  // Create notification for relevant users
  try {
    const statusLabel: Record<string, string> = {
      SOLICITADA: 'Solicitada', RECOLECCION_PROGRAMADA: 'Recolección Programada',
      RECOLECCION_REALIZADA: 'Recolección Realizada', EN_CREMATORIO: 'En Crematorio',
      EN_PROCESO: 'En Proceso', LISTA_PARA_ENTREGA: 'Lista para Entrega',
      ENTREGADA: 'Entregada', CANCELADA: 'Cancelada',
    };
    const admins = await prisma.user.findMany({
      where: { rol: 'ADMIN', activo: true },
      select: { id: true },
    });
    const notifData = admins.map(admin => ({
      userId: admin.id,
      tipo: 'CREMACION_STATUS' as any,
      titulo: `Cremación ${updated.folio}: ${statusLabel[data.status] || data.status}`,
      mensaje: `La orden ${updated.folio} (${updated.petName}) cambió a ${statusLabel[data.status] || data.status}`,
      data: { orderId: updated.id, folio: updated.folio, status: data.status },
    }));
    if (notifData.length > 0) {
      await prisma.notification.createMany({ data: notifData });
    }
  } catch (notifErr) {
    console.error('[cremation] notification error:', notifErr);
  }

  res.json({ status: 'success', data: { order: updated } });
});

// PATCH /cremation/orders/:id - Update order details
router.patch('/orders/:id', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    petName: z.string().optional(),
    species: z.string().optional(),
    breed: z.string().optional(),
    sex: z.string().optional(),
    age: z.string().optional(),
    color: z.string().optional(),
    characteristics: z.string().optional(),
    weightKg: z.number().positive().optional(),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    clientEmail: z.string().optional(),
    pickupAddress: z.string().optional(),
    pickupDate: z.string().optional(),
    pickupTimeSlot: z.string().optional(),
    pickupNotes: z.string().optional(),
    urnId: z.string().optional(),
    notes: z.string().optional(),
    assignedToId: z.string().optional(),
    deliveryDate: z.string().optional(),
    petPhotoUrl: z.string().optional(),
    afterPhotoUrl: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const updateData: any = { ...data };

  // If weight changes, recalculate packaging
  if (data.weightKg) {
    const packaging = await getPackaging(data.weightKg);
    updateData.packagingLabel = packaging.label;
    updateData.requiresTwoOps = packaging.requiresTwoOps;
  }

  if (data.pickupDate) updateData.pickupDate = new Date(data.pickupDate);
  if (data.deliveryDate) updateData.deliveryDate = new Date(data.deliveryDate);

  const order = await prisma.cremationOrder.update({
    where: { id },
    data: updateData,
    include: { urn: true, assignedTo: { select: { id: true, nombre: true } } },
  });

  res.json({ status: 'success', data: { order } });
});

// ============================================================================
// PAYMENTS
// ============================================================================

// POST /cremation/orders/:id/payments
router.post('/orders/:id/payments', authenticate, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    amount: z.number().positive(),
    method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
    status: z.enum(['PENDIENTE', 'PAGADO', 'FALLIDO']).default('PAGADO'),
    reference: z.string().optional(),
    notes: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const payment = await prisma.cremationPayment.create({
    data: {
      orderId: id,
      amount: data.amount,
      method: data.method as any,
      status: data.status as any,
      reference: data.reference,
      notes: data.notes,
      registeredById: req.user!.userId,
      paidAt: data.status === 'PAGADO' ? new Date() : null,
    },
    include: { registeredBy: { select: { id: true, nombre: true } } },
  });

  res.status(201).json({ status: 'success', data: { payment } });
});

// ============================================================================
// STATS / DASHBOARD
// ============================================================================

// GET /cremation/stats - KPIs
router.get('/stats', authenticate, async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalOrders,
    byStatus,
    todayOrders,
    pendingPickups,
    inProcess,
    readyForDelivery,
  ] = await Promise.all([
    prisma.cremationOrder.count(),
    prisma.cremationOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.cremationOrder.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.cremationOrder.count({
      where: { status: { in: ['SOLICITADA', 'RECOLECCION_PROGRAMADA'] } },
    }),
    prisma.cremationOrder.count({
      where: { status: { in: ['EN_CREMATORIO', 'EN_PROCESO'] } },
    }),
    prisma.cremationOrder.count({
      where: { status: 'LISTA_PARA_ENTREGA' },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach((s: any) => {
    statusCounts[s.status] = s._count.id;
  });

  res.json({
    status: 'success',
    data: {
      stats: {
        totalOrders,
        todayOrders,
        pendingPickups,
        inProcess,
        readyForDelivery,
        byStatus: statusCounts,
      },
    },
  });
});

// GET /cremation/export - Export orders as JSON (can be converted to CSV on frontend)
router.get('/export', authenticate, async (req: Request, res: Response) => {
  const { dateFrom, dateTo, status } = req.query;
  const where: any = {};

  if (status && status !== 'all') where.status = status;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const orders = await prisma.cremationOrder.findMany({
    where,
    include: {
      urn: { select: { name: true, price: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { orders } });
});

// ============================================================================
// SUPPLIES / INVENTORY
// ============================================================================

// GET /cremation/supplies
router.get('/supplies', authenticate, async (_req: Request, res: Response) => {
  const supplies = await prisma.cremationSupply.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json({ status: 'success', data: { supplies } });
});

// POST /cremation/supplies (admin only)
router.post('/supplies', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    stock: z.number().int().min(0).default(0),
    minStock: z.number().int().min(0).default(5),
    unit: z.string().default('pzas'),
    notes: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const supply = await prisma.cremationSupply.create({ data: data as any });
  res.status(201).json({ status: 'success', data: { supply } });
});

// PUT /cremation/supplies/:id (admin only)
router.put('/supplies/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    name: z.string().min(1).optional(),
    category: z.string().optional(),
    stock: z.number().int().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    unit: z.string().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  });
  const data = schema.parse(req.body);
  const supply = await prisma.cremationSupply.update({
    where: { id },
    data: data as any,
  });
  res.json({ status: 'success', data: { supply } });
});

// DELETE /cremation/supplies/:id (admin only)
router.delete('/supplies/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.cremationSupply.delete({ where: { id } });
  res.json({ status: 'success', message: 'Supply deleted' });
});

// POST /cremation/supplies/:id/adjust - Adjust stock
router.post('/supplies/:id/adjust', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = z.object({
    quantity: z.number().int(), // positive = add, negative = subtract
  });
  const { quantity } = schema.parse(req.body);
  const supply = await prisma.cremationSupply.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });
  res.json({ status: 'success', data: { supply } });
});

export default router;
