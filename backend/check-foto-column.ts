import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking fotoUrl column type and content...\n');
  
  // Get all pets with fotoUrl
  const pets = await prisma.pet.findMany({
    select: {
      id: true,
      nombre: true,
      fotoUrl: true,
    },
    where: {
      fotoUrl: {
        not: null
      }
    }
  });
  
  console.log(`Found ${pets.length} pets with fotoUrl\n`);
  
  for (const pet of pets) {
    const fotoLen = pet.fotoUrl?.length || 0;
    const first100 = pet.fotoUrl?.substring(0, 100) || '';
    const last50 = pet.fotoUrl?.substring(fotoLen - 50) || '';
    
    console.log(`Pet: ${pet.nombre}`);
    console.log(`  ID: ${pet.id}`);
    console.log(`  fotoUrl length: ${fotoLen} characters`);
    console.log(`  First 100 chars: ${first100}`);
    console.log(`  Last 50 chars: ${last50}`);
    console.log(`  Valid Base64? ${fotoLen > 500 ? 'Probably YES' : 'NO - Too short!'}`);
    console.log('');
  }
  
  // Check raw SQL for column type
  const columnInfo = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'u191251575_everest' 
    AND TABLE_NAME = 'Pet'
    AND COLUMN_NAME = 'fotoUrl'
  `;
  
  console.log('\n=== Column Type Info ===');
  console.log(columnInfo);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
