// src/routes/grooming.routes.ts
// Grooming service routes - ESTÉTICA module

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, isRecepcion, isEstilista } from '../middleware/auth';

const router = Router();

// Validation schema for creating/updating grooming service
const groomingServiceSchema = z.object({
    visitId: z.string().cuid(),
    petId: z.string().cuid(),

    // Section 3: Pet's General Condition
    conditionCalm: z.boolean().optional().default(false),
    conditionNervous: z.boolean().optional().default(false),
    conditionAggressive: z.boolean().optional().default(false),
    conditionAnxious: z.boolean().optional().default(false),
    conditionBites: z.boolean().optional().default(false),
    conditionNeedsMuzzle: z.boolean().optional().default(false),
    conditionFirstGrooming: z.boolean().optional().default(false),
    conditionObservations: z.string().optional(),

    // Section 4: Bath Services
    bathBasic: z.boolean().optional().default(false),
    bathMedicated: z.boolean().optional().default(false),
    bathFleaTreatment: z.boolean().optional().default(false),
    bathMoisturizing: z.boolean().optional().default(false),
    bathDrying: z.boolean().optional().default(false),

    // Section 4: Haircut & Grooming
    haircutFull: z.boolean().optional().default(false),
    haircutDeshedding: z.boolean().optional().default(false),
    haircutTrimming: z.boolean().optional().default(false),
    haircutSanitary: z.boolean().optional().default(false),
    haircutFace: z.boolean().optional().default(false),
    haircutPaws: z.boolean().optional().default(false),

    // Section 4: Details
    detailsNailTrimming: z.boolean().optional().default(false),
    detailsEarCleaning: z.boolean().optional().default(false),
    detailsAnalGlands: z.boolean().optional().default(false),
    detailsTeethBrushing: z.boolean().optional().default(false),

    // Section 4: Extras
    extrasPerfume: z.boolean().optional().default(false),
    extrasBowsBandana: z.boolean().optional().default(false),
    extrasSpecialShampoo: z.boolean().optional().default(false),
    extrasSpecialShampooType: z.string().optional(),

    // Section 5: Special Instructions
    specialInstructions: z.string().optional(),

    // Section 6: Health Conditions
    healthWounds: z.boolean().optional().default(false),
    healthSkinProblems: z.boolean().optional().default(false),
    healthOtitis: z.boolean().optional().default(false),
    healthAllergies: z.boolean().optional().default(false),
    healthFleasTicks: z.boolean().optional().default(false),
    healthChronicIllness: z.boolean().optional().default(false),
    healthUnderTreatment: z.boolean().optional().default(false),
    healthTreatmentDetails: z.string().optional(),

    // Section 7: Authorization & Consent
    authorizeMuzzle: z.boolean().optional().default(false),
    authorizeAdjustments: z.boolean().optional().default(false),
    ownerSignature: z.string().optional(),
    consentGiven: z.boolean().optional().default(false),
});

// POST /grooming - Create new grooming service record
router.post('/', authenticate, isRecepcion, async (req, res) => {
    const data = groomingServiceSchema.parse(req.body);

    // Verify visit exists and is a grooming visit
    const visit = await prisma.visit.findUnique({
        where: { id: data.visitId },
        select: { id: true, serviceType: true, petId: true }
    });

    if (!visit) {
        throw new AppError('Visit not found', 404);
    }

    if (visit.serviceType !== 'ESTETICA') {
        throw new AppError('This visit is not a grooming service', 400);
    }

    // Check if grooming service already exists for this visit
    const existingGrooming = await prisma.groomingService.findUnique({
        where: { visitId: data.visitId }
    });

    if (existingGrooming) {
        throw new AppError('Grooming service already exists for this visit', 409);
    }

    // Create grooming service record
    const groomingService = await prisma.groomingService.create({
        data: {
            ...data,
            consentTimestamp: data.consentGiven ? new Date() : null,
        },
        include: {
            visit: {
                include: {
                    pet: {
                        include: { owner: true }
                    }
                }
            }
        }
    });

    // Update visit status to EN_ESPERA (waiting for stylist)
    await prisma.visit.update({
        where: { id: data.visitId },
        data: { status: 'EN_ESPERA' }
    });

    // Update pet status
    await prisma.pet.update({
        where: { id: data.petId },
        data: { estado: 'EN_ESPERA' }
    });

    res.status(201).json({
        status: 'success',
        data: { groomingService }
    });
});

