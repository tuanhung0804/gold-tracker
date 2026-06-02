import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error('❌ DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Turso database: ${url}`);

  const client = createClient({
    url,
    authToken,
  });

  console.log('🏗️ Creating database tables...');

  // Create PriceHistory table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "PriceHistory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "buyPrice" REAL NOT NULL,
      "sellPrice" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  console.log('✅ Created table: PriceHistory');

  // Create PortfolioItem table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "PortfolioItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "buyDate" DATETIME NOT NULL,
      "quantity" REAL NOT NULL,
      "buyPrice" REAL NOT NULL,
      "status" TEXT NOT NULL,
      "sellPrice" REAL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  console.log('✅ Created table: PortfolioItem');

  // Create SjcPriceHistory table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "SjcPriceHistory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "buyPrice" REAL NOT NULL,
      "sellPrice" REAL NOT NULL,
      "yesterdayBuy" REAL NOT NULL,
      "yesterdaySell" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  console.log('✅ Created table: SjcPriceHistory');

  // Create WorldGoldPriceHistory table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "WorldGoldPriceHistory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "buyPrice" REAL NOT NULL,
      "sellPrice" REAL NOT NULL,
      "yesterdayBuy" REAL NOT NULL,
      "yesterdaySell" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  console.log('✅ Created table: WorldGoldPriceHistory');

  // Create RateLimit table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "RateLimit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ip" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "userAgent" TEXT,
      "isLocked" BOOLEAN NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Created table: RateLimit');

  // Create unique index on RateLimit.ip
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "RateLimit_ip_key" ON "RateLimit"("ip");
  `);
  console.log('✅ Created index: RateLimit_ip_key');

  console.log('🎉 Turso database schema successfully initialized.');
}

main().catch((err) => {
  console.error('❌ Failed to setup Turso database:', err);
  process.exit(1);
});
