// seed-medications-excel.js
// Reads medications from Excel sheet 2 and replaces all DB medications
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map route text to category
function guessCategory(compuesto, via, nombre) {
  const c = (compuesto || '').toUpperCase();
  const v = (via || '').toUpperCase();
  const n = (nombre || '').toUpperCase();
  
  if (c.includes('AMOXICILINA') || c.includes('CLINDAMICINA') || c.includes('NEOMICINA') || c.includes('BACITRACINA')) return 'ANTIBIOTICO';
  if (c.includes('DEXAMETAZONA') || c.includes('DEXAMETASONA')) return 'ANTIINFLAMATORIO';
  if (c.includes('MULTIVITAMINICO') || c.includes('CARNOSINA')) return 'VITAMINA';
  if (c.includes('SUCRALFATO')) return 'OTRO';
  if (c.includes('CLORHEXIDINA') || c.includes('MICONAZOL') || c.includes('GRISEOFULVINA')) return 'DERMATOLOGICO';
  if (c.includes('SALICILICO') || c.includes('BORICO')) return 'OTRO';
  if (v.includes('OTICA') || v.includes('OFTALM')) return 'OFTALMICO';
  if (v.includes('SHAMPO') || v.includes('TOPICA')) return 'DERMATOLOGICO';
  return 'OTRO';
}

// Map via text to standard route
function mapVia(via) {
  const v = (via || '').toUpperCase();
  if (v.includes('ORAL')) return 'Oral';
  if (v.includes('INTRAMUSCULAR')) return 'IM';
  if (v.includes('SUBCUTANEA')) return 'SC';
  if (v.includes('INTRAVENOSA')) return 'IV';
  if (v.includes('OTICA')) return 'Otica';
  if (v.includes('OFTALM')) return 'Oftalmica';
  if (v.includes('SHAMPO')) return 'Topico';
  if (v.includes('TOPICA')) return 'Topico';
  return via || 'Oral';
}

(async () => {
  try {
    // Read Excel
    const wb = XLSX.readFile('C:\\Users\\Alecs\\Downloads\\Libro (1) (4).xlsx');
    const ws = wb.Sheets[wb.SheetNames[1]]; // Hoja2
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Headers: PROVEEDOR, LABORATORIO, NOMBRE COMERCIAL, COSTO, PRECIO DE VENTA,
    // COMPUESTO ACTIVO, PRESENTACION, CONCENTRACION, VIA DE ADMINISTRACION, EJEMPLO DE INDICACIONES
    const dataRows = rows.slice(1).filter(r => r[0]); // Skip header, filter empty
    
    console.log(`Found ${dataRows.length} medications in Excel`);
    
    // Delete all existing medications (cascade will handle related records)
    // First check what references exist
    const existingCount = await prisma.medication.count();
    console.log(`Existing medications in DB: ${existingCount}`);
    
    // Delete in order to respect foreign keys
    console.log('Deleting existing medication data...');
    await prisma.medicationDosing.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockAlert.deleteMany({});
    await prisma.dispenseItem.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    // Don't delete therapyPlanItems - they reference medications but should keep working
    // Just nullify the reference
    await prisma.therapyPlanItem.updateMany({
      where: { medicationId: { not: null } },
      data: { medicationId: null },
    });
    await prisma.vaccineRecord.updateMany({
      where: { medicationId: { not: null } },
      data: { medicationId: null },
    });
    await prisma.dewormingRecord.updateMany({
      where: { medicationId: { not: null } },
      data: { medicationId: null },
    });
    await prisma.medication.deleteMany({});
    console.log('All existing medications deleted');
    
    // Insert new medications
    for (const row of dataRows) {
      const [proveedor, laboratorio, nombreComercial, costo, precioVenta, compuestoActivo, presentacion, concentracion, via, indicaciones] = row;
      
      const category = guessCategory(compuestoActivo, via, nombreComercial);
      const viaAdmin = mapVia(via);
      
      const med = await prisma.medication.create({
        data: {
          name: (nombreComercial || '').trim(),
          genericName: (compuestoActivo || '').trim(),
          category,
          presentation: (presentacion || '').trim(),
          concentration: (concentracion || '').trim(),
          unit: 'pieza',
          currentStock: 0,
          minStock: 5,
          maxStock: 50,
          costPrice: costo ? parseFloat(costo) : null,
          salePrice: precioVenta ? parseFloat(parseFloat(precioVenta).toFixed(2)) : 0,
          supplier: (proveedor || '').trim(),
          supplierCode: (laboratorio || '').trim(),
          viaAdministracion: viaAdmin,
          nombreComercial: (nombreComercial || '').trim(),
          activo: true,
        },
      });
      
      console.log(`  ✅ ${med.name} (${med.genericName}) - $${med.salePrice} - ${category}`);
    }
    
    console.log(`\nDone! Inserted ${dataRows.length} medications.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
