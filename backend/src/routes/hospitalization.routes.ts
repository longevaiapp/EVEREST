// @ts-nocheck
// src/routes/hospitalization.routes.ts
// Hospitalization routes - Complete module
// NOTE: @ts-nocheck is used because Prisma client needs to be regenerated

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// Helper function to calculate age from birth date
function calcularEdad(fechaNacimiento: Date): string {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let años = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  
  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
    años--;
    meses += 12;
  }
  
  if (años > 0) {
    return `${años} año${años !== 1 ? 's' : ''}`;
  }
  return `${meses} mes${meses !== 1 ? 'es' : ''}`;
}

// GET /hospitalizations/summary/stats - Get hospitalization statistics
router.get('/summary/stats', authenticate, async (_req: Request, res: Response) => {
  try {
    const hospitalizations = await prisma.hospitalization.findMany({
      where: { status: 'ACTIVA' },
      select: { type: true },
    });

    const stats = {
      general: hospitalizations.filter((h: any) => h.type === 'GENERAL').length,
      uci: hospitalizations.filter((h: any) => h.type === 'UCI').length,
      neonatos: hospitalizations.filter((h: any) => h.type === 'NEONATOS').length,
      infecciosos: hospitalizations.filter((h: any) => h.type === 'INFECCIOSOS').length,
      total: hospitalizations.length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Error getting stats' });
  }
});

// GET /hospitalizations/pharmacy/pending - Get all hospitalization medications pending pharmacy dispense
// IMPORTANT: This route must be BEFORE /:id routes to avoid "pharmacy" being captured as an ID
// This endpoint is for Pharmacy to see what they need to prepare for hospitalized patients
router.get('/pharmacy/pending', authenticate, async (_req: Request, res: Response) => {
  try {
    // Get all active hospitalizations with their therapy items
    const hospitalizations = await prisma.hospitalization.findMany({
      where: { status: 'ACTIVA' },
      include: {
        pet: { include: { owner: true } },
        therapyItems: {
          where: { isActive: true },
          include: {
            medication: true,
            prescribedBy: { select: { id: true, nombre: true } },
          },
        },
        admittedBy: { select: { id: true, nombre: true } },
      },
    });

    // Transform into pharmacy-friendly format
    const pendingItems: any[] = [];
    
    for (const hosp of hospitalizations) {
      for (const item of (hosp as any).therapyItems || []) {
        // Check if this medication has been dispensed via prescription
        let dispensedQty = 0;
        let prescriptionStatus = 'NO_PRESCRIPTION';
        
        if (item.prescriptionId) {
          const prescriptionItem = await prisma.prescriptionItem.findFirst({
            where: { 
              prescriptionId: item.prescriptionId,
              OR: [
                { medicationId: item.medicationId || undefined },
                { name: item.medicationName }
              ]
            },
          });
          dispensedQty = prescriptionItem?.dispensedQuantity || 0;
          
          const prescription = await prisma.prescription.findUnique({
            where: { id: item.prescriptionId },
          });
          prescriptionStatus = prescription?.status || 'UNKNOWN';
        }
        
        pendingItems.push({
          id: item.id,
          hospitalizationId: hosp.id,
          type: (hosp as any).type,
          location: (hosp as any).location || `Área ${(hosp as any).type}`,
          patient: {
            id: (hosp as any).pet?.id,
            nombre: (hosp as any).pet?.nombre,
            especie: (hosp as any).pet?.especie,
            owner: (hosp as any).pet?.owner?.nombre,
          },
          attendingVet: (hosp as any).admittedBy,
          medication: {
            id: item.medicationId,
            name: item.medicationName,
            dose: item.dose,
            route: item.route,
            frequency: item.frequency,
            stockDisponible: item.medication?.stockActual || null,
            precio: item.medication?.precio || null,
          },
          prescriptionId: item.prescriptionId,
          prescriptionStatus,
          dispensedQuantity: dispensedQty,
          needsDispense: prescriptionStatus === 'PENDIENTE' || prescriptionStatus === 'NO_PRESCRIPTION',
          prescribedBy: item.prescribedBy,
          createdAt: item.createdAt,
        });
      }
    }

    // Sort by creation date, newest first
    pendingItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      status: 'success',
      data: {
        count: pendingItems.length,
        items: pendingItems,
      },
    });
  } catch (error) {
    console.error('Error getting pharmacy pending items:', error);
    res.status(500).json({ error: 'Error getting pharmacy pending items' });
  }
});

