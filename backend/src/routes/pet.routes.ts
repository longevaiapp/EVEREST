// src/routes/pet.routes.ts
// Pet (Mascota/Paciente) routes - RECEPCION module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isRecepcion, isMedico } from '../middleware/auth';

const router = Router();

// Validation schemas
const createPetSchema = z.object({
  ownerId: z.string().cuid(),
  nombre: z.string().min(1, 'Name is required'),
  especie: z.enum(['PERRO', 'GATO', 'AVE', 'ROEDOR', 'REPTIL', 'OTRO']),
  raza: z.string().optional().nullable(),
  sexo: z.enum(['MACHO', 'HEMBRA']),
  fechaNacimiento: z.string().datetime().optional().nullable(),
  peso: z.number().positive().optional().nullable(),
  color: z.string().optional().nullable(),
  condicionCorporal: z.enum(['MUY_DELGADO', 'DELGADO', 'IDEAL', 'SOBREPESO', 'OBESO']).optional().nullable(),
  fotoUrl: z.string().optional().nullable(), // Base64 encoded image
  // Medical history
  snapTest: z.string().optional().nullable(),
  analisisClinicos: z.string().optional().nullable(),
  antecedentes: z.string().optional().nullable(),
  // Vaccines
  desparasitacionExterna: z.boolean().optional().nullable(),
  ultimaDesparasitacion: z.string().datetime().optional().nullable(),
  vacunasTexto: z.string().optional().nullable(),
  vacunasActualizadas: z.boolean().optional().nullable(),
  ultimaVacuna: z.string().datetime().optional().nullable(),
  // Surgeries
  esterilizado: z.boolean().optional().nullable(),
  otrasCirugias: z.boolean().optional().nullable(),
  detalleCirugias: z.string().optional().nullable(),
  // Reproductive (females)
  ultimoCelo: z.string().datetime().optional().nullable(),
  cantidadPartos: z.number().int().optional().nullable(),
  ultimoParto: z.string().datetime().optional().nullable(),
  // Feeding
  alimento: z.string().optional().nullable(),
  porcionesPorDia: z.string().optional().nullable(),
  otrosAlimentos: z.string().optional().nullable(),
  frecuenciaOtrosAlimentos: z.string().optional().nullable(),
  // Allergies
  alergias: z.string().optional().nullable(),
  enfermedadesCronicas: z.string().optional().nullable(),
  // Lifestyle
  conviveOtrasMascotas: z.boolean().optional().nullable(),
  cualesMascotas: z.string().optional().nullable(),
  actividadFisica: z.boolean().optional().nullable(),
  frecuenciaActividad: z.string().optional().nullable(),
  saleViaPublica: z.boolean().optional().nullable(),
  frecuenciaSalida: z.string().optional().nullable(),
  otrosDatos: z.string().optional().nullable(),
});

const updatePetSchema = createPetSchema.partial().omit({ ownerId: true });

// Helper to generate ficha number
async function generateFichaNumber(): Promise<string> {
  const lastPet = await prisma.pet.findFirst({
    orderBy: { numeroFicha: 'desc' },
    select: { numeroFicha: true },
  });

  if (!lastPet) {
    return 'VET-001';
  }

  const lastNumber = parseInt(lastPet.numeroFicha.split('-')[1]);
  return `VET-${String(lastNumber + 1).padStart(3, '0')}`;
}

