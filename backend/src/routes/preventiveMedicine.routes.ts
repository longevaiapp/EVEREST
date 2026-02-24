// src/routes/preventiveMedicine.routes.ts
// Preventive Medicine routes - MEDICINA PREVENTIVA module
// Handles: Vaccinations, Deworming, Basic Physical Exam

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isMedico } from '../middleware/auth';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Schema for applying a vaccine
const vaccineRecordSchema = z.object({
  petId: z.string().cuid(),
  visitId: z.string().cuid().optional(),
  nombre: z.string().min(1, 'Nombre de vacuna requerido'),
  marca: z.string().optional(),
  nombreComercial: z.string().optional(),
  medicationId: z.string().cuid().optional(), // From inventory
  lote: z.string().optional(),
  fechaCaducidad: z.string().datetime().optional(),
  fecha: z.string().datetime(),
  proximaDosis: z.string().datetime().optional(),
  viaAdministracion: z.string().optional(),
  costo: z.number().optional(),
  notas: z.string().optional(),
});

// Schema for applying deworming
const dewormingRecordSchema = z.object({
  petId: z.string().cuid(),
  visitId: z.string().cuid().optional(),
  marca: z.string().min(1, 'Marca requerida'),
  nombreComercial: z.string().min(1, 'Nombre comercial requerido'),
  tipo: z.enum(['Interna', 'Externa', 'Ambas']),
  medicationId: z.string().cuid().optional(),
  lote: z.string().optional(),
  fecha: z.string().datetime().optional(),
  proximaAplicacion: z.string().datetime(),
  costo: z.number().optional(),
  notas: z.string().optional(),
});

// Schema for preventive medicine record (full consultation)
const preventiveMedicineSchema = z.object({
  visitId: z.string().cuid(),
  petId: z.string().cuid(),
  // Basic physical exam
  temperatura: z.number().optional(),
  peso: z.number().optional(),
  frecuenciaCardiaca: z.number().int().optional(),
  frecuenciaRespiratoria: z.number().int().optional(),
  condicionGeneral: z.enum(['Normal', 'Requiere atención']).optional(),
  observaciones: z.string().optional(),
  // Vaccines to apply (array of vaccine records)
  vaccines: z.array(z.object({
    medicationId: z.string().cuid(),
    lote: z.string().optional(),
    fechaCaducidad: z.string().datetime().optional(),
    proximaDosis: z.string().datetime().optional(),
    viaAdministracion: z.string().optional(),
    notas: z.string().optional(),
  })).optional().default([]),
  // Dewormings to apply
  dewormings: z.array(z.object({
    medicationId: z.string().cuid(),
    tipo: z.enum(['Interna', 'Externa', 'Ambas']),
    lote: z.string().optional(),
    proximaAplicacion: z.string().datetime(),
    notas: z.string().optional(),
  })).optional().default([]),
});

// ============================================================================
// GET /preventive-medicine/queue - Get patients waiting for preventive medicine
// ============================================================================
router.get('/queue', authenticate, isMedico, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visits = await prisma.visit.findMany({
    where: {
      serviceType: 'MEDICINA_PREVENTIVA',
      status: {
        in: ['RECIEN_LLEGADO', 'EN_ESPERA', 'EN_MEDICINA_PREVENTIVA'],
      },
      arrivalTime: { gte: today },
    },
    include: {
      pet: {
        include: {
          owner: {
            select: { id: true, nombre: true, telefono: true, email: true },
          },
          vaccineRecords: {
            orderBy: { fecha: 'desc' },
            take: 5,
          },
          dewormingRecords: {
            orderBy: { fecha: 'desc' },
            take: 3,
          },
        },
      },
    },
    orderBy: [
      { prioridad: 'asc' },
      { arrivalTime: 'asc' },
    ],
  });

  res.json({
    status: 'success',
    data: { visits, total: visits.length },
  });
});

