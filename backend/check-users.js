// Script para verificar usuarios en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true
      }
    });
    
    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===\n');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\nTotal usuarios: ${users.length}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
