import 'dotenv/config';
import { triggerPushNotification } from '../src/lib/push';

async function main() {
  console.log('Sending live test push notification...');
  await triggerPushNotification(
    'Nhẫn Trơn 9999',
    12490000, // newBuy
    12940000, // newSell
    12520000, // lastBuy
    12970000, // lastSell
    12850000  // yesterdayPrice
  );
  console.log('Done!');
}

main().catch(console.error);
