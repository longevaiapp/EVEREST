import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router: any = Router();

// Helper to safely get string query param
const qs = (val: unknown): string | undefined =>
  typeof val === "string" ? val : undefined;

// ============================================================================
// CONFIG
// ============================================================================

router.get("/config", async (_req: Request, res: Response) => {
  let config = await prisma.bloodBankConfig.findFirst();
  if (!config) {
    config = await prisma.bloodBankConfig.create({ data: {} });
  }
  res.json(config);
});

router.put("/config", async (req: Request, res: Response) => {
  const schema = z.object({
    diasCaducidadSangreTotal: z.number().int().min(1).optional(),
    diasCaducidadConcentrado: z.number().int().min(1).optional(),
    diasCaducidadPlasma: z.number().int().min(1).optional(),
    diasAlertaCaducidad: z.number().int().min(1).optional(),
    intervaloMinPerros: z.number().int().min(1).optional(),
    intervaloMinGatos: z.number().int().min(1).optional(),
    hematocritoMinPerros: z.number().min(1).optional(),
    hematocritoMinGatos: z.number().min(1).optional(),
  });
  const data = schema.parse(req.body);

  let config = await prisma.bloodBankConfig.findFirst();
  if (!config) {
    config = await prisma.bloodBankConfig.create({ data });
  } else {
    config = await prisma.bloodBankConfig.update({
      where: { id: config.id },
      data,
    });
  }
  res.json(config);
});

// ============================================================================
// DONORS
// ============================================================================