// GET /hospitalizations/pending-discharge - Get all hospitalizations pending payment (for reception)
// IMPORTANT: This route must be BEFORE /:id routes
router.get('/pending-discharge', authenticate, async (_req: Request, res: Response) => {
  try {
    const hospitalizations = await prisma.hospitalization.findMany({
      where: { status: 'ALTA_PENDIENTE' },
      include: {
        pet: { include: { owner: true } },
        admittedBy: { select: { id: true, nombre: true } },
        therapyItems: { include: { medication: true } },
      },
      orderBy: { dischargedAt: 'desc' },
    });
    
    // Transform and add costs
    const results = [];
    const businessInfo = await prisma.businessInfo.findFirst();
    const tarifas = {
      hospGeneral: businessInfo?.tarifaHospGeneral ? parseFloat(businessInfo.tarifaHospGeneral.toString()) : 500,
      hospUCI: businessInfo?.tarifaHospUCI ? parseFloat(businessInfo.tarifaHospUCI.toString()) : 800,
      hospNeonatos: businessInfo?.tarifaHospNeonatos ? parseFloat(businessInfo.tarifaHospNeonatos.toString()) : 600,
      hospInfecciosos: businessInfo?.tarifaHospInfecciosos ? parseFloat(businessInfo.tarifaHospInfecciosos.toString()) : 700,
    };
    
    for (const hosp of hospitalizations) {
      const admissionDate = new Date(hosp.createdAt);
      const dischargeDate = (hosp as any).dischargedAt ? new Date((hosp as any).dischargedAt) : new Date();
      const days = Math.max(1, Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      let dailyRate = tarifas.hospGeneral;
      const t = (hosp as any).type;
      if (t === 'UCI') dailyRate = tarifas.hospUCI;
      else if (t === 'NEONATOS') dailyRate = tarifas.hospNeonatos;
      else if (t === 'INFECCIOSOS') dailyRate = tarifas.hospInfecciosos;
      
      results.push({
        id: hosp.id,
        pet: hosp.pet,
        type: (hosp as any).type,
        days,
        dailyRate,
        estimatedCost: days * dailyRate,
        dischargedAt: (hosp as any).dischargedAt,
        dischargeSummary: (hosp as any).dischargeSummary,
        dischargeInstructions: (hosp as any).dischargeInstructions,
        admittedBy: hosp.admittedBy,
        medicationCount: hosp.therapyItems?.length || 0,
      });
    }

    res.json({ 
      status: 'success', 
      data: { 
        count: results.length,
        hospitalizations: results 
      } 
    });
  } catch (error) {
    console.error('Error getting pending discharges:', error);
    res.status(500).json({ error: 'Error getting pending discharges' });
  }
});

// GET /hospitalizations - List hospitalizations with filters
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;

    const where: any = {};
    
    // Map frontend status to database status
    if (status === 'ACTIVO' || status === 'ACTIVE' || !status) {
      where.status = 'ACTIVA';
    } else if (status === 'ALTA_PENDIENTE') {
      where.status = 'ALTA_PENDIENTE';
    } else if (status === 'DADO_DE_ALTA' || status === 'DISCHARGED') {
      where.status = 'ALTA';
    } else {
      // If empty string or specific status, don't filter (show all)
      if (status) {
        where.status = status;
      }
    }
    
    if (type) {
      where.type = type;
    }

    const hospitalizations = await prisma.hospitalization.findMany({
      where,
      include: {
        pet: { 
          include: { owner: true }
        },
        admittedBy: { select: { id: true, nombre: true } },
        consultation: {
          select: {
            id: true,
            motivoConsulta: true,
            diagnosticos: { select: { codigoCIE10: true, descripcion: true } },
          },
        },
        therapyItems: { include: { medication: true } },
        monitorings: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match frontend expectations
    const transformed = hospitalizations.map((h: any) => ({
      id: h.id,
      type: h.type,
      status: h.status === 'ACTIVA' ? 'ACTIVO' : h.status,
      reason: h.reason,
      diagnosis: h.presumptiveDiagnosis || h.consultation?.diagnosticos?.[0]?.descripcion || h.reason,
      presumptiveDiagnosis: h.presumptiveDiagnosis,
      location: h.location,
      cuidadosEspeciales: h.cuidadosEspeciales,
      frecuenciaMonitoreo: h.frecuenciaMonitoreo,
      fechaIngreso: h.admittedAt,
      patient: h.pet ? {
        id: h.pet.id,
        nombre: h.pet.nombre,
        especie: h.pet.especie,
        raza: h.pet.raza,
        edad: h.pet.fechaNacimiento ? calcularEdad(h.pet.fechaNacimiento) : null,
        genero: h.pet.sexo,
        peso: h.pet.peso,
        owner: h.pet.owner ? {
          id: h.pet.owner.id,
          nombre: h.pet.owner.nombre || h.pet.owner.name,
        } : null
      } : null,
      attendingVet: h.admittedBy ? {
        id: h.admittedBy.id,
        nombre: h.admittedBy.nombre,
      } : null,
      therapyPlan: h.therapyItems?.map((item: any) => ({
        id: item.id,
        medicationName: item.medicationName,
        dosis: item.dose,
        frecuenciaHoras: item.frequency,
        via: item.route,
        activo: item.isActive,
      })) || [],
      latestMonitoring: h.monitorings?.[0] ? {
        temperatura: h.monitorings[0].temperatura,
        frecuenciaCardiaca: h.monitorings[0].frecuenciaCardiaca,
        frecuenciaRespiratoria: h.monitorings[0].frecuenciaRespiratoria,
        recordedAt: h.monitorings[0].recordedAt,
      } : null,
    }));

    res.json(transformed);
  } catch (error) {
    console.error('Error listing hospitalizations:', error);
    res.status(500).json({ error: 'Error listing hospitalizations' });
  }
});

// POST /hospitalizations - Admit patient
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      patientId: z.union([z.string(), z.number()]).transform(v => String(v)),
      type: z.enum(['GENERAL', 'UCI', 'NEONATOS', 'INFECCIOSOS']).default('GENERAL'),
      reason: z.string().min(1),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const hospitalization = await prisma.hospitalization.create({
      data: {
        petId: data.patientId,
        type: data.type as any,
        reason: data.reason,
        admissionNotes: data.notes,
        admittedById: (req as any).user!.userId,
        status: 'ACTIVA',
      },
      include: {
        pet: { include: { owner: true } },
      },
    });

    // Update pet status
    await prisma.pet.update({
      where: { id: data.patientId },
      data: { estado: 'HOSPITALIZADO' },
    });

    res.status(201).json(hospitalization);
  } catch (error) {
    console.error('Error admitting patient:', error);
    res.status(500).json({ error: 'Error admitting patient' });
  }
});

