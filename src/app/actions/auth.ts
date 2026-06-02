'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { hashPin, createSessionToken } from '@/lib/session';

// Using constants for the raw PINs just to hash them on the fly 
// (In a real app, you would store ONLY the hashes in environment variables)
const USER_PIN = '0811';
const ADMIN_PIN = '8646';

export async function submitPin(pin: string) {
  let role: 'user' | 'admin' | null = null;
  try {
    const headersList = await headers(); // Next 15 headers() is async
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip';
    const userAgent = headersList.get('user-agent') || 'Unknown Device';

    // 1. Check Rate Limit
    let rateLimit = await prisma.rateLimit.findUnique({ where: { ip } });
    
    if (rateLimit?.isLocked) {
      return { error: 'Your device has been permanently locked due to too many failed attempts. Please contact the administrator.' };
    }

    // 2. Hash and verify
    const inputHash = await hashPin(pin);
    const expectedUserHash = await hashPin(USER_PIN);
    const expectedAdminHash = await hashPin(ADMIN_PIN);
    
    if (inputHash === expectedUserHash) {
      role = 'user';
    } else if (inputHash === expectedAdminHash) {
      role = 'admin';
    }

    // 3. Handle Failure
    if (!role) {
      if (!rateLimit) {
        rateLimit = await prisma.rateLimit.create({
          data: { ip, attempts: 1, userAgent }
        });
      } else {
        rateLimit = await prisma.rateLimit.update({
          where: { ip },
          data: { attempts: rateLimit.attempts + 1, userAgent }
        });
      }

      const attemptMessages: Record<number, string> = {
        1: "Em yêu thử lại lần nữa nhen 😘",
        2: "Hoi hông có giỡn nữa nhaaa 😌",
        3: "Nào nào, em mà quên là anh dỗi đó 🥺",
        4: "Gòi gòi, bé Linh chuẩn bị ăn đòn 😡",
        5: "Thì ra là em yêu muốn được tét mông 🤤"
      };

      const attempts = rateLimit.attempts;
      const errorMsg = attemptMessages[attempts] || `Incorrect PIN. (${attempts}/5)`;

      if (attempts >= 5) {
        await prisma.rateLimit.update({
          where: { ip },
          data: { isLocked: true }
        });
        return { error: errorMsg };
      }

      return { error: errorMsg };
    }

    // 4. Handle Success
    if (rateLimit) {
      // Reset attempts on successful login
      await prisma.rateLimit.update({
        where: { ip },
        data: { attempts: 0 }
      });
    }

    // Generate secure session cookie
    const token = await createSessionToken(role);
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred.' };
  }

  // Call redirect outside the try-catch block because redirect() throws a NEXT_REDIRECT error
  if (role === 'admin') {
    redirect('/admin/lockouts');
  } else if (role === 'user') {
    redirect('/');
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