router.get("/donors", async (req: Request, res: Response): Promise<any> => {
  const estado = qs(req.query.estado);
  const especie = qs(req.query.especie);
  const search = qs(req.query.search);
  const elegible = qs(req.query.elegible);

  const where: any = {};
  if (estado) where.estado = estado;
  if (especie) {
    where.OR = [
      { especie: especie as string },
      { pet: { especie: especie as string } },
    ];
  }
  if (search) {
    const s = search as string;
    where.OR = [
      { nombre: { contains: s } },
      { ownerName: { contains: s } },
      { ownerPhone: { contains: s } },
      { pet: { nombre: { contains: s } } },
      { pet: { owner: { nombre: { contains: s } } } },
      { pet: { owner: { telefono: { contains: s } } } },
    ];
  }

  const donors = await prisma.bloodDonor.findMany({
    where,
    include: {
      pet: {
        include: { owner: { select: { nombre: true, telefono: true, email: true } } },
      },
      registeredBy: { select: { id: true, nombre: true } },
      _count: { select: { donations: true, evaluations: true, diagnosticTests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter elegible donors if requested
  if (elegible === "true") {
    const config = await prisma.bloodBankConfig.findFirst();
    const now = new Date();
    const filtered = donors.filter((d) => {
      if (d.estado !== "ACTIVO") return false;
      if (!d.fechaUltimaDonacion) return true;
      const species = d.pet?.especie || d.especie || "";
      const interval =
        species === "GATO"
          ? (config?.intervaloMinGatos || 84)
          : (config?.intervaloMinPerros || 56);
      const nextEligible = new Date(d.fechaUltimaDonacion);
      nextEligible.setDate(nextEligible.getDate() + interval);
      return nextEligible <= now;
    });
    return res.json(filtered);
  }

  res.json(donors);
});

router.post("/donors", async (req: Request, res: Response) => {
  const schema = z.object({
    petId: z.string().optional().nullable(),
    nombre: z.string().optional().nullable(),
    especie: z.string().optional().nullable(),
    raza: z.string().optional().nullable(),
    edad: z.string().optional().nullable(),
    sexo: z.string().optional().nullable(),
    peso: z.number().optional().nullable(),
    color: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    ownerPhone: z.string().optional().nullable(),
    ownerEmail: z.string().optional().nullable(),
    tipoSanguineo: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
    registeredById: z.string(),
  });
  const data = schema.parse(req.body);

  const donor = await prisma.bloodDonor.create({
    data: data as any,
    include: {
      pet: {
        include: { owner: { select: { nombre: true, telefono: true, email: true } } },
      },
      registeredBy: { select: { id: true, nombre: true } },
    },
  });
  res.status(201).json(donor);
});

router.get("/donors/search-pet", async (req: Request, res: Response): Promise<any> => {
  const q = qs(req.query.q);
  if (!q) return res.json([]);

  const pets = await prisma.pet.findMany({
    where: {
      OR: [
        { nombre: { contains: q as string } },
        { numeroFicha: { contains: q as string } },
        { owner: { nombre: { contains: q as string } } },
        { owner: { telefono: { contains: q as string } } },
      ],
    },
    include: {
      owner: { select: { id: true, nombre: true, telefono: true, email: true } },
    },
    take: 10,
  });
  res.json(pets);
});

router.get("/donors/:id", async (req: Request, res: Response): Promise<any> => {
  const donor = await prisma.bloodDonor.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      pet: {
        include: { owner: { select: { nombre: true, telefono: true, email: true } } },
      },
      registeredBy: { select: { id: true, nombre: true } },
      evaluations: {
        include: { evaluator: { select: { id: true, nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      diagnosticTests: {
        include: { registeredBy: { select: { id: true, nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      donations: {
        include: {
          medico: { select: { id: true, nombre: true } },
          unit: true,
        },
        orderBy: { fecha: "desc" },
      },
    },
  });
  if (!donor) return res.status(404).json({ error: "Donador no encontrado" });
  res.json(donor);
});

router.put("/donors/:id", async (req: Request, res: Response) => {
  const schema = z.object({
    estado: z.enum(["ACTIVO", "TEMPORALMENTE_NO_APTO", "RETIRADO"]).optional(),
    tipoSanguineo: z.string().optional().nullable(),
    nombre: z.string().optional().nullable(),
    especie: z.string().optional().nullable(),
    raza: z.string().optional().nullable(),
    edad: z.string().optional().nullable(),
    sexo: z.string().optional().nullable(),
    peso: z.number().optional().nullable(),
    color: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    ownerPhone: z.string().optional().nullable(),
    ownerEmail: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),
  });
  const data = schema.parse(req.body);

  const donor = await prisma.bloodDonor.update({
    where: { id: (req.params.id as string) },
    data,
    include: {
      pet: {
        include: { owner: { select: { nombre: true, telefono: true, email: true } } },
      },
    },
  });
  res.json(donor);
});

// ============================================================================
// EVALUATIONS
// ============================================================================

router.get("/donors/:id/evaluations", async (req: Request, res: Response) => {
  const evaluations = await prisma.donorEvaluation.findMany({
    where: { donorId: (req.params.id as string) },
    include: { evaluator: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });
  res.json(evaluations);
});

router.post("/donors/:id/evaluations", async (req: Request, res: Response) => {
  const schema = z.object({
    evaluatorId: z.string(),
    temperatura: z.number().optional().nullable(),
    frecuenciaCardiaca: z.number().int().optional().nullable(),
    frecuenciaRespiratoria: z.number().int().optional().nullable(),
    mucosas: z.string().optional().nullable(),
    tiempoLlenadoCapilar: z.string().optional().nullable(),
    condicionCorporal: z.string().optional().nullable(),
    observaciones: z.string().optional().nullable(),
    resultado: z.enum(["APTO", "NO_APTO"]),
  });
  const data = schema.parse(req.body);

  const evaluation = await prisma.donorEvaluation.create({
    data: { ...data, donorId: (req.params.id as string) },
    include: { evaluator: { select: { id: true, nombre: true } } },
  });

  // If NO_APTO, update donor status
  if (data.resultado === "NO_APTO") {
    await prisma.bloodDonor.update({
      where: { id: (req.params.id as string) },
      data: { estado: "TEMPORALMENTE_NO_APTO" },
    });
  }

  res.status(201).json(evaluation);
});

// ============================================================================
// DIAGNOSTIC TESTS
// ============================================================================

router.get("/donors/:id/tests", async (req: Request, res: Response) => {
  const tests = await prisma.donorDiagnosticTest.findMany({
    where: { donorId: (req.params.id as string) },
    include: { registeredBy: { select: { id: true, nombre: true } } },
    orderBy: { fecha: "desc" },
  });
  res.json(tests);
});

router.post("/donors/:id/tests", async (req: Request, res: Response) => {
  const schema = z.object({
    registeredById: z.string(),
    metodo: z.string().optional().nullable(),
    hematocrito: z.number().optional().nullable(),
    hemoglobina: z.number().optional().nullable(),
    eritrocitos: z.number().optional().nullable(),
    leucocitos: z.number().optional().nullable(),
    plaquetas: z.number().optional().nullable(),
    ehrlichia: z.string().optional().nullable(),
    anaplasma: z.string().optional().nullable(),
    babesia: z.string().optional().nullable(),
    dirofilaria: z.string().optional().nullable(),
    brucella: z.string().optional().nullable(),
    felv: z.string().optional().nullable(),
    fiv: z.string().optional().nullable(),
    hemoplasmas: z.string().optional().nullable(),
    tipificacionSanguinea: z.string().optional().nullable(),
    observaciones: z.string().optional().nullable(),
  });
  const data = schema.parse(req.body);

  const test = await prisma.donorDiagnosticTest.create({
    data: { ...data, donorId: (req.params.id as string) },
    include: { registeredBy: { select: { id: true, nombre: true } } },
  });

  // Update blood type on donor if tipificación was done
  if (data.tipificacionSanguinea) {
    await prisma.bloodDonor.update({
      where: { id: (req.params.id as string) },
      data: { tipoSanguineo: data.tipificacionSanguinea },
    });
  }

  res.status(201).json(test);
});

// ============================================================================
// DONATIONS
// ============================================================================

router.get("/donations", async (req: Request, res: Response): Promise<any> => {
  const donorId = qs(req.query.donorId);
  const where: any = {};
  if (donorId) where.donorId = donorId;

  const donations = await prisma.bloodDonation.findMany({
    where,
    include: {
      donor: {
        select: { id: true, nombre: true, tipoSanguineo: true, pet: { select: { nombre: true, especie: true } } },
      },
      medico: { select: { id: true, nombre: true } },
      unit: true,
    },
    orderBy: { fecha: "desc" },
  });
  res.json(donations);
});

router.post("/donations", async (req: Request, res: Response): Promise<any> => {
  const schema = z.object({
    donorId: z.string(),
    medicoId: z.string(),
    volumenMl: z.number().positive(),
    pesoDonadorKg: z.number().positive(),
    tipoBolsa: z.string().optional().nullable(),
    metodoContencion: z.enum(["FISICA", "SEDACION"]),
    farmacoUtilizado: z.string().optional().nullable(),
    dosisMgKg: z.number().optional().nullable(),
    dosisTotal: z.number().optional().nullable(),
    horaAdministracion: z.string().optional().nullable(),
    reversionAplicada: z.boolean().optional().nullable(),
    descripcionProtocolo: z.string().optional().nullable(),
    observaciones: z.string().optional().nullable(),
    tipoProducto: z.enum(["SANGRE_TOTAL", "CONCENTRADO_ERITROCITARIO", "PLASMA"]),
  });
  const data = schema.parse(req.body);

  // Validate donor eligibility
  const donor = await prisma.bloodDonor.findUnique({
    where: { id: data.donorId },
    include: { pet: true },
  });
  if (!donor) return res.status(404).json({ error: "Donador no encontrado" });
  if (donor.estado !== "ACTIVO") {
    return res.status(400).json({ error: "El donador no está activo" });
  }

  // Check last evaluation
  const lastEval = await prisma.donorEvaluation.findFirst({
    where: { donorId: data.donorId },
    orderBy: { fecha: "desc" },
  });
  if (!lastEval || lastEval.resultado !== "APTO") {
    return res.status(400).json({ error: "El donador no tiene evaluación APTO reciente" });
  }

  // Check eligibility interval
  const config = await prisma.bloodBankConfig.findFirst();
  if (donor.fechaUltimaDonacion) {
    const species = donor.pet?.especie || donor.especie || "";
    const interval =
      species === "GATO"
        ? (config?.intervaloMinGatos || 84)
        : (config?.intervaloMinPerros || 56);
    const nextEligible = new Date(donor.fechaUltimaDonacion);
    nextEligible.setDate(nextEligible.getDate() + interval);
    if (nextEligible > new Date()) {
      return res.status(400).json({
        error: `Donador no elegible hasta ${nextEligible.toISOString().split("T")[0]}`,
      });
    }
  }

  // Check hematocrit
  const lastTest = await prisma.donorDiagnosticTest.findFirst({
    where: { donorId: data.donorId },
    orderBy: { fecha: "desc" },
  });
  if (lastTest?.hematocrito) {
    const species = donor.pet?.especie || donor.especie || "";
    const minHct =
      species === "GATO"
        ? (config?.hematocritoMinGatos || 30)
        : (config?.hematocritoMinPerros || 40);
    if (lastTest.hematocrito < minHct) {
      return res.status(400).json({
        error: `Hematocrito ${lastTest.hematocrito}% es menor al mínimo ${minHct}%`,
      });
    }
  }

  // Calculate expiry
  const now = new Date();
  let diasCaducidad = config?.diasCaducidadSangreTotal || 35;
  if (data.tipoProducto === "CONCENTRADO_ERITROCITARIO") {
    diasCaducidad = config?.diasCaducidadConcentrado || 42;
  } else if (data.tipoProducto === "PLASMA") {
    diasCaducidad = config?.diasCaducidadPlasma || 365;
  }
  const fechaCaducidad = new Date(now);
  fechaCaducidad.setDate(fechaCaducidad.getDate() + diasCaducidad);

  // Generate unique code
  const count = await prisma.bloodUnit.count();
  const codigoUnidad = `BS-${String(count + 1).padStart(5, "0")}`;

  // Create donation + unit in transaction
  const { tipoProducto, ...donationData } = data;

  const result = await prisma.$transaction(async (tx) => {
    const donation = await tx.bloodDonation.create({
      data: {
        ...donationData,
        horaAdministracion: donationData.horaAdministracion
          ? new Date(donationData.horaAdministracion)
          : null,
      },
    });

    const unit = await tx.bloodUnit.create({
      data: {
        codigoUnidad,
        donationId: donation.id,
        tipoProducto,
        volumenMl: data.volumenMl,
        tipoSanguineo: donor.tipoSanguineo,
        fechaRecoleccion: now,
        fechaCaducidad,
      },
    });

    // Update donor
    await tx.bloodDonor.update({
      where: { id: data.donorId },
      data: {
        fechaUltimaDonacion: now,
        totalDonaciones: { increment: 1 },
      },
    });

    return { donation, unit };
  });

  res.status(201).json(result);
});

router.get("/donations/:id", async (req: Request, res: Response): Promise<any> => {
  const donation = await prisma.bloodDonation.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      donor: {
        include: { pet: { include: { owner: { select: { nombre: true, telefono: true } } } } },
      },
      medico: { select: { id: true, nombre: true } },
      unit: true,
    },
  });
  if (!donation) return res.status(404).json({ error: "Donación no encontrada" });
  res.json(donation);
});

// ============================================================================
// BLOOD UNITS (INVENTORY)
// ============================================================================

router.get("/units", async (req: Request, res: Response): Promise<any> => {
  const status = qs(req.query.status);
  const tipoProducto = qs(req.query.tipoProducto);
  const tipoSanguineo = qs(req.query.tipoSanguineo);
  const expiringSoon = qs(req.query.expiringSoon);
  const where: any = {};

  if (status) where.status = status;
  if (tipoProducto) where.tipoProducto = tipoProducto;
  if (tipoSanguineo) where.tipoSanguineo = { contains: tipoSanguineo as string };

  if (expiringSoon === "true") {
    const config = await prisma.bloodBankConfig.findFirst();
    const alertDays = config?.diasAlertaCaducidad || 7;
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + alertDays);
    where.status = "DISPONIBLE";
    where.fechaCaducidad = { lte: alertDate };
  }

  const units = await prisma.bloodUnit.findMany({
    where,
    include: {
      donation: {
        include: {
          donor: {
            select: { id: true, nombre: true, tipoSanguineo: true, pet: { select: { nombre: true } } },
          },
        },
      },
    },
    orderBy: { fechaCaducidad: "asc" },
  });
  res.json(units);
});

router.get("/units/:id", async (req: Request, res: Response): Promise<any> => {
  const unit = await prisma.bloodUnit.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      donation: {
        include: {
          donor: {
            include: { pet: { include: { owner: { select: { nombre: true, telefono: true } } } } },
          },
          medico: { select: { id: true, nombre: true } },
        },
      },
      transfusions: {
        include: {
          recipientPet: { select: { nombre: true, especie: true, owner: { select: { nombre: true } } } },
          medico: { select: { id: true, nombre: true } },
        },
      },
    },
  });
  if (!unit) return res.status(404).json({ error: "Unidad no encontrada" });
  res.json(unit);
});

router.put("/units/:id/status", async (req: Request, res: Response): Promise<any> => {
  const { status, notas } = req.body;
  const validStatuses = ["DISPONIBLE", "RESERVADA", "CADUCADA", "DESCARTADA"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  const unit = await prisma.bloodUnit.update({
    where: { id: (req.params.id as string) },
    data: { status, notas: notas || undefined },
  });
  res.json(unit);
});

router.post("/units/check-expiry", async (_req: Request, res: Response) => {
  const now = new Date();
  const config = await prisma.bloodBankConfig.findFirst();
  const alertDays = config?.diasAlertaCaducidad || 7;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + alertDays);

  // Mark expired units
  const expired = await prisma.bloodUnit.updateMany({
    where: {
      status: "DISPONIBLE",
      fechaCaducidad: { lt: now },
    },
    data: { status: "CADUCADA" },
  });

  // Find units expiring soon
  const expiringSoon = await prisma.bloodUnit.findMany({
    where: {
      status: "DISPONIBLE",
      fechaCaducidad: { lte: alertDate, gt: now },
    },
  });

  // Create alerts for expired
  if (expired.count > 0) {
    const expiredUnits = await prisma.bloodUnit.findMany({
      where: { status: "CADUCADA", fechaCaducidad: { lt: now } },
    });
    for (const u of expiredUnits) {
      const existing = await prisma.bloodBankAlert.findFirst({
        where: { unitId: u.id, tipo: "CADUCADA", resuelta: false },
      });
      if (!existing) {
        await prisma.bloodBankAlert.create({
          data: {
            tipo: "CADUCADA",
            unitId: u.id,
            mensaje: `Unidad ${u.codigoUnidad} ha caducado`,
            prioridad: "ALTA",
          },
        });
      }
    }
  }

  // Create alerts for expiring soon
  for (const u of expiringSoon) {
    const existing = await prisma.bloodBankAlert.findFirst({
      where: { unitId: u.id, tipo: "PROXIMA_CADUCIDAD", resuelta: false },
    });
    if (!existing) {
      const daysLeft = Math.ceil((u.fechaCaducidad.getTime() - now.getTime()) / 86400000);
      await prisma.bloodBankAlert.create({
        data: {
          tipo: "PROXIMA_CADUCIDAD",
          unitId: u.id,
          mensaje: `Unidad ${u.codigoUnidad} caduca en ${daysLeft} días`,
          prioridad: daysLeft <= 3 ? "ALTA" : "MEDIA",
        },
      });
    }
  }

  // Check donor eligibility
  const donors = await prisma.bloodDonor.findMany({
    where: { estado: "ACTIVO", fechaUltimaDonacion: { not: null } },
    include: { pet: true },
  });
  for (const d of donors) {
    const species = d.pet?.especie || d.especie || "";
    const interval =
      species === "GATO"
        ? (config?.intervaloMinGatos || 84)
        : (config?.intervaloMinPerros || 56);
    const nextEligible = new Date(d.fechaUltimaDonacion!);
    nextEligible.setDate(nextEligible.getDate() + interval);
    if (nextEligible <= now) {
      const existing = await prisma.bloodBankAlert.findFirst({
        where: { donorId: d.id, tipo: "DONADOR_ELEGIBLE", resuelta: false },
      });
      if (!existing) {
        const name = d.pet?.nombre || d.nombre || "Donador";
        await prisma.bloodBankAlert.create({
          data: {
            tipo: "DONADOR_ELEGIBLE",
            donorId: d.id,
            mensaje: `${name} es elegible para nueva donación`,
            prioridad: "BAJA",
          },
        });
      }
    }
  }

  res.json({
    expiredMarked: expired.count,
    expiringSoonAlerts: expiringSoon.length,
    donorsChecked: donors.length,
  });
});

// ============================================================================
// TRANSFUSIONS
// ============================================================================

router.get("/transfusions", async (req: Request, res: Response) => {
  const transfusions = await prisma.bloodTransfusion.findMany({
    include: {
      unit: { select: { codigoUnidad: true, tipoProducto: true, tipoSanguineo: true } },
      recipientPet: {
        select: { nombre: true, especie: true, owner: { select: { nombre: true, telefono: true } } },
      },
      medico: { select: { id: true, nombre: true } },
    },
    orderBy: { fechaTransfusion: "desc" },
  });
  res.json(transfusions);
});

router.post("/transfusions", async (req: Request, res: Response): Promise<any> => {
  const schema = z.object({
    unitId: z.string(),
    recipientPetId: z.string().optional().nullable(),
    recipientName: z.string().optional().nullable(),
    recipientSpecies: z.string().optional().nullable(),
    recipientBreed: z.string().optional().nullable(),
    recipientOwnerName: z.string().optional().nullable(),
    recipientOwnerPhone: z.string().optional().nullable(),
    consultationId: z.string().optional().nullable(),
    hospitalizationId: z.string().optional().nullable(),
    requestId: z.string().optional().nullable(),
    medicoId: z.string(),
    volumenTransfundidoMl: z.number().positive(),
    reacciones: z.string().optional().nullable(),
    observaciones: z.string().optional().nullable(),
  });
  const data = schema.parse(req.body);

  // Validate unit
  const unit = await prisma.bloodUnit.findUnique({ where: { id: data.unitId } });
  if (!unit) return res.status(404).json({ error: "Unidad no encontrada" });
  if (unit.status === "CADUCADA") {
    return res.status(400).json({ error: "No se puede usar una unidad caducada" });
  }
  if (unit.status !== "DISPONIBLE" && unit.status !== "RESERVADA") {
    return res.status(400).json({ error: `Unidad no disponible (status: ${unit.status})` });
  }
  if (unit.fechaCaducidad < new Date()) {
    // Auto-mark as expired
    await prisma.bloodUnit.update({
      where: { id: unit.id },
      data: { status: "CADUCADA" },
    });
    return res.status(400).json({ error: "La unidad ha caducado" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const { requestId, ...transfusionData } = data;
    const transfusion = await tx.bloodTransfusion.create({
      data: transfusionData,
      include: {
        unit: true,
        recipientPet: { select: { nombre: true } },
        medico: { select: { nombre: true } },
      },
    });

    await tx.bloodUnit.update({
      where: { id: data.unitId },
      data: { status: "UTILIZADA" },
    });

    // If this transfusion was originated from a request, link and complete it
    if (requestId) {
      await tx.bloodTransfusionRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETADA",
          transfusionId: transfusion.id,
          procesadoAt: new Date(),
        },
      });
    }

    return transfusion;
  });

  res.status(201).json(result);
});

router.get("/transfusions/:id", async (req: Request, res: Response): Promise<any> => {
  const transfusion = await prisma.bloodTransfusion.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      unit: {
        include: {
          donation: {
            include: {
              donor: { include: { pet: { select: { nombre: true } } } },
            },
          },
        },
      },
      recipientPet: {
        include: { owner: { select: { nombre: true, telefono: true } } },
      },
      medico: { select: { id: true, nombre: true } },
    },
  });
  if (!transfusion) return res.status(404).json({ error: "Transfusión no encontrada" });
  res.json(transfusion);
});

