import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.therapyPlanItem.updateMany({
    data: { isActive: true }
  });
  console.log('Updated therapy items:', result.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
