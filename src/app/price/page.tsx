import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/session';
import prisma from '@/lib/prisma';
import TabSlider from '@/components/TabSlider';

export const dynamic = 'force-dynamic';

export default async function PricePage() {
  // 1. Secure Server-Side Auth Check
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const decoded = session ? await verifySessionToken(session) : null;
  
  if (!decoded) {
    redirect('/login');
  }

  // 2. Fetch prices and portfolio
  const now = Date.now();
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  
  let livePrice = null;

  // Try to serve from fresh global memory cache to prevent DB overhead and lag on page reload
  const cached = (globalThis as any).goldPriceCache;
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    console.log('[Dashboard Server] Serving from fresh global memory cache');
    livePrice = cached.data;
  }

  // Cache miss/stale: Query database fallback instantly to avoid blocking SSR
  if (!livePrice) {
    console.log('[Dashboard Server] Cache miss. Serving from database fallback...');
    const tzOffset = 7 * 60 * 60 * 1000;
    const todayLocal = new Date(Date.now() + tzOffset);
    todayLocal.setUTCHours(0, 0, 0, 0);
    const today = new Date(todayLocal.getTime() - tzOffset);

    const [latestNgocCua, latestSjc, latestWorld, yesterdaySjc] = await Promise.all([
      prisma.priceHistory.findFirst({
        where: { name: 'Nhẫn Trơn 9999' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sjcPriceHistory.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.worldGoldPriceHistory.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sjcPriceHistory.findFirst({
        where: { createdAt: { lt: today } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (latestNgocCua) {
      const sjcYesterdayBuy = yesterdaySjc ? yesterdaySjc.buyPrice : (latestSjc ? latestSjc.buyPrice : 0);
      const sjcYesterdaySell = yesterdaySjc ? yesterdaySjc.sellPrice : (latestSjc ? latestSjc.sellPrice : 0);
      
      const worldYesterdayBuy = latestWorld ? latestWorld.yesterdayBuy : 0;
      const worldYesterdaySell = latestWorld ? latestWorld.yesterdaySell : 0;

      livePrice = {
        name: latestNgocCua.name,
        buyPrice: latestNgocCua.buyPrice,
        sellPrice: latestNgocCua.sellPrice,
        sjcRing: latestSjc ? {
          name: "Vàng nhẫn SJC 99.99%",
          buyPrice: latestSjc.buyPrice,
          sellPrice: latestSjc.sellPrice,
          alterBuy: latestSjc.buyPrice - sjcYesterdayBuy,
          alterSell: latestSjc.sellPrice - sjcYesterdaySell,
          yesterdayBuy: sjcYesterdayBuy,
          yesterdaySell: sjcYesterdaySell
        } : null,
        worldGold: latestWorld ? {
          name: "Vàng thế giới",
          buyPrice: latestWorld.buyPrice,
          sellPrice: latestWorld.sellPrice,
          alterBuy: latestWorld.buyPrice - worldYesterdayBuy,
          alterSell: latestWorld.sellPrice - worldYesterdaySell,
          yesterdayBuy: worldYesterdayBuy,
          yesterdaySell: worldYesterdaySell
        } : null
      };
    }
  }
  
  // Fetch initial active portfolio items on server side
  const portfolio = await prisma.portfolioItem.findMany({
    where: { status: 'Đang giữ' }
  });

  // Convert Date types to ISO string to ensure they serialize cleanly from Server to Client component
  const serializedPortfolio = portfolio.map(item => ({
    ...item,
    buyDate: item.buyDate.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return (
    <TabSlider 
      initialLivePrice={livePrice} 
      initialPortfolio={serializedPortfolio} 
    />
  );
}
