// prisma/seed.ts
// Seed data for VET-OS (EVEREST)
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ===========================================================================
  // 1. USERS - Create default users for each role
  // ===========================================================================
  console.log('👤 Creating users...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vetos.com' },
    update: {},
    create: {
      email: 'admin@vetos.com',
      password: passwordHash,
      nombre: 'Administrador',
      rol: 'ADMIN',
      activo: true,
    },
  });

  const recepcionista = await prisma.user.upsert({
    where: { email: 'recepcion@vetos.com' },
    update: {},
    create: {
      email: 'recepcion@vetos.com',
      password: passwordHash,
      nombre: 'María López',
      rol: 'RECEPCION',
      activo: true,
    },
  });

  const drGarcia = await prisma.user.upsert({
    where: { email: 'drgarcia@vetos.com' },
    update: {},
    create: {
      email: 'drgarcia@vetos.com',
      password: passwordHash,
      nombre: 'Dr. García',
      rol: 'MEDICO',
      especialidad: 'Cirugía General',
      activo: true,
    },
  });

  const draMartinez = await prisma.user.upsert({
    where: { email: 'dramartinez@vetos.com' },
    update: {},
    create: {
      email: 'dramartinez@vetos.com',
      password: passwordHash,
      nombre: 'Dra. Martínez',
      rol: 'MEDICO',
      especialidad: 'Medicina Interna',
      activo: true,
    },
  });

  const laboratorista = await prisma.user.upsert({
    where: { email: 'laboratorio@vetos.com' },
    update: {},
    create: {
      email: 'laboratorio@vetos.com',
      password: passwordHash,
      nombre: 'Carlos Ruiz',
      rol: 'LABORATORIO',
      activo: true,
    },
  });

  const farmaceutico = await prisma.user.upsert({
    where: { email: 'farmacia@vetos.com' },
    update: {},
    create: {
      email: 'farmacia@vetos.com',
      password: passwordHash,
      nombre: 'Ana Torres',
      rol: 'FARMACIA',
      activo: true,
    },
  });

  const estilista = await prisma.user.upsert({
    where: { email: 'estilista@vetos.com' },
    update: {},
    create: {
      email: 'estilista@vetos.com',
      password: passwordHash,
      nombre: 'Sofia Estilista',
      rol: 'ESTILISTA',
      activo: true,
    },
  });

  console.log('✅ Users created:', { admin: admin.id, recepcionista: recepcionista.id, estilista: estilista.id });

  // ===========================================================================
  // 2. MEDICATIONS - Create initial inventory
  // ===========================================================================
  console.log('💊 Creating medications...');

  const medications = [
    { name: 'Amoxicilina 500mg', genericName: 'Amoxicilina', category: 'ANTIBIOTICO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 150, minStock: 50, salePrice: 25.00 },
    { name: 'Carprofeno 75mg', genericName: 'Carprofeno', category: 'ANTIINFLAMATORIO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 80, minStock: 30, salePrice: 35.00 },
    { name: 'Metronidazol 250mg', genericName: 'Metronidazol', category: 'ANTIBIOTICO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 45, minStock: 40, salePrice: 20.00 },
    { name: 'Prednisona 5mg', genericName: 'Prednisona', category: 'ANTIINFLAMATORIO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 120, minStock: 50, salePrice: 15.00 },
    { name: 'Tramadol 50mg', genericName: 'Tramadol', category: 'ANALGESICO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 25, minStock: 30, salePrice: 40.00, isControlled: true },
    { name: 'Doxiciclina 100mg', genericName: 'Doxiciclina', category: 'ANTIBIOTICO' as const, presentation: 'Cápsulas', unit: 'cápsula', currentStock: 90, minStock: 40, salePrice: 28.00 },
    { name: 'Meloxicam 15mg', genericName: 'Meloxicam', category: 'ANTIINFLAMATORIO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 15, minStock: 25, salePrice: 32.00 },
    { name: 'Omeprazol 20mg', genericName: 'Omeprazol', category: 'OTRO' as const, presentation: 'Cápsulas', unit: 'cápsula', currentStock: 110, minStock: 50, salePrice: 18.00 },
    { name: 'Enrofloxacina 150mg', genericName: 'Enrofloxacina', category: 'ANTIBIOTICO' as const, presentation: 'Tabletas', unit: 'tableta', currentStock: 65, minStock: 30, salePrice: 30.00 },
    { name: 'Vacuna Séxtuple', genericName: null, category: 'VACUNA' as const, presentation: 'Inyectable', unit: 'dosis', currentStock: 30, minStock: 20, salePrice: 45.00, requiresRefrigeration: true },
    { name: 'Vacuna Triple Felina', genericName: null, category: 'VACUNA' as const, presentation: 'Inyectable', unit: 'dosis', currentStock: 25, minStock: 15, salePrice: 42.00, requiresRefrigeration: true },
    { name: 'Vacuna Antirrábica', genericName: null, category: 'VACUNA' as const, presentation: 'Inyectable', unit: 'dosis', currentStock: 40, minStock: 20, salePrice: 35.00, requiresRefrigeration: true },
    { name: 'Ketamina 50mg/ml', genericName: 'Ketamina', category: 'ANESTESICO' as const, presentation: 'Inyectable', unit: 'ml', currentStock: 20, minStock: 10, salePrice: 55.00, isControlled: true },
    { name: 'Propofol 10mg/ml', genericName: 'Propofol', category: 'ANESTESICO' as const, presentation: 'Inyectable', unit: 'ml', currentStock: 15, minStock: 10, salePrice: 65.00, isControlled: true, requiresRefrigeration: true },
    { name: 'Suero Fisiológico 500ml', genericName: 'Cloruro de Sodio 0.9%', category: 'SUERO' as const, presentation: 'Bolsa', unit: 'bolsa', currentStock: 50, minStock: 20, salePrice: 12.00 },
  ];

  for (const med of medications) {
    await prisma.medication.upsert({
      where: { id: med.name.toLowerCase().replace(/\s/g, '-') },
      update: {},
      create: {
        ...med,
        salePrice: med.salePrice,
        costPrice: med.salePrice * 0.6, // 60% del precio de venta como costo aproximado
      },
    });
  }

  console.log('✅ Medications created:', medications.length);

  // ===========================================================================
  // 3. SAMPLE OWNERS AND PETS
  // ===========================================================================
  console.log('🐾 Creating sample owners and pets...');

  // Owner 1 with 2 pets
  const owner1 = await prisma.owner.upsert({
    where: { telefono: '5551234567' },
    update: {},
    create: {
      nombre: 'Juan Pérez',
      telefono: '5551234567',
      email: 'juan.perez@email.com',
      direccion: 'Calle Principal 123, Col. Centro',
      ciudad: 'Ciudad de México',
    },
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-001' },
    update: {},
    create: {
      numeroFicha: 'VET-001',
      ownerId: owner1.id,
      nombre: 'Max',
      especie: 'PERRO',
      raza: 'Golden Retriever',
      sexo: 'MACHO',
      fechaNacimiento: new Date('2020-03-15'),
      peso: 32.5,
      color: 'Dorado',
      condicionCorporal: 'IDEAL',
      esterilizado: true,
      estado: 'ALTA',
    },
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-002' },
    update: {},
    create: {
      numeroFicha: 'VET-002',
      ownerId: owner1.id,
      nombre: 'Luna',
      especie: 'GATO',
      raza: 'Siamés',
      sexo: 'HEMBRA',
      fechaNacimiento: new Date('2021-08-20'),
      peso: 4.2,
      color: 'Crema con puntos oscuros',
      condicionCorporal: 'IDEAL',
      esterilizado: true,
      estado: 'ALTA',
    },
  });

  // Owner 2 with 1 pet
  const owner2 = await prisma.owner.upsert({
    where: { telefono: '5559876543' },
    update: {},
    create: {
      nombre: 'María Sánchez',
      telefono: '5559876543',
      email: 'maria.sanchez@email.com',
      direccion: 'Av. Reforma 456, Col. Juárez',
      ciudad: 'Ciudad de México',
    },
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-003' },
    update: {},
    create: {
      numeroFicha: 'VET-003',
      ownerId: owner2.id,
      nombre: 'Rocky',
      especie: 'PERRO',
      raza: 'Bulldog Francés',
      sexo: 'MACHO',
      fechaNacimiento: new Date('2019-11-05'),
      peso: 12.8,
      color: 'Atigrado',
      condicionCorporal: 'SOBREPESO',
      esterilizado: false,
      alergias: 'Polen, pollo',
      enfermedadesCronicas: 'Problemas respiratorios leves',
      estado: 'ALTA',
    },
  });

  // Owner 3 with 1 pet
  const owner3 = await prisma.owner.upsert({
    where: { telefono: '5554567890' },
    update: {},
    create: {
      nombre: 'Carlos Ruiz',
      telefono: '5554567890',
      email: 'carlos.ruiz@email.com',
      direccion: 'Calle del Sol 789, Col. Narvarte',
      ciudad: 'Ciudad de México',
    },
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-004' },
    update: {},
    create: {
      numeroFicha: 'VET-004',
      ownerId: owner3.id,
      nombre: 'Michi',
      especie: 'GATO',
      raza: 'Mestizo',
      sexo: 'HEMBRA',
      fechaNacimiento: new Date('2022-02-14'),
      peso: 3.8,
      color: 'Naranja atigrado',
      condicionCorporal: 'IDEAL',
      esterilizado: true,
      estado: 'ALTA',
    },
  });

  console.log('✅ Owners and pets created');

  // ===========================================================================
  // 4. CREATE STOCK ALERTS FOR LOW STOCK ITEMS
  // ===========================================================================
  console.log('⚠️ Creating stock alerts...');

  // Manual check since Prisma doesn't support field comparisons directly
  const allMeds = await prisma.medication.findMany();
  for (const med of allMeds) {
    if (med.currentStock <= med.minStock) {
      // Check if alert already exists
      const existingAlert = await prisma.stockAlert.findFirst({
        where: { medicationId: med.id, status: 'ACTIVA' },
      });

      if (!existingAlert) {
        await prisma.stockAlert.create({
          data: {
            medicationId: med.id,
            type: med.currentStock === 0 ? 'AGOTADO' : 'STOCK_BAJO',
            message: med.currentStock === 0
              ? `${med.name} está agotado`
              : `${med.name} tiene stock bajo (${med.currentStock}/${med.minStock})`,
            priority: med.currentStock === 0 ? 'ALTA' : 'MEDIA',
            status: 'ACTIVA',
          },
        });
      }
    }
  }

  console.log('✅ Stock alerts created');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log('   - Users: 6 (admin, recepcion, 2 medicos, laboratorio, farmacia)');
  console.log('   - Medications: 15');
  console.log('   - Owners: 3');
  console.log('   - Pets: 4');
  console.log('\n🔑 Default credentials:');
  console.log('   Email: [role]@vetos.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
