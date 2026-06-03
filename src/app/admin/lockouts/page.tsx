import prisma from '@/lib/prisma';
import { ShieldCheck, ShieldAlert, Unlock, ArrowLeft } from 'lucide-react';
import { unblockIp } from '@/actions/admin';
import Link from 'next/link';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function LockoutsAdminPage() {
  const lockouts = await prisma.rateLimit.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  const lockedCount = lockouts.filter(l => l.isLocked).length;

  return (
    <div className={styles.container}>
      
      <div className={`glass-card ${styles.headerCard}`}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className={`heading-gradient ${styles.title}`}>Quản trị viên</h1>
            <p className={styles.subtitle}>Quản lý truy cập và các IP bị khóa</p>
          </div>
        </div>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            <ShieldAlert className="text-red-500" size={20} style={{ color: 'var(--danger)' }} /> Danh sách IP truy cập
          </h2>
          <span className={styles.lockedBadge}>
            {lockedCount} bị khóa
          </span>
        </div>
        
        <div className={styles.tableWrapper}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Thiết bị (User-Agent)</th>
                <th>Số lần thử</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {lockouts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có dữ liệu truy cập nào.
                  </td>
                </tr>
              ) : lockouts.map((item) => (
                <tr key={item.id}>
                  <td className={styles.ipCell}>{item.ip}</td>
                  <td className={styles.userAgentCell} title={item.userAgent || ''}>
                    {item.userAgent || 'Không rõ'}
                  </td>
                  <td className="font-numbers" style={{ fontWeight: 600 }}>{item.attempts}</td>
                  <td>
                    {item.isLocked ? (
                      <span className="badge badge-danger">
                        <span className={styles.statusIndicator}>
                          <span className={`${styles.dot} ${styles.dotLocked}`}></span>
                          Bị khóa
                        </span>
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        <span className={styles.statusIndicator}>
                          <span className={`${styles.dot} ${styles.dotSafe}`}></span>
                          An toàn
                        </span>
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 12px' }}>
                    {item.isLocked && (
                      <form action={async () => {
                        'use server';
                        await unblockIp(item.ip);
                      }} style={{ display: 'inline-block' }}>
                        <button type="submit" className={styles.unlockBtn}>
                          <Unlock size={14} /> Mở khóa
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

