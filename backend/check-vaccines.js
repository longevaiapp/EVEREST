require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vaccines = await prisma.medication.findMany({
    where: { category: 'VACUNA' },
    select: { name: true, nombreComercial: true, especies: true, currentStock: true }
  });
  
  console.log('=== VACUNAS EN BASE DE DATOS ===\n');
  vaccines.forEach(v => {
    console.log(`- ${v.name}`);
    console.log(`  Comercial: ${v.nombreComercial || 'N/A'}`);
    console.log(`  Especie: ${v.especies || 'Todas'}, Stock: ${v.currentStock}`);
    console.log('');
  });
  
  console.log(`Total: ${vaccines.length} vacunas`);
  await prisma.$disconnect();
}

main().catch(console.error);
