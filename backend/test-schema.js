const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAppointmentFields() {
  try {
    // Try to query appointmemt with the problematic fields
    const apt = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Appointment' AND TABLE_SCHEMA = DATABASE()
    `;
    
    console.log('Campos en tabla Appointment:');
    apt.forEach(col => console.log('  -', col.COLUMN_NAME));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointmentFields();
