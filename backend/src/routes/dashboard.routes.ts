// src/routes/dashboard.routes.ts
// Dashboard routes - Statistics and metrics for all modules

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// GET /dashboard/recepcion - Reception dashboard stats
router.get('/recepcion', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's visits
  const visitsToday = await prisma.visit.count({
    where: {
      arrivalTime: { gte: today, lt: tomorrow },
    },
  });

  // Patients by status
  const patientsByStatus = await prisma.pet.groupBy({
    by: ['estado'],
    _count: { id: true },
    where: {
      estado: { not: 'ALTA' },
    },
  });

  // Pending payments
  const pendingPayments = await prisma.visit.count({
    where: { status: 'LISTO_PARA_ALTA' },
  });

  // Today's appointments
  const appointmentsToday = await prisma.appointment.count({
    where: {
      fecha: { gte: today, lt: tomorrow },
      cancelada: false,
    },
  });

  // Wait time average (simplified)
  const waitingPatients = await prisma.visit.findMany({
    where: { status: 'EN_ESPERA' },
    select: { arrivalTime: true },
  });

  const avgWaitMinutes = waitingPatients.length > 0
    ? waitingPatients.reduce((acc, v) => {
        const waitMs = Date.now() - new Date(v.arrivalTime).getTime();
        return acc + (waitMs / 60000);
      }, 0) / waitingPatients.length
    : 0;

  res.json({
    status: 'success',
    data: {
      visitsToday,
      patientsByStatus: patientsByStatus.map((p) => ({
        status: p.estado,
        count: p._count.id,
      })),
      pendingPayments,
      appointmentsToday,
      avgWaitMinutes: Math.round(avgWaitMinutes),
      waitingCount: waitingPatients.length,
    },
  });
});

// GET /dashboard/medico - Medical dashboard stats
router.get('/medico', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Waiting patients
  const waitingPatients = await prisma.visit.count({
    where: { status: 'EN_ESPERA' },
  });

  // In consultation
  const inConsultation = await prisma.visit.count({
    where: { status: 'EN_CONSULTA' },
  });

  // Consultations today
  const consultationsToday = await prisma.consultation.count({
    where: {
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  // Pending lab results
  const pendingLabResults = await prisma.labRequest.count({
    where: { status: { in: ['PENDIENTE', 'EN_PROCESO'] } },
  });

  // Hospitalizations
  const activeHospitalizations = await prisma.hospitalization.count({
    where: { status: 'ACTIVA' },
  });

  // Today's surgeries
  const surgeriesToday = await prisma.surgery.count({
    where: {
      scheduledDate: { gte: today, lt: tomorrow },
    },
  });

  res.json({
    status: 'success',
    data: {
      waitingPatients,
      inConsultation,
      consultationsToday,
      pendingLabResults,
      activeHospitalizations,
      surgeriesToday,
    },
  });
});

// GET /dashboard/farmacia - Pharmacy dashboard stats
router.get('/farmacia', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 30 days ago for monthly stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ========== TODAY STATS ==========
  const dispensesToday = await prisma.dispense.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
    },
    include: {
      items: true,
    },
  });

  const todayStats = {
    totalDispenses: dispensesToday.length,
    totalRevenue: dispensesToday.reduce((sum, d) => 
      sum + d.items.reduce((itemSum, item) => itemSum + Number(item.subtotal || 0), 0), 0),
    productsDispensed: dispensesToday.reduce((sum, d) => sum + (d.items?.length || 0), 0),
  };

  // ========== PENDING PRESCRIPTIONS ==========
  const pendingPrescriptions = await prisma.prescription.count({
    where: { status: { in: ['PENDIENTE', 'PARCIAL'] } },
  });

  // ========== STOCK ALERTS ==========
  const allMeds = await prisma.medication.findMany({
    where: { activo: true },
    select: { currentStock: true, minStock: true, expirationDate: true },
  });

  const lowStockCount = allMeds.filter(m => m.currentStock <= m.minStock && m.currentStock > 0).length;
  const outOfStockCount = allMeds.filter(m => m.currentStock === 0).length;

  // Expiring soon (30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringCount = allMeds.filter(m => 
    m.expirationDate && new Date(m.expirationDate) <= thirtyDaysFromNow
  ).length;

  // Unresolved alerts
  const unresolvedAlerts = await prisma.stockAlert.count({
    where: { status: 'ACTIVA' },
  });

  // ========== TOP MEDICATIONS (30 days) ==========
  const dispenseItems = await prisma.dispenseItem.findMany({
    where: {
      dispense: {
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    include: {
      medication: {
        select: { id: true, name: true, category: true },
      },
    },
  });

  // Group by medication and count
  const medicationCounts: Record<string, { id: string; name: string; category: string; quantity: number; revenue: number }> = {};
  for (const item of dispenseItems) {
    const medId = item.medicationId;
    if (!medicationCounts[medId]) {
      medicationCounts[medId] = {
        id: medId,
        name: item.medication?.name || 'Unknown',
        category: item.medication?.category || 'OTRO',
        quantity: 0,
        revenue: 0,
      };
    }
    medicationCounts[medId].quantity += item.dispensedQty;
    medicationCounts[medId].revenue += Number(item.subtotal) || 0;
  }

  const topMedications = Object.values(medicationCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // ========== REVENUE BY CATEGORY ==========
  const revenueByCategory: Record<string, number> = {};
  for (const item of dispenseItems) {
    const category = item.medication?.category || 'OTRO';
    revenueByCategory[category] = (revenueByCategory[category] || 0) + Number(item.subtotal || 0);
  }

  // ========== MONTHLY STATS ==========
  const monthlyDispenses = await prisma.dispense.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      items: {
        select: { subtotal: true },
      },
    },
  });

  const monthlyStats = {
    totalDispenses: monthlyDispenses.length,
    totalRevenue: monthlyDispenses.reduce((sum, d) => 
      sum + d.items.reduce((itemSum, item) => itemSum + (Number(item.subtotal) || 0), 0), 0),
    averagePerDay: monthlyDispenses.length / 30,
    averageTicket: monthlyDispenses.length > 0 
      ? monthlyDispenses.reduce((sum, d) => 
          sum + d.items.reduce((itemSum, item) => itemSum + (Number(item.subtotal) || 0), 0), 0) / monthlyDispenses.length 
      : 0,
  };

  // ========== CONTROLLED MEDICATIONS ==========
  const controlledMeds = await prisma.medication.findMany({
    where: {
      isControlled: true,
      activo: true,
    },
    select: { currentStock: true },
  });
  const controlledLowStock = controlledMeds.filter(m => m.currentStock <= 10).length;

  res.json({
    status: 'success',
    data: {
      todayStats,
      pendingPrescriptions,
      alerts: {
        lowStockCount,
        outOfStockCount,
        expiringCount,
        unresolvedAlerts,
        controlledLowStock,
      },
      topMedications,
      revenueByCategory: Object.entries(revenueByCategory).map(([category, revenue]) => ({
        category,
        revenue,
      })),
      monthlyStats,
    },
  });
});

