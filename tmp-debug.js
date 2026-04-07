const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // What /today endpoint uses now
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  
  console.log('now:', new Date().toISOString());
  console.log('today (UTC midnight):', today.toISOString());
  console.log('tomorrow (UTC midnight):', tomorrow.toISOString());

  // Check Luna's record
  const all = await p.surgery.findMany({
    select: { id: true, scheduledDate: true, scheduledTime: true, status: true, pet: { select: { nombre: true } } }
  });
  console.log('\n--- ALL SURGERIES ---');
  all.forEach(s => {
    const d = s.scheduledDate;
    console.log(`${s.pet.nombre} | ${s.status} | date: ${d.toISOString()} | time: ${s.scheduledTime}`);
    console.log(`  gte today? ${d >= today} | lt tomorrow? ${d < tomorrow}`);
  });

  // Actually run the same query as /today
  const results = await p.surgery.findMany({
    where: {
      OR: [
        { scheduledDate: { gte: today, lt: tomorrow } },
        { status: { in: ['EN_CURSO', 'EN_PREPARACION'] } },
        { status: 'PROGRAMADA', scheduledDate: { gte: today } },
      ],
    },
  });
  console.log('\n--- /today QUERY RESULTS:', results.length, '---');
  
  await p.$disconnect();
})();
