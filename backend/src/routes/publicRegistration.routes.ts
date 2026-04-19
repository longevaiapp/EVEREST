// src/routes/publicRegistration.routes.ts
// Public routes for client self-registration via QR code
// NO authentication required — rate-limited and validated

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { Species, Sexo } from '@prisma/client';

const router = Router();

// Simple in-memory rate limiter (per IP, max 10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: any, _res: any, next: any) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }

  if (entry.count >= 10) {
    throw new AppError('Demasiadas solicitudes. Intente en un minuto.', 429);
  }

  entry.count++;
  return next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

// POST /public/register - Full client self-registration
router.post('/register', rateLimit, async (req, res) => {
  const schema = z.object({
    // Owner data
    owner: z.object({
      nombre: z.string().min(2).max(100),
      telefono: z.string().min(8).max(15),
      email: z.string().email().optional().nullable(),
      direccion: z.string().max(200).optional().nullable(),
      ciudad: z.string().max(100).optional().nullable(),
      codigoPostal: z.string().max(10).optional().nullable(),
    }),
    // Pet data
    pet: z.object({
      nombre: z.string().min(1).max(100),
      especie: z.string(),
      raza: z.string().max(100).optional().nullable(),
      sexo: z.string(),
      fechaNacimiento: z.string().optional().nullable(),
      peso: z.number().positive().optional().nullable(),
      color: z.string().max(50).optional().nullable(),
      esterilizado: z.boolean().optional(),
      fotoUrl: z.string().max(2_700_000).optional().nullable(), // Max ~2MB base64
      // Medical history
      vacunasActualizadas: z.boolean().optional(),
      ultimaVacuna: z.string().optional().nullable(),
      desparasitacionExterna: z.boolean().optional(),
      ultimaDesparasitacionExterna: z.string().optional().nullable(),
      desparasitacionInterna: z.boolean().optional(),
      ultimaDesparasitacionInterna: z.string().optional().nullable(),
      otrasCirugias: z.boolean().optional(),
      detalleCirugias: z.string().max(1000).optional().nullable(),
      alergias: z.string().max(1000).optional().nullable(),
      antecedentes: z.string().max(1000).optional().nullable(),
    }),
    // Visit/consultation reason (optional)
    consulta: z.object({
      motivoConsulta: z.string().max(500).optional(),
      sintomas: z.array(z.string()).optional(),
      duracionSintomas: z.string().max(100).optional(),
      comportamiento: z.string().max(200).optional(),
      apetito: z.string().max(100).optional(),
      agua: z.string().max(100).optional(),
      orina: z.string().max(100).optional(),
      heces: z.string().max(100).optional(),
      otrosDetalles: z.string().max(500).optional(),
    }).optional(),
  });

  const data = schema.parse(req.body);
  const normalizedPhone = String(data.owner.telefono || '').replace(/[^\d+]/g, '').trim();
  const normalizedSexo = String(data.pet.sexo || '').trim().toLowerCase();
  // Map species
  const especieMap: Record<string, string> = {
    'Perro': 'PERRO', 'Gato': 'GATO', 'Ave': 'AVE', 'Roedor': 'ROEDOR', 'Reptil': 'REPTIL',
    'Dog': 'PERRO', 'Cat': 'GATO', 'Bird': 'AVE', 'Rodent': 'ROEDOR', 'Reptile': 'REPTIL',
    'Canino': 'PERRO', 'Felino': 'GATO',
    'PERRO': 'PERRO', 'GATO': 'GATO', 'AVE': 'AVE', 'ROEDOR': 'ROEDOR', 'REPTIL': 'REPTIL',
  };
  const especie = (especieMap[data.pet.especie] || 'OTRO') as Species;
  const sexo = (
    normalizedSexo === 'macho' || normalizedSexo === 'male'
      ? 'MACHO'
      : 'HEMBRA'
  ) as Sexo;
  // Use a transaction so it's all-or-nothing
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or find owner by phone
    let owner = await tx.owner.findFirst({
      where: { telefono: normalizedPhone || data.owner.telefono },
    });

    if (!owner) {
      owner = await tx.owner.create({
        data: {
          nombre: data.owner.nombre,
          telefono: normalizedPhone || data.owner.telefono,
          email: data.owner.email || null,
          direccion: data.owner.direccion || null,
          ciudad: data.owner.ciudad || null,
          codigoPostal: data.owner.codigoPostal || null,
        },
      });
    }

    // 2. Create pet
    // Generate ficha number
    const lastPet = await tx.pet.findFirst({ orderBy: { createdAt: 'desc' }, select: { numeroFicha: true } });
    const lastNum = lastPet?.numeroFicha ? parseInt(lastPet.numeroFicha.replace(/\D/g, '')) : 0;
    const numeroFicha = `VET-${String((lastNum || 0) + 1).padStart(4, '0')}`;

    const pet = await tx.pet.create({
      data: {
        ownerId: owner.id,
        nombre: data.pet.nombre,
        especie,
        raza: data.pet.raza || null,
        sexo,
        numeroFicha,
        fechaNacimiento: data.pet.fechaNacimiento ? new Date(data.pet.fechaNacimiento) : null,
        peso: data.pet.peso || null,
        color: data.pet.color || null,
        esterilizado: data.pet.esterilizado || false,
        fotoUrl: data.pet.fotoUrl || null,
        vacunasActualizadas: data.pet.vacunasActualizadas || false,
        ultimaVacuna: data.pet.ultimaVacuna ? new Date(data.pet.ultimaVacuna) : null,
        desparasitacionExterna: data.pet.desparasitacionExterna || false,
        ultimaDesparasitacionExterna: data.pet.ultimaDesparasitacionExterna ? new Date(data.pet.ultimaDesparasitacionExterna) : null,
        desparasitacionInterna: data.pet.desparasitacionInterna || false,
        ultimaDesparasitacionInterna: data.pet.ultimaDesparasitacionInterna ? new Date(data.pet.ultimaDesparasitacionInterna) : null,
        otrasCirugias: data.pet.otrasCirugias || false,
        detalleCirugias: data.pet.detalleCirugias || null,
        alergias: data.pet.alergias || null,
        antecedentes: data.pet.antecedentes || null,
        estado: 'RECIEN_LLEGADO',
      },
    });

    // 3. Create visit
    const visit = await tx.visit.create({
      data: {
        petId: pet.id,
        status: 'RECIEN_LLEGADO',
        tipoVisita: 'CONSULTA_GENERAL',
        motivo: data.consulta?.motivoConsulta || 'Registro por QR',
      },
    });

    return { owner, pet, visit };
  });

  res.status(201).json({
    status: 'success',
    data: {
      owner: { id: result.owner.id, nombre: result.owner.nombre },
      pet: { id: result.pet.id, nombre: result.pet.nombre, numeroFicha: result.pet.numeroFicha },
      visit: { id: result.visit.id, status: result.visit.status },
    },
  });
});

