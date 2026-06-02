import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import fs from 'fs';


// Resolve database path
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl || dbUrl === 'undefined') {
  dbUrl = `file:${path.resolve(process.cwd(), 'dev.db')}`;
} else if (dbUrl.startsWith('file:./') || dbUrl.startsWith('file:dev.db')) {
  const relativePath = dbUrl.replace(/^file:/, '');
  dbUrl = `file:${path.resolve(process.cwd(), relativePath)}`;
}

const adapter = new PrismaLibSql({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');
  console.log(`📂 Using database: ${dbUrl}`);

  // Clear existing data
  await prisma.portfolioItem.deleteMany();
  await prisma.priceHistory.deleteMany();
  console.log('🗑️  Cleared existing data.');

  // Portfolio data from Google Sheets
  const portfolioData = [
    { buyDate: new Date('2021-02-01'), quantity: 1, buyPrice: 5535000, status: 'Đang giữ' },
    { buyDate: new Date('2021-10-13'), quantity: 2, buyPrice: 5150000, status: 'Đang giữ' },
    { buyDate: new Date('2025-03-30'), quantity: 3, buyPrice: 9905000, status: 'Đang giữ' },
    { buyDate: new Date('2025-04-04'), quantity: 3, buyPrice: 10080000, status: 'Đang giữ' },
    { buyDate: new Date('2025-08-01'), quantity: 5, buyPrice: 10895000, status: 'Đang giữ' },
    { buyDate: new Date('2026-01-19'), quantity: 1, buyPrice: 15350000, status: 'Đang giữ' },
    { buyDate: new Date('2026-04-08'), quantity: 1, buyPrice: 16040000, status: 'Đang giữ' },
    { buyDate: new Date('2026-05-16'), quantity: 1, buyPrice: 15060000, status: 'Đang giữ' },
  ];

  for (const item of portfolioData) {
    await prisma.portfolioItem.create({ data: item });
  }
  console.log(`✅ Inserted ${portfolioData.length} portfolio items.`);

  // Parse and seed historical data from CSV
  const csvFilePath = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\f64cf85b-0a61-430a-b5c6-f1b70c638718\\.system_generated\\steps\\16\\content.md';
  
  if (fs.existsSync(csvFilePath)) {
    console.log(`📖 Reading historical data from: ${csvFilePath}`);
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = fileContent.split(/\r?\n/);
    
    let csvStarted = false;
    interface SeedPriceHistory {
      name: string;
      buyPrice: number;
      sellPrice: number;
      createdAt: Date;
      updatedAt: Date;
    }
    const priceHistoryData: SeedPriceHistory[] = [];
    
    for (const line of lines) {
      if (!csvStarted) {
        if (line.startsWith('Loại vàng') || line.includes('Mua vào')) {
          csvStarted = true;
        }
        continue;
      }
      
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(',');
      if (parts.length < 5) continue;
      
      const name = parts[0].trim();
      const buyPrice = parseFloat(parts[1].trim());
      const sellPrice = parseFloat(parts[2].trim());
      
      // Parse dates: replace space with T or parse directly
      const firstRecordedAtStr = parts[3].trim();
      const lastRecordedAtStr = parts[4].trim();
      
      if (!name || isNaN(buyPrice) || isNaN(sellPrice)) {
        continue;
      }
      
      priceHistoryData.push({
        name,
        buyPrice,
        sellPrice,
        createdAt: new Date(firstRecordedAtStr.replace(' ', 'T')),
        updatedAt: new Date(lastRecordedAtStr.replace(' ', 'T'))
      });
    }
    
    console.log(`📊 Parsed ${priceHistoryData.length} records from CSV.`);
    
    // Copy the cleaned CSV to prisma directory for persistence/future seeds
    const cleanCsvLines = [
      'Loại vàng,Mua vào (VNĐ/chỉ),Bán ra (VNĐ/chỉ),First recorded at,Last recorded at'
    ];
    for (const record of priceHistoryData) {
      const formatDate = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19);
      cleanCsvLines.push(`${record.name},${record.buyPrice},${record.sellPrice},${formatDate(record.createdAt)},${formatDate(record.updatedAt)}`);
    }
    fs.writeFileSync(path.resolve(__dirname, 'historical_data.csv'), cleanCsvLines.join('\n'));
    console.log(`💾 Persisted clean CSV to: ${path.resolve(__dirname, 'historical_data.csv')}`);
    
    // Insert into database
    let insertedCount = 0;
    for (const item of priceHistoryData) {
      await prisma.priceHistory.create({
        data: item
      });
      insertedCount++;
    }
    console.log(`✅ Inserted ${insertedCount} price history records.`);
  } else {
    console.log(`⚠️ Historical data CSV not found at ${csvFilePath}. Falling back to default snapshot.`);
    await prisma.priceHistory.create({
      data: {
        name: 'SJC 1L - 10L',
        buyPrice: 14390000,
        sellPrice: 14680000,
      },
    });
    console.log('✅ Inserted default price history snapshot.');
  }

  // Verify
  const portfolioCount = await prisma.portfolioItem.count();
  const priceCount = await prisma.priceHistory.count();
  console.log(`\n📊 Database now has:`);
  console.log(`   - ${portfolioCount} portfolio items`);
  console.log(`   - ${priceCount} price history records`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
