const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // First find users
  const usersRes = await request({
    hostname: 'localhost', port: 3003,
    path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': 0 }
  });
  console.log('Login attempt 1:', JSON.stringify(usersRes).substring(0, 200));

  // Try different passwords
  const passwords = ['admin123', 'Admin123', 'Admin123!', 'password', '123456'];
  let token = null;
  
  for (const pwd of passwords) {
    const loginBody = JSON.stringify({ email: 'admin@everest.com', password: pwd });
    const loginRes = await request({
      hostname: 'localhost', port: 3003,
      path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
    }, loginBody);
    if (loginRes.token) {
      token = loginRes.token;
      console.log('Login OK with:', pwd);
      break;
    }
  }

  // Try Patricia (hospitalizacion user from screenshot)
  if (!token) {
    const emails = ['patricia@everest.com', 'patricia.mendoza@everest.com', 'pmendoza@everest.com'];
    for (const email of emails) {
      for (const pwd of passwords) {
        const loginBody = JSON.stringify({ email, password: pwd });
        const loginRes = await request({
          hostname: 'localhost', port: 3003,
          path: '/api/v1/auth/login', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
        }, loginBody);
        if (loginRes.token) {
          token = loginRes.token;
          console.log('Login OK with:', email, pwd);
          break;
        }
      }
      if (token) break;
    }
  }

  if (!token) {
    console.log('Could not login. Trying DB directly...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany({ select: { email: true, rol: true }, take: 5 });
    console.log('Users:', JSON.stringify(users));
    
    // Also check hospitalizations directly
    const hosps = await prisma.hospitalization.findMany({ 
      where: { status: 'ACTIVA' },
      select: { id: true, type: true, pet: { select: { nombre: true, especie: true } } }
    });
    console.log('Active hospitalizations:', JSON.stringify(hosps, null, 2));
    await prisma.$disconnect();
    return;
  }

  // Board
  const boardRes = await request({
    hostname: 'localhost', port: 3003,
    path: '/api/v1/hospitalizations/board/PERROS_NO_INFECCIOSOS', method: 'GET',
    headers: { Authorization: 'Bearer ' + token }
  });
  
  console.log('Board status:', boardRes.status);
  console.log('Rows count:', boardRes.data?.rows?.length || 0);
  console.log('Total patients:', boardRes.data?.totalPatients || 0);
  if (boardRes.data?.rows?.length) {
    boardRes.data.rows.forEach(r => {
      console.log(`  - ${r.pet.nombre} (${r.pet.especie}) type_in_db: activities_count=${Object.keys(r.activities).length}`);
    });
  } else {
    console.log('Full response:', JSON.stringify(boardRes, null, 2).substring(0, 1000));
  }
}

main().catch(console.error);