// GET /public/search-owner - Search owner by phone (limited fields)
router.get('/search-owner', rateLimit, async (req, res) => {
  const phone = z.string().min(8).max(15).parse(req.query.phone);

  const owner = await prisma.owner.findFirst({
    where: { telefono: { contains: phone } },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      pets: {
        select: {
          id: true,
          nombre: true,
          especie: true,
          raza: true,
          fechaNacimiento: true,
          numeroFicha: true,
        },
      },
    },
  });

  res.json({ status: 'success', data: { owner } });
});

// POST /public/checkin-existing - Check-in existing pet (no auth)
router.post('/checkin-existing', rateLimit, async (req, res) => {
  const schema = z.object({
    petId: z.string(),
    motivoConsulta: z.string().max(500).optional(),
    sintomas: z.array(z.string()).optional(),
    duracionSintomas: z.string().max(100).optional(),
    comportamiento: z.string().max(200).optional(),
    apetito: z.string().max(100).optional(),
    agua: z.string().max(100).optional(),
    orina: z.string().max(100).optional(),
    heces: z.string().max(100).optional(),
    otrosDetalles: z.string().max(500).optional(),
  });

  const data = schema.parse(req.body);

  // Verify pet exists
  const pet = await prisma.pet.findUnique({ where: { id: data.petId } });
  if (!pet) throw new AppError('Mascota no encontrada', 404);

  // Check no active visit already
  const activeVisit = await prisma.visit.findFirst({
    where: { petId: data.petId, status: { notIn: ['ALTA', 'CANCELADO'] as any } },
  });
  if (activeVisit) throw new AppError('Esta mascota ya tiene una visita activa', 409);

  const visit = await prisma.visit.create({
    data: {
      petId: data.petId,
      status: 'RECIEN_LLEGADO',
      tipoVisita: 'CONSULTA_GENERAL',
      motivo: data.motivoConsulta || 'Check-in por QR',
    },
  });

  await prisma.pet.update({
    where: { id: data.petId },
    data: { estado: 'RECIEN_LLEGADO' },
  });

  res.status(201).json({ status: 'success', data: { visit } });
});

export default router;
