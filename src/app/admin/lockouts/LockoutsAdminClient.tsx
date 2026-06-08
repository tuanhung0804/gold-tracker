'use client';

import { useState, useTransition } from 'react';
import { ShieldAlert, Unlock, Gift, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { unblockIp, updateGiftMessage } from '@/actions/admin';
import styles from './page.module.css';

interface RateLimitItem {
  id: string;
  ip: string;
  attempts: number;
  userAgent: string | null;
  isLocked: boolean;
  updatedAt: string;
}

interface LockoutsAdminClientProps {
  initialLockouts: RateLimitItem[];
  initialGiftMessage: string;
}

export default function LockoutsAdminClient({
  initialLockouts,
  initialGiftMessage
}: LockoutsAdminClientProps) {
  const [activeTab, setActiveTab] = useState<'lockouts' | 'gift'>('lockouts');
  const [lockouts, setLockouts] = useState<RateLimitItem[]>(initialLockouts);
  const [giftMessage, setGiftMessage] = useState(initialGiftMessage);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [isPending, startTransition] = useTransition();

  const handleUnblock = async (ip: string) => {
    startTransition(async () => {
      const res = await unblockIp(ip);
      if (res.success) {
        setLockouts(prev => prev.map(item => item.ip === ip ? { ...item, isLocked: false, attempts: 0 } : item));
      }
    });
  };

  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    startTransition(async () => {
      const res = await updateGiftMessage(giftMessage);
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'Cập nhật tin nhắn thành công!' });
      } else {
        setSaveStatus({ type: 'error', message: res.error || 'Có lỗi xảy ra khi cập nhật.' });
      }
    });
  };

  const lockedCount = lockouts.filter(l => l.isLocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tabs */}
      <div className={styles.tabContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'lockouts' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('lockouts');
            setSaveStatus(null);
          }}
        >
          <ShieldAlert size={18} />
          Quản lý IP khóa ({lockedCount})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'gift' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('gift');
            setSaveStatus(null);
          }}
        >
          <Gift size={18} />
          Tin nhắn hộp quà
        </button>
      </div>

      {activeTab === 'lockouts' ? (
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
                        <button
                          onClick={() => handleUnblock(item.ip)}
                          disabled={isPending}
                          className={styles.unlockBtn}
                        >
                          <Unlock size={14} /> Mở khóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={22} style={{ color: '#ff527b' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Cấu hình Tin nhắn Hộp Quà</h2>
          </div>

          <form onSubmit={handleSaveMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="gift-message" style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                Nội dung tin nhắn hiển thị khi click vào hộp quà ở trang đăng nhập:
              </label>
              <textarea
                id="gift-message"
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Nhập lời xin lỗi ngọt ngào..."
                disabled={isPending}
                className={styles.messageTextarea}
                rows={5}
                required
              />
            </div>

            {saveStatus && (
              <div className={saveStatus.type === 'success' ? styles.successAlert : styles.errorAlert}>
                {saveStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={styles.saveBtn}
            >
              <Save size={16} />
              {isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
