const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    select: {
      id: true,
      tipo: true,
      status: true,
      motivo: true,
      fecha: true,
      hora: true,
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

  console.log('\n📅 Recent Appointments (last 24h):\n');
  appointments.forEach(a => {
    const icon = a.tipo === 'MEDICINA_PREVENTIVA' ? '💉' : 
                 a.tipo === 'ESTETICA' ? '✂️' : '🩺';
    console.log(`${icon} ${a.pet?.nombre || 'Unknown'}`);
    console.log(`   Tipo: ${a.tipo}`);
    console.log(`   Status: ${a.status}`);
    console.log(`   Fecha: ${a.fecha} ${a.hora}`);
    console.log(`   Motivo: ${a.motivo || 'N/A'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
