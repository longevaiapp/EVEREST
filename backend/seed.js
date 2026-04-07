// backend/seed.js - Simple seed script
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  const passwordHash = await bcrypt.hash('password123', 12);

  // Users
  console.log('👤 Creating users...');
  
  await prisma.user.upsert({
    where: { email: 'admin@vetos.com' },
    update: {},
    create: { email: 'admin@vetos.com', password: passwordHash, nombre: 'Administrador', rol: 'ADMIN', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'recepcion@vetos.com' },
    update: {},
    create: { email: 'recepcion@vetos.com', password: passwordHash, nombre: 'María López', rol: 'RECEPCION', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'drgarcia@vetos.com' },
    update: {},
    create: { email: 'drgarcia@vetos.com', password: passwordHash, nombre: 'Dr. García', rol: 'MEDICO', especialidad: 'Cirugía General', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'dramartinez@vetos.com' },
    update: {},
    create: { email: 'dramartinez@vetos.com', password: passwordHash, nombre: 'Dra. Martínez', rol: 'MEDICO', especialidad: 'Medicina Interna', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'laboratorio@vetos.com' },
    update: {},
    create: { email: 'laboratorio@vetos.com', password: passwordHash, nombre: 'Carlos Ruiz', rol: 'LABORATORIO', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'farmacia@vetos.com' },
    update: {},
    create: { email: 'farmacia@vetos.com', password: passwordHash, nombre: 'Ana Torres', rol: 'FARMACIA', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'estilista@vetos.com' },
    update: {},
    create: { email: 'estilista@vetos.com', password: passwordHash, nombre: 'Luis Estrada', rol: 'ESTILISTA', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'hospitalizacion@vetos.com' },
    update: {},
    create: { email: 'hospitalizacion@vetos.com', password: passwordHash, nombre: 'Patricia Mendoza', rol: 'HOSPITALIZACION', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'recolector@vetos.com' },
    update: {},
    create: { email: 'recolector@vetos.com', password: passwordHash, nombre: 'Roberto Sánchez', rol: 'RECOLECTOR', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'crematorio@vetos.com' },
    update: {},
    create: { email: 'crematorio@vetos.com', password: passwordHash, nombre: 'Miguel Ángel Díaz', rol: 'OPERADOR_CREMATORIO', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'entregas@vetos.com' },
    update: {},
    create: { email: 'entregas@vetos.com', password: passwordHash, nombre: 'Sandra Flores', rol: 'ENTREGA', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'bancosangre@vetos.com' },
    update: {},
    create: { email: 'bancosangre@vetos.com', password: passwordHash, nombre: 'Patricia Ríos', rol: 'BANCO_SANGRE', activo: true }
  });

  await prisma.user.upsert({
    where: { email: 'quirofano@vetos.com' },
    update: {},
    create: { email: 'quirofano@vetos.com', password: passwordHash, nombre: 'Carlos Mendoza', rol: 'QUIROFANO', activo: true }
  });

  console.log('✅ 13 Users created');

  // Owners and Pets
  console.log('🐾 Creating owners and pets...');
  
  const owner1 = await prisma.owner.upsert({
    where: { telefono: '5551234567' },
    update: {},
    create: { nombre: 'Juan Pérez', telefono: '5551234567', email: 'juan.perez@email.com', direccion: 'Calle Principal 123', ciudad: 'Ciudad de México' }
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-001' },
    update: {},
    create: { numeroFicha: 'VET-001', ownerId: owner1.id, nombre: 'Max', especie: 'PERRO', raza: 'Golden Retriever', sexo: 'MACHO', peso: 32.5, color: 'Dorado', estado: 'ALTA' }
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-002' },
    update: {},
    create: { numeroFicha: 'VET-002', ownerId: owner1.id, nombre: 'Luna', especie: 'GATO', raza: 'Siamés', sexo: 'HEMBRA', peso: 4.2, color: 'Crema', estado: 'ALTA' }
  });

  const owner2 = await prisma.owner.upsert({
    where: { telefono: '5559876543' },
    update: {},
    create: { nombre: 'María Sánchez', telefono: '5559876543', email: 'maria.sanchez@email.com', direccion: 'Av. Reforma 456', ciudad: 'Ciudad de México' }
  });

  await prisma.pet.upsert({
    where: { numeroFicha: 'VET-003' },
    update: {},
    create: { numeroFicha: 'VET-003', ownerId: owner2.id, nombre: 'Rocky', especie: 'PERRO', raza: 'Bulldog Francés', sexo: 'MACHO', peso: 12.8, color: 'Atigrado', estado: 'ALTA' }
  });

  console.log('✅ 2 Owners, 3 Pets created');

  // Medications
  console.log('💊 Creating medications...');
  
  const meds = [
    { name: 'Amoxicilina 500mg', category: 'ANTIBIOTICO', presentation: 'Tabletas', unit: 'tableta', currentStock: 150, minStock: 50, salePrice: 25.00 },
    { name: 'Carprofeno 75mg', category: 'ANTIINFLAMATORIO', presentation: 'Tabletas', unit: 'tableta', currentStock: 80, minStock: 30, salePrice: 35.00 },
    { name: 'Metronidazol 250mg', category: 'ANTIBIOTICO', presentation: 'Tabletas', unit: 'tableta', currentStock: 45, minStock: 40, salePrice: 20.00 },
    { name: 'Tramadol 50mg', category: 'ANALGESICO', presentation: 'Tabletas', unit: 'tableta', currentStock: 25, minStock: 30, salePrice: 40.00, isControlled: true },
    { name: 'Vacuna Séxtuple', category: 'VACUNA', presentation: 'Inyectable', unit: 'dosis', currentStock: 30, minStock: 20, salePrice: 45.00, requiresRefrigeration: true },
    { name: 'Vacuna Antirrábica', category: 'VACUNA', presentation: 'Inyectable', unit: 'dosis', currentStock: 40, minStock: 20, salePrice: 35.00, requiresRefrigeration: true },
    { name: 'Suero Fisiológico 500ml', category: 'SUERO', presentation: 'Bolsa', unit: 'bolsa', currentStock: 50, minStock: 20, salePrice: 12.00 },
  ];

  for (const med of meds) {
    await prisma.medication.upsert({
      where: { id: med.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
      update: {},
      create: { ...med, costPrice: med.salePrice * 0.6 }
    });
  }

  console.log('✅ 7 Medications created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n🔑 Login credentials:');
  console.log('   Email: admin@vetos.com | recepcion@vetos.com | drgarcia@vetos.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
