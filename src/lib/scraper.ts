import { JSDOM } from 'jsdom';
import prisma from './prisma';

export interface GoldPriceData {
  name: string;
  buyPrice: number;
  sellPrice: number;
}

export interface GiaVangPriceInfo {
  name: string;
  buyPrice: number;
  sellPrice: number;
  alterBuy: number;
  alterSell: number;
  yesterdayBuy: number;
  yesterdaySell: number;
}

export interface ExtendedGoldPriceData extends GoldPriceData {
  sjcRing: GiaVangPriceInfo | null;
  worldGold: GiaVangPriceInfo | null;
}

interface CachedPrice {
  data: ExtendedGoldPriceData;
  timestamp: number;
}

declare global {
  var goldPriceCache: CachedPrice | null;
  var isGoldPriceRevalidating: boolean;
}

globalThis.goldPriceCache = globalThis.goldPriceCache ?? null;
globalThis.isGoldPriceRevalidating = globalThis.isGoldPriceRevalidating ?? false;

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Scrape Nhẫn SJC and Vàng thế giới from giavang.net API
async function scrapeGiaVangData(): Promise<{ sjcRing: GiaVangPriceInfo | null; worldGold: GiaVangPriceInfo | null } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api2.giavang.net/v1/gold/last-price", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Scraper] Failed to fetch from api2.giavang.net', response.status);
      return null;
    }

    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) return null;

    const sjcItem = json.data.find((item: any) => item.type_code === 'SJ9999');
    const worldItem = json.data.find((item: any) => item.type_code === 'XAUUSD');

    const sjcYesterdayBuy = sjcItem ? ((Number(sjcItem.yesterday_buy) || (Number(sjcItem.buy) - Number(sjcItem.alter_buy))) / 10) : 0;
    const sjcYesterdaySell = sjcItem ? ((Number(sjcItem.yesterday_sell) || (Number(sjcItem.sell) - Number(sjcItem.alter_sell))) / 10) : 0;
    const sjcBuy = sjcItem ? (Number(sjcItem.buy) / 10) : 0;
    const sjcSell = sjcItem ? (Number(sjcItem.sell) / 10) : 0;

    const sjcRing: GiaVangPriceInfo | null = sjcItem ? {
      name: "Vàng nhẫn SJC 99.99%",
      buyPrice: sjcBuy,
      sellPrice: sjcSell,
      alterBuy: sjcBuy - sjcYesterdayBuy,
      alterSell: sjcSell - sjcYesterdaySell,
      yesterdayBuy: sjcYesterdayBuy,
      yesterdaySell: sjcYesterdaySell,
    } : null;

    const worldYesterdayBuy = worldItem ? (Number(worldItem.yesterday_buy) || (Number(worldItem.buy) - Number(worldItem.alter_buy))) : 0;
    const worldYesterdaySell = worldItem ? Number(worldItem.yesterday_sell || 0) : 0;
    const worldBuy = worldItem ? Number(worldItem.buy) : 0;
    const worldSell = worldItem ? Number(worldItem.sell || 0) : 0;

    const worldGold: GiaVangPriceInfo | null = worldItem ? {
      name: "Vàng thế giới",
      buyPrice: worldBuy,
      sellPrice: worldSell,
      alterBuy: worldBuy - worldYesterdayBuy,
      alterSell: worldSell > 0 && worldYesterdaySell > 0 ? worldSell - worldYesterdaySell : 0,
      yesterdayBuy: worldYesterdayBuy,
      yesterdaySell: worldYesterdaySell,
    } : null;

    return { sjcRing, worldGold };
  } catch (error) {
    console.error('[Scraper] Error in scrapeGiaVangData:', error);
    return null;
  }
}

// Internal function to perform the actual scrape for Ngoc Cua
async function scrapeGoldPriceRaw(): Promise<GoldPriceData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://ngoccuanhabe.com/?refresh=${Math.random()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Failed to fetch from ngoccuanhabe.com', response.status);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const tables = document.querySelectorAll('table');
    if (tables.length === 0) return null;

    const table = tables[0];
    const rows = table.querySelectorAll('tr');
    
    if (rows.length < 2) return null;

    const cols = rows[1].querySelectorAll('td, th');
    if (cols.length < 3) return null;

    const name = cols[0].textContent?.trim() || '';
    const buyPriceRaw = cols[1].textContent?.replace(/[^\d]/g, '') || '0';
    const sellPriceRaw = cols[2].textContent?.replace(/[^\d]/g, '') || '0';

    const buyPrice = Number(buyPriceRaw);
    const sellPrice = Number(sellPriceRaw);

    if (buyPrice <= 0) return null;

    return {
      name,
      buyPrice,
      sellPrice
    };
  } catch (error) {
    console.error('Error in scrapeGoldPriceRaw:', error);
    return null;
  }
}

// Guaranteed hard timeout wrapper to prevent any hanging calls
async function scrapeGoldPrice(): Promise<ExtendedGoldPriceData | null> {
  return new Promise((resolve) => {
    let completed = false;
    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.warn('[Scraper] Hard timeout of 5000ms reached during scrape.');
        resolve(null);
      }
    }, 5000);

    Promise.all([
      scrapeGoldPriceRaw(),
      scrapeGiaVangData()
    ]).then(async ([ngocCua, giaVang]) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        
        let base = ngocCua;
        if (!base) {
          try {
            const latestNgocCua = await prisma.priceHistory.findFirst({
              where: { name: 'Nhẫn Trơn 9999' },
              orderBy: { createdAt: 'desc' }
            });
            base = latestNgocCua ? {
              name: latestNgocCua.name,
              buyPrice: latestNgocCua.buyPrice,
              sellPrice: latestNgocCua.sellPrice
            } : { name: 'Nhẫn Trơn 9999', buyPrice: 0, sellPrice: 0 };
          } catch (e) {
            base = { name: 'Nhẫn Trơn 9999', buyPrice: 0, sellPrice: 0 };
          }
        }

        resolve({
          ...base,
          sjcRing: giaVang?.sjcRing || null,
          worldGold: giaVang?.worldGold || null
        });
      }
    }).catch((err) => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutId);
        console.error('[Scraper] Scraping promise rejected:', err);
        resolve(null);
      }
    });
  });
}


