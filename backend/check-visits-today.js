const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.visit.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    select: {
      id: true,
      serviceType: true,
      status: true,
      motivo: true,
      createdAt: true,
      pet: {
        select: {
          nombre: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log('\n📋 Recent Visits (last 24h):\n');
  visits.forEach(v => {
    const icon = v.serviceType === 'MEDICINA_PREVENTIVA' ? '💉' : 
                 v.serviceType === 'ESTETICA' ? '✂️' : '🩺';
    console.log(`${icon} ${v.pet?.nombre || 'Unknown'}`);
    console.log(`   ServiceType: ${v.serviceType}`);
    console.log(`   Status: ${v.status}`);
    console.log(`   Motivo: ${v.motivo || 'N/A'}`);
    console.log(`   Created: ${v.createdAt}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
