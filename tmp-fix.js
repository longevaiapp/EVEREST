const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const s = await p.surgery.findFirst({ where: { pet: { nombre: 'Luna' }, status: 'PROGRAMADA' } });
  if (s) {
    await p.surgery.update({ where: { id: s.id }, data: { scheduledDate: new Date('2026-04-06T12:00:00'), scheduledTime: '08:00' } });
    console.log('Luna surgery updated to April 6 08:00');
  } else {
    console.log('No surgery found for Luna');
  }
  await p.$disconnect();
})();
