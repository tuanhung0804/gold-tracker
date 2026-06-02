import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PortfolioRedirectPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const decoded = session ? await verifySessionToken(session) : null;
  
  if (!decoded) {
    redirect('/login');
  }

  redirect('/price#portfolio');
}
