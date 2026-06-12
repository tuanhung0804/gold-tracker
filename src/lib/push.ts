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

async function sendSingleNotification(
  sub: { id: number; endpoint: string; p256dh: string; auth: string },
  payload: string,
  options: webpush.RequestOptions
) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, payload, options);
  } catch (error: any) {
    // If subscription is expired/invalid, delete it from the database
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`🗑️ Deleting invalid/expired push subscription: ${sub.endpoint}`);
      try {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
      } catch (dbErr) {
        console.error(`❌ Failed to delete expired subscription for ${sub.endpoint}:`, dbErr);
      }
    } else {
      console.error(`❌ Error sending push notification to endpoint ${sub.endpoint}:`, error);
    }
  }
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
    return val > 0 ? '▲' : (val < 0 ? '▼' : '➖');
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

    const options: webpush.RequestOptions = {
      headers: {
        'Urgency': 'high',
      },
      urgency: 'high',
      TTL: 86400, // 24 hours
    };

    const promises = subscriptions.map((sub) =>
      sendSingleNotification(sub, payload, options)
    );

    await Promise.allSettled(promises);
    console.log('✅ Push notifications dispatch complete.');
  } catch (dbError) {
    console.error('❌ Failed to fetch subscriptions or dispatch notifications:', dbError);
  }
}
