'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return false;
  
  const session = await verifySessionToken(sessionCookie);
  return session?.role === 'admin';
}

export async function unblockIp(ip: string) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { error: 'Unauthorized' };
  }

  try {
    await prisma.rateLimit.update({
      where: { ip },
      data: { isLocked: false, attempts: 0 }
    });
    revalidatePath('/admin/lockouts');
    return { success: true };
  } catch (error) {
    console.error('Failed to unblock IP:', error);
    return { error: 'Database error' };
  }
}
