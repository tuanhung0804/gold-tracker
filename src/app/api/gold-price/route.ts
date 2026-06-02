import { NextResponse } from 'next/server';
import { fetchGoldPrice } from '@/lib/scraper';

import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let data = await fetchGoldPrice();
  
  // Fallback to database records for all 3 types if scraper completely fails
  if (!data) {
    try {
      const [latestNgocCua, latestSjc, latestWorld] = await Promise.all([
        prisma.priceHistory.findFirst({
          where: { name: 'Nhẫn Trơn 9999' },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.sjcPriceHistory.findFirst({
          orderBy: { createdAt: 'desc' }
        }),
        prisma.worldGoldPriceHistory.findFirst({
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const fallbackNgocCua = latestNgocCua || await prisma.priceHistory.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (fallbackNgocCua) {
        data = {
          name: fallbackNgocCua.name,
          buyPrice: fallbackNgocCua.buyPrice,
          sellPrice: fallbackNgocCua.sellPrice,
          sjcRing: latestSjc ? {
            name: "Vàng nhẫn SJC 99.99%",
            buyPrice: latestSjc.buyPrice,
            sellPrice: latestSjc.sellPrice,
            alterBuy: latestSjc.buyPrice - latestSjc.yesterdayBuy,
            alterSell: latestSjc.sellPrice - latestSjc.yesterdaySell,
            yesterdayBuy: latestSjc.yesterdayBuy,
            yesterdaySell: latestSjc.yesterdaySell
          } : null,
          worldGold: latestWorld ? {
            name: "Vàng thế giới",
            buyPrice: latestWorld.buyPrice,
            sellPrice: latestWorld.sellPrice,
            alterBuy: latestWorld.buyPrice - latestWorld.yesterdayBuy,
            alterSell: latestWorld.sellPrice - latestWorld.yesterdaySell,
            yesterdayBuy: latestWorld.yesterdayBuy,
            yesterdaySell: latestWorld.yesterdaySell
          } : null
        };
      }
    } catch (e) {
      console.error('Error fetching fallback prices in api route:', e);
    }
  }
  
  if (!data) {
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }

  return NextResponse.json(data);
}
