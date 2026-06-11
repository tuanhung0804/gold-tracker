import webpush from 'web-push';
import prisma from './prisma';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:vutuanhung1997@gmail.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('⚠️ VAPID keys are missing. Push notifications cannot be sent.');
}

export async function triggerPushNotification(
  name: string,
  newBuy: number,
  newSell: number,
  lastBuy: number,
  lastSell: number,
  yesterdayPrice: number
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ Skipping push notifications due to missing VAPID keys.');
    return;
  }

  const diffBuy = newBuy - lastBuy;
  const diffSell = newSell - lastSell;
  const diffYest = newBuy - yesterdayPrice;

  const getTrendSymbol = (val: number) => {
    return val > 0 ? '🔺' : (val < 0 ? '🔻' : '➖');
  };

  const formatVnd = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const formatChange = (val: number) => {
    const formatted = Math.abs(val).toLocaleString('vi-VN') + ' đ';
    return val > 0 ? `+${formatted}` : val < 0 ? `-${formatted}` : '0 đ';
  };

  const formatChangeWithIndicator = (val: number) => {
    return `${getTrendSymbol(val)}${formatChange(val)}`;
  };

  const title = `Vàng Ngọc Của`;
  const body = `Mua vào: ${formatVnd(newBuy)} (${formatChangeWithIndicator(diffBuy)})\n` +
         `Bán ra: ${formatVnd(newSell)} (${formatChangeWithIndicator(diffSell)})\n` +
         `Chênh lệch: ${formatVnd(newSell - newBuy)}\n` +
         `Hôm qua: ${formatChangeWithIndicator(diffYest)}`;

  const payload = JSON.stringify({ title, body });

  try {
    const subscriptions = await prisma.pushSubscription.findMany();
    if (subscriptions.length === 0) {
      console.log('ℹ️ No active push subscriptions found.');
      return;
    }

    console.log(`📤 Dispatching push notifications to ${subscriptions.length} clients...`);

    const promises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        // If subscription is expired/invalid, delete it from the database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️ Deleting invalid/expired push subscription: ${sub.endpoint}`);
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch((dbErr) => {
            console.error('Failed to delete expired subscription:', dbErr);
          });
        } else {
          console.error(`❌ Error sending push notification to endpoint ${sub.endpoint}:`, error);
        }
      }
    });

    await Promise.all(promises);
    console.log('✅ Push notifications dispatch complete.');
  } catch (dbError) {
    console.error('❌ Failed to fetch subscriptions or dispatch notifications:', dbError);
  }
}