// GET /pets - List all pets
router.get('/', authenticate, async (req, res) => {
  const { search, estado, especie, page = '1', limit = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = { activo: true };

  if (search) {
    where.OR = [
      { nombre: { contains: search as string } },
      { numeroFicha: { contains: search as string } },
      { owner: { nombre: { contains: search as string } } },
      { owner: { telefono: { contains: search as string } } },
    ];
  }

  if (estado) {
    where.estado = estado;
  }

  if (especie) {
    where.especie = especie;
  }

  const [pets, total] = await Promise.all([
    prisma.pet.findMany({
      where,
      include: {
        owner: {
          select: { id: true, nombre: true, telefono: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.pet.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      pets,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    },
  });
});

// GET /pets/by-owner/:ownerId - Get pets by owner ID
router.get('/by-owner/:ownerId', authenticate, async (req, res) => {
  const ownerId = req.params.ownerId as string;

  const pets = await prisma.pet.findMany({
    where: {
      ownerId,
      activo: true,
    },
    include: {
      owner: {
        select: { id: true, nombre: true, telefono: true },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  res.json({
    status: 'success',
    data: { pets },
  });
});

// GET /pets/by-status/:status - Get pets by status
router.get('/by-status/:status', authenticate, async (req, res) => {
  const { status } = req.params;

  const pets = await prisma.pet.findMany({
    where: {
      estado: status as any,
      activo: true,
    },
    include: {
      owner: {
        select: { id: true, nombre: true, telefono: true },
      },
      visits: {
        take: 1,
        orderBy: { arrivalTime: 'desc' },
        select: {
          id: true,
          arrivalTime: true,
          prioridad: true,
          motivo: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    status: 'success',
    data: { pets },
  });
});

// GET /pets/historial/:id - Get complete medical history for a pet
// Can be accessed by both RECEPCION and MEDICO
router.get('/historial/:id', authenticate, async (req, res) => {
  const petId = req.params.id as string;

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: { owner: true },
  });

  if (!pet) throw new AppError('Paciente no encontrado', 404);

  // Get all consultations with full details
  const consultas = await prisma.consultation.findMany({
    where: { petId },
    include: {
      doctor: { select: { id: true, nombre: true, especialidad: true } },
      diagnosticos: true,
      signosVitales: { orderBy: { registeredAt: 'desc' } },
      prescriptions: { include: { items: true } },
      labRequests: true,
    },
    orderBy: { startTime: 'desc' },
  });

  // Get all surgeries
  const cirugias = await prisma.surgery.findMany({
    where: { petId },
    include: {
      surgeon: { select: { id: true, nombre: true, especialidad: true } },
    },
    orderBy: { scheduledDate: 'desc' },
  });

  // Get all hospitalizations
  const hospitalizaciones = await prisma.hospitalization.findMany({
    where: { petId },
    include: {
      monitorings: { orderBy: { recordedAt: 'desc' } },
      admittedBy: { select: { id: true, nombre: true } },
    },
    orderBy: { admittedAt: 'desc' },
  });

  // Get all vaccines
  const vacunas = await prisma.vaccineRecord.findMany({
    where: { petId },
    orderBy: { fecha: 'desc' },
  });

  // Get all medical notes
  const notas = await prisma.medicalNote.findMany({
    where: { petId },
    include: {
      createdBy: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    status: 'success',
    data: {
      paciente: pet,
      historial: {
        consultas,
        cirugias,
        hospitalizaciones,
        vacunas,
        notas,
      },
      resumen: {
        totalConsultas: consultas.length,
        totalCirugias: cirugias.length,
        totalHospitalizaciones: hospitalizaciones.length,
        ultimaConsulta: consultas[0]?.startTime || null,
      },
    },
  });
});

// GET /pets/preventive-calendar - Get pets needing preventive care (vaccines, deworming)
// MUST be before /:id route to avoid being caught by the parameter route
router.get('/preventive-calendar', authenticate, async (req, res) => {
  const today = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Find pets that need preventive care:
  const petsNeedingCare = await prisma.pet.findMany({
    where: {
      activo: true,
      OR: [
        { vacunasActualizadas: false },
        { ultimaVacuna: null },
        { ultimaVacuna: { lt: oneYearAgo } },
        { ultimaDesparasitacion: { lt: sixMonthsAgo } },
        { 
          AND: [
            { desparasitacionExterna: true },
            { ultimaDesparasitacion: null }
          ]
        },
      ],
    },
    include: {
      owner: {
        select: { id: true, nombre: true, telefono: true, email: true },
      },
      vaccineRecords: {
        where: {
          proximaDosis: {
            gte: today,
            lte: oneMonthFromNow,
          },
        },
        orderBy: { proximaDosis: 'asc' },
        take: 1,
      },
    },
    orderBy: [
      { ultimaVacuna: 'asc' },
      { ultimaDesparasitacion: 'asc' },
    ],
    take: 50,
  });

  const preventiveCalendar = petsNeedingCare.map(pet => {
    const needs: any[] = [];
    
    if (!pet.vacunasActualizadas || !pet.ultimaVacuna || pet.ultimaVacuna < oneYearAgo) {
      needs.push({
        type: 'VACUNA',
        reason: !pet.ultimaVacuna ? 'Sin registro de vacunas' : 
                pet.ultimaVacuna < oneYearAgo ? 'Vacuna vencida' : 'Vacunas no actualizadas',
        lastDate: pet.ultimaVacuna,
        priority: !pet.ultimaVacuna ? 'alta' : 'media',
      });
    }

    if (!pet.ultimaDesparasitacion || pet.ultimaDesparasitacion < sixMonthsAgo) {
      needs.push({
        type: 'DESPARASITACION',
        reason: !pet.ultimaDesparasitacion ? 'Sin registro de desparasitación' : 'Desparasitación vencida',
        lastDate: pet.ultimaDesparasitacion,
        priority: !pet.ultimaDesparasitacion ? 'alta' : 'media',
      });
    }

    if (pet.vaccineRecords.length > 0) {
      const nextVaccine = pet.vaccineRecords[0];
      needs.push({
        type: 'VACUNA_PROGRAMADA',
        reason: `${nextVaccine.vacuna} programada`,
        scheduledDate: nextVaccine.proximaDosis,
        priority: 'alta',
      });
    }

    return {
      id: pet.id,
      nombre: pet.nombre,
      numeroFicha: pet.numeroFicha,
      especie: pet.especie,
      raza: pet.raza,
      fotoUrl: pet.fotoUrl,
      propietario: pet.owner.nombre,
      telefono: pet.owner.telefono,
      email: pet.owner.email,
      needs,
      ultimaVacuna: pet.ultimaVacuna,
      ultimaDesparasitacion: pet.ultimaDesparasitacion,
    };
  }).filter(pet => pet.needs.length > 0);

  res.json({
    status: 'success',
    data: {
      preventiveCalendar,
      total: preventiveCalendar.length,
    },
  });
});

// GET /pets/:id - Get pet by ID with full details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: true,
      vaccineRecords: {
        orderBy: { fecha: 'desc' },
      },
      visits: {
        take: 10,
        orderBy: { arrivalTime: 'desc' },
        include: {
          consultation: {
            select: {
              id: true,
              diagnosis: true,
              treatment: true,
              doctor: { select: { nombre: true } },
            },
          },
        },
      },
      consultations: {
        take: 10,
        orderBy: { startTime: 'desc' },
        include: {
          doctor: { select: { nombre: true, especialidad: true } },
        },
      },
      surgeries: {
        take: 5,
        orderBy: { scheduledDate: 'desc' },
      },
      hospitalizations: {
        take: 5,
        orderBy: { admittedAt: 'desc' },
      },
    },
  });

  if (!pet) {
    throw new AppError('Pet not found', 404);
  }

  res.json({
    status: 'success',
    data: { pet },
  });
});

// POST /pets - Create new pet
router.post('/', authenticate, isRecepcion, async (req, res) => {
  const data = createPetSchema.parse(req.body);

  // Verify owner exists
  const owner = await prisma.owner.findUnique({
    where: { id: data.ownerId },
  });

  if (!owner) {
    throw new AppError('Owner not found', 404);
  }

  const numeroFicha = await generateFichaNumber();

  const pet = await prisma.pet.create({
    data: {
      ...data,
      numeroFicha,
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
      ultimaDesparasitacion: data.ultimaDesparasitacion ? new Date(data.ultimaDesparasitacion) : null,
      ultimaVacuna: data.ultimaVacuna ? new Date(data.ultimaVacuna) : null,
      ultimoCelo: data.ultimoCelo ? new Date(data.ultimoCelo) : null,
      ultimoParto: data.ultimoParto ? new Date(data.ultimoParto) : null,
    },
    include: {
      owner: { select: { id: true, nombre: true, telefono: true } },
    },
  });

  res.status(201).json({
    status: 'success',
    data: { pet },
  });
});

// PUT /pets/:id - Update pet
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const data = updatePetSchema.parse(req.body);

  const pet = await prisma.pet.update({
    where: { id },
    data: {
      ...data,
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
      ultimaDesparasitacion: data.ultimaDesparasitacion ? new Date(data.ultimaDesparasitacion) : undefined,
      ultimaVacuna: data.ultimaVacuna ? new Date(data.ultimaVacuna) : undefined,
      ultimoCelo: data.ultimoCelo ? new Date(data.ultimoCelo) : undefined,
      ultimoParto: data.ultimoParto ? new Date(data.ultimoParto) : undefined,
    },
    include: {
      owner: { select: { id: true, nombre: true, telefono: true } },
    },
  });

  res.json({
    status: 'success',
    data: { pet },
  });
});

// PATCH /pets/:id/status - Update pet status
router.patch('/:id/status', authenticate, async (req, res) => {
  const id = req.params.id as string;
  const { estado } = z.object({
    estado: z.enum([
      'RECIEN_LLEGADO', 'EN_ESPERA', 'EN_CONSULTA', 'EN_ESTUDIOS',
      'EN_FARMACIA', 'CIRUGIA_PROGRAMADA', 'EN_CIRUGIA', 'HOSPITALIZADO',
      'LISTO_PARA_ALTA', 'ALTA'
    ]),
  }).parse(req.body);

  const pet = await prisma.pet.update({
    where: { id },
    data: { estado },
  });

  res.json({
    status: 'success',
    data: { pet },
  });
});

// DELETE /pets/:id - Soft delete pet
router.delete('/:id', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  await prisma.pet.update({
    where: { id },
    data: { activo: false },
  });

  res.json({
    status: 'success',
    message: 'Pet deleted successfully',
  });
});

export default router;
