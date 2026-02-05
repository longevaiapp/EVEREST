require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const meds = await prisma.medication.findMany({ take: 1 });
    if (meds.length === 0) {
      console.log('No medications found');
      return;
    }
    
    console.log('Found medication:', meds[0].name);
    console.log('Current imageUrl:', meds[0].imageUrl);
    
    const updated = await prisma.medication.update({
      where: { id: meds[0].id },
      data: { imageUrl: 'test-image-url' }
    });
    
    console.log('SUCCESS! Updated imageUrl:', updated.imageUrl);
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
