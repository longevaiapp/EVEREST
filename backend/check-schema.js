require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const tables = await p.$queryRawUnsafe("SHOW TABLES LIKE 'FluidTherapy'");
  console.log('FluidTherapy table:', tables.length > 0 ? 'EXISTS' : 'NOT FOUND');
  
  const col = await p.$queryRawUnsafe("SHOW COLUMNS FROM Hospitalization WHERE Field = 'type'");
  console.log('type enum:', col[0]?.Type);
  
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
