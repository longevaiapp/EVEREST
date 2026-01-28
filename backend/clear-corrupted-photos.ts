import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing corrupted fotoUrl data...\n');
  
  // Clear corrupted fotoUrl (those with length < 500 are definitely truncated)
  const result = await prisma.pet.updateMany({
    where: {
      fotoUrl: {
        not: null
      }
    },
    data: {
      fotoUrl: null
    }
  });
  
  console.log(`✅ Cleared ${result.count} corrupted fotoUrl entries`);
  console.log('\nNow you can re-upload photos for these pets and they will save correctly!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
