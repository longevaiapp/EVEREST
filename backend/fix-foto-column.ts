import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Altering fotoUrl column to LONGTEXT...\n');
  
  // Alter the column type
  await prisma.$executeRaw`
    ALTER TABLE Pet MODIFY COLUMN fotoUrl LONGTEXT NULL
  `;
  
  console.log('✅ Column altered successfully!');
  
  // Verify the change
  const columnInfo = await prisma.$queryRaw`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'u191251575_everest' 
    AND TABLE_NAME = 'Pet'
    AND COLUMN_NAME = 'fotoUrl'
  `;
  
  console.log('\n=== New Column Type Info ===');
  console.log(columnInfo);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
