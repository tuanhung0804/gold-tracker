import prisma from '@/lib/prisma';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import LockoutsAdminClient from './LockoutsAdminClient';

export const dynamic = 'force-dynamic';

export default async function LockoutsAdminPage() {
  const lockouts = await prisma.rateLimit.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  const config = await prisma.systemConfig.findUnique({
    where: { key: 'gift_message' }
  });
  const giftMessage = config?.value || "Anh xin lỗi bé nhiều nhiều. Em yêu mau hết cáu anh nha. Anh yêu em nhiều ❤️";

  return (
    <div className={styles.container}>
      
      <div className={`glass-card ${styles.headerCard}`}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className={`heading-gradient ${styles.title}`}>Quản trị viên</h1>
            <p className={styles.subtitle}>Quản lý truy cập và các cấu hình hệ thống</p>
          </div>
        </div>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>

      <LockoutsAdminClient initialLockouts={lockouts} initialGiftMessage={giftMessage} />

    </div>
  );
}