// GET /hospitalizations/:id - Get hospitalization details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const hospitalization = await prisma.hospitalization.findUnique({
      where: { id },
      include: {
        pet: { include: { owner: true } },
        admittedBy: { select: { id: true, nombre: true } },
        consultation: {
          include: {
            diagnosticos: true,
            signosVitales: { orderBy: { registeredAt: 'desc' }, take: 1 },
            prescriptions: {
              include: { items: true }
            },
          },
        },
        monitorings: { orderBy: { recordedAt: 'desc' } },
        therapyItems: {
          include: { medication: true },
        },
        neonates: { include: { records: true } },
      },
    });

    if (!hospitalization) {
      return res.status(404).json({ error: 'Hospitalization not found' });
    }

    // Transform to match frontend expectations
    const h: any = hospitalization;
    const transformed = {
      id: h.id,
      type: h.type,
      status: h.status === 'ACTIVA' ? 'ACTIVO' : h.status,
      reason: h.reason,
      diagnosis: h.presumptiveDiagnosis || h.reason,
      presumptiveDiagnosis: h.presumptiveDiagnosis,
      finalDiagnosis: h.finalDiagnosis,
      location: h.location,
      fluidTherapy: h.fluidTherapy,
      frecuenciaMonitoreo: h.frecuenciaMonitoreo,
      cuidadosEspeciales: h.cuidadosEspeciales,
      estimacionDias: h.estimacionDias,
      admissionNotes: h.admissionNotes,
      fechaIngreso: h.admittedAt,
      admissionTime: h.admissionTime,
      createdAt: h.createdAt,
      // Estudios solicitados
      studyBH: h.studyBH,
      studyQS: h.studyQS,
      studyRX: h.studyRX,
      studyUS: h.studyUS,
      studyEGO: h.studyEGO,
      studyECG: h.studyECG,
      studyElectrolitos: h.studyElectrolitos,
      studySNAP: h.studySNAP,
      // Relations
      patient: h.pet ? {
        id: h.pet.id,
        nombre: h.pet.nombre,
        especie: h.pet.especie,
        raza: h.pet.raza,
        edad: h.pet.fechaNacimiento ? calcularEdad(h.pet.fechaNacimiento) : null,
        genero: h.pet.sexo,
        peso: h.pet.peso,
        owner: h.pet.owner ? {
          id: h.pet.owner.id,
          nombre: h.pet.owner.nombre || h.pet.owner.name,
          telefono: h.pet.owner.telefono,
        } : null
      } : null,
      attendingVet: h.admittedBy ? {
        id: h.admittedBy.id,
        nombre: h.admittedBy.nombre,
      } : null,
      // Consultation data (from doctor)
      consultation: h.consultation ? {
        id: h.consultation.id,
        motivoConsulta: h.consultation.motivoConsulta,
        soapSubjetivo: h.consultation.soapSubjetivo,
        soapObjetivo: h.consultation.soapObjetivo,
        soapAnalisis: h.consultation.soapAnalisis,
        soapPlan: h.consultation.soapPlan,
        diagnosticos: h.consultation.diagnosticos || [],
        signosVitales: h.consultation.signosVitales?.[0] || null,
        prescriptions: h.consultation.prescriptions || [],
      } : null,
      // Monitorings
      monitorings: h.monitorings?.map((m: any) => ({
        id: m.id,
        temperatura: m.temperatura,
        frecuenciaCardiaca: m.frecuenciaCardiaca,
        frecuenciaRespiratoria: m.frecuenciaRespiratoria,
        presionArterial: m.presionArterial,
        trc: m.capillaryRefillTime,
        mucosas: m.mucousMembranes,
        nivelConciencia: m.nivelConciencia,
        escalaDolor: m.escalaDolor,
        observaciones: m.observaciones,
        recordedAt: m.recordedAt,
      })) || [],
      latestMonitoring: h.monitorings?.[0] || null,
      // Therapy Plan
      therapyPlan: h.therapyItems?.map((item: any) => ({
        id: item.id,
        medicationId: item.medicationId,
        medicationName: item.medicationName,
        medication: item.medication,
        dosis: item.dose,
        frecuenciaHoras: item.frequency,
        via: item.route,
        activo: item.isActive,
        scheduledTimes: item.scheduledTimes,
        createdAt: item.createdAt,
      })) || [],
      neonates: h.neonates || [],
      // Alta
      dischargedAt: h.dischargedAt,
      dischargeSummary: h.dischargeSummary,
      dischargeInstructions: h.dischargeInstructions,
    };

    res.json(transformed);
  } catch (error) {
    console.error('Error getting hospitalization:', error);
    res.status(500).json({ error: 'Error getting hospitalization' });
  }
});

// ==================== MONITORINGS ====================

// GET /hospitalizations/:id/monitorings - Get all monitorings
router.get('/:id/monitorings', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const monitorings = await prisma.monitoring.findMany({
      where: { hospitalizationId: id },
      orderBy: { recordedAt: 'desc' },
    });

    // Transform field names to match frontend (Spanish names)
    const transformed = monitorings.map((m: any) => ({
      id: m.id,
      temperatura: m.temperatura,
      frecuenciaCardiaca: m.frecuenciaCardiaca,
      frecuenciaRespiratoria: m.frecuenciaRespiratoria,
      presionArterial: m.presionArterial,
      trc: m.capillaryRefillTime,
      mucosas: m.mucousMembranes,
      nivelConciencia: m.nivelConciencia,
      escalaDolor: m.escalaDolor,
      observaciones: m.observaciones,
      recordedAt: m.recordedAt,
    }));

    res.json(transformed);
  } catch (error) {
    console.error('Error getting monitorings:', error);
    res.status(500).json({ error: 'Error getting monitorings' });
  }
});

