// create-production-users.js
// Creates the 4 real production users with specific dashboard access
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USERS = [
  {
    email: 'paulina@everestvet.com',
    password: 'Paulina22',
    nombre: 'Paulina',
    rol: 'RECEPCION',
    dashboardAccess: ['recepcion', 'farmacia', 'crematorio', 'estilista', 'hospitalizacion', 'quirofano'],
  },
  {
    email: 'vinda@everestvet.com',
    password: 'Maxkira99',
    nombre: 'Vinda',
    rol: 'MEDICO',
    dashboardAccess: ['recepcion', 'medico', 'farmacia', 'laboratorio', 'estilista', 'hospitalizacion', 'quirofano', 'crematorio', 'banco-sangre'],
  },
  {
    email: 'jesus@everestvet.com',
    password: 'MKS513121*',
    nombre: 'Jesús',
    rol: 'MEDICO',
    dashboardAccess: ['recepcion', 'medico', 'farmacia', 'laboratorio', 'estilista', 'hospitalizacion', 'quirofano', 'crematorio', 'banco-sangre'],
  },
  {
    email: 'edgar@everestvet.com',
    password: 'Egmm7991@',
    nombre: 'Edgar',
    rol: 'ADMIN',
    dashboardAccess: ['recepcion', 'medico', 'farmacia', 'laboratorio', 'estilista', 'hospitalizacion', 'quirofano', 'crematorio', 'banco-sangre', 'admin'],
  },
];

(async () => {
  try {
    // First delete all demo users
    const deleted = await prisma.user.deleteMany({});
    console.log(`Deleted ${deleted.count} demo users`);

    // Create production users
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 12);
      const user = await prisma.user.create({
        data: {
          email: u.email,
          password: hash,
          nombre: u.nombre,
          rol: u.rol,
          dashboardAccess: JSON.stringify(u.dashboardAccess),
          activo: true,
        },
      });
      console.log(`✅ ${user.nombre} (${user.email}) - rol: ${user.rol} - acceso: ${u.dashboardAccess.join(', ')}`);
    }

    console.log('\nDone! Created', USERS.length, 'production users');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
