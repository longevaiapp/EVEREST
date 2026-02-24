// backend/seed-vaccines.js
// Seed script for vaccines and dewormers - Medicina Preventiva module
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('💉 Seeding vaccines and dewormers for Medicina Preventiva...\n');

  // ============================================================================
  // VACCINES - 7 types
  // ============================================================================
  const vaccines = [
    // === PERROS ===
    {
      name: 'Vacuna Quíntuple Canina',
      genericName: 'Parvovirus + Distemper + Parainfluenza + Adenovirus + Leptospirosis',
      nombreComercial: 'Vanguard Plus 5/L',
      category: 'VACUNA',
      presentation: 'Frasco ampolla',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 15,
      minStock: 5,
      maxStock: 50,
      salePrice: 280.00,
      costPrice: 150.00,
      especies: 'PERRO',
      edadMinima: '6 semanas',
      intervaloRefuerzo: '365', // días
      viaAdministracion: 'SC',
      requiresRefrigeration: true,
      lote: 'VG-2024-156',
      expirationDate: new Date('2026-12-31'),
      supplier: 'Zoetis',
    },
    {
      name: 'Vacuna Séxtuple Canina',
      genericName: 'Quíntuple + Coronavirus',
      nombreComercial: 'Vanguard Plus 5/L4 CV',
      category: 'VACUNA',
      presentation: 'Frasco ampolla',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 12,
      minStock: 5,
      maxStock: 40,
      salePrice: 320.00,
      costPrice: 180.00,
      especies: 'PERRO',
      edadMinima: '6 semanas',
      intervaloRefuerzo: '365',
      viaAdministracion: 'SC',
      requiresRefrigeration: true,
      lote: 'VG-2024-189',
      expirationDate: new Date('2027-03-15'),
      supplier: 'Zoetis',
    },
    {
      name: 'Vacuna Antirrábica Canina',
      genericName: 'Virus de la rabia inactivado',
      nombreComercial: 'Rabisin®',
      category: 'VACUNA',
      presentation: 'Jeringa prellenada',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 23,
      minStock: 10,
      maxStock: 60,
      salePrice: 250.00,
      costPrice: 120.00,
      especies: 'PERRO',
      edadMinima: '12 semanas',
      intervaloRefuerzo: '365',
      viaAdministracion: 'IM',
      requiresRefrigeration: true,
      lote: 'RAB-2024-445',
      expirationDate: new Date('2027-08-20'),
      supplier: 'Boehringer Ingelheim',
    },
    {
      name: 'Vacuna Bordetella',
      genericName: 'Bordetella bronchiseptica',
      nombreComercial: 'Bronchi-Shield®',
      category: 'VACUNA',
      presentation: 'Frasco intranasal',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 8,
      minStock: 5,
      maxStock: 30,
      salePrice: 290.00,
      costPrice: 160.00,
      especies: 'PERRO',
      edadMinima: '8 semanas',
      intervaloRefuerzo: '180', // 6 meses
      viaAdministracion: 'Intranasal',
      requiresRefrigeration: true,
      lote: 'BS-2024-067',
      expirationDate: new Date('2026-09-30'),
      supplier: 'Elanco',
    },
    // === GATOS ===
    {
      name: 'Vacuna Triple Felina',
      genericName: 'Panleucopenia + Rinotraqueitis + Calicivirus',
      nombreComercial: 'Feligen CRP®',
      category: 'VACUNA',
      presentation: 'Frasco ampolla',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 18,
      minStock: 8,
      maxStock: 40,
      salePrice: 310.00,
      costPrice: 170.00,
      especies: 'GATO',
      edadMinima: '8 semanas',
      intervaloRefuerzo: '365',
      viaAdministracion: 'SC',
      requiresRefrigeration: true,
      lote: 'FEL-2024-112',
      expirationDate: new Date('2027-02-28'),
      supplier: 'Virbac',
    },
    {
      name: 'Vacuna Leucemia Felina',
      genericName: 'Virus de leucemia felina',
      nombreComercial: 'Purevax FeLV®',
      category: 'VACUNA',
      presentation: 'Jeringa prellenada',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 10,
      minStock: 5,
      maxStock: 30,
      salePrice: 380.00,
      costPrice: 210.00,
      especies: 'GATO',
      edadMinima: '8 semanas',
      intervaloRefuerzo: '365',
      viaAdministracion: 'SC',
      requiresRefrigeration: true,
      lote: 'PVX-2024-089',
      expirationDate: new Date('2027-01-15'),
      supplier: 'Boehringer Ingelheim',
    },
    {
      name: 'Vacuna Antirrábica Felina',
      genericName: 'Virus de la rabia inactivado',
      nombreComercial: 'Rabisin® Feline',
      category: 'VACUNA',
      presentation: 'Jeringa prellenada',
      concentration: '1 dosis/1ml',
      unit: 'dosis',
      currentStock: 20,
      minStock: 10,
      maxStock: 50,
      salePrice: 250.00,
      costPrice: 120.00,
      especies: 'GATO',
      edadMinima: '12 semanas',
      intervaloRefuerzo: '365',
      viaAdministracion: 'IM',
      requiresRefrigeration: true,
      lote: 'RAF-2024-334',
      expirationDate: new Date('2027-07-10'),
      supplier: 'Boehringer Ingelheim',
    },
  ];

  // ============================================================================
  // DEWORMERS - 3 types
  // ============================================================================
  const dewormers = [
    {
      name: 'Bravecto 20-40kg',
      genericName: 'Fluralaner',
      nombreComercial: 'Bravecto®',
      category: 'ANTIPARASITARIO',
      presentation: 'Tableta masticable',
      concentration: '1000mg',
      unit: 'tableta',
      currentStock: 8,
      minStock: 3,
      maxStock: 20,
      salePrice: 450.00,
      costPrice: 280.00,
      especies: 'PERRO',
      pesoMinimo: 20.0,
      pesoMaximo: 40.0,
      intervaloRefuerzo: '90', // 3 meses
      viaAdministracion: 'Oral',
      requiresRefrigeration: false,
      lote: 'BRV-2024-567',
      expirationDate: new Date('2027-06-30'),
      supplier: 'MSD',
    },
    {
      name: 'Bravecto Gatos 2.8-6.25kg',
      genericName: 'Fluralaner',
      nombreComercial: 'Bravecto® Spot-On Felino',
      category: 'ANTIPARASITARIO',
      presentation: 'Pipeta spot-on',
      concentration: '250mg/0.89ml',
      unit: 'pipeta',
      currentStock: 12,
      minStock: 5,
      maxStock: 25,
      salePrice: 380.00,
      costPrice: 240.00,
      especies: 'GATO',
      pesoMinimo: 2.8,
      pesoMaximo: 6.25,
      intervaloRefuerzo: '90',
      viaAdministracion: 'Topico',
      requiresRefrigeration: false,
      lote: 'BRC-2024-234',
      expirationDate: new Date('2027-05-15'),
      supplier: 'MSD',
    },
    {
      name: 'Drontal Plus',
      genericName: 'Praziquantel + Pirantel + Febantel',
      nombreComercial: 'Drontal® Plus',
      category: 'ANTIPARASITARIO',
      presentation: 'Tableta',
      concentration: '1 tableta por 10kg',
      unit: 'tableta',
      currentStock: 30,
      minStock: 15,
      maxStock: 60,
      salePrice: 85.00,
      costPrice: 45.00,
      especies: 'PERRO',
      intervaloRefuerzo: '90', // 3 meses
      viaAdministracion: 'Oral',
      requiresRefrigeration: false,
      lote: 'DRT-2024-789',
      expirationDate: new Date('2027-12-31'),
      supplier: 'Elanco',
    },
  ];

  // ============================================================================
  // INSERT VACCINES
  // ============================================================================
  console.log('💉 Creating vaccines...');
  
  for (const vaccine of vaccines) {
    const id = vaccine.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 25);
    
    try {
      await prisma.medication.upsert({
        where: { id },
        update: {
          ...vaccine,
          updatedAt: new Date(),
        },
        create: {
          id,
          ...vaccine,
        },
      });
      console.log(`  ✅ ${vaccine.name} (${vaccine.especies})`);
    } catch (error) {
      // If upsert by id fails, try creating with auto-generated id
      const existing = await prisma.medication.findFirst({
        where: { name: vaccine.name },
      });
      
      if (existing) {
        await prisma.medication.update({
          where: { id: existing.id },
          data: {
            ...vaccine,
            updatedAt: new Date(),
          },
        });
        console.log(`  ✅ ${vaccine.name} (${vaccine.especies}) - updated`);
      } else {
        await prisma.medication.create({
          data: vaccine,
        });
        console.log(`  ✅ ${vaccine.name} (${vaccine.especies}) - created`);
      }
    }
  }

  // ============================================================================
  // INSERT DEWORMERS
  // ============================================================================
  console.log('\n💊 Creating dewormers...');
  
  for (const dewormer of dewormers) {
    const id = dewormer.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 25);
    
    try {
      await prisma.medication.upsert({
        where: { id },
        update: {
          ...dewormer,
          updatedAt: new Date(),
        },
        create: {
          id,
          ...dewormer,
        },
      });
      console.log(`  ✅ ${dewormer.name} (${dewormer.especies})`);
    } catch (error) {
      const existing = await prisma.medication.findFirst({
        where: { name: dewormer.name },
      });
      
      if (existing) {
        await prisma.medication.update({
          where: { id: existing.id },
          data: {
            ...dewormer,
            updatedAt: new Date(),
          },
        });
        console.log(`  ✅ ${dewormer.name} (${dewormer.especies}) - updated`);
      } else {
        await prisma.medication.create({
          data: dewormer,
        });
        console.log(`  ✅ ${dewormer.name} (${dewormer.especies}) - created`);
      }
    }
  }

  console.log('\n🎉 Vaccine and dewormer seed completed!');
  console.log(`   Total: ${vaccines.length} vaccines + ${dewormers.length} dewormers = ${vaccines.length + dewormers.length} products`);
  console.log('\n📋 Summary:');
  console.log('   Vaccines for PERRO: 4 (Quíntuple, Séxtuple, Antirrábica, Bordetella)');
  console.log('   Vaccines for GATO:  3 (Triple Felina, Leucemia, Antirrábica)');
  console.log('   Dewormers:          3 (Bravecto Perro, Bravecto Gato, Drontal Plus)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
