// backend/seed-dosing.js
// Seed common veterinary medication dosing data
// Run: cd backend && node seed-dosing.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Common veterinary medication dosing references
// Sources: Plumb's Veterinary Drug Handbook, BSAVA Formulary
const dosingData = [
  // === ANTIBIÓTICOS ===
  {
    medicationName: 'Amoxicilina',
    dosings: [
      { species: 'PERRO', doseMin: 10, doseMax: 20, routes: '["PO"]', frequencyHours: 12, notes: 'Amplio espectro. Puede darse con alimento.' },
      { species: 'GATO', doseMin: 10, doseMax: 20, routes: '["PO"]', frequencyHours: 12, notes: 'Amplio espectro.' },
    ]
  },
  {
    medicationName: 'Amoxicilina con Ácido Clavulánico',
    dosings: [
      { species: 'PERRO', doseMin: 12.5, doseMax: 25, routes: '["PO"]', frequencyHours: 12, notes: 'Para infecciones resistentes.' },
      { species: 'GATO', doseMin: 12.5, doseMax: 25, routes: '["PO"]', frequencyHours: 12, notes: 'Para infecciones resistentes.' },
    ]
  },
  {
    medicationName: 'Cefalexina',
    dosings: [
      { species: 'PERRO', doseMin: 15, doseMax: 30, routes: '["PO"]', frequencyHours: 12, notes: 'Cefalosporina 1ª gen. Infecciones piel, UTI.' },
      { species: 'GATO', doseMin: 15, doseMax: 30, routes: '["PO"]', frequencyHours: 12, notes: 'Cefalosporina 1ª gen.' },
    ]
  },
  {
    medicationName: 'Enrofloxacina',
    dosings: [
      { species: 'PERRO', doseMin: 5, doseMax: 20, routes: '["PO","IM","IV"]', frequencyHours: 24, notes: 'Fluoroquinolona. No usar en cachorros en crecimiento.' },
      { species: 'GATO', doseMin: 5, doseMax: 5, routes: '["PO"]', frequencyHours: 24, notes: '⚠️ No exceder 5 mg/kg en gatos (riesgo de toxicidad retiniana).' },
    ]
  },
  {
    medicationName: 'Metronidazol',
    dosings: [
      { species: 'PERRO', doseMin: 10, doseMax: 25, routes: '["PO","IV"]', frequencyHours: 12, notes: 'Anaerobios, Giardia, EII. Dar con alimento.' },
      { species: 'GATO', doseMin: 10, doseMax: 25, routes: '["PO","IV"]', frequencyHours: 12, notes: 'Anaerobios, Giardia.' },
    ]
  },
  {
    medicationName: 'Doxiciclina',
    dosings: [
      { species: 'PERRO', doseMin: 5, doseMax: 10, routes: '["PO"]', frequencyHours: 12, notes: 'Tetraciclina. Ehrlichia, Leptospira, Bordetella. Dar con alimento.' },
      { species: 'GATO', doseMin: 5, doseMax: 10, routes: '["PO"]', frequencyHours: 12, notes: 'Mycoplasma, Chlamydophila. Dar con alimento+agua para evitar esofagitis.' },
    ]
  },
  {
    medicationName: 'Clindamicina',
    dosings: [
      { species: 'PERRO', doseMin: 5.5, doseMax: 11, routes: '["PO"]', frequencyHours: 12, notes: 'Infecciones óseas, dentales, anaerobios.' },
      { species: 'GATO', doseMin: 5.5, doseMax: 11, routes: '["PO"]', frequencyHours: 12, notes: 'Toxoplasmosis, infecciones dentales.' },
    ]
  },
  {
    medicationName: 'Ceftriaxona',
    dosings: [
      { species: 'PERRO', doseMin: 25, doseMax: 50, routes: '["IV","IM","SC"]', frequencyHours: 24, notes: 'Cefalosporina 3ª gen. Infecciones severas.' },
      { species: 'GATO', doseMin: 25, doseMax: 50, routes: '["IV","IM","SC"]', frequencyHours: 24, notes: 'Cefalosporina 3ª gen.' },
    ]
  },

  // === ANALGESICOS / AINES ===
  {
    medicationName: 'Meloxicam',
    dosings: [
      { species: 'PERRO', doseMin: 0.1, doseMax: 0.2, routes: '["PO","SC"]', frequencyHours: 24, notes: 'Día 1: 0.2 mg/kg, mantenimiento: 0.1 mg/kg. Con alimento.' },
      { species: 'GATO', doseMin: 0.05, doseMax: 0.1, routes: '["PO","SC"]', frequencyHours: 24, notes: '⚠️ Uso máx 3 días en gatos. Dosis inicial: 0.1, mantenimiento: 0.05.' },
    ]
  },
  {
    medicationName: 'Carprofeno',
    dosings: [
      { species: 'PERRO', doseMin: 2, doseMax: 4, routes: '["PO","SC","IV"]', frequencyHours: 12, notes: '4 mg/kg/día dividido en 2 tomas. AINE preferido en perros.' },
      { species: 'GATO', doseMin: 1, doseMax: 2, routes: '["SC"]', frequencyHours: 24, notes: '⚠️ Solo dosis única perioperatoria en gatos.' },
    ]
  },
  {
    medicationName: 'Tramadol',
    dosings: [
      { species: 'PERRO', doseMin: 2, doseMax: 5, routes: '["PO","IV"]', frequencyHours: 8, notes: 'Opiode sintético. Dolor moderado-severo.' },
      { species: 'GATO', doseMin: 1, doseMax: 2, routes: '["PO"]', frequencyHours: 12, notes: 'Dolor moderado. Sabor amargo, considerar formulación.' },
    ]
  },
  {
    medicationName: 'Gabapentina',
    dosings: [
      { species: 'PERRO', doseMin: 5, doseMax: 10, routes: '["PO"]', frequencyHours: 8, notes: 'Dolor neuropático, coadyuvante.' },
      { species: 'GATO', doseMin: 3, doseMax: 10, routes: '["PO"]', frequencyHours: 8, notes: 'Dolor, ansiedad. Inicio con 5 mg/kg.' },
    ]
  },
  {
    medicationName: 'Dipirona',
    dosings: [
      { species: 'PERRO', doseMin: 25, doseMax: 50, routes: '["IV","IM","PO"]', frequencyHours: 8, notes: 'Analgésico, antipirético. Uso IV lento.' },
      { species: 'GATO', doseMin: 25, doseMax: 50, routes: '["IV","IM"]', frequencyHours: 12, notes: 'Antipirético. IV lento.' },
    ]
  },

  // === CORTICOSTEROIDES ===
  {
    medicationName: 'Dexametasona',
    dosings: [
      { species: 'PERRO', doseMin: 0.1, doseMax: 0.5, routes: '["IV","IM","PO"]', frequencyHours: 24, notes: 'Antiinflamatorio: 0.1-0.2. Inmunosupresor: 0.3-0.5. No usar largo plazo en dosis altas.' },
      { species: 'GATO', doseMin: 0.1, doseMax: 0.5, routes: '["IV","IM","PO"]', frequencyHours: 24, notes: 'Antiinflamatorio potente. Monitorear glucosa.' },
    ]
  },
  {
    medicationName: 'Prednisolona',
    dosings: [
      { species: 'PERRO', doseMin: 0.5, doseMax: 2, routes: '["PO"]', frequencyHours: 12, notes: 'Antiinflamatorio: 0.5-1. Inmunosupresor: 1-2. Reducir gradualmente.' },
      { species: 'GATO', doseMin: 0.5, doseMax: 2, routes: '["PO"]', frequencyHours: 12, notes: '⚠️ Usar prednisolona, no prednisona (gatos no la convierten bien).' },
    ]
  },

  // === GASTROINTESTINALES ===
  {
    medicationName: 'Omeprazol',
    dosings: [
      { species: 'PERRO', doseMin: 0.5, doseMax: 1, routes: '["PO","IV"]', frequencyHours: 12, notes: 'Protector gástrico. En ayunas si PO.' },
      { species: 'GATO', doseMin: 0.5, doseMax: 1, routes: '["PO","IV"]', frequencyHours: 24, notes: 'Protector gástrico.' },
    ]
  },
  {
    medicationName: 'Maropitant',
    dosings: [
      { species: 'PERRO', doseMin: 1, doseMax: 2, routes: '["PO","SC","IV"]', frequencyHours: 24, notes: 'Antiemético de elección. SC puede causar dolor transitorio.' },
      { species: 'GATO', doseMin: 1, doseMax: 1, routes: '["PO","SC","IV"]', frequencyHours: 24, notes: 'Antiemético. Dosis estándar 1 mg/kg.' },
    ]
  },
  {
    medicationName: 'Metoclopramida',
    dosings: [
      { species: 'PERRO', doseMin: 0.2, doseMax: 0.5, routes: '["PO","SC","IM","IV"]', frequencyHours: 8, notes: 'Procinético y antiemético. CRI: 1-2 mg/kg/día.' },
      { species: 'GATO', doseMin: 0.2, doseMax: 0.4, routes: '["PO","SC","IV"]', frequencyHours: 8, notes: 'Procinético. Puede causar excitación.' },
    ]
  },
  {
    medicationName: 'Sucralfato',
    dosings: [
      { species: 'PERRO', doseMin: 40, doseMax: 40, routes: '["PO"]', frequencyHours: 8, notes: '0.5-1g por dosis según tamaño. Dar 1h antes de otros fármacos.' },
      { species: 'GATO', doseMin: 40, doseMax: 40, routes: '["PO"]', frequencyHours: 8, notes: '250mg por dosis. Dar 1h antes de otros fármacos.' },
    ]
  },

  // === ANTIPARASITARIOS ===
  {
    medicationName: 'Ivermectina',
    dosings: [
      { species: 'PERRO', doseMin: 0.006, doseMax: 0.012, routes: '["PO","SC"]', frequencyHours: 24, notes: '⚠️ CONTRAINDICADO en Collies, Pastores y cruces MDR1+. Preventivo heartworm: 0.006.' },
      { species: 'GATO', doseMin: 0.024, doseMax: 0.024, routes: '["SC"]', frequencyHours: 0, notes: 'Dosis única para ácaros.' },
    ]
  },
  {
    medicationName: 'Fenbendazol',
    dosings: [
      { species: 'PERRO', doseMin: 50, doseMax: 50, routes: '["PO"]', frequencyHours: 24, notes: 'Desparasitante amplio espectro. 3-5 días consecutivos. Seguro en gestantes.' },
      { species: 'GATO', doseMin: 50, doseMax: 50, routes: '["PO"]', frequencyHours: 24, notes: 'Desparasitante amplio espectro. 3-5 días consecutivos.' },
    ]
  },

  // === CARDIACOS ===
  {
    medicationName: 'Enalapril',
    dosings: [
      { species: 'PERRO', doseMin: 0.25, doseMax: 0.5, routes: '["PO"]', frequencyHours: 12, notes: 'IECA. ICC, enfermedad valvular. Monitorear función renal.' },
      { species: 'GATO', doseMin: 0.25, doseMax: 0.5, routes: '["PO"]', frequencyHours: 12, notes: 'IECA. Monitorear función renal y potasio.' },
    ]
  },
  {
    medicationName: 'Furosemida',
    dosings: [
      { species: 'PERRO', doseMin: 1, doseMax: 4, routes: '["PO","IV","IM"]', frequencyHours: 8, notes: 'Diurético de asa. ICC aguda: 2-4 IV. Mantenimiento: 1-2 PO.' },
      { species: 'GATO', doseMin: 1, doseMax: 4, routes: '["PO","IV","IM"]', frequencyHours: 8, notes: 'Diurético. Emergencia: 2-4 IV. Monitorear electrolitos.' },
    ]
  },
  {
    medicationName: 'Pimobendan',
    dosings: [
      { species: 'PERRO', doseMin: 0.1, doseMax: 0.3, routes: '["PO"]', frequencyHours: 12, notes: 'Inodilatador. ICC, CMD. Dar en ayunas (1h antes de alimento).' },
    ]
  },

  // === ANESTÉSICOS / SEDANTES ===
  {
    medicationName: 'Acepromazina',
    dosings: [
      { species: 'PERRO', doseMin: 0.01, doseMax: 0.05, routes: '["IM","IV","SC"]', frequencyHours: 0, notes: 'Fenotiacina. Premedicación. ⚠️ No en boxers, debilitados, epilepsia.' },
      { species: 'GATO', doseMin: 0.01, doseMax: 0.05, routes: '["IM","SC"]', frequencyHours: 0, notes: 'Premedicación. Dosis baja.' },
    ]
  },
  {
    medicationName: 'Ketamina',
    dosings: [
      { species: 'PERRO', doseMin: 5, doseMax: 10, routes: '["IV","IM"]', frequencyHours: 0, notes: 'Anestésico disociativo. Combinar con benzodiacepina.' },
      { species: 'GATO', doseMin: 5, doseMax: 10, routes: '["IV","IM"]', frequencyHours: 0, notes: 'Anestésico disociativo. Gatos la metabolizan mejor.' },
    ]
  },
  {
    medicationName: 'Xilacina',
    dosings: [
      { species: 'PERRO', doseMin: 0.5, doseMax: 1, routes: '["IV","IM"]', frequencyHours: 0, notes: 'Alfa-2 agonista. Sedación. Revierte con atipamezol.' },
      { species: 'GATO', doseMin: 0.5, doseMax: 1, routes: '["IM"]', frequencyHours: 0, notes: 'Sedación profunda. Puede causar vómito. Revierte con atipamezol.' },
    ]
  },
  {
    medicationName: 'Propofol',
    dosings: [
      { species: 'PERRO', doseMin: 4, doseMax: 6, routes: '["IV"]', frequencyHours: 0, notes: 'Inducción anestésica. Aplicar lento a efecto. Apnea posible.' },
      { species: 'GATO', doseMin: 4, doseMax: 8, routes: '["IV"]', frequencyHours: 0, notes: 'Inducción anestésica. ⚠️ Uso repetido en gatos causa cuerpos de Heinz.' },
    ]
  },

  // === ANTICONVULSIVANTES ===
  {
    medicationName: 'Fenobarbital',
    dosings: [
      { species: 'PERRO', doseMin: 2, doseMax: 5, routes: '["PO","IV"]', frequencyHours: 12, notes: 'Antiepiléptico 1ª línea. Monitorear niveles séricos a 2 semanas.' },
      { species: 'GATO', doseMin: 1, doseMax: 2, routes: '["PO","IV"]', frequencyHours: 12, notes: 'Antiepiléptico. Monitorear función hepática.' },
    ]
  },

  // === DERMATOLÓGICOS / ANTIHISTAMÍNICOS ===
  {
    medicationName: 'Difenhidramina',
    dosings: [
      { species: 'PERRO', doseMin: 1, doseMax: 2, routes: '["PO","IM","IV"]', frequencyHours: 8, notes: 'Antihistamínico H1. Reacciones alérgicas, prurito.' },
      { species: 'GATO', doseMin: 1, doseMax: 2, routes: '["PO","IM"]', frequencyHours: 8, notes: 'Antihistamínico. Puede causar excitación paradójica.' },
    ]
  },

  // === EMERGENCIA ===
  {
    medicationName: 'Atropina',
    dosings: [
      { species: 'PERRO', doseMin: 0.02, doseMax: 0.04, routes: '["IV","IM"]', frequencyHours: 0, notes: 'Anticolinérgico. Bradicardia, intoxicación organofosforados. Emergencia.' },
      { species: 'GATO', doseMin: 0.02, doseMax: 0.04, routes: '["IV","IM"]', frequencyHours: 0, notes: 'Anticolinérgico. Bradicardia.' },
    ]
  },
  {
    medicationName: 'Adrenalina',
    dosings: [
      { species: 'PERRO', doseMin: 0.01, doseMax: 0.02, routes: '["IV","IT"]', frequencyHours: 0, notes: 'Paro cardiaco, anafilaxia. Repetir cada 3-5 min si necesario.' },
      { species: 'GATO', doseMin: 0.01, doseMax: 0.02, routes: '["IV","IT"]', frequencyHours: 0, notes: 'Paro cardiaco, anafilaxia.' },
    ]
  },
];