// ============================================================================
// ALERTS
// ============================================================================

router.get("/alerts", async (req: Request, res: Response): Promise<any> => {
  const tipo = qs(req.query.tipo);
  const resuelta = qs(req.query.resuelta);
  const where: any = {};
  if (tipo) where.tipo = tipo;
  if (resuelta !== undefined) where.resuelta = resuelta === "true";

  const alerts = await prisma.bloodBankAlert.findMany({
    where,
    include: {
      unit: { select: { codigoUnidad: true, tipoProducto: true, status: true } },
      donor: { select: { id: true, nombre: true, pet: { select: { nombre: true } } } },
      resueltaPor: { select: { nombre: true } },
    },
    orderBy: [{ resuelta: "asc" }, { prioridad: "asc" }, { createdAt: "desc" }],
  });
  res.json(alerts);
});

router.put("/alerts/:id/resolve", async (req: Request, res: Response) => {
  const { userId } = req.body;
  const alert = await prisma.bloodBankAlert.update({
    where: { id: (req.params.id as string) },
    data: {
      resuelta: true,
      resueltaAt: new Date(),
      resueltaPorId: userId,
    },
  });
  res.json(alert);
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

router.get("/dashboard", async (_req: Request, res: Response) => {
  const now = new Date();
  const config = await prisma.bloodBankConfig.findFirst();
  const alertDays = config?.diasAlertaCaducidad || 7;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + alertDays);

  const [
    totalUnitsAvailable,
    unitsByType,
    unitsByBloodType,
    expiringUnits,
    activeDonors,
    totalDonors,
    recentTransfusions,
    unresolvedAlerts,
  ] = await Promise.all([
    prisma.bloodUnit.count({ where: { status: "DISPONIBLE" } }),
    prisma.bloodUnit.groupBy({
      by: ["tipoProducto"],
      where: { status: "DISPONIBLE" },
      _count: true,
    }),
    prisma.bloodUnit.groupBy({
      by: ["tipoSanguineo"],
      where: { status: "DISPONIBLE" },
      _count: true,
    }),
    prisma.bloodUnit.count({
      where: { status: "DISPONIBLE", fechaCaducidad: { lte: alertDate } },
    }),
    prisma.bloodDonor.count({ where: { estado: "ACTIVO" } }),
    prisma.bloodDonor.count(),
    prisma.bloodTransfusion.count({
      where: { fechaTransfusion: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    }),
    prisma.bloodBankAlert.count({ where: { resuelta: false } }),
  ]);

  const pendingRequests = await prisma.bloodTransfusionRequest.count({
    where: { status: "PENDIENTE" },
  });

  // Eligible donors count
  const activeWithDonation = await prisma.bloodDonor.findMany({
    where: { estado: "ACTIVO" },
    include: { pet: true },
  });
  let eligibleCount = 0;
  for (const d of activeWithDonation) {
    if (!d.fechaUltimaDonacion) {
      eligibleCount++;
      continue;
    }
    const species = d.pet?.especie || d.especie || "";
    const interval =
      species === "GATO"
        ? (config?.intervaloMinGatos || 84)
        : (config?.intervaloMinPerros || 56);
    const nextEligible = new Date(d.fechaUltimaDonacion);
    nextEligible.setDate(nextEligible.getDate() + interval);
    if (nextEligible <= now) eligibleCount++;
  }

  res.json({
    totalUnitsAvailable,
    unitsByType: unitsByType.map((u) => ({ tipo: u.tipoProducto, count: u._count })),
    unitsByBloodType: unitsByBloodType
      .filter((u) => u.tipoSanguineo)
      .map((u) => ({ tipo: u.tipoSanguineo, count: u._count })),
    expiringUnits,
    activeDonors,
    totalDonors,
    eligibleDonors: eligibleCount,
    recentTransfusions,
    unresolvedAlerts,
    pendingRequests,
  });
});

// ============================================================================
// DONOR HISTORY
// ============================================================================

router.get("/donors/:id/history", async (req: Request, res: Response): Promise<any> => {
  const donor = await prisma.bloodDonor.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      pet: {
        include: { owner: { select: { nombre: true, telefono: true, email: true } } },
      },
      evaluations: {
        include: { evaluator: { select: { nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      diagnosticTests: {
        include: { registeredBy: { select: { nombre: true } } },
        orderBy: { fecha: "desc" },
      },
      donations: {
        include: {
          medico: { select: { nombre: true } },
          unit: {
            include: {
              transfusions: {
                include: {
                  recipientPet: { select: { nombre: true } },
                  medico: { select: { nombre: true } },
                },
              },
            },
          },
        },
        orderBy: { fecha: "desc" },
      },
    },
  });
  if (!donor) return res.status(404).json({ error: "Donador no encontrado" });

  // Compute volume total donated
  const donorAny = donor as any;
  const volumenTotal = (donorAny.donations || []).reduce((sum: number, d: any) => sum + d.volumenMl, 0);

  res.json({ ...donor, volumenTotal });
});

// ============================================================================
// TRANSFUSION REQUESTS
// ============================================================================

router.get("/requests", async (req: Request, res: Response): Promise<any> => {
  const status = qs(req.query.status);
  const urgencia = qs(req.query.urgencia);
  const where: any = {};
  if (status) where.status = status;
  if (urgencia) where.urgencia = urgencia;

  const requests = await prisma.bloodTransfusionRequest.findMany({
    where,
    include: {
      pet: { select: { id: true, nombre: true, especie: true, raza: true, owner: { select: { nombre: true, telefono: true } } } },
      consultation: { select: { id: true, visitId: true, status: true } },
      hospitalization: { select: { id: true, type: true, status: true } },
      solicitadoPor: { select: { id: true, nombre: true } },
      procesadoPor: { select: { id: true, nombre: true } },
      transfusion: { select: { id: true, unitId: true, volumenTransfundidoMl: true, fechaTransfusion: true } },
    },
    orderBy: [{ urgencia: "asc" }, { createdAt: "desc" }],
  });
  res.json(requests);
});

router.post("/requests", async (req: Request, res: Response): Promise<any> => {
  const schema = z.object({
    petId: z.string().optional().nullable(),
    consultationId: z.string().optional().nullable(),
    hospitalizationId: z.string().optional().nullable(),
    recipientName: z.string().optional().nullable(),
    recipientSpecies: z.string().optional().nullable(),
    solicitadoPorId: z.string(),
    tipoProducto: z.enum(["SANGRE_TOTAL", "CONCENTRADO_ERITROCITARIO", "PLASMA"]),
    tipoSanguineo: z.string().optional().nullable(),
    urgencia: z.enum(["NORMAL", "URGENTE", "EMERGENCIA"]).optional(),
    volumenEstimadoMl: z.number().positive().optional().nullable(),
    motivo: z.string(),
    notas: z.string().optional().nullable(),
  });
  const data = schema.parse(req.body);

  const request = await prisma.bloodTransfusionRequest.create({
    data: data as any,
    include: {
      pet: { select: { id: true, nombre: true, especie: true } },
      solicitadoPor: { select: { id: true, nombre: true } },
    },
  });

  // Create alert for blood bank
  const petName = request.pet?.nombre || data.recipientName || "Paciente";
  const urgLabel = data.urgencia === "EMERGENCIA" ? "🚨 EMERGENCIA" : data.urgencia === "URGENTE" ? "⚠️ URGENTE" : "";
  await prisma.bloodBankAlert.create({
    data: {
      tipo: "SOLICITUD_TRANSFUSION",
      mensaje: `${urgLabel} Solicitud de transfusión para ${petName} - ${data.tipoProducto} - Solicitado por: ${request.solicitadoPor?.nombre}`.trim(),
      prioridad: data.urgencia === "EMERGENCIA" ? "ALTA" : data.urgencia === "URGENTE" ? "ALTA" : "MEDIA",
    },
  });

  res.status(201).json(request);
});

router.get("/requests/:id", async (req: Request, res: Response): Promise<any> => {
  const request = await prisma.bloodTransfusionRequest.findUnique({
    where: { id: (req.params.id as string) },
    include: {
      pet: { select: { id: true, nombre: true, especie: true, raza: true, peso: true, owner: { select: { nombre: true, telefono: true } } } },
      consultation: { select: { id: true, visitId: true, soapAssessment: true } },
      hospitalization: { select: { id: true, type: true, presumptiveDiagnosis: true } },
      solicitadoPor: { select: { id: true, nombre: true } },
      procesadoPor: { select: { id: true, nombre: true } },
      transfusion: true,
    },
  });
  if (!request) return res.status(404).json({ error: "Solicitud no encontrada" });
  res.json(request);
});

router.put("/requests/:id/approve", async (req: Request, res: Response): Promise<any> => {
  const { procesadoPorId } = req.body;
  const request = await prisma.bloodTransfusionRequest.findUnique({ where: { id: (req.params.id as string) } });
  if (!request) return res.status(404).json({ error: "Solicitud no encontrada" });
  if (request.status !== "PENDIENTE") return res.status(400).json({ error: "Solo se pueden aprobar solicitudes pendientes" });

  const updated = await prisma.bloodTransfusionRequest.update({
    where: { id: (req.params.id as string) },
    data: {
      status: "APROBADA",
      procesadoPorId,
      procesadoAt: new Date(),
    },
    include: {
      pet: { select: { nombre: true } },
      solicitadoPor: { select: { nombre: true } },
    },
  });
  res.json(updated);
});

router.put("/requests/:id/reject", async (req: Request, res: Response): Promise<any> => {
  const { procesadoPorId, motivoRechazo } = req.body;
  const request = await prisma.bloodTransfusionRequest.findUnique({ where: { id: (req.params.id as string) } });
  if (!request) return res.status(404).json({ error: "Solicitud no encontrada" });
  if (request.status !== "PENDIENTE") return res.status(400).json({ error: "Solo se pueden rechazar solicitudes pendientes" });

  const updated = await prisma.bloodTransfusionRequest.update({
    where: { id: (req.params.id as string) },
    data: {
      status: "RECHAZADA",
      procesadoPorId,
      procesadoAt: new Date(),
      motivoRechazo,
    },
  });
  res.json(updated);
});

router.put("/requests/:id/cancel", async (req: Request, res: Response): Promise<any> => {
  const request = await prisma.bloodTransfusionRequest.findUnique({ where: { id: (req.params.id as string) } });
  if (!request) return res.status(404).json({ error: "Solicitud no encontrada" });
  if (request.status !== "PENDIENTE") return res.status(400).json({ error: "Solo se pueden cancelar solicitudes pendientes" });

  const updated = await prisma.bloodTransfusionRequest.update({
    where: { id: (req.params.id as string) },
    data: { status: "CANCELADA" },
  });
  res.json(updated);
});

// Count pending requests (for dashboard badge)
router.get("/requests/count/pending", async (_req: Request, res: Response) => {
  const count = await prisma.bloodTransfusionRequest.count({
    where: { status: "PENDIENTE" },
  });
  res.json({ count });
});

export default router;
