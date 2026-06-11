import { NextResponse } from 'next/server';
import { triggerPushNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'asymmetric') {
      // Send an asymmetric mock change notification
      await triggerPushNotification(
        'Nhẫn Trơn 9999',
        12490000, // newBuy
        12940000, // newSell
        12520000, // lastBuy (-30.000)
        12960000, // lastSell (-20.000 - discrepancy!)
        12850000  // yesterdayPrice (-360.000)
      );
      return NextResponse.json({ success: true, message: 'Mock asymmetric notification dispatched' });
    } else {
      // Send a symmetric mock change notification
      await triggerPushNotification(
        'Nhẫn Trơn 9999',
        12490000, // newBuy
        12940000, // newSell
        12520000, // lastBuy (-30.000)
        12970000, // lastSell (-30.000)
        12850000  // yesterdayPrice (-360.000)
      );
      return NextResponse.json({ success: true, message: 'Mock symmetric notification dispatched' });
    }
  } catch (error: any) {
    console.error('❌ Error sending mock push notification:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