// GET /dashboard/laboratorio - Lab dashboard stats
router.get('/laboratorio', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Pending requests
  const pendingRequests = await prisma.labRequest.count({
    where: { status: 'PENDIENTE' },
  });

  // In process
  const inProcess = await prisma.labRequest.count({
    where: { status: 'EN_PROCESO' },
  });

  // Completed today
  const completedToday = await prisma.labRequest.count({
    where: {
      status: 'COMPLETADO',
      completedAt: { gte: today, lt: tomorrow },
    },
  });

  // Urgent pending
  const urgentPending = await prisma.labRequest.count({
    where: {
      status: { in: ['PENDIENTE', 'EN_PROCESO'] },
      urgency: 'URGENTE',
    },
  });

  // Requests by type
  const requestsByType = await prisma.labRequest.groupBy({
    by: ['type'],
    _count: { id: true },
    where: {
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  res.json({
    status: 'success',
    data: {
      pendingRequests,
      inProcess,
      completedToday,
      urgentPending,
      requestsByType: requestsByType.map((r) => ({
        tipo: r.type,
        count: r._count.id,
      })),
    },
  });
});

// GET /dashboard/admin - Admin overview (all modules)
router.get('/admin', authenticate, isAdmin, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // User stats
  const totalUsers = await prisma.user.count({ where: { activo: true } });
  const usersByRole = await prisma.user.groupBy({
    by: ['rol'],
    _count: { id: true },
    where: { activo: true },
  });

  // Today's activity
  const visitsToday = await prisma.visit.count({
    where: { arrivalTime: { gte: today, lt: tomorrow } },
  });

  const consultationsToday = await prisma.consultation.count({
    where: { createdAt: { gte: today, lt: tomorrow } },
  });

  const dispensesToday = await prisma.dispense.count({
    where: { createdAt: { gte: today, lt: tomorrow } },
  });

  // Financial (simplified)
  const paymentsToday = await prisma.payment.aggregate({
    _sum: { total: true },
    _count: { id: true },
    where: { createdAt: { gte: today, lt: tomorrow } },
  });

  // Active patients
  const activePatients = await prisma.pet.count({
    where: { estado: { not: 'ALTA' } },
  });

  // Total pets and owners
  const totalPets = await prisma.pet.count();
  const totalOwners = await prisma.owner.count();

  res.json({
    status: 'success',
    data: {
      users: {
        total: totalUsers,
        byRole: usersByRole.map((u) => ({
          role: u.rol,
          count: u._count.id,
        })),
      },
      today: {
        visits: visitsToday,
        consultations: consultationsToday,
        dispenses: dispensesToday,
        payments: {
          count: paymentsToday._count.id,
          total: paymentsToday._sum.total || 0,
        },
      },
      patients: {
        active: activePatients,
        totalPets,
        totalOwners,
      },
    },
  });
});

export default router;
