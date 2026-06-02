'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitPin } from '@/app/actions/auth';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      setError('');
      setPin(val);
    }
  };

  const handleSubmit = () => {
    if (pin.length !== 4 || isPending) return;
    
    startTransition(async () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justLoggedIn', 'true');
      }
      const res = await submitPin(pin);
      if (res && res.error) {
        setError(res.error);
        setPin(''); // Reset PIN on error
        if (inputRef.current) inputRef.current.focus();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('justLoggedIn');
        }
      } else if (res && res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pin_verified', 'true');
        }
        if (res.role === 'admin') {
          router.push('/admin/lockouts');
        } else {
          router.push('/price');
        }
      }
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={`heading-gradient ${styles.siteTitle}`}>Sổ vàng của bé Linh</h1>
      <div className={`glass-card ${styles.loginCard}`}>
        <div>
          <div className={styles.iconWrapper}>
            <Lock size={32} />
          </div>
          <h1 className={`page-title heading-gradient ${styles.title}`}>
            Xác thực bé Linh <br /> của anh Hưng
          </h1>
          <p className={styles.subtitle}>Em biết nhập ngày gì rồi đó, nhập sai 5 lần thì em báo anh nhen</p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <p>{error}</p>
          </div>
        )}

        <div className={styles.pinContainer}>
          <input 
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={handleChange}
            disabled={isPending}
            className={styles.hiddenInput}
            autoComplete="off"
            autoFocus
          />
          {[0, 1, 2, 3].map((i) => {
            const isCurrent = pin.length === i;
            const isFilled = pin.length > i;
            
            let boxClass = styles.pinBox;
            if (isCurrent) boxClass += ` ${styles.pinBoxActive}`;
            else if (isFilled) boxClass += ` ${styles.pinBoxFilled}`;
            
            return (
              <div key={i} className={boxClass}>
                {isFilled ? (
                  <div className={styles.dot}></div>
                ) : (
                  isCurrent && <div className={styles.cursor}></div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.loadingBox}>
          {isPending && (
            <>
              <Loader2 className={styles.spin} size={20} />
              <span>Đang kiểm tra...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