// POST /hospitalizations/:id/monitorings - Add monitoring record
router.post('/:id/monitorings', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    console.log('Received monitoring data:', JSON.stringify(req.body, null, 2));
    
    const schema = z.object({
      // Accept both Spanish and English field names
      temperatura: z.number().optional().nullable(),
      temperature: z.number().optional(),
      frecuenciaCardiaca: z.number().optional().nullable(),
      heartRate: z.number().int().optional(),
      frecuenciaRespiratoria: z.number().optional().nullable(),
      respiratoryRate: z.number().int().optional(),
      presionArterial: z.string().optional().nullable(),
      trc: z.number().optional().nullable(),
      mucosas: z.string().optional().nullable(),
      peso: z.number().optional().nullable(),
      glucosa: z.number().optional().nullable(),
      hidratacion: z.string().optional().nullable(),
      nivelConciencia: z.enum(['ALERTA', 'SOMNOLIENTO', 'DESORIENTADO', 'ESTUPOROSO', 'COMA']).optional().nullable(),
      nivelDolor: z.number().int().min(0).max(10).optional().nullable(),
      observaciones: z.string().optional().nullable(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Convert to integers where needed
    const frecCardiaca = data.frecuenciaCardiaca ?? data.heartRate;
    const frecResp = data.frecuenciaRespiratoria ?? data.respiratoryRate;

    const monitoring = await prisma.monitoring.create({
      data: {
        hospitalizationId: id,
        temperatura: data.temperatura ?? data.temperature ?? null,
        frecuenciaCardiaca: frecCardiaca ? Math.round(frecCardiaca) : null,
        frecuenciaRespiratoria: frecResp ? Math.round(frecResp) : null,
        presionArterial: data.presionArterial ?? null,
        capillaryRefillTime: data.trc?.toString() ?? null,
        mucousMembranes: data.mucosas ?? null,
        nivelConciencia: data.nivelConciencia ?? null,
        escalaDolor: data.nivelDolor ?? null,
        observaciones: data.observaciones ?? data.notes ?? null,
        recordedById: (req as any).user!.userId,
      },
    });

    // Return in frontend format (matching what frontend expects)
    res.status(201).json({
      id: monitoring.id,
      temperatura: monitoring.temperatura,
      frecuenciaCardiaca: monitoring.frecuenciaCardiaca,
      frecuenciaRespiratoria: monitoring.frecuenciaRespiratoria,
      presionArterial: monitoring.presionArterial,
      trc: monitoring.capillaryRefillTime,
      mucosas: monitoring.mucousMembranes,
      nivelConciencia: monitoring.nivelConciencia,
      escalaDolor: monitoring.escalaDolor,
      observaciones: monitoring.observaciones,
      recordedAt: monitoring.recordedAt,
    });
  } catch (error) {
    console.error('Error creating monitoring:', error);
    res.status(500).json({ error: 'Error creating monitoring' });
  }
});

// ==================== THERAPY ITEMS ====================

// GET /hospitalizations/:id/therapy-items - Get therapy plan
router.get('/:id/therapy-items', authenticate, async (req: Request, res: Response) => {
  try {
    const hospitalizationId = req.params.id;

    const items = await prisma.therapyPlanItem.findMany({
      where: { hospitalizationId },
      include: {
        medication: true,
        prescribedBy: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(items.map(item => ({
      id: item.id,
      medicationId: item.medicationId,
      medicationName: item.medicationName,
      medication: item.medication,
      dosis: item.dose,
      frecuenciaHoras: item.frequency,
      via: item.route,
      activo: item.isActive,
      scheduledTimes: item.scheduledTimes,
      createdAt: item.createdAt,
      prescribedBy: item.prescribedBy,
    })));
  } catch (error) {
    console.error('Error fetching therapy items:', error);
    res.status(500).json({ error: 'Error fetching therapy items' });
  }
});

// POST /hospitalizations/:id/therapy-items - Add therapy item
// This also creates a Prescription for Pharmacy to dispense
router.post('/:id/therapy-items', authenticate, async (req: Request, res: Response) => {
  try {
    const hospitalizationId = req.params.id;
    const userId = (req as any).user!.userId;
    
    console.log('Received therapy item data:', JSON.stringify(req.body, null, 2));
    
    const schema = z.object({
      medicationId: z.string().optional().nullable(),
      medicationName: z.string().min(1),
      dose: z.string(),
      frequency: z.string(),
      route: z.string(),
      scheduledTimes: z.array(z.string()).optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);
    
    // Get hospitalization with pet and consultation info
    const hospitalization = await prisma.hospitalization.findUnique({
      where: { id: hospitalizationId },
      include: { pet: true },
    });
    
    if (!hospitalization) {
      return res.status(404).json({ error: 'Hospitalization not found' });
    }
    
    // Get medication info from inventory if medicationId provided
    let medicationInfo: any = null;
    if (data.medicationId) {
      medicationInfo = await prisma.medication.findUnique({
        where: { id: data.medicationId },
      });
    }
    
    // Calculate estimated quantity needed based on frequency and 7-day supply default
    // Parse frequency like "cada 8 horas" -> 3 times per day -> 21 doses for 7 days
    let estimatedQuantity = 7; // Default
    const freqMatch = data.frequency.match(/(\d+)/);
    if (freqMatch) {
      const hoursInterval = parseInt(freqMatch[1]);
      const dosesPerDay = Math.ceil(24 / hoursInterval);
      estimatedQuantity = dosesPerDay * 7; // 7 days supply
    }

    // Use transaction to create therapy item and prescription atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the therapy plan item
      const therapyItem = await tx.therapyPlanItem.create({
        data: {
          hospitalizationId,
          medicationId: data.medicationId || null,
          medicationName: data.medicationName,
          dose: data.dose,
          frequency: data.frequency,
          route: data.route,
          scheduledTimes: data.scheduledTimes || [],
          isActive: true,
          prescribedById: userId,
        },
        include: { medication: true },
      });
      
      // 2. Create a Prescription for Pharmacy IF consultation exists
      // Note: This ensures Pharmacy can see and prepare the medication
      let prescription = null;
      if ((hospitalization as any).consultationId) {
        prescription = await tx.prescription.create({
          data: {
            consultationId: (hospitalization as any).consultationId,
            petId: hospitalization.petId,
            prescribedById: userId,
            status: 'PENDIENTE',
            generalInstructions: `Para hospitalización - ${data.notes || ''}`.trim(),
            items: {
              create: {
                type: 'USO_INMEDIATO',
                medicationId: data.medicationId || undefined,
                name: data.medicationName,
                dosage: data.dose,
                frequency: data.frequency,
                duration: 'Durante hospitalización',
                quantity: estimatedQuantity,
                instructions: `Vía: ${data.route}. ${data.notes || ''}`.trim(),
                unitPrice: medicationInfo?.precio || null,
              },
            },
          },
        });
        
        // Link prescription to therapy item
        await tx.therapyPlanItem.update({
          where: { id: therapyItem.id },
          data: { prescriptionId: prescription.id },
        });
      }
      
      return { therapyItem, prescription };
    });
    
    // Return the created item with transformed field names (matching GET endpoint)
    const item = result.therapyItem;
    res.status(201).json({
      id: item.id,
      medicationId: item.medicationId,
      medicationName: item.medicationName,
      medication: item.medication,
      dosis: item.dose,
      frecuenciaHoras: item.frequency,
      via: item.route,
      activo: item.isActive,
      scheduledTimes: item.scheduledTimes,
      createdAt: item.createdAt,
      prescriptionId: result.prescription?.id || null,
      prescriptionStatus: result.prescription?.status || 'NO_PRESCRIPTION',
      pharmacyNote: result.prescription 
        ? 'Solicitud enviada a Farmacia'
        : 'Sin consulta vinculada - Farmacia debe verificar en sección hospitalización',
      stockDisponible: medicationInfo?.stockActual || null,
      precioUnitario: medicationInfo?.precio || null,
    });
  } catch (error) {
    console.error('Error creating therapy item:', error);
    res.status(500).json({ error: 'Error creating therapy item' });
  }
});

// PATCH /hospitalizations/:id/therapy-items/:itemId - Update therapy item (activate/deactivate)
router.patch('/:id/therapy-items/:itemId', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { isActive } = req.body;

    const item = await prisma.therapyPlanItem.update({
      where: { id: itemId },
      data: { isActive: isActive },
      include: { medication: true },
    });

    res.json({
      id: item.id,
      medicationId: item.medicationId,
      medicationName: item.medicationName,
      medication: item.medication,
      dosis: item.dose,
      frecuenciaHoras: item.frequency,
      via: item.route,
      activo: item.isActive,
      scheduledTimes: item.scheduledTimes,
      createdAt: item.createdAt,
    });
  } catch (error) {
    console.error('Error updating therapy item:', error);
    res.status(500).json({ error: 'Error updating therapy item' });
  }
});

// DELETE /hospitalizations/:id/therapy-items/:itemId - Deactivate therapy item
router.delete('/:id/therapy-items/:itemId', authenticate, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    await prisma.therapyPlanItem.update({
      where: { id: itemId },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating therapy item:', error);
    res.status(500).json({ error: 'Error deactivating therapy item' });
  }
});

// ==================== MEDICATION ADMINISTRATION ====================

// GET /hospitalizations/:id/pending-medications - Get pending medications
router.get('/:id/pending-medications', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const administrations = await prisma.medicationAdministration.findMany({
      where: {
        hospitalizationId: id,
        scheduledTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: {
        therapyItem: {
          include: {
            medication: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Transform to match frontend expectations
    const transformed = administrations.map((a: any) => ({
      id: a.id,
      // Frontend uses these names
      horaPrograma: a.scheduledTime,
      administrado: a.status === 'ADMINISTRADO' || a.status === 'RETRASADO',
      status: a.status,
      administeredAt: a.administeredAt,
      reason: a.reason,
      notes: a.notes,
      // Therapy item details
      therapyItem: a.therapyItem ? {
        id: a.therapyItem.id,
        medicationId: a.therapyItem.medicationId,
        medicationName: a.therapyItem.medicationName,
        dosis: a.therapyItem.dose,
        unidadDosis: '',
        via: a.therapyItem.route,
        frecuencia: a.therapyItem.frequency,
        medication: a.therapyItem.medication,
      } : null,
    }));

    res.json(transformed);
  } catch (error) {
    console.error('Error getting pending medications:', error);
    res.status(500).json({ error: 'Error getting pending medications' });
  }
});

// POST /hospitalizations/:id/administer-medication/:adminId - Administer medication
router.post('/:id/administer-medication/:adminId', authenticate, async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { status, reason, notes } = req.body;
    
    // Determine if late administration
    const existing = await prisma.medicationAdministration.findUnique({
      where: { id: adminId },
    });
    
    const now = new Date();
    const scheduledTime = existing?.scheduledTime ? new Date(existing.scheduledTime) : now;
    const isLate = now.getTime() - scheduledTime.getTime() > 30 * 60 * 1000; // 30 min tolerance
    
    // Determine final status
    let finalStatus = status || 'ADMINISTRADO';
    if (finalStatus === 'ADMINISTRADO' && isLate) {
      finalStatus = 'RETRASADO';
    }

    const administration = await prisma.medicationAdministration.update({
      where: { id: adminId },
      data: {
        administeredAt: now,
        administeredById: (req as any).user!.userId,
        status: finalStatus,
        reason: reason || null,
        notes: notes || null,
      },
      include: {
        therapyItem: true,
      },
    });

    res.json(administration);
  } catch (error) {
    console.error('Error administering medication:', error);
    res.status(500).json({ error: 'Error administering medication' });
  }
});

// POST /hospitalizations/:id/generate-daily-schedule - Generate daily medication schedule
// Uses scheduledTimes from TherapyPlanItem (e.g., ["08:00", "16:00", "00:00"])
router.post('/:id/generate-daily-schedule', authenticate, async (req: Request, res: Response) => {
  try {
    const hospitalizationId = req.params.id;
    
    // Get active therapy items with their scheduled times
    const therapyItems = await prisma.therapyPlanItem.findMany({
      where: { hospitalizationId, isActive: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    
    let generated = 0;
    let skipped = 0;
    
    for (const item of therapyItems) {
      // Get scheduled times from the therapy plan item
      // scheduledTimes is an array like ["08:00", "16:00", "00:00"]
      const times: string[] = item.scheduledTimes || [];
      
      // If no specific times, calculate from frequency
      if (times.length === 0) {
        // Parse frequency like "cada 8 horas" or just "8"
        const freqMatch = item.frequency.match(/(\d+)/);
        if (freqMatch) {
          const hoursInterval = parseInt(freqMatch[1]);
          const dosesPerDay = Math.ceil(24 / hoursInterval);
          for (let i = 0; i < dosesPerDay; i++) {
            const hour = (8 + (i * hoursInterval)) % 24;
            times.push(`${hour.toString().padStart(2, '0')}:00`);
          }
        } else {
          // Default to once daily at 8am
          times.push('08:00');
        }
      }
      
      // Create administration records for each scheduled time
      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes || 0, 0, 0);
        
        // Skip times that have already passed
        if (scheduledTime <= now) {
          skipped++;
          continue;
        }
        
        // Check if this exact schedule already exists for today
        const startOfScheduledTime = new Date(scheduledTime);
        startOfScheduledTime.setMinutes(scheduledTime.getMinutes() - 5);
        const endOfScheduledTime = new Date(scheduledTime);
        endOfScheduledTime.setMinutes(scheduledTime.getMinutes() + 5);
        
        const existing = await prisma.medicationAdministration.findFirst({
          where: {
            therapyItemId: item.id,
            scheduledTime: {
              gte: startOfScheduledTime,
              lte: endOfScheduledTime,
            },
          },
        });

        if (!existing) {
          await prisma.medicationAdministration.create({
            data: {
              therapyItemId: item.id,
              hospitalizationId,
              scheduledTime,
              status: 'PENDIENTE',
            },
          });
          generated++;
        }
      }
    }

    res.json({ 
      generated, 
      skipped,
      message: `Se generaron ${generated} administraciones para hoy. ${skipped} horarios ya pasaron.`
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ error: 'Error generating schedule' });
  }
});

// ==================== NEONATES ====================

// GET /hospitalizations/:id/neonates - Get neonates
router.get('/:id/neonates', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const neonates = await prisma.neonate.findMany({
      where: { hospitalizationId: id },
      include: {
        records: { orderBy: { recordedAt: 'desc' } },
      },
    });

    res.json(neonates);
  } catch (error) {
    console.error('Error getting neonates:', error);
    res.status(500).json({ error: 'Error getting neonates' });
  }
});

// POST /hospitalizations/:id/neonates - Add neonate (SOLO MÉDICO)
// Registrar neonato con identificación como en el formulario de la imagen
router.post('/:id/neonates', authenticate, async (req: Request, res: Response) => {
  try {
    // Solo el médico puede registrar neonatos
    const userRole = (req as any).user?.role;
    if (userRole !== 'MEDICO') {
      return res.status(403).json({ 
        error: 'Solo el médico puede registrar neonatos',
        message: 'Acceso denegado: Se requiere rol de MEDICO'
      });
    }

    const hospitalizationId = req.params.id;
    
    const schema = z.object({
      number: z.number().int().positive(),                    // Neonato No. (1, 2, 3...)
      identification: z.string().optional(),                  // "Collar rojo", "Marca oreja", etc.
      identificationType: z.enum(['COLLAR', 'MARCA', 'COLOR', 'OTRO']).optional(), 
      sex: z.enum(['MACHO', 'HEMBRA']).optional(),
    });

    const data = schema.parse(req.body);

    const neonate = await prisma.neonate.create({
      data: {
        hospitalizationId,
        number: data.number,
        identification: data.identification || null,
        identificationType: data.identificationType || null,
        sex: data.sex || null,
      },
      include: {
        records: { orderBy: { recordedAt: 'desc' } },
      },
    });

    res.status(201).json(neonate);
  } catch (error) {
    console.error('Error creating neonate:', error);
    res.status(500).json({ error: 'Error creating neonate' });
  }
});

// POST /hospitalizations/:id/neonates/:neonateId/records - Add neonate record
// Registrar monitoreo de neonato: Peso, Temp, FC, FR, Succión, Actividad
router.post('/:id/neonates/:neonateId/records', authenticate, async (req: Request, res: Response) => {
  try {
    const { neonateId } = req.params;
    
    const schema = z.object({
      weight: z.number().optional(),           // Peso en gramos
      temperature: z.number().optional(),       // Temperatura °C
      heartRate: z.number().int().optional(),   // FC (lpm)
      respiratoryRate: z.number().int().optional(), // FR (rpm)
      suction: z.enum(['ADECUADA', 'DEBIL']).optional(),
      activity: z.enum(['ACTIVO', 'LETARGICO']).optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const record = await prisma.neonateRecord.create({
      data: {
        neonateId,
        weight: data.weight,
        temperature: data.temperature,
        heartRate: data.heartRate,
        respiratoryRate: data.respiratoryRate,
        suction: data.suction,
        activity: data.activity,
        notes: data.notes,
        recordedById: (req as any).user!.userId,
      },
      include: {
        recordedBy: { select: { name: true } },
      },
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating neonate record:', error);
    res.status(500).json({ error: 'Error creating neonate record' });
  }
});

// GET /hospitalizations/:hospId/neonates/:neonateId/records - Get neonate records history
router.get('/:id/neonates/:neonateId/records', authenticate, async (req: Request, res: Response) => {
  try {
    const { neonateId } = req.params;
    
    const records = await prisma.neonateRecord.findMany({
      where: { neonateId },
      orderBy: { recordedAt: 'desc' },
      include: {
        recordedBy: { select: { name: true } },
      },
    });

    res.json(records);
  } catch (error) {
    console.error('Error getting neonate records:', error);
    res.status(500).json({ error: 'Error getting neonate records' });
  }
});

// ==================== COSTS ====================

// GET /hospitalizations/:id/costs - Get hospitalization costs
router.get('/:id/costs', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Get hospitalization with therapy items and their medications
    const hospitalization = await prisma.hospitalization.findUnique({
      where: { id },
      include: {
        therapyItems: {
          where: { isActive: true },
          include: { medication: true },
        },
        medicationAdmins: {
          where: { status: 'ADMINISTRADO' },
          include: {
            therapyItem: { include: { medication: true } },
          },
        },
      },
    });

    if (!hospitalization) {
      return res.status(404).json({ error: 'Hospitalization not found' });
    }

    // Get business info for tariffs
    const businessInfo = await prisma.businessInfo.findFirst();
    
    // Default tariffs if not configured
    const tarifas = {
      hospGeneral: businessInfo?.tarifaHospGeneral ? parseFloat(businessInfo.tarifaHospGeneral.toString()) : 500,
      hospUCI: businessInfo?.tarifaHospUCI ? parseFloat(businessInfo.tarifaHospUCI.toString()) : 800,
      hospNeonatos: businessInfo?.tarifaHospNeonatos ? parseFloat(businessInfo.tarifaHospNeonatos.toString()) : 600,
      hospInfecciosos: businessInfo?.tarifaHospInfecciosos ? parseFloat(businessInfo.tarifaHospInfecciosos.toString()) : 700,
      // Lab studies
      BH: businessInfo?.tarifaBH ? parseFloat(businessInfo.tarifaBH.toString()) : 350,
      QS: businessInfo?.tarifaQS ? parseFloat(businessInfo.tarifaQS.toString()) : 450,
      RX: businessInfo?.tarifaRX ? parseFloat(businessInfo.tarifaRX.toString()) : 400,
      US: businessInfo?.tarifaUS ? parseFloat(businessInfo.tarifaUS.toString()) : 600,
      EGO: businessInfo?.tarifaEGO ? parseFloat(businessInfo.tarifaEGO.toString()) : 250,
      ECG: businessInfo?.tarifaECG ? parseFloat(businessInfo.tarifaECG.toString()) : 400,
      Electrolitos: businessInfo?.tarifaElectrolitos ? parseFloat(businessInfo.tarifaElectrolitos.toString()) : 300,
      SNAP: businessInfo?.tarifaSNAP ? parseFloat(businessInfo.tarifaSNAP.toString()) : 500,
    };

    // Calculate days
    const admissionDate = new Date(hospitalization.createdAt);
    const endDate = (hospitalization as any).dischargedAt ? new Date((hospitalization as any).dischargedAt) : new Date();
    const days = Math.max(1, Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Get daily rate based on type from BusinessInfo
    let dailyRate = tarifas.hospGeneral;
    const hospType = (hospitalization as any).type;
    switch (hospType) {
      case 'UCI':
        dailyRate = tarifas.hospUCI;
        break;
      case 'NEONATOS':
        dailyRate = tarifas.hospNeonatos;
        break;
      case 'INFECCIOSOS':
        dailyRate = tarifas.hospInfecciosos;
        break;
      default:
        dailyRate = tarifas.hospGeneral;
    }

    const hospitalizationCost = days * dailyRate;

    // Calculate medication costs from administered medications
    let medicationCost = 0;
    let medicationCount = 0;
    const medicationBreakdown: any[] = [];
    
    for (const admin of hospitalization.medicationAdmins || []) {
      const therapyItem = (admin as any).therapyItem;
      if (therapyItem) {
        const medication = therapyItem.medication;
        // Use medication price from inventory, or a default
        const unitPrice = medication?.precio ? parseFloat(medication.precio.toString()) : 0;
        medicationCost += unitPrice;
        medicationCount++;
        
        // Add to breakdown
        const existingItem = medicationBreakdown.find(m => m.name === therapyItem.medicationName);
        if (existingItem) {
          existingItem.quantity++;
          existingItem.subtotal += unitPrice;
        } else {
          medicationBreakdown.push({
            name: therapyItem.medicationName,
            quantity: 1,
            unitPrice,
            subtotal: unitPrice,
          });
        }
      }
    }

    // Calculate lab/studies cost based on study flags
    let labCost = 0;
    let labCount = 0;
    const studiesBreakdown: any[] = [];
    
    const h = hospitalization as any;
    if (h.studyBH) { labCost += tarifas.BH; labCount++; studiesBreakdown.push({ name: 'Biometría Hemática (BH)', price: tarifas.BH }); }
    if (h.studyQS) { labCost += tarifas.QS; labCount++; studiesBreakdown.push({ name: 'Química Sanguínea (QS)', price: tarifas.QS }); }
    if (h.studyRX) { labCost += tarifas.RX; labCount++; studiesBreakdown.push({ name: 'Rayos X', price: tarifas.RX }); }
    if (h.studyUS) { labCost += tarifas.US; labCount++; studiesBreakdown.push({ name: 'Ultrasonido', price: tarifas.US }); }
    if (h.studyEGO) { labCost += tarifas.EGO; labCount++; studiesBreakdown.push({ name: 'Examen General de Orina (EGO)', price: tarifas.EGO }); }
    if (h.studyECG) { labCost += tarifas.ECG; labCount++; studiesBreakdown.push({ name: 'Electrocardiograma (ECG)', price: tarifas.ECG }); }
    if (h.studyElectrolitos) { labCost += tarifas.Electrolitos; labCount++; studiesBreakdown.push({ name: 'Electrolitos', price: tarifas.Electrolitos }); }
    if (h.studySNAP) { labCost += tarifas.SNAP; labCount++; studiesBreakdown.push({ name: 'SNAP Test', price: tarifas.SNAP }); }

    const total = hospitalizationCost + medicationCost + labCost;

    res.json({
      // Summary
      days,
      dailyRate,
      hospitalizationType: hospType || 'GENERAL',
      hospitalizationCost,
      medicationCost,
      medicationCount,
      labCost,
      labCount,
      otherCosts: 0,
      total,
      // Detailed breakdown
      breakdown: {
        hospitalization: {
          days,
          dailyRate,
          type: hospType || 'GENERAL',
          subtotal: hospitalizationCost,
        },
        medications: medicationBreakdown,
        studies: studiesBreakdown,
      },
      // Business info tariffs used
      tarifasUsadas: tarifas,
    });
  } catch (error) {
    console.error('Error getting costs:', error);
    res.status(500).json({ error: 'Error getting costs' });
  }
});

// ==================== PATCH - UPDATE HOSPITALIZATION ====================

// PATCH /hospitalizations/:id - Update hospitalization details (diagnosis, fluids, notes, etc.)
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const schema = z.object({
      presumptiveDiagnosis: z.string().optional(),
      finalDiagnosis: z.string().optional(),
      fluidTherapy: z.string().optional(),
      admissionNotes: z.string().optional(),
      cuidadosEspeciales: z.string().optional(),
      frecuenciaMonitoreo: z.string().optional(),
      estimacionDias: z.number().int().positive().optional(),
      location: z.string().optional(),
      // Studies can be toggled
      studyBH: z.boolean().optional(),
      studyQS: z.boolean().optional(),
      studyRX: z.boolean().optional(),
      studyUS: z.boolean().optional(),
      studyEGO: z.boolean().optional(),
      studyECG: z.boolean().optional(),
      studyElectrolitos: z.boolean().optional(),
      studySNAP: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (data.presumptiveDiagnosis !== undefined) updateData.presumptiveDiagnosis = data.presumptiveDiagnosis;
    if (data.finalDiagnosis !== undefined) updateData.finalDiagnosis = data.finalDiagnosis;
    if (data.fluidTherapy !== undefined) updateData.fluidTherapy = data.fluidTherapy;
    if (data.admissionNotes !== undefined) updateData.admissionNotes = data.admissionNotes;
    if (data.cuidadosEspeciales !== undefined) updateData.cuidadosEspeciales = data.cuidadosEspeciales;
    if (data.frecuenciaMonitoreo !== undefined) updateData.frecuenciaMonitoreo = data.frecuenciaMonitoreo;
    if (data.estimacionDias !== undefined) updateData.estimacionDias = data.estimacionDias;
    if (data.location !== undefined) updateData.location = data.location;
    // Studies
    if (data.studyBH !== undefined) updateData.studyBH = data.studyBH;
    if (data.studyQS !== undefined) updateData.studyQS = data.studyQS;
    if (data.studyRX !== undefined) updateData.studyRX = data.studyRX;
    if (data.studyUS !== undefined) updateData.studyUS = data.studyUS;
    if (data.studyEGO !== undefined) updateData.studyEGO = data.studyEGO;
    if (data.studyECG !== undefined) updateData.studyECG = data.studyECG;
    if (data.studyElectrolitos !== undefined) updateData.studyElectrolitos = data.studyElectrolitos;
    if (data.studySNAP !== undefined) updateData.studySNAP = data.studySNAP;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const hospitalization = await prisma.hospitalization.update({
      where: { id },
      data: updateData,
      include: {
        pet: { include: { owner: true } },
        admittedBy: { select: { id: true, nombre: true } },
      },
    });

    res.json({ status: 'success', data: { hospitalization } });
  } catch (error) {
    console.error('Error updating hospitalization:', error);
    res.status(500).json({ error: 'Error updating hospitalization' });
  }
});

// ==================== DISCHARGE ====================

// PUT /hospitalizations/:id/discharge - Discharge patient (medical discharge)
// This sets status to ALTA_PENDIENTE - patient waits for payment at reception
// Or to ALTA if fullDischarge is true (already paid or special cases)
router.put('/:id/discharge', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const schema = z.object({
      dischargeSummary: z.string().optional(),
      dischargeInstructions: z.string().optional(),
      dischargeNotes: z.string().optional(),
      finalDiagnosis: z.string().optional(),
      // If true, go directly to ALTA (e.g., patient already paid or special case)
      fullDischarge: z.boolean().optional().default(false),
      // Type of discharge
      dischargeType: z.enum(['ALTA', 'FALLECIDO', 'TRANSFERIDO']).optional().default('ALTA'),
    });

    const data = schema.parse(req.body);
    
    // Determine final status
    let newStatus: string;
    let petStatus: string;
    
    if (data.dischargeType === 'FALLECIDO') {
      newStatus = 'FALLECIDO';
      petStatus = 'FALLECIDO';
    } else if (data.dischargeType === 'TRANSFERIDO') {
      newStatus = 'TRANSFERIDO';
      petStatus = 'TRANSFERIDO';
    } else if (data.fullDischarge) {
      newStatus = 'ALTA';
      petStatus = 'ALTA';
    } else {
      // Normal flow: medical discharge, pending payment at reception
      newStatus = 'ALTA_PENDIENTE';
      petStatus = 'LISTO_PARA_ALTA';
    }

    const hospitalization = await prisma.hospitalization.update({
      where: { id },
      data: {
        status: newStatus as any,
        dischargedAt: new Date(),
        dischargeTime: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        dischargedById: (req as any).user?.userId,
        dischargeSummary: data.dischargeSummary || null,
        dischargeInstructions: data.dischargeInstructions || null,
        dischargeNotes: data.dischargeNotes || null,
        finalDiagnosis: data.finalDiagnosis || undefined, // Only update if provided
      },
      include: {
        pet: { include: { owner: true } },
        admittedBy: { select: { id: true, nombre: true } },
      },
    });

    // Update pet status
    await prisma.pet.update({
      where: { id: hospitalization.petId },
      data: { estado: petStatus },
    });
    
    // If there's a linked visit, update its status too
    if ((hospitalization as any).visitId) {
      await prisma.visit.update({
        where: { id: (hospitalization as any).visitId },
        data: { status: petStatus === 'ALTA' ? 'ALTA' : 'LISTO_PARA_ALTA' },
      }).catch(() => {}); // Ignore if visit doesn't exist
    }

    res.json({ 
      status: 'success', 
      data: { 
        hospitalization,
        message: newStatus === 'ALTA_PENDIENTE' 
          ? 'Alta médica completada. Paciente pendiente de cobro en recepción.'
          : `Paciente dado de alta (${newStatus}).`
      } 
    });
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).json({ error: 'Error discharging patient' });
  }
});

// POST /hospitalizations/:id/complete-discharge - Complete discharge after payment (called by reception)
router.post('/:id/complete-discharge', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Verify hospitalization exists and is in ALTA_PENDIENTE
    const hospitalization = await prisma.hospitalization.findUnique({
      where: { id },
      include: { pet: true },
    });
    
    if (!hospitalization) {
      return res.status(404).json({ error: 'Hospitalization not found' });
    }
    
    if ((hospitalization as any).status !== 'ALTA_PENDIENTE') {
      return res.status(400).json({ 
        error: 'Hospitalization is not pending discharge',
        currentStatus: (hospitalization as any).status
      });
    }
    
    // Complete the discharge
    const updated = await prisma.hospitalization.update({
      where: { id },
      data: {
        status: 'ALTA',
      },
      include: {
        pet: { include: { owner: true } },
      },
    });
    
    // Update pet status
    await prisma.pet.update({
      where: { id: hospitalization.petId },
      data: { estado: 'ALTA' },
    });
    
    res.json({ 
      status: 'success', 
      data: { 
        hospitalization: updated,
        message: 'Alta completada exitosamente.'
      } 
    });
  } catch (error) {
    console.error('Error completing discharge:', error);
    res.status(500).json({ error: 'Error completing discharge' });
  }
});

export default router;