// ============================================================================
// GET /preventive-medicine/vaccines - Get available vaccines from inventory
// ============================================================================
router.get('/vaccines', authenticate, async (req, res) => {
  const { especie } = req.query;
  
  const whereClause: any = {
    category: 'VACUNA',
    activo: true,
    currentStock: { gt: 0 },
  };

  if (especie && typeof especie === 'string') {
    whereClause.OR = [
      { especies: especie.toUpperCase() },
      { especies: 'AMBOS' },
      { especies: null }, // Legacy vaccines without species
    ];
  }

  const vaccines = await prisma.medication.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      genericName: true,
      nombreComercial: true,
      presentation: true,
      concentration: true,
      currentStock: true,
      salePrice: true,
      expirationDate: true,
      especies: true,
      edadMinima: true,
      intervaloRefuerzo: true,
      viaAdministracion: true,
      lote: true,
      requiresRefrigeration: true,
    },
  });

  res.json({
    status: 'success',
    data: { vaccines },
  });
});

// ============================================================================
// GET /preventive-medicine/dewormers - Get available dewormers from inventory
// ============================================================================
router.get('/dewormers', authenticate, async (req, res) => {
  const { especie } = req.query;
  
  const whereClause: any = {
    category: 'ANTIPARASITARIO',
    activo: true,
    currentStock: { gt: 0 },
  };

  if (especie && typeof especie === 'string') {
    whereClause.OR = [
      { especies: especie.toUpperCase() },
      { especies: 'AMBOS' },
      { especies: null },
    ];
  }

  const dewormers = await prisma.medication.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      genericName: true,
      nombreComercial: true,
      presentation: true,
      concentration: true,
      currentStock: true,
      salePrice: true,
      expirationDate: true,
      especies: true,
      pesoMinimo: true,
      pesoMaximo: true,
      intervaloRefuerzo: true,
      viaAdministracion: true,
      lote: true,
    },
  });

  res.json({
    status: 'success',
    data: { dewormers },
  });
});

// ============================================================================
// GET /preventive-medicine/pet/:petId/history - Get pet's vaccine & deworming history
// ============================================================================
router.get('/pet/:petId/history', authenticate, async (req, res) => {
  const { petId } = req.params;

  const [vaccineRecords, dewormingRecords, pet] = await Promise.all([
    prisma.vaccineRecord.findMany({
      where: { petId },
      orderBy: { fecha: 'desc' },
      include: {
        medication: {
          select: { name: true, nombreComercial: true },
        },
      },
    }),
    prisma.dewormingRecord.findMany({
      where: { petId },
      orderBy: { fecha: 'desc' },
      include: {
        medication: {
          select: { name: true, nombreComercial: true },
        },
      },
    }),
    prisma.pet.findUnique({
      where: { id: petId },
      select: {
        id: true,
        nombre: true,
        especie: true,
        raza: true,
        fechaNacimiento: true,
        ultimaVacuna: true,
        ultimaDesparasitacion: true,
      },
    }),
  ]);

  res.json({
    status: 'success',
    data: { pet, vaccineRecords, dewormingRecords },
  });
});

