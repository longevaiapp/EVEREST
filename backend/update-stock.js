require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('./node_modules/.prisma/client');
const prisma = new PrismaClient();

async function updateStock() {
  // Actualizar todos los medicamentos con stock aleatorio
  const medications = await prisma.medication.findMany();
  
  for (const med of medications) {
    const randomStock = Math.floor(Math.random() * 150) + 20; // Entre 20 y 170
    await prisma.medication.update({
      where: { id: med.id },
      data: {
        currentStock: randomStock,
        minStock: 10,
        maxStock: 200
      }
    });
  }
  
  console.log(`✅ Stock actualizado para ${medications.length} medicamentos`);
  
  // Mostrar algunos ejemplos
  const examples = await prisma.medication.findMany({
    take: 5,
    select: { name: true, currentStock: true, minStock: true }
  });
  
  console.log('\nEjemplos:');
  examples.forEach(m => console.log(`  - ${m.name}: Stock=${m.currentStock}`));
  
  await prisma.$disconnect();
}

updateStock().catch(console.error);
