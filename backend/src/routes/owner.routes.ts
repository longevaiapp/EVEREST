// src/routes/owner.routes.ts
// Owner (Propietario) routes - RECEPCION module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isRecepcion } from '../middleware/auth';

const router = Router();

// Validation schemas
const createOwnerSchema = z.object({
  nombre: z.string().min(2, 'Name must be at least 2 characters'),
  telefono: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email().optional().nullable(),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  codigoPostal: z.string().optional().nullable(),
});

const updateOwnerSchema = createOwnerSchema.partial();

// GET /owners - List all owners with their pets count
router.get('/', authenticate, async (req, res) => {
  const { search, page = '1', limit = '20' } = req.query;
  
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where = search
    ? {
        OR: [
          { nombre: { contains: search as string } },
          { telefono: { contains: search as string } },
          { email: { contains: search as string } },
        ],
      }
    : {};

  const [owners, total] = await Promise.all([
    prisma.owner.findMany({
      where,
      include: {
        _count: { select: { pets: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.owner.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      owners,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    },
  });
});

// GET /owners/search?telefono=xxx - Search by phone (for check-in)
router.get('/search', authenticate, async (req, res) => {
  const { telefono } = req.query;

  if (!telefono) {
    throw new AppError('Phone number is required', 400);
  }

  const owner = await prisma.owner.findFirst({
    where: {
      telefono: { contains: telefono as string },
    },
    include: {
      pets: {
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      },
    },
  });

  if (!owner) {
    throw new AppError('Owner not found', 404);
  }

  res.json({
    status: 'success',
    data: { owner },
  });
});

// GET /owners/:id - Get owner by ID with pets
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id as string;

  const owner = await prisma.owner.findUnique({
    where: { id },
    include: {
      pets: {
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      },
    },
  });

  if (!owner) {
    throw new AppError('Owner not found', 404);
  }

  res.json({
    status: 'success',
    data: { owner },
  });
});

// POST /owners - Create new owner
router.post('/', authenticate, isRecepcion, async (req, res) => {
  const data = createOwnerSchema.parse(req.body);

  // Check if phone already exists
  const existing = await prisma.owner.findUnique({
    where: { telefono: data.telefono },
  });

  if (existing) {
    throw new AppError('Phone number already registered', 409);
  }

  const owner = await prisma.owner.create({
    data,
  });

  res.status(201).json({
    status: 'success',
    data: { owner },
  });
});

// PUT /owners/:id - Update owner
router.put('/:id', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;
  const data = updateOwnerSchema.parse(req.body);

  // Check if phone is being changed and already exists
  if (data.telefono) {
    const existing = await prisma.owner.findFirst({
      where: {
        telefono: data.telefono,
        NOT: { id },
      },
    });

    if (existing) {
      throw new AppError('Phone number already registered', 409);
    }
  }

  const owner = await prisma.owner.update({
    where: { id },
    data,
  });

  res.json({
    status: 'success',
    data: { owner },
  });
});

// DELETE /owners/:id - Delete owner (soft delete by removing pets first)
router.delete('/:id', authenticate, isRecepcion, async (req, res) => {
  const id = req.params.id as string;

  // Check if owner has active pets
  const petsCount = await prisma.pet.count({
    where: { ownerId: id, activo: true },
  });

  if (petsCount > 0) {
    throw new AppError('Cannot delete owner with active pets', 400);
  }

  await prisma.owner.delete({
    where: { id },
  });

  res.json({
    status: 'success',
    message: 'Owner deleted successfully',
  });
});

export default router;
