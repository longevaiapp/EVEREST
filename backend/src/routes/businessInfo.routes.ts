// src/routes/businessInfo.routes.ts
// Business/Clinic Info routes - ADMIN module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// GET /business-info - Get clinic configuration (public for prescription PDF)
router.get('/', authenticate, async (req, res) => {
  // Get the first (and should be only) business info record
  const info = await prisma.businessInfo.findFirst();

  if (!info) {
    // Return empty/default structure if not configured
    return res.json({
      status: 'success',
      data: {
        businessInfo: null,
        configured: false
      }
    });
  }

  return res.json({
    status: 'success',
    data: {
      businessInfo: info,
      configured: true
    }
  });
});

// POST /business-info - Create or update clinic configuration
router.post('/', authenticate, isAdmin, async (req, res) => {
  const schema = z.object({
    // Clinic data
    clinicName: z.string().min(1, 'Clinic name is required'),
    clinicAddress: z.string().min(1, 'Clinic address is required'),
    clinicCity: z.string().optional(),
    clinicState: z.string().optional(),
    clinicZip: z.string().optional(),
    clinicPhone: z.string().min(1, 'Clinic phone is required'),
    clinicEmail: z.string().email().optional().or(z.literal('')),
    clinicWebsite: z.string().optional(),
    clinicLogo: z.string().optional(),
    
    // Tax data
    taxId: z.string().optional(),
    taxName: z.string().optional(),
    
    // Vet data
    vetName: z.string().min(1, 'Veterinarian name is required'),
    vetLicense: z.string().min(1, 'Veterinarian license is required'),
    vetSpecialty: z.string().optional(),
    vetSignature: z.string().optional(),
    
    // Prescription config
    prescriptionHeader: z.string().optional(),
    prescriptionFooter: z.string().optional(),
    prescriptionWarnings: z.string().optional(),
    
    // Hospitalization rates (per day)
    tarifaHospGeneral: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaHospUCI: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaHospNeonatos: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaHospInfecciosos: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaConsultaGeneral: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    
    // Study rates
    tarifaBH: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaQS: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaRX: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaUS: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaEGO: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaECG: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaElectrolitos: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
    tarifaSNAP: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : null),
  });

  const data = schema.parse(req.body);

  // Check if record exists
  const existing = await prisma.businessInfo.findFirst();

  let businessInfo;
  if (existing) {
    // Update existing
    businessInfo = await prisma.businessInfo.update({
      where: { id: existing.id },
      data: {
        clinicName: data.clinicName,
        clinicAddress: data.clinicAddress,
        clinicCity: data.clinicCity || null,
        clinicState: data.clinicState || null,
        clinicZip: data.clinicZip || null,
        clinicPhone: data.clinicPhone,
        clinicEmail: data.clinicEmail || null,
        clinicWebsite: data.clinicWebsite || null,
        clinicLogo: data.clinicLogo || null,
        taxId: data.taxId || null,
        taxName: data.taxName || null,
        vetName: data.vetName,
        vetLicense: data.vetLicense,
        vetSpecialty: data.vetSpecialty || null,
        vetSignature: data.vetSignature || null,
        prescriptionHeader: data.prescriptionHeader || null,
        prescriptionFooter: data.prescriptionFooter || null,
        prescriptionWarnings: data.prescriptionWarnings || null,
        // Hospitalization rates
        tarifaHospGeneral: data.tarifaHospGeneral,
        tarifaHospUCI: data.tarifaHospUCI,
        tarifaHospNeonatos: data.tarifaHospNeonatos,
        tarifaHospInfecciosos: data.tarifaHospInfecciosos,
        tarifaConsultaGeneral: data.tarifaConsultaGeneral,
        // Study rates
        tarifaBH: data.tarifaBH,
        tarifaQS: data.tarifaQS,
        tarifaRX: data.tarifaRX,
        tarifaUS: data.tarifaUS,
        tarifaEGO: data.tarifaEGO,
        tarifaECG: data.tarifaECG,
        tarifaElectrolitos: data.tarifaElectrolitos,
        tarifaSNAP: data.tarifaSNAP,
      },
    });
  } else {
    // Create new
    businessInfo = await prisma.businessInfo.create({
      data: {
        clinicName: data.clinicName,
        clinicAddress: data.clinicAddress,
        clinicCity: data.clinicCity || null,
        clinicState: data.clinicState || null,
        clinicZip: data.clinicZip || null,
        clinicPhone: data.clinicPhone,
        clinicEmail: data.clinicEmail || null,
        clinicWebsite: data.clinicWebsite || null,
        clinicLogo: data.clinicLogo || null,
        taxId: data.taxId || null,
        taxName: data.taxName || null,
        vetName: data.vetName,
        vetLicense: data.vetLicense,
        vetSpecialty: data.vetSpecialty || null,
        vetSignature: data.vetSignature || null,
        prescriptionHeader: data.prescriptionHeader || null,
        prescriptionFooter: data.prescriptionFooter || null,
        prescriptionWarnings: data.prescriptionWarnings || null,
        // Hospitalization rates
        tarifaHospGeneral: data.tarifaHospGeneral,
        tarifaHospUCI: data.tarifaHospUCI,
        tarifaHospNeonatos: data.tarifaHospNeonatos,
        tarifaHospInfecciosos: data.tarifaHospInfecciosos,
        tarifaConsultaGeneral: data.tarifaConsultaGeneral,
        // Study rates
        tarifaBH: data.tarifaBH,
        tarifaQS: data.tarifaQS,
        tarifaRX: data.tarifaRX,
        tarifaUS: data.tarifaUS,
        tarifaEGO: data.tarifaEGO,
        tarifaECG: data.tarifaECG,
        tarifaElectrolitos: data.tarifaElectrolitos,
        tarifaSNAP: data.tarifaSNAP,
      },
    });
  }

  res.status(existing ? 200 : 201).json({
    status: 'success',
    data: { businessInfo }
  });
});

// PUT /business-info/logo - Upload clinic logo (base64)
router.put('/logo', authenticate, isAdmin, async (req, res) => {
  const schema = z.object({
    logo: z.string().min(1, 'Logo data is required'),
  });

  const data = schema.parse(req.body);

  const existing = await prisma.businessInfo.findFirst();
  if (!existing) {
    throw new AppError('Business info not configured. Please configure clinic info first.', 400);
  }

  const businessInfo = await prisma.businessInfo.update({
    where: { id: existing.id },
    data: { clinicLogo: data.logo },
  });

  res.json({
    status: 'success',
    data: { businessInfo }
  });
});

// PUT /business-info/signature - Upload vet signature (base64)
router.put('/signature', authenticate, isAdmin, async (req, res) => {
  const schema = z.object({
    signature: z.string().min(1, 'Signature data is required'),
  });

  const data = schema.parse(req.body);

  const existing = await prisma.businessInfo.findFirst();
  if (!existing) {
    throw new AppError('Business info not configured. Please configure clinic info first.', 400);
  }

  const businessInfo = await prisma.businessInfo.update({
    where: { id: existing.id },
    data: { vetSignature: data.signature },
  });

  res.json({
    status: 'success',
    data: { businessInfo }
  });
});

export default router;
