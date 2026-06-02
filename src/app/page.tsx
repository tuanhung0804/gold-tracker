import prisma from '@/lib/prisma';
import TabSlider from './components/TabSlider';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const now = Date.now();
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  
  let livePrice = null;

  // 1. Try to serve from fresh global memory cache to prevent DB overhead and lag on page reload
  const cached = (globalThis as any).goldPriceCache;
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    console.log('[Dashboard Server] Serving from fresh global memory cache');
    livePrice = cached.data;
  }

  // 2. Cache miss/stale: Query database fallback instantly to avoid blocking SSR
  if (!livePrice) {
    console.log('[Dashboard Server] Cache miss. Serving from database fallback...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [latestNgocCua, latestSjc, latestWorld, yesterdaySjc, yesterdayWorld] = await Promise.all([
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
      }),
      prisma.worldGoldPriceHistory.findFirst({
        where: { createdAt: { lt: today } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (latestNgocCua) {
      const sjcYesterdayBuy = yesterdaySjc ? yesterdaySjc.buyPrice : (latestSjc ? latestSjc.buyPrice : 0);
      const sjcYesterdaySell = yesterdaySjc ? yesterdaySjc.sellPrice : (latestSjc ? latestSjc.sellPrice : 0);
      
      const worldYesterdayBuy = yesterdayWorld ? yesterdayWorld.buyPrice : (latestWorld ? latestWorld.buyPrice : 0);
      const worldYesterdaySell = yesterdayWorld ? yesterdayWorld.sellPrice : (latestWorld ? latestWorld.sellPrice : 0);

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
