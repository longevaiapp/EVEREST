// clean-for-production.js
// Deletes all pets, owners, and related data. Keeps users and medications.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧹 Limpiando base de datos para producción...\n');

    // Disable FK checks for clean deletion
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

    // Delete all related tables
    const tables = [
      'MedicationAdministration', 'NeonateRecord', 'Neonate', 'FluidTherapy',
      'Monitoring', 'TherapyPlanItem', 'Hospitalization',
      'SurgeryVitals', 'SurgeryPreMedication', 'Surgery',
      'Diagnostico', 'SignosVitales',
      'DispenseItem', 'Dispense',
      'PrescriptionItem', 'Prescription',
      'LabRequest', 'MedicalNote', 'Consultation',
      'GroomingService', 'Payment', 'Visit',
      'Appointment',
      'BloodTransfusion', 'BloodTransfusionRequest', 'BloodDonor',
      'PreventiveMedicineRecord',
      'VaccineRecord', 'DewormingRecord',
      'Task', 'CremationRecord', 'Notification',
      'Pet', 'Owner',
    ];

    for (const table of tables) {
      try {
        const result = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
        if (result.count > 0) {
          console.log(`  Deleted ${result.count} ${table}`);
        }
      } catch (e) {
        // Table might not exist, skip
      }
    }

    // Re-enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    // Verify what remains
    const userCount = await prisma.user.count();
    const medCount = await prisma.medication.count();
    const petCount = await prisma.pet.count();
    const ownerCount = await prisma.owner.count();

    console.log('\n✅ Limpieza completada!');
    console.log(`  Usuarios conservados: ${userCount}`);
    console.log(`  Medicamentos conservados: ${medCount}`);
    console.log(`  Mascotas restantes: ${petCount}`);
    console.log(`  Dueños restantes: ${ownerCount}`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
