'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortfolioRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#portfolio');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Đang chuyển hướng sang Hũ vàng của bé Linh...
    </div>
  );
}
