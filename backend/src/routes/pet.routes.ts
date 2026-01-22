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
  fotoUrl: z.string().url().optional().nullable(),
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

// GET /pets/:id - Get pet by ID with full details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

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
  const { id } = req.params;
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
  const { id } = req.params;
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
  const { id } = req.params;

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
