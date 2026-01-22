// src/middleware/errorHandler.ts
// Global error handling middleware

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          status: 'error',
          message: 'A record with this value already exists',
          field: (err.meta?.target as string[])?.join(', '),
        });
      case 'P2025':
        return res.status(404).json({
          status: 'error',
          message: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          status: 'error',
          message: 'Foreign key constraint failed',
        });
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Database error',
          code: err.code,
        });
    }
  }

  // App errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Unknown errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
