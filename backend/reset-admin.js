// Script para resetear password del admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    const admin = await prisma.user.update({
      where: { email: 'admin@vetos.com' },
      data: { password: passwordHash }
    });
    
    console.log('\n✅ Password reseteado exitosamente');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Nuevo password: ${newPassword}`);
    console.log(`👤 Nombre: ${admin.nombre}`);
    console.log(`🎭 Rol: ${admin.rol}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