// GET /grooming/today - Get today's grooming visits
router.get('/today', authenticate, async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groomingVisits = await prisma.visit.findMany({
        where: {
            serviceType: 'ESTETICA',
            arrivalTime: { gte: today, lt: tomorrow },
        },
        include: {
            pet: {
                include: { owner: true }
            },
            groomingService: true,
        },
        orderBy: { arrivalTime: 'desc' },
    });

    res.json({
        status: 'success',
        data: { visits: groomingVisits }
    });
});

// GET /grooming/:visitId - Get grooming details for a specific visit
router.get('/:visitId', authenticate, async (req, res) => {
    const visitId = req.params.visitId as string;

    const groomingService = await prisma.groomingService.findUnique({
        where: { visitId },
        include: {
            visit: {
                include: {
                    pet: {
                        include: { owner: true }
                    }
                }
            }
        }
    });

    if (!groomingService) {
        throw new AppError('Grooming service not found for this visit', 404);
    }

    res.json({
        status: 'success',
        data: { groomingService }
    });
});

// PUT /grooming/:id - Update grooming service (for stylist to update status/notes)
router.put('/:id', authenticate, async (req, res) => {
    const id = req.params.id as string;

    const updateSchema = z.object({
        status: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO']).optional(),
        notes: z.string().optional(),
        // Section 8: Internal Use fields (Stylist fills)
        checkoutTime: z.string().datetime().optional().nullable(),
        dischargeCondition: z.enum(['EXCELLENT', 'GOOD', 'REQUIRES_OBSERVATION']).optional().nullable(),
        stylistNotes: z.string().optional().nullable(),
        // Allow updating any of the service fields
        ...groomingServiceSchema.shape,
    }).partial();

    const data = updateSchema.parse(req.body);

    // Check if grooming service exists
    const existingGrooming = await prisma.groomingService.findUnique({
        where: { id },
        include: { visit: true }
    });

    if (!existingGrooming) {
        throw new AppError('Grooming service not found', 404);
    }

    // Prepare update data
    const updateData: any = {
        ...data,
    };

    // Set checkout time and stylist when completing
    if (data.status === 'COMPLETADO') {
        updateData.completedAt = new Date();
        updateData.completedById = req.user?.userId;
        updateData.checkoutTime = updateData.checkoutTime || new Date();
        updateData.stylistId = req.user?.userId;
    }

    // Update grooming service
    const updatedGrooming = await prisma.groomingService.update({
        where: { id },
        data: updateData,
        include: {
            visit: {
                include: {
                    pet: { include: { owner: true } }
                }
            }
        }
    });

    // Update visit and pet status based on grooming status
    if (data.status) {
        let visitStatus: string;
        let petStatus: string;

        switch (data.status) {
            case 'EN_PROCESO':
                visitStatus = 'EN_ESTETICA';
                petStatus = 'EN_ESTETICA';
                break;
            case 'COMPLETADO':
                visitStatus = 'ESTETICA_COMPLETADA';
                petStatus = 'LISTO_PARA_ALTA';
                break;
            case 'CANCELADO':
                visitStatus = 'ALTA';
                petStatus = 'ALTA';
                break;
            default:
                visitStatus = 'EN_ESPERA';
                petStatus = 'EN_ESPERA';
        }

        await prisma.visit.update({
            where: { id: existingGrooming.visitId },
            data: { status: visitStatus as any }
        });

        await prisma.pet.update({
            where: { id: existingGrooming.petId },
            data: { estado: petStatus as any }
        });
    }

    res.json({
        status: 'success',
        data: { groomingService: updatedGrooming }
    });
});

export default router;
