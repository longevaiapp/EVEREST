// src/routes/auth.routes.ts
// Authentication routes

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nombre: z.string().min(2, 'Name must be at least 2 characters'),
  rol: z.enum(['ADMIN', 'RECEPCION', 'MEDICO', 'LABORATORIO', 'FARMACIA']),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.activo) {
    throw new AppError('Account is disabled', 401);
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        especialidad: user.especialidad,
      },
      token,
    },
  });
});

// POST /auth/register (admin only in production)
router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      especialidad: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      especialidad: true,
      telefono: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    status: 'success',
    data: { user },
  });
});

// POST /auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
  });

  const { currentPassword, newPassword } = schema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);

  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res.json({
    status: 'success',
    message: 'Password changed successfully',
  });
});

export default router;
