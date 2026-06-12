import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

export async function POST(request: Request) {
  // 1. Secure Route - Session Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  console.log('[Push Subscribe API] Received POST request.');
  console.log('[Push Subscribe API] Session cookie present:', !!sessionToken);
  
  const decoded = sessionToken ? await verifySessionToken(sessionToken) : null;
  console.log('[Push Subscribe API] Decoded session:', decoded);
  
  if (!decoded) {
    console.warn('[Push Subscribe API] Unauthorized request - no valid session token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscription, action } = body;
    console.log('[Push Subscribe API] Action:', action);
    console.log('[Push Subscribe API] Subscription details:', {
      endpoint: subscription?.endpoint,
      hasKeys: !!subscription?.keys,
      p256dhLength: subscription?.keys?.p256dh?.length,
      authLength: subscription?.keys?.auth?.length,
    });

    if (!subscription || !subscription.endpoint) {
      console.warn('[Push Subscribe API] Invalid subscription object');
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    if (action === 'unsubscribe') {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      });
      console.log('[Push Subscribe API] Unsubscribed successfully.');
      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
    }

    // Extract keys safely
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;

    if (!p256dh || !auth) {
      console.warn('[Push Subscribe API] Keys missing from subscription object');
      return NextResponse.json({ error: 'Keys missing from subscription' }, { status: 400 });
    }

    // Upsert subscription
    const result = await prisma.pushSubscription.upsert({
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
    console.log('[Push Subscribe API] Upserted subscription in DB:', result.id);

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error: any) {
    console.error('❌ [Push Subscribe API] Error in push subscription API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
