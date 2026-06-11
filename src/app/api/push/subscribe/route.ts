import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

export async function POST(request: Request) {
  // 1. Secure Route - Session Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const decoded = sessionToken ? await verifySessionToken(sessionToken) : null;
  
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscription, action } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    if (action === 'unsubscribe') {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      });
      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
    }

    // Extract keys safely
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Keys missing from subscription' }, { status: 400 });
    }

    // Upsert subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh,
        auth,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error: any) {
    console.error('❌ Error in push subscription API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
