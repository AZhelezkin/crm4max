const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE reviews, payments, bookings, service_photos, services, categories, schedules, master_photos, clients, masters RESTART IDENTITY CASCADE'
  );
  console.log('Truncated OK');
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
