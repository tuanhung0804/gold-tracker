export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js runtime (server startup)
    console.log('⚡ [Instrumentation] Next.js startup - Registering background gold tracker...');
    
    // We delay the first run by a few seconds to let the server fully initialize
    setTimeout(async () => {
      // Dynamic imports to avoid issues during build/loading
      const { fetchGoldPrice } = await import('./lib/scraper');
      const { default: prisma } = await import('./lib/prisma');
      
      const trackPrice = async () => {
        try {
          const nowStr = new Date().toISOString();
          console.log(`⏱️ [Automation] [${nowStr}] Scraping live gold price...`);
          const data = await fetchGoldPrice({ forceRefresh: true });
          if (!data) {
            console.error('❌ [Automation] Scraper failed to fetch gold price.');
            return;
          }
          
          const latestRecord = await prisma.priceHistory.findFirst({
            where: { name: data.name },
            orderBy: { createdAt: 'desc' }
          });
          
          // Anomaly checks (20% change threshold)
          if (latestRecord) {
            const buyPriceDiff = Math.abs(data.buyPrice - latestRecord.buyPrice) / latestRecord.buyPrice;
            const sellPriceDiff = Math.abs(data.sellPrice - latestRecord.sellPrice) / latestRecord.sellPrice;
            
            if (buyPriceDiff > 0.20 || sellPriceDiff > 0.20) {
              console.warn(`⚠️ [Automation] Ignored anomalous spike (>20%):`, {
                new: { buy: data.buyPrice, sell: data.sellPrice },
                latest: { buy: latestRecord.buyPrice, sell: latestRecord.sellPrice }
              });
              
              // Heartbeat update
              await prisma.priceHistory.update({
                where: { id: latestRecord.id },
                data: { updatedAt: new Date() }
              });
              return;
            }
          }
          
          if (latestRecord && latestRecord.buyPrice === data.buyPrice && latestRecord.sellPrice === data.sellPrice) {
            // Heartbeat update
            await prisma.priceHistory.update({
              where: { id: latestRecord.id },
              data: { updatedAt: new Date() }
            });
            console.log('✅ [Automation] Price unchanged. Heartbeat updated.');
          } else {
            // Price changed, get yesterday's price for comparison
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

            // Send push notification
            try {
              const { triggerPushNotification } = await import('./lib/push');
              await triggerPushNotification(
                data.name,
                data.buyPrice,
                data.sellPrice,
                latestRecord ? latestRecord.buyPrice : data.buyPrice,
                latestRecord ? latestRecord.sellPrice : data.sellPrice,
                yesterdayPrice
              );
            } catch (pushError) {
              console.error('❌ [Automation] Failed to send push notification:', pushError);
            }

            // Price changed, insert new record
            const newRecord = await prisma.priceHistory.create({
              data: {
                name: data.name,
                buyPrice: data.buyPrice,
                sellPrice: data.sellPrice
              }
            });
            console.log('🎉 [Automation] Price changed. Recorded new entry:', newRecord);
          }
        } catch (err) {
          console.error('❌ [Automation] Background price tracking error:', err);
        }
      };

      // Run immediately on start (delayed by 5s)
      await trackPrice();

      // Schedule to run every 5 minutes (300,000 ms)
      const intervalMs = 5 * 60 * 1000;
      setInterval(trackPrice, intervalMs);
      console.log(`⏰ [Automation] Background gold price tracker scheduled every 5 minutes.`);
    }, 5000);
  }
}
