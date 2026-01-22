// src/middleware/auth.ts
// Authentication middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  rol: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, activo: true },
    });

    if (!user || !user.activo) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

// Role-based authorization
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return next(new AppError('Not authorized for this action', 403));
    }

    next();
  };
};

// Check if user is admin
export const isAdmin = authorize('ADMIN');

// Check if user is receptionist or admin
export const isRecepcion = authorize('RECEPCION', 'ADMIN');

// Check if user is doctor or admin
export const isMedico = authorize('MEDICO', 'ADMIN');

// Check if user is lab tech or admin
export const isLaboratorio = authorize('LABORATORIO', 'ADMIN');

// Check if user is pharmacist or admin
export const isFarmacia = authorize('FARMACIA', 'ADMIN');
