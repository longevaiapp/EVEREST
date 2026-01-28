const { PrismaClient } = require('.prisma/client');
const prisma = new PrismaClient();

async function checkFotos() {
  const pets = await prisma.pet.findMany({
    select: {
      id: true,
      nombre: true,
      fotoUrl: true
    }
  });
  
  console.log('=== Mascotas y sus fotos ===');
  pets.forEach(p => {
    const tieneImagen = p.fotoUrl ? (p.fotoUrl.startsWith('data:') ? 'Base64 ✓' : 'URL: ' + p.fotoUrl.substring(0,50)) : 'Sin foto ✗';
    console.log(`${p.id} - ${p.nombre}: ${tieneImagen}`);
  });
  
  await prisma.$disconnect();
}

checkFotos();