async function seedDosing() {
  console.log('🌱 Seeding medication dosing data...\n');

  let totalCreated = 0;
  let totalSkipped = 0;
  let medsNotFound = [];

  for (const entry of dosingData) {
    // Try to find the medication by name (flexible search)
    const medication = await prisma.medication.findFirst({
      where: {
        OR: [
          { name: { contains: entry.medicationName } },
          { genericName: { contains: entry.medicationName } },
          { nombreComercial: { contains: entry.medicationName } },
        ],
      },
    });

    if (!medication) {
      medsNotFound.push(entry.medicationName);
      totalSkipped += entry.dosings.length;
      continue;
    }

    for (const dosing of entry.dosings) {
      try {
        await prisma.medicationDosing.upsert({
          where: {
            medicationId_species: {
              medicationId: medication.id,
              species: dosing.species,
            },
          },
          create: {
            medicationId: medication.id,
            species: dosing.species,
            doseMin: dosing.doseMin,
            doseMax: dosing.doseMax,
            doseUnit: 'mg/kg',
            routes: dosing.routes,
            frequencyHours: dosing.frequencyHours || null,
            notes: dosing.notes || null,
          },
          update: {
            doseMin: dosing.doseMin,
            doseMax: dosing.doseMax,
            routes: dosing.routes,
            frequencyHours: dosing.frequencyHours || null,
            notes: dosing.notes || null,
          },
        });
        totalCreated++;
        console.log(`  ✅ ${entry.medicationName} (${dosing.species}): ${dosing.doseMin}-${dosing.doseMax} mg/kg`);
      } catch (err) {
        console.log(`  ❌ ${entry.medicationName} (${dosing.species}): ${err.message}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`  Creados/actualizados: ${totalCreated}`);
  console.log(`  Omitidos: ${totalSkipped}`);
  if (medsNotFound.length > 0) {
    console.log(`\n⚠️ Medicamentos no encontrados en inventario (${medsNotFound.length}):`);
    medsNotFound.forEach(m => console.log(`  - ${m}`));
    console.log('\n  → Agregue estos medicamentos al inventario y ejecute este script de nuevo.');
  }
}

seedDosing()
  .then(() => {
    console.log('\n✅ Seed completado');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
