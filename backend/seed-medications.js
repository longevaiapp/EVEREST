require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo de categorías al enum de Prisma
const CATEGORY_MAP = {
  'antibioticos': 'ANTIBIOTICO',
  'antiinflamatorios': 'ANTIINFLAMATORIO',
  'corticosteroides': 'ANTIINFLAMATORIO',
  'analgesicos': 'ANALGESICO',
  'antiparasitarios': 'ANTIPARASITARIO',
  'vacunas': 'VACUNA',
  'protectores': 'OTRO',
  'dermatologicos': 'DERMATOLOGICO',
  'vitaminas': 'VITAMINA'
};

const medications = [
  // ANTIBIÓTICOS (10)
  { name: 'Amoxicilina 500mg', genericName: 'Amoxicilina', category: 'antibioticos', presentation: 'Tabletas', concentration: '500mg', unit: 'tableta', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.50, salePrice: 1.50, supplier: 'VetPharma', location: 'Estante A1' },
  { name: 'Amoxicilina + Ác. Clavulánico 250mg', genericName: 'Amoxicilina/Clavulanato', category: 'antibioticos', presentation: 'Tabletas', concentration: '250mg', unit: 'tableta', currentStock: 150, minStock: 40, maxStock: 400, costPrice: 0.80, salePrice: 2.00, supplier: 'VetPharma', location: 'Estante A1' },
  { name: 'Enrofloxacina 50mg', genericName: 'Enrofloxacina', category: 'antibioticos', presentation: 'Tabletas', concentration: '50mg', unit: 'tableta', currentStock: 180, minStock: 50, maxStock: 400, costPrice: 0.60, salePrice: 1.80, supplier: 'Zoetis', location: 'Estante A1' },
  { name: 'Enrofloxacina 150mg', genericName: 'Enrofloxacina', category: 'antibioticos', presentation: 'Tabletas', concentration: '150mg', unit: 'tableta', currentStock: 120, minStock: 30, maxStock: 300, costPrice: 1.20, salePrice: 3.00, supplier: 'Zoetis', location: 'Estante A1' },
  { name: 'Cefalexina 500mg', genericName: 'Cefalexina', category: 'antibioticos', presentation: 'Cápsulas', concentration: '500mg', unit: 'cápsula', currentStock: 100, minStock: 30, maxStock: 300, costPrice: 0.70, salePrice: 2.00, supplier: 'VetPharma', location: 'Estante A1' },
  { name: 'Metronidazol 250mg', genericName: 'Metronidazol', category: 'antibioticos', presentation: 'Tabletas', concentration: '250mg', unit: 'tableta', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.30, salePrice: 1.00, supplier: 'Generic Vet', location: 'Estante A2' },
  { name: 'Doxiciclina 100mg', genericName: 'Doxiciclina', category: 'antibioticos', presentation: 'Tabletas', concentration: '100mg', unit: 'tableta', currentStock: 150, minStock: 40, maxStock: 400, costPrice: 0.50, salePrice: 1.50, supplier: 'VetPharma', location: 'Estante A2' },
  { name: 'Ceftriaxona 1g Inyectable', genericName: 'Ceftriaxona', category: 'antibioticos', presentation: 'Frasco ampolla', concentration: '1g', unit: 'frasco', currentStock: 50, minStock: 20, maxStock: 100, costPrice: 3.00, salePrice: 8.00, supplier: 'Zoetis', location: 'Refrigerador R1', requiresRefrigeration: true },
  { name: 'Gentamicina 80mg/2ml Inyectable', genericName: 'Gentamicina', category: 'antibioticos', presentation: 'Ampolla', concentration: '80mg/2ml', unit: 'ampolla', currentStock: 80, minStock: 30, maxStock: 200, costPrice: 1.50, salePrice: 4.00, supplier: 'VetPharma', location: 'Estante A2' },
  { name: 'Penicilina G Benzatínica 1.2M UI', genericName: 'Penicilina', category: 'antibioticos', presentation: 'Frasco ampolla', concentration: '1.2M UI', unit: 'frasco', currentStock: 40, minStock: 15, maxStock: 100, costPrice: 2.50, salePrice: 6.00, supplier: 'Generic Vet', location: 'Refrigerador R1', requiresRefrigeration: true },

  // ANTIINFLAMATORIOS (8)
  { name: 'Meloxicam 1mg', genericName: 'Meloxicam', category: 'antiinflamatorios', presentation: 'Tabletas', concentration: '1mg', unit: 'tableta', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.40, salePrice: 1.20, supplier: 'Boehringer', location: 'Estante B1' },
  { name: 'Meloxicam 2mg', genericName: 'Meloxicam', category: 'antiinflamatorios', presentation: 'Tabletas', concentration: '2mg', unit: 'tableta', currentStock: 150, minStock: 40, maxStock: 400, costPrice: 0.60, salePrice: 1.80, supplier: 'Boehringer', location: 'Estante B1' },
  { name: 'Carprofeno 25mg', genericName: 'Carprofeno', category: 'antiinflamatorios', presentation: 'Tabletas', concentration: '25mg', unit: 'tableta', currentStock: 100, minStock: 30, maxStock: 300, costPrice: 0.80, salePrice: 2.50, supplier: 'Zoetis', location: 'Estante B1' },
  { name: 'Carprofeno 75mg', genericName: 'Carprofeno', category: 'antiinflamatorios', presentation: 'Tabletas', concentration: '75mg', unit: 'tableta', currentStock: 80, minStock: 25, maxStock: 250, costPrice: 1.50, salePrice: 4.00, supplier: 'Zoetis', location: 'Estante B1' },
  { name: 'Firocoxib 57mg', genericName: 'Firocoxib', category: 'antiinflamatorios', presentation: 'Tabletas masticables', concentration: '57mg', unit: 'tableta', currentStock: 60, minStock: 20, maxStock: 150, costPrice: 2.00, salePrice: 5.50, supplier: 'Merial', location: 'Estante B1' },
  { name: 'Ketoprofeno 10mg/ml Inyectable', genericName: 'Ketoprofeno', category: 'antiinflamatorios', presentation: 'Frasco', concentration: '10mg/ml', unit: 'ml', currentStock: 500, minStock: 100, maxStock: 1000, costPrice: 0.10, salePrice: 0.30, supplier: 'VetPharma', location: 'Estante B2' },
  { name: 'Dexametasona 4mg/ml Inyectable', genericName: 'Dexametasona', category: 'corticosteroides', presentation: 'Frasco', concentration: '4mg/ml', unit: 'ml', currentStock: 300, minStock: 80, maxStock: 600, costPrice: 0.15, salePrice: 0.40, supplier: 'Generic Vet', location: 'Estante B2' },
  { name: 'Prednisolona 5mg', genericName: 'Prednisolona', category: 'corticosteroides', presentation: 'Tabletas', concentration: '5mg', unit: 'tableta', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.20, salePrice: 0.60, supplier: 'VetPharma', location: 'Estante B2' },

  // ANALGÉSICOS (5)
  { name: 'Tramadol 50mg', genericName: 'Tramadol', category: 'analgesicos', presentation: 'Tabletas', concentration: '50mg', unit: 'tableta', currentStock: 100, minStock: 30, maxStock: 300, costPrice: 0.40, salePrice: 1.20, supplier: 'VetPharma', location: 'Controlados C1', isControlled: true },
  { name: 'Tramadol Gotas 100mg/ml', genericName: 'Tramadol', category: 'analgesicos', presentation: 'Frasco gotas', concentration: '100mg/ml', unit: 'ml', currentStock: 200, minStock: 50, maxStock: 400, costPrice: 0.30, salePrice: 0.80, supplier: 'VetPharma', location: 'Controlados C1', isControlled: true },
  { name: 'Gabapentina 100mg', genericName: 'Gabapentina', category: 'analgesicos', presentation: 'Cápsulas', concentration: '100mg', unit: 'cápsula', currentStock: 150, minStock: 40, maxStock: 400, costPrice: 0.25, salePrice: 0.80, supplier: 'Generic Vet', location: 'Estante B3' },
  { name: 'Dipirona 500mg/ml Inyectable', genericName: 'Metamizol', category: 'analgesicos', presentation: 'Ampolla', concentration: '500mg/ml', unit: 'ampolla', currentStock: 100, minStock: 30, maxStock: 250, costPrice: 0.80, salePrice: 2.00, supplier: 'VetPharma', location: 'Estante B3' },
  { name: 'Buprenorfina 0.3mg/ml', genericName: 'Buprenorfina', category: 'analgesicos', presentation: 'Ampolla', concentration: '0.3mg/ml', unit: 'ampolla', currentStock: 30, minStock: 10, maxStock: 80, costPrice: 5.00, salePrice: 12.00, supplier: 'Zoetis', location: 'Controlados C1', isControlled: true },

  // ANTIPARASITARIOS (8)
  { name: 'Ivermectina 1%', genericName: 'Ivermectina', category: 'antiparasitarios', presentation: 'Frasco', concentration: '1%', unit: 'ml', currentStock: 500, minStock: 100, maxStock: 1000, costPrice: 0.08, salePrice: 0.25, supplier: 'Merial', location: 'Estante C1' },
  { name: 'Fenbendazol 10%', genericName: 'Fenbendazol', category: 'antiparasitarios', presentation: 'Suspensión', concentration: '10%', unit: 'ml', currentStock: 400, minStock: 80, maxStock: 800, costPrice: 0.05, salePrice: 0.15, supplier: 'Generic Vet', location: 'Estante C1' },
  { name: 'Praziquantel 50mg', genericName: 'Praziquantel', category: 'antiparasitarios', presentation: 'Tabletas', concentration: '50mg', unit: 'tableta', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.30, salePrice: 1.00, supplier: 'Bayer', location: 'Estante C1' },
  { name: 'Milbemicina 2.5mg + Praziquantel', genericName: 'Milbemicina/Praziquantel', category: 'antiparasitarios', presentation: 'Tabletas', concentration: '2.5mg', unit: 'tableta', currentStock: 100, minStock: 30, maxStock: 250, costPrice: 2.00, salePrice: 5.00, supplier: 'Novartis', location: 'Estante C1' },
  { name: 'Fipronil Spray 250ml', genericName: 'Fipronil', category: 'antiparasitarios', presentation: 'Spray', concentration: '0.25%', unit: 'frasco', currentStock: 50, minStock: 15, maxStock: 120, costPrice: 8.00, salePrice: 18.00, supplier: 'Merial', location: 'Estante C2' },
  { name: 'Pipeta Fipronil Perro Grande', genericName: 'Fipronil', category: 'antiparasitarios', presentation: 'Pipeta', concentration: '2.68ml', unit: 'pipeta', currentStock: 80, minStock: 25, maxStock: 200, costPrice: 4.00, salePrice: 10.00, supplier: 'Merial', location: 'Estante C2' },
  { name: 'Pipeta Fipronil Perro Pequeño', genericName: 'Fipronil', category: 'antiparasitarios', presentation: 'Pipeta', concentration: '0.67ml', unit: 'pipeta', currentStock: 100, minStock: 30, maxStock: 250, costPrice: 3.00, salePrice: 8.00, supplier: 'Merial', location: 'Estante C2' },
  { name: 'Collar Antiparasitario Perro', genericName: 'Deltametrina', category: 'antiparasitarios', presentation: 'Collar', concentration: '4%', unit: 'unidad', currentStock: 40, minStock: 15, maxStock: 100, costPrice: 6.00, salePrice: 15.00, supplier: 'Bayer', location: 'Estante C2' },

  // VACUNAS (6)
  { name: 'Vacuna Séxtuple Canina', genericName: 'DHPPi+L', category: 'vacunas', presentation: 'Frasco', concentration: '1 dosis', unit: 'dosis', currentStock: 50, minStock: 20, maxStock: 120, costPrice: 8.00, salePrice: 25.00, supplier: 'Zoetis', location: 'Refrigerador R2', requiresRefrigeration: true },
  { name: 'Vacuna Rabia Canina', genericName: 'Rabia inactivada', category: 'vacunas', presentation: 'Frasco', concentration: '1 dosis', unit: 'dosis', currentStock: 80, minStock: 30, maxStock: 200, costPrice: 3.00, salePrice: 12.00, supplier: 'Merial', location: 'Refrigerador R2', requiresRefrigeration: true },
  { name: 'Vacuna Triple Felina', genericName: 'FVR-C-P', category: 'vacunas', presentation: 'Frasco', concentration: '1 dosis', unit: 'dosis', currentStock: 40, minStock: 15, maxStock: 100, costPrice: 7.00, salePrice: 22.00, supplier: 'Zoetis', location: 'Refrigerador R2', requiresRefrigeration: true },
  { name: 'Vacuna Leucemia Felina', genericName: 'FeLV', category: 'vacunas', presentation: 'Frasco', concentration: '1 dosis', unit: 'dosis', currentStock: 30, minStock: 10, maxStock: 80, costPrice: 10.00, salePrice: 30.00, supplier: 'Merial', location: 'Refrigerador R2', requiresRefrigeration: true },
  { name: 'Vacuna Kennel Cough', genericName: 'Bordetella', category: 'vacunas', presentation: 'Intranasal', concentration: '1 dosis', unit: 'dosis', currentStock: 35, minStock: 15, maxStock: 90, costPrice: 6.00, salePrice: 18.00, supplier: 'Zoetis', location: 'Refrigerador R2', requiresRefrigeration: true },
  { name: 'Vacuna Leptospira', genericName: 'Leptospira', category: 'vacunas', presentation: 'Frasco', concentration: '1 dosis', unit: 'dosis', currentStock: 45, minStock: 20, maxStock: 100, costPrice: 5.00, salePrice: 15.00, supplier: 'Zoetis', location: 'Refrigerador R2', requiresRefrigeration: true },

  // PROTECTORES GÁSTRICOS (4)
  { name: 'Omeprazol 20mg', genericName: 'Omeprazol', category: 'protectores', presentation: 'Cápsulas', concentration: '20mg', unit: 'cápsula', currentStock: 200, minStock: 50, maxStock: 500, costPrice: 0.15, salePrice: 0.50, supplier: 'Generic Vet', location: 'Estante D1' },
  { name: 'Ranitidina 150mg', genericName: 'Ranitidina', category: 'protectores', presentation: 'Tabletas', concentration: '150mg', unit: 'tableta', currentStock: 150, minStock: 40, maxStock: 400, costPrice: 0.10, salePrice: 0.35, supplier: 'Generic Vet', location: 'Estante D1' },
  { name: 'Sucralfato 1g', genericName: 'Sucralfato', category: 'protectores', presentation: 'Sobres', concentration: '1g', unit: 'sobre', currentStock: 100, minStock: 30, maxStock: 300, costPrice: 0.20, salePrice: 0.60, supplier: 'VetPharma', location: 'Estante D1' },
  { name: 'Metoclopramida 10mg', genericName: 'Metoclopramida', category: 'protectores', presentation: 'Tabletas', concentration: '10mg', unit: 'tableta', currentStock: 180, minStock: 50, maxStock: 450, costPrice: 0.08, salePrice: 0.25, supplier: 'Generic Vet', location: 'Estante D1' },

  // DERMATOLÓGICOS (5)
  { name: 'Shampoo Clorhexidina 4%', genericName: 'Clorhexidina', category: 'dermatologicos', presentation: 'Frasco', concentration: '4%', unit: 'frasco', currentStock: 40, minStock: 15, maxStock: 100, costPrice: 5.00, salePrice: 15.00, supplier: 'Virbac', location: 'Estante D2' },
  { name: 'Crema Miconazol + Gentamicina', genericName: 'Miconazol/Gentamicina', category: 'dermatologicos', presentation: 'Tubo', concentration: '2%/0.1%', unit: 'tubo', currentStock: 60, minStock: 20, maxStock: 150, costPrice: 3.00, salePrice: 9.00, supplier: 'VetPharma', location: 'Estante D2' },
  { name: 'Gotas Óticas Surolan', genericName: 'Miconazol/Polimixina/Prednisolona', category: 'dermatologicos', presentation: 'Frasco gotas', concentration: '15ml', unit: 'frasco', currentStock: 45, minStock: 15, maxStock: 120, costPrice: 8.00, salePrice: 22.00, supplier: 'Elanco', location: 'Estante D2' },
  { name: 'Spray Cicatrizante', genericName: 'Violeta genciana + Aluminio', category: 'dermatologicos', presentation: 'Spray', concentration: '100ml', unit: 'frasco', currentStock: 35, minStock: 12, maxStock: 90, costPrice: 4.00, salePrice: 12.00, supplier: 'Generic Vet', location: 'Estante D2' },
  { name: 'Apoquel 5.4mg', genericName: 'Oclacitinib', category: 'dermatologicos', presentation: 'Tabletas', concentration: '5.4mg', unit: 'tableta', currentStock: 50, minStock: 20, maxStock: 120, costPrice: 3.50, salePrice: 9.00, supplier: 'Zoetis', location: 'Estante D2' },

  // VITAMINAS Y SUPLEMENTOS (4)
  { name: 'Complejo B Inyectable', genericName: 'Vitaminas B1, B6, B12', category: 'vitaminas', presentation: 'Frasco', concentration: '10ml', unit: 'frasco', currentStock: 80, minStock: 25, maxStock: 200, costPrice: 2.00, salePrice: 6.00, supplier: 'Generic Vet', location: 'Estante E1' },
  { name: 'Condroprotector Articular', genericName: 'Glucosamina + Condroitina', category: 'vitaminas', presentation: 'Tabletas', concentration: '500mg', unit: 'tableta', currentStock: 100, minStock: 30, maxStock: 250, costPrice: 0.50, salePrice: 1.50, supplier: 'Nutramax', location: 'Estante E1' },
  { name: 'Hepatoprotector Canino', genericName: 'Silimarina + SAMe', category: 'vitaminas', presentation: 'Tabletas', concentration: '200mg', unit: 'tableta', currentStock: 80, minStock: 25, maxStock: 200, costPrice: 0.80, salePrice: 2.50, supplier: 'VetPharma', location: 'Estante E1' },
  { name: 'Probióticos Veterinarios', genericName: 'Lactobacillus', category: 'vitaminas', presentation: 'Sobres', concentration: '2g', unit: 'sobre', currentStock: 120, minStock: 40, maxStock: 300, costPrice: 0.30, salePrice: 1.00, supplier: 'Purina Pro Plan', location: 'Estante E1' },
];

async function seedMedications() {
  console.log('🔄 Iniciando inserción de medicamentos...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const med of medications) {
    try {
      // Check if medication already exists
      const existing = await prisma.medication.findFirst({
        where: { name: med.name }
      });
      
      if (existing) {
        console.log(`⏭️  Ya existe: ${med.name}`);
        skipped++;
        continue;
      }
      
      // Set expiration date 1 year from now
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      
      // Map category to Prisma enum
      const mappedCategory = CATEGORY_MAP[med.category] || 'OTRO';
      
      await prisma.medication.create({
        data: {
          ...med,
          category: mappedCategory,
          expirationDate,
          requiresRefrigeration: med.requiresRefrigeration || false,
          isControlled: med.isControlled || false,
          activo: true
        }
      });
      
      console.log(`✅ Creado: ${med.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creando ${med.name}:`, error.message);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📊 RESUMEN:`);
  console.log(`   ✅ Creados: ${created}`);
  console.log(`   ⏭️  Ya existían: ${skipped}`);
  console.log(`   📦 Total medicamentos: ${medications.length}`);
  console.log(`========================================\n`);
}

seedMedications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