// ============================================================================
// POST /preventive-medicine/attend - Complete preventive medicine consultation
// ============================================================================
router.post('/attend', authenticate, isMedico, async (req, res) => {
  const data = preventiveMedicineSchema.parse(req.body);
  const userId = (req as any).user?.userId;

  // Verify visit exists and is preventive medicine type
  const visit = await prisma.visit.findUnique({
    where: { id: data.visitId },
    include: { pet: true },
  });

  if (!visit) {
    throw new AppError('Visita no encontrada', 404);
  }

  if (visit.serviceType !== 'MEDICINA_PREVENTIVA') {
    throw new AppError('Esta visita no es de medicina preventiva', 400);
  }

  // Calculate total cost
  let totalCost = 0;
  const vaccineDetails: any[] = [];
  const dewormingDetails: any[] = [];

  // Process vaccines
  for (const vaccine of data.vaccines) {
    const medication = await prisma.medication.findUnique({
      where: { id: vaccine.medicationId },
    });

    if (!medication) {
      throw new AppError(`Medicamento no encontrado: ${vaccine.medicationId}`, 404);
    }

    if (medication.currentStock < 1) {
      throw new AppError(`Sin stock disponible: ${medication.name}`, 400);
    }

    totalCost += Number(medication.salePrice);
    vaccineDetails.push({
      medication,
      ...vaccine,
    });
  }

  // Process dewormings
  for (const deworming of data.dewormings) {
    const medication = await prisma.medication.findUnique({
      where: { id: deworming.medicationId },
    });

    if (!medication) {
      throw new AppError(`Medicamento no encontrado: ${deworming.medicationId}`, 404);
    }

    if (medication.currentStock < 1) {
      throw new AppError(`Sin stock disponible: ${medication.name}`, 400);
    }

    totalCost += Number(medication.salePrice);
    dewormingDetails.push({
      medication,
      ...deworming,
    });
  }

  // Execute all in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create preventive medicine record
    const preventiveRecord = await tx.preventiveMedicineRecord.create({
      data: {
        visitId: data.visitId,
        petId: data.petId,
        temperatura: data.temperatura,
        peso: data.peso,
        frecuenciaCardiaca: data.frecuenciaCardiaca,
        frecuenciaRespiratoria: data.frecuenciaRespiratoria,
        condicionGeneral: data.condicionGeneral,
        observaciones: data.observaciones,
        vacunasAplicadas: data.vaccines.length,
        desparasitantesAplicados: data.dewormings.length,
        aplicadoPorId: userId,
        totalCost,
      },
    });

    // 2. Create vaccine records and update stock
    for (const vac of vaccineDetails) {
      // Calculate next dose based on intervalo
      let proximaDosis = vac.proximaDosis ? new Date(vac.proximaDosis) : null;
      if (!proximaDosis && vac.medication.intervaloRefuerzo) {
        const dias = parseInt(vac.medication.intervaloRefuerzo);
        if (!isNaN(dias)) {
          proximaDosis = new Date();
          proximaDosis.setDate(proximaDosis.getDate() + dias);
        }
      }

      await tx.vaccineRecord.create({
        data: {
          petId: data.petId,
          visitId: data.visitId,
          nombre: vac.medication.name,
          marca: vac.medication.supplier || '',
          nombreComercial: vac.medication.nombreComercial || vac.medication.name,
          medicationId: vac.medicationId,
          lote: vac.lote || vac.medication.lote,
          fechaCaducidad: vac.fechaCaducidad ? new Date(vac.fechaCaducidad) : vac.medication.expirationDate,
          fecha: new Date(),
          proximaDosis,
          aplicadaPor: (req as any).user?.nombre || 'Médico',
          aplicadoPorId: userId,
          viaAdministracion: vac.viaAdministracion || vac.medication.viaAdministracion,
          costo: vac.medication.salePrice,
          notas: vac.notas,
        },
      });

      // Update stock
      await tx.medication.update({
        where: { id: vac.medicationId },
        data: { currentStock: { decrement: 1 } },
      });

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          medicationId: vac.medicationId,
          type: 'SALIDA',
          quantity: 1,
          previousStock: vac.medication.currentStock,
          newStock: vac.medication.currentStock - 1,
          reason: `Vacunación - ${visit.pet.nombre}`,
          reference: `PREV-${preventiveRecord.id}`,
          performedById: userId,
        },
      });
    }

    // 3. Create deworming records and update stock
    for (const dew of dewormingDetails) {
      await tx.dewormingRecord.create({
        data: {
          petId: data.petId,
          visitId: data.visitId,
          marca: dew.medication.supplier || dew.medication.name,
          nombreComercial: dew.medication.nombreComercial || dew.medication.name,
          tipo: dew.tipo,
          medicationId: dew.medicationId,
          lote: dew.lote || dew.medication.lote,
          fecha: new Date(),
          proximaAplicacion: new Date(dew.proximaAplicacion),
          aplicadoPor: (req as any).user?.nombre || 'Médico',
          aplicadoPorId: userId,
          costo: dew.medication.salePrice,
          notas: dew.notas,
        },
      });

      // Update stock
      await tx.medication.update({
        where: { id: dew.medicationId },
        data: { currentStock: { decrement: 1 } },
      });

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          medicationId: dew.medicationId,
          type: 'SALIDA',
          quantity: 1,
          previousStock: dew.medication.currentStock,
          newStock: dew.medication.currentStock - 1,
          reason: `Desparasitación - ${visit.pet.nombre}`,
          reference: `PREV-${preventiveRecord.id}`,
          performedById: userId,
        },
      });
    }

    // 4. Update pet's last vaccine/deworming dates
    const updateData: any = {};
    if (data.vaccines.length > 0) {
      updateData.ultimaVacuna = new Date();
      updateData.vacunasActualizadas = true;
    }
    if (data.dewormings.length > 0) {
      updateData.ultimaDesparasitacion = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await tx.pet.update({
        where: { id: data.petId },
        data: updateData,
      });
    }

    // 5. Update visit status
    await tx.visit.update({
      where: { id: data.visitId },
      data: {
        status: 'MEDICINA_PREVENTIVA_COMPLETADA',
        peso: data.peso,
        temperatura: data.temperatura,
      },
    });

    return preventiveRecord;
  });

  // Fetch the complete record with relations
  const completeRecord = await prisma.preventiveMedicineRecord.findUnique({
    where: { id: result.id },
    include: {
      pet: true,
      visit: true,
      aplicadoPor: { select: { nombre: true } },
    },
  });

  res.status(201).json({
    status: 'success',
    message: 'Medicina preventiva completada exitosamente',
    data: { preventiveRecord: completeRecord },
  });
});

