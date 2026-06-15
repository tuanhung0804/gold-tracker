import { NextResponse } from 'next/server';
import { fetchGoldPrice } from '@/lib/scraper';
import prisma from '@/lib/prisma';
import { sendPriceChangeEmail } from '@/lib/email';
import { triggerPushNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';

async function handleTrack(buyPricePassed?: number, sellPricePassed?: number) {
  try {
    let data;
    if (buyPricePassed && sellPricePassed) {
      console.log('[Cron Track API] Using passed prices:', { buyPricePassed, sellPricePassed });
      const liveData = await fetchGoldPrice({ forceRefresh: true }).catch(() => null);
      data = {
        name: 'Nhẫn Trơn 9999',
        buyPrice: buyPricePassed,
        sellPrice: sellPricePassed,
        sjcRing: liveData?.sjcRing || null,
        worldGold: liveData?.worldGold || null
      };
    } else {
      console.log('[Cron Track API] No prices passed, scraping live...');
      data = await fetchGoldPrice({ forceRefresh: true });
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
    }

    // Get latest record
    const latestRecord = await prisma.priceHistory.findFirst({
      where: { name: data.name },
      orderBy: { createdAt: 'desc' }
    });

    // Validate price stability (no spikes > 20%)
    if (latestRecord) {
      const buyPriceDiff = Math.abs(data.buyPrice - latestRecord.buyPrice) / latestRecord.buyPrice;
      const sellPriceDiff = Math.abs(data.sellPrice - latestRecord.sellPrice) / latestRecord.sellPrice;
      
      if (buyPriceDiff > 0.20 || sellPriceDiff > 0.20) {
        console.warn(`[Price Validation] Rejected anomalous price data due to >20% change compared to latest record (ID: ${latestRecord.id}):`, {
          new: { buy: data.buyPrice, sell: data.sellPrice },
          latest: { buy: latestRecord.buyPrice, sell: latestRecord.sellPrice }
        });
        
        // Update the heartbeat of the latest record instead of inserting bad data
        await prisma.priceHistory.update({
          where: { id: latestRecord.id },
          data: { updatedAt: new Date() }
        });
        
        return NextResponse.json({
          status: 'Ignored anomalous price data (Heartbeat updated)',
          warning: 'Price change exceeds 20% threshold',
          data
        });
      }
    }

    // 1. Process database and heartbeat for SJC Ring
    if (data.sjcRing) {
      try {
        const latestSjc = await prisma.sjcPriceHistory.findFirst({
          orderBy: { createdAt: 'desc' }
        });
        if (latestSjc && latestSjc.buyPrice === data.sjcRing.buyPrice && latestSjc.sellPrice === data.sjcRing.sellPrice && latestSjc.yesterdayBuy === data.sjcRing.yesterdayBuy && latestSjc.yesterdaySell === data.sjcRing.yesterdaySell) {
          await prisma.sjcPriceHistory.update({
            where: { id: latestSjc.id },
            data: { updatedAt: new Date() }
          });
        } else {
          await prisma.sjcPriceHistory.create({
            data: {
              buyPrice: data.sjcRing.buyPrice,
              sellPrice: data.sjcRing.sellPrice,
              yesterdayBuy: data.sjcRing.yesterdayBuy,
              yesterdaySell: data.sjcRing.yesterdaySell
            }
          });
        }
      } catch (err) {
        console.error('Failed to process SJC Ring price history in cron:', err);
      }
    }

    // 2. Process database and heartbeat for World Gold
    if (data.worldGold) {
      try {
        const latestWorld = await prisma.worldGoldPriceHistory.findFirst({
          orderBy: { id: 'desc' }
        });
        if (latestWorld) {
          await prisma.worldGoldPriceHistory.update({
            where: { id: latestWorld.id },
            data: {
              buyPrice: data.worldGold.buyPrice,
              sellPrice: data.worldGold.sellPrice,
              yesterdayBuy: data.worldGold.yesterdayBuy,
              yesterdaySell: data.worldGold.yesterdaySell,
              updatedAt: new Date()
            }
          });
        } else {
          await prisma.worldGoldPriceHistory.create({
            data: {
              buyPrice: data.worldGold.buyPrice,
              sellPrice: data.worldGold.sellPrice,
              yesterdayBuy: data.worldGold.yesterdayBuy,
              yesterdaySell: data.worldGold.yesterdaySell
            }
          });
        }
      } catch (err) {
        console.error('Failed to process World Gold price history in cron:', err);
      }
    }

    // 3. Process base Ngoc Cua gold price (unchanged email & db log)
    if (latestRecord && latestRecord.buyPrice === data.buyPrice && latestRecord.sellPrice === data.sellPrice) {
      // Price unchanged, update the heartbeat (updatedAt)
      await prisma.priceHistory.update({
        where: { id: latestRecord.id },
        data: { updatedAt: new Date() }
      });
      return NextResponse.json({ status: 'Heartbeat updated for all gold types', data });
    } else {
      // Price changed, get yesterday's price for email comparison
      const tzOffset = 7 * 60 * 60 * 1000;
      const todayLocal = new Date(Date.now() + tzOffset);
      todayLocal.setUTCHours(0, 0, 0, 0);
      const today = new Date(todayLocal.getTime() - tzOffset);
      const yesterdayRecord = await prisma.priceHistory.findFirst({
        where: {
          name: data.name,
          createdAt: {
            lt: today
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      const yesterdayPrice = yesterdayRecord ? yesterdayRecord.buyPrice : (latestRecord ? latestRecord.buyPrice : data.buyPrice);

      // Send email notification first
      try {
        await sendPriceChangeEmail(
          data.name,
          data.buyPrice,
          data.sellPrice,
          latestRecord ? latestRecord.buyPrice : data.buyPrice,
          latestRecord ? latestRecord.sellPrice : data.sellPrice,
          yesterdayPrice
        );
      } catch (emailError) {
        console.error('Failed to send price change email:', emailError);
      }

      // Send push notification
      try {
        await triggerPushNotification(
          data.name,
          data.buyPrice,
          data.sellPrice,
          latestRecord ? latestRecord.buyPrice : data.buyPrice,
          latestRecord ? latestRecord.sellPrice : data.sellPrice,
          yesterdayPrice
        );
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
      }

      // Insert new record in database
      await prisma.priceHistory.create({
        data: {
          name: data.name,
          buyPrice: data.buyPrice,
          sellPrice: data.sellPrice
        }
      });
      
      return NextResponse.json({ status: 'New price recorded, email and push sent for Ngoc Cua, other types updated', data });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in cron track:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleTrack();
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  return handleTrack(body.buyPrice, body.sellPrice);
}
