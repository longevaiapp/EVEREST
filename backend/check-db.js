const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('=== VERIFICANDO PACIENTES EN BD ===\n');
  
  // Ver últimos 10 pacientes
  const pets = await p.pet.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { owner: true }
  });
  
  console.log('Últimos 10 pacientes registrados:');
  pets.forEach(pet => {
    console.log(`  - ${pet.nombre} | Propietario: ${pet.owner?.nombre || 'N/A'} | Creado: ${pet.createdAt}`);
  });
  
  console.log('\n=== VERIFICANDO VISITA EN_ESPERA ===\n');
  
  const visit = await p.visit.findFirst({
    where: { status: 'EN_ESPERA' },
    include: { 
      pet: true,
      consultation: true 
    }
  });
  
  if (!visit) {
    console.log('No hay visitas EN_ESPERA');
  } else {
    console.log('Visit ID:', visit.id);
    console.log('Pet nombre:', visit.pet?.nombre);
    console.log('Ya tiene consulta?:', visit.consultation ? 'SÍ' : 'NO');
    
    if (visit.consultation) {
      console.log('\n=== Eliminando consulta existente ===');
      await p.consultation.delete({ where: { id: visit.consultation.id }});
      console.log('✅ Consulta eliminada:', visit.consultation.id);
    }
  }
  
  await p.$disconnect();
})();
