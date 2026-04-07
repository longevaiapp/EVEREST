// src/routes/admin.routes.ts
// Admin routes for user management and permissions

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Middleware: require ADMIN role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.rol !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }
  next();
};

router.use(requireAdmin);

// Valid dashboard keys
const DASHBOARD_KEYS = [
  'recepcion', 'medico', 'farmacia', 'laboratorio', 'estilista',
  'admin', 'hospitalizacion', 'crematorio', 'banco-sangre', 'quirofano'
] as const;

const ALL_ROLES = [
  'ADMIN', 'RECEPCION', 'MEDICO', 'LABORATORIO', 'FARMACIA',
  'ESTILISTA', 'HOSPITALIZACION', 'QUIROFANO', 'RECOLECTOR',
  'OPERADOR_CREMATORIO', 'ENTREGA', 'BANCO_SANGRE'
] as const;

// GET /admin/users - List all users
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      especialidad: true,
      telefono: true,
      activo: true,
      dashboardAccess: true,
      createdAt: true,
    },
    orderBy: { nombre: 'asc' },
  });

  // Parse dashboardAccess JSON for each user
  const parsed = users.map(u => ({
    ...u,
    dashboardAccess: u.dashboardAccess ? JSON.parse(u.dashboardAccess) : null,
  }));

  res.json({ status: 'success', data: { users: parsed } });
});

// POST /admin/users - Create a new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(2),
  rol: z.enum(ALL_ROLES as any),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
  dashboardAccess: z.array(z.string()).optional(),
});

router.post('/users', async (req, res) => {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      nombre: data.nombre,
      rol: data.rol as any,
      especialidad: data.especialidad,
      telefono: data.telefono,
      dashboardAccess: data.dashboardAccess ? JSON.stringify(data.dashboardAccess) : null,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      especialidad: true,
      telefono: true,
      activo: true,
      dashboardAccess: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        ...user,
        dashboardAccess: user.dashboardAccess ? JSON.parse(user.dashboardAccess) : null,
      },
    },
  });
});

// PUT /admin/users/:id - Update user info
const updateUserSchema = z.object({
  nombre: z.string().min(2).optional(),
  email: z.string().email().optional(),
  rol: z.enum(ALL_ROLES as any).optional(),
  especialidad: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  password: z.string().min(6).optional(),
  dashboardAccess: z.array(z.string()).nullable().optional(),
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const data = updateUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  // If email is changing, check uniqueness
  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) {
      throw new AppError('Email already in use', 409);
    }
  }

  const updateData: any = {};
  if (data.nombre !== undefined) updateData.nombre = data.nombre;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.rol !== undefined) updateData.rol = data.rol;
  if (data.especialidad !== undefined) updateData.especialidad = data.especialidad;
  if (data.telefono !== undefined) updateData.telefono = data.telefono;
  if (data.activo !== undefined) updateData.activo = data.activo;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 12);
  if (data.dashboardAccess !== undefined) {
    updateData.dashboardAccess = data.dashboardAccess ? JSON.stringify(data.dashboardAccess) : null;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      especialidad: true,
      telefono: true,
      activo: true,
      dashboardAccess: true,
      createdAt: true,
    },
  });

  res.json({
    status: 'success',
    data: {
      user: {
        ...user,
        dashboardAccess: user.dashboardAccess ? JSON.parse(user.dashboardAccess) : null,
      },
    },
  });
});

// PUT /admin/users/:id/permissions - Update only dashboard access
const permissionsSchema = z.object({
  dashboardAccess: z.array(z.string()),
});

router.put('/users/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { dashboardAccess } = permissionsSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { dashboardAccess: JSON.stringify(dashboardAccess) },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      dashboardAccess: true,
    },
  });

  res.json({
    status: 'success',
    data: {
      user: {
        ...user,
        dashboardAccess: user.dashboardAccess ? JSON.parse(user.dashboardAccess) : null,
      },
    },
  });
});

// DELETE /admin/users/:id - Deactivate user (soft delete)
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  // Don't allow deleting yourself
  if (id === req.user!.userId) {
    throw new AppError('Cannot delete your own account', 400);
  }

  await prisma.user.update({
    where: { id },
    data: { activo: false },
  });

  res.json({ status: 'success', message: 'User deactivated' });
});

export default router;
