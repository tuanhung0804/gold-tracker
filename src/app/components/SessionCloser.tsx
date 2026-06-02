'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export default function SessionCloser() {
  const router = useRouter();

  useEffect(() => {
    const performSessionCleanup = async () => {
      // Access window.location.pathname directly in client-side useEffect
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        // Retrieve navigation timing to check if this was a page refresh
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const isReload = (navigation && navigation.type === 'reload') || 
                         (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

        // Reload only if browser says reload AND JS memory context was reset (no soft navigation flag)
        const isRealReload = isReload && !(window as any).__isSoftNavigation;

        if (isRealReload) {
          console.log('[SessionCloser] Page refresh detected on protected page. Wiping session...');
          await logout();
          router.replace('/login');
        }
      }

      // Mark that client context is active so soft navigations bypass reload check
      (window as any).__isSoftNavigation = true;
    };
    performSessionCleanup();
  }, [router]); // Include router in dependencies to satisfy hooks lint rule

  return null;
}
