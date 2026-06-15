import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const dbUrl = 'libsql://gold-tracker-db-tuanhung0804.aws-ap-northeast-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODAyMTMyNjAsImlkIjoiMDE5ZTdjZjktZTQwMS03YTg1LWIxNmItZjVjYzU3Njk3NjUxIiwicmlkIjoiMWRjNzUwOWQtMGQ4My00MGVhLWEyYjQtY2MzOTI1NmRlNmIyIn0.1rr33icJ_dOPp1-FaqJIWiBxOWd6T6bdiCrHrt6xC_q8xWWMgXu7cN6V40MBoCKha5lJh61OEwGrwexXKTo7AQ';

const adapter = new PrismaLibSql({ url: dbUrl, authToken });
const prisma = new PrismaClient({ adapter });

async function main() {
  const latest = await prisma.priceHistory.findFirst({
    where: { name: 'Nhẫn Trơn 9999' },
    orderBy: { createdAt: 'desc' }
  });

  if (latest) {
    console.log(`Current latest record ID: ${latest.id}, buy: ${latest.buyPrice}, sell: ${latest.sellPrice}`);
    await prisma.priceHistory.update({
      where: { id: latest.id },
      data: {
        buyPrice: latest.buyPrice - 10000,
        sellPrice: latest.sellPrice - 10000
      }
    });
    console.log('Successfully modified latest record to simulate a price change!');
  } else {
    console.log('No record found to modify!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
