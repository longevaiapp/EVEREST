const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Ver todas las visitas de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayVisits = await p.visit.findMany({
    where: { arrivalTime: { gte: today, lt: tomorrow } },
    include: { pet: true, consultation: true }
  });
  
  console.log('=== VISITAS DE HOY ===');
  todayVisits.forEach(v => {
    console.log(`ID: ${v.id}`);
    console.log(`  Pet: ${v.pet?.nombre}`);
    console.log(`  Status: ${v.status}`);
    console.log(`  Consulta: ${v.consultation ? 'SI (ID: ' + v.consultation.id + ', status: ' + v.consultation.status + ')' : 'NO'}`);
    console.log('');
  });
  
  // Ver visitas EN_ESPERA o RECIEN_LLEGADO
  const waiting = await p.visit.findMany({
    where: { 
      status: { in: ['EN_ESPERA', 'RECIEN_LLEGADO'] }
    },
    include: { pet: true, consultation: true }
  });
  
  console.log('=== VISITAS EN ESPERA / RECIEN LLEGADO ===');
  waiting.forEach(v => {
    console.log(`ID: ${v.id}, Pet: ${v.pet?.nombre}, Status: ${v.status}, Consulta: ${v.consultation ? 'SI' : 'NO'}`);
  });
  
  await p.$disconnect();
}

main();