export async function fetchGoldPrice(options?: { forceRefresh?: boolean }): Promise<ExtendedGoldPriceData | null> {
  const now = Date.now();

  // If forceRefresh is requested, bypass database cache completely and do synchronous fetch
  if (options?.forceRefresh) {
    console.log('[Scraper] Force refresh requested. Scraping synchronously...');
    const freshData = await scrapeGoldPrice();
    if (freshData) {
      globalThis.goldPriceCache = {
        data: freshData,
        timestamp: now
      };
    }
    return freshData;
  }

  // 1. If memory cache exists and is fresh (< 2 minutes old), return it immediately
  if (globalThis.goldPriceCache && (now - globalThis.goldPriceCache.timestamp < CACHE_TTL_MS)) {
    return globalThis.goldPriceCache.data;
  }

  // 2. Cache is stale or missing. Scrape synchronously to avoid returning DB fallback with +0 alterBuy.
  console.log('[Scraper] Cache miss. Scraping synchronously...');
  const livePrice = await scrapeGoldPrice();
  
  if (livePrice) {
    globalThis.goldPriceCache = {
      data: livePrice,
      timestamp: Date.now()
    };
    
    // 3. Lazy Cron: Check if the DB record is older than 10 minutes. If so, update DB.
    if (!globalThis.isGoldPriceRevalidating) {
      globalThis.isGoldPriceRevalidating = true;
      try {
        const fallbackNgocCua = await prisma.priceHistory.findFirst({
          where: { name: 'Nhẫn Trơn 9999' },
          orderBy: { createdAt: 'desc' }
        });
        const dbAgeMs = fallbackNgocCua ? now - fallbackNgocCua.createdAt.getTime() : Infinity;
        const tenMinutesMs = 10 * 60 * 1000;
        
        if (dbAgeMs > tenMinutesMs) {
          console.log('[Scraper] Database price is stale (>10 mins). Lazy updating DB...');
          
          const processLazyDbUpdate = async (name: string, buyPrice: number, sellPrice: number) => {
            const latest = await prisma.priceHistory.findFirst({
              where: { name },
              orderBy: { createdAt: 'desc' }
            });
            if (latest && latest.buyPrice === buyPrice && latest.sellPrice === sellPrice) {
              await prisma.priceHistory.update({
                where: { id: latest.id },
                data: { updatedAt: new Date() }
              });
            } else {
              await prisma.priceHistory.create({
                data: { name, buyPrice, sellPrice }
              });
            }
          };

          const processLazySjcDbUpdate = async (buyPrice: number, sellPrice: number, yesterdayBuy: number, yesterdaySell: number) => {
            const latest = await prisma.sjcPriceHistory.findFirst({
              orderBy: { createdAt: 'desc' }
            });
            if (latest && latest.buyPrice === buyPrice && latest.sellPrice === sellPrice && latest.yesterdayBuy === yesterdayBuy && latest.yesterdaySell === yesterdaySell) {
              await prisma.sjcPriceHistory.update({
                where: { id: latest.id },
                data: { updatedAt: new Date() }
              });
            } else {
              await prisma.sjcPriceHistory.create({
                data: { buyPrice, sellPrice, yesterdayBuy, yesterdaySell }
              });
            }
          };

          const processLazyWorldDbUpdate = async (buyPrice: number, sellPrice: number, yesterdayBuy: number, yesterdaySell: number) => {
            const latest = await prisma.worldGoldPriceHistory.findFirst({
              orderBy: { id: 'desc' }
            });
            if (latest) {
              await prisma.worldGoldPriceHistory.update({
                where: { id: latest.id },
                data: {
                  buyPrice,
                  sellPrice,
                  yesterdayBuy,
                  yesterdaySell,
                  updatedAt: new Date()
                }
              });
            } else {
              await prisma.worldGoldPriceHistory.create({
                data: { buyPrice, sellPrice, yesterdayBuy, yesterdaySell }
              });
            }
          };

          if (livePrice.buyPrice > 0) {
            await processLazyDbUpdate(livePrice.name, livePrice.buyPrice, livePrice.sellPrice);
          }
          if (livePrice.sjcRing) {
            await processLazySjcDbUpdate(livePrice.sjcRing.buyPrice, livePrice.sjcRing.sellPrice, livePrice.sjcRing.yesterdayBuy, livePrice.sjcRing.yesterdaySell);
          }
          if (livePrice.worldGold) {
            await processLazyWorldDbUpdate(livePrice.worldGold.buyPrice, livePrice.worldGold.sellPrice, livePrice.worldGold.yesterdayBuy, livePrice.worldGold.yesterdaySell);
          }
        }
      } catch (err) {
        console.error('[Scraper] Lazy DB update error:', err);
      } finally {
        globalThis.isGoldPriceRevalidating = false;
      }
    }
    
    return livePrice;
  }

  // 4. If scraping fails completely, return null. The route.ts will handle the DB fallback.
  console.log('[Scraper] Scraping failed completely. Returning null...');
  return null;
}
