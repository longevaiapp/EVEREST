// update-vaccine-species.js
// Update vaccines with correct species values

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSpecies() {
  console.log('Updating vaccine species...\n');
  
  // Vacunas caninas (keywords)
  const caninas = ['Quíntuple', 'Séxtuple', 'Kennel', 'Leptospira', 'Parvovirus', 'Moquillo', 'Hepatitis', 'Rabia Canina', 'Séxtuple Canina', 'Bordetella'];
  
  // Vacunas felinas  
  const felinas = ['Triple Felina', 'Leucemia Felina', 'Rabia Felina', 'PIF', 'Panleucopenia'];
  
  // Antirrábica genérica es para ambos
  const ambos = ['Antirrábica'];
  
  let updated = 0;
  
  for (const name of caninas) {
    const result = await prisma.medication.updateMany({
      where: { 
        category: 'VACUNA',
        name: { contains: name }
      },
      data: { especies: 'CANINO' }
    });
    if (result.count > 0) {
      console.log(`✓ ${name}: ${result.count} vacunas -> CANINO`);
      updated += result.count;
    }
  }
  
  for (const name of felinas) {
    const result = await prisma.medication.updateMany({
      where: { 
        category: 'VACUNA',
        name: { contains: name }
      },
      data: { especies: 'FELINO' }
    });
    if (result.count > 0) {
      console.log(`✓ ${name}: ${result.count} vacunas -> FELINO`);
      updated += result.count;
    }
  }
  
  for (const name of ambos) {
    const result = await prisma.medication.updateMany({
      where: { 
        category: 'VACUNA',
        name: { contains: name }
      },
      data: { especies: 'AMBOS' }
    });
    if (result.count > 0) {
      console.log(`✓ ${name}: ${result.count} vacunas -> AMBOS`);
      updated += result.count;
    }
  }
  
  console.log(`\nTotal updated: ${updated}`);
  
  // Show results
  const results = await prisma.medication.findMany({
    where: { category: 'VACUNA' },
    select: { name: true, especies: true },
    orderBy: { especies: 'asc' }
  });
  
  console.log('\nCurrent vaccine species:');
  console.table(results);
}

updateSpecies()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(e => { 
    console.error('Error:', e); 
    process.exit(1); 
  })
  .finally(() => prisma.$disconnect());
