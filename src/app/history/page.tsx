'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#history');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Đang chuyển hướng sang Lịch sử giá...
    </div>
  );
}
