const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('=== PROBANDO BÚSQUEDA DE MASCOTAS ===\n');
  
  // Buscar "vader"
  console.log('Buscando "vader"...');
  const result = await p.pet.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: 'vader' } },
        { owner: { nombre: { contains: 'vader' } } }
      ]
    },
    include: {
      owner: { select: { id: true, nombre: true, telefono: true } }
    }
  });
  
  console.log('Resultados:', result.length);
  result.forEach(r => console.log('  -', r.nombre, '| Propietario:', r.owner?.nombre, '| ID:', r.id));
  
  await p.$disconnect();
})();
