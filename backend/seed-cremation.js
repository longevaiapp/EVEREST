// seed-cremation.js
// Seeds packaging ranges and sample urns for cremation module

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔥 Seeding cremation data...\n');

  // === PACKAGING RANGES ===
  const ranges = [
    { minKg: 0, maxKg: 5, label: 'Empaque chico', requiresTwoOperators: false, sortOrder: 1 },
    { minKg: 5.01, maxKg: 20, label: 'Empaque mediano', requiresTwoOperators: false, sortOrder: 2 },
    { minKg: 20.01, maxKg: 45, label: 'Empaque grande', requiresTwoOperators: false, sortOrder: 3 },
    { minKg: 45.01, maxKg: 80, label: 'Extra grande', requiresTwoOperators: false, sortOrder: 4 },
    { minKg: 80.01, maxKg: 999, label: 'Servicio especial', requiresTwoOperators: true, sortOrder: 5 },
  ];

  console.log('📦 Packaging ranges:');
  for (const r of ranges) {
    const existing = await prisma.packagingRange.findFirst({
      where: { label: r.label },
    });
    if (existing) {
      console.log(`  ✓ ${r.label} (already exists)`);
    } else {
      await prisma.packagingRange.create({ data: r });
      console.log(`  + ${r.label} (${r.minKg}-${r.maxKg} kg)`);
    }
  }

  // === SAMPLE URNS ===
  const urns = [
    { name: 'Urna Básica Pequeña', description: 'Urna de madera para mascotas pequeñas', price: 500, size: 'CHICA' },
    { name: 'Urna Básica Mediana', description: 'Urna de madera para mascotas medianas', price: 800, size: 'MEDIANA' },
    { name: 'Urna Básica Grande', description: 'Urna de madera para mascotas grandes', price: 1200, size: 'GRANDE' },
    { name: 'Urna Premium Pequeña', description: 'Urna premium con grabado personalizado', price: 1500, size: 'CHICA' },
    { name: 'Urna Premium Mediana', description: 'Urna premium con grabado personalizado', price: 2000, size: 'MEDIANA' },
    { name: 'Urna Premium Grande', description: 'Urna premium con grabado personalizado', price: 2800, size: 'GRANDE' },
    { name: 'Urna Memorial', description: 'Urna especial con espacio para foto y placa', price: 3500, size: 'GRANDE' },
    { name: 'Urna Biodegradable', description: 'Urna ecológica biodegradable', price: 600, size: 'MEDIANA' },
  ];

  console.log('\n⚱️ Urns:');
  for (const u of urns) {
    const existing = await prisma.urn.findFirst({
      where: { name: u.name },
    });
    if (existing) {
      console.log(`  ✓ ${u.name} (already exists)`);
    } else {
      await prisma.urn.create({ data: u });
      console.log(`  + ${u.name} - $${u.price} (${u.size})`);
    }
  }

  console.log('\n✅ Cremation seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
