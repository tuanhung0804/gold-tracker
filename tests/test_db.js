const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

const dbUrl = `file:${path.resolve(__dirname, 'dev.db')}`;
console.log("Using Database URL:", dbUrl);

const adapter = new PrismaLibSql({
  url: dbUrl
});
const prisma = new PrismaClient({ adapter });

async function checkDb() {
  try {
    const latest = await prisma.priceHistory.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    console.log("Latest PriceHistory record:", latest);
    
    const items = await prisma.portfolioItem.findMany();
    console.log("Total portfolio items:", items.length);
    console.log("First few items:", items.slice(0, 3));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