// ============================================================================
// POST /preventive-medicine/vaccine - Add single vaccine record (quick add)
// ============================================================================
router.post('/vaccine', authenticate, isMedico, async (req, res) => {
  const data = vaccineRecordSchema.parse(req.body);
  const userId = (req as any).user?.userId;

  let medicationData: any = null;

  // If medicationId provided, get medication details and update stock
  if (data.medicationId) {
    medicationData = await prisma.medication.findUnique({
      where: { id: data.medicationId },
    });

    if (!medicationData) {
      throw new AppError('Medicamento no encontrado', 404);
    }

    if (medicationData.currentStock < 1) {
      throw new AppError('Sin stock disponible', 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const vaccineRecord = await tx.vaccineRecord.create({
      data: {
        petId: data.petId,
        visitId: data.visitId,
        nombre: data.nombre,
        marca: data.marca || medicationData?.supplier,
        nombreComercial: data.nombreComercial || medicationData?.nombreComercial,
        medicationId: data.medicationId,
        lote: data.lote || medicationData?.lote,
        fechaCaducidad: data.fechaCaducidad ? new Date(data.fechaCaducidad) : medicationData?.expirationDate,
        fecha: new Date(data.fecha),
        proximaDosis: data.proximaDosis ? new Date(data.proximaDosis) : null,
        aplicadaPor: (req as any).user?.nombre,
        aplicadoPorId: userId,
        viaAdministracion: data.viaAdministracion,
        costo: data.costo || (medicationData ? Number(medicationData.salePrice) : null),
        notas: data.notas,
      },
    });

    // Update stock if from inventory
    if (data.medicationId && medicationData) {
      await tx.medication.update({
        where: { id: data.medicationId },
        data: { currentStock: { decrement: 1 } },
      });

      await tx.stockMovement.create({
        data: {
          medicationId: data.medicationId,
          type: 'SALIDA',
          quantity: 1,
          previousStock: medicationData.currentStock,
          newStock: medicationData.currentStock - 1,
          reason: `Vacunación individual`,
          reference: `VAC-${vaccineRecord.id}`,
          performedById: userId,
        },
      });
    }

    // Update pet
    await tx.pet.update({
      where: { id: data.petId },
      data: {
        ultimaVacuna: new Date(data.fecha),
        vacunasActualizadas: true,
      },
    });

    return vaccineRecord;
  });

  res.status(201).json({
    status: 'success',
    message: 'Vacuna registrada exitosamente',
    data: { vaccineRecord: result },
  });
});

// ============================================================================
// POST /preventive-medicine/deworming - Add single deworming record
// ============================================================================
router.post('/deworming', authenticate, isMedico, async (req, res) => {
  const data = dewormingRecordSchema.parse(req.body);
  const userId = (req as any).user?.userId;

  let medicationData: any = null;

  if (data.medicationId) {
    medicationData = await prisma.medication.findUnique({
      where: { id: data.medicationId },
    });

    if (!medicationData) {
      throw new AppError('Medicamento no encontrado', 404);
    }

    if (medicationData.currentStock < 1) {
      throw new AppError('Sin stock disponible', 400);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const dewormingRecord = await tx.dewormingRecord.create({
      data: {
        petId: data.petId,
        visitId: data.visitId,
        marca: data.marca,
        nombreComercial: data.nombreComercial,
        tipo: data.tipo,
        medicationId: data.medicationId,
        lote: data.lote || medicationData?.lote,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        proximaAplicacion: new Date(data.proximaAplicacion),
        aplicadoPor: (req as any).user?.nombre,
        aplicadoPorId: userId,
        costo: data.costo || (medicationData ? Number(medicationData.salePrice) : null),
        notas: data.notas,
      },
    });

    // Update stock if from inventory
    if (data.medicationId && medicationData) {
      await tx.medication.update({
        where: { id: data.medicationId },
        data: { currentStock: { decrement: 1 } },
      });

      await tx.stockMovement.create({
        data: {
          medicationId: data.medicationId,
          type: 'SALIDA',
          quantity: 1,
          previousStock: medicationData.currentStock,
          newStock: medicationData.currentStock - 1,
          reason: `Desparasitación individual`,
          reference: `DEW-${dewormingRecord.id}`,
          performedById: userId,
        },
      });
    }

    // Update pet
    await tx.pet.update({
      where: { id: data.petId },
      data: { ultimaDesparasitacion: new Date() },
    });

    return dewormingRecord;
  });

  res.status(201).json({
    status: 'success',
    message: 'Desparasitación registrada exitosamente',
    data: { dewormingRecord: result },
  });
});

// ============================================================================
// GET /preventive-medicine/today - Get today's preventive medicine records
// ============================================================================
router.get('/today', authenticate, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await prisma.preventiveMedicineRecord.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow },
    },
    include: {
      pet: {
        include: {
          owner: { select: { nombre: true, telefono: true } },
        },
      },
      aplicadoPor: { select: { nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    status: 'success',
    data: { records },
  });
});

// ============================================================================
// GET /preventive-medicine/upcoming - Get pets with upcoming vaccines/dewormings
// ============================================================================
router.get('/upcoming', authenticate, async (req, res) => {
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  const [upcomingVaccines, upcomingDewormings] = await Promise.all([
    prisma.vaccineRecord.findMany({
      where: {
        proximaDosis: { gte: today, lte: nextMonth },
      },
      include: {
        pet: {
          include: {
            owner: { select: { nombre: true, telefono: true, email: true } },
          },
        },
      },
      orderBy: { proximaDosis: 'asc' },
    }),
    prisma.dewormingRecord.findMany({
      where: {
        proximaAplicacion: { gte: today, lte: nextMonth },
      },
      include: {
        pet: {
          include: {
            owner: { select: { nombre: true, telefono: true, email: true } },
          },
        },
      },
      orderBy: { proximaAplicacion: 'asc' },
    }),
  ]);

  res.json({
    status: 'success',
    data: { upcomingVaccines, upcomingDewormings },
  });
});

export default router;
