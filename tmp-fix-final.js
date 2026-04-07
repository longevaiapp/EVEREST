const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Fix: store as local midnight April 6
  const localDate = new Date('2026-04-06T00:00:00'); // parsed as local time
  console.log('Setting date to:', localDate.toISOString());
  
  const updated = await p.surgery.updateMany({
    where: { status: 'PROGRAMADA' },
    data: { scheduledDate: localDate },
  });
  console.log('Updated', updated.count, 'records');
  
  // Verify with the same logic as /today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  console.log('today boundary:', today.toISOString());
  console.log('tomorrow boundary:', tomorrow.toISOString());
  
  const s = await p.surgery.findMany({ select: { scheduledDate: true, pet: { select: { nombre: true } } } });
  s.forEach(x => {
    console.log(`${x.pet.nombre} | date: ${x.scheduledDate.toISOString()} | gte today? ${x.scheduledDate >= today} | lt tomorrow? ${x.scheduledDate < tomorrow}`);
  });
  
  await p.$disconnect();
})();
