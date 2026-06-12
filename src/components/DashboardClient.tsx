'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Flower, Bell } from 'lucide-react';
import { format } from 'date-fns';

interface GiaVangPriceInfo {
  name: string;
  buyPrice: number;
  sellPrice: number;
  alterBuy: number;
  alterSell: number;
  yesterdayBuy: number;
  yesterdaySell: number;
}

interface LivePrice {
  name: string;
  buyPrice: number;
  sellPrice: number;
  sjcRing: GiaVangPriceInfo | null;
  worldGold: GiaVangPriceInfo | null;
}

interface PortfolioItem {
  id: number;
  buyDate: string | Date;
  quantity: number;
  buyPrice: number;
  status: string;
}

interface PriceHistoryItem {
  id: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardClientProps {
  initialLivePrice: LivePrice | null;
  initialPortfolio: PortfolioItem[];
}

export default function DashboardClient({ initialLivePrice, initialPortfolio }: DashboardClientProps) {
  const [livePrice, setLivePrice] = useState<LivePrice | null>(initialLivePrice);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pollingError, setPollingError] = useState(false);
  const [rawHistory, setRawHistory] = useState<PriceHistoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [showNotificationBell, setShowNotificationBell] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Register sw and check subscription on client side
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setShowNotificationBell(true);
      
      const checkSubscription = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js?v=2');
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (err) {
          console.error('Error checking push subscription:', err);
        }
      };

      checkSubscription();
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
    if (!buffer) return '';
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const waitForActive = (reg: ServiceWorkerRegistration) => {
    if (reg.active) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Timeout waiting for service worker to activate');
        resolve();
      }, 3000);
      
      const worker = reg.installing || reg.waiting;
      if (worker) {
        worker.addEventListener('statechange', (e: any) => {
          if (e.target.state === 'activated') {
            clearTimeout(timeout);
            resolve();
          }
        });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  };

  const handleBellClick = async () => {
    if (isPushLoading) return;
    setIsPushLoading(true);
    
    try {
      if (isSubscribed) {
        await unsubscribeUser();
      } else {
        await subscribeUser();
      }
    } catch (err) {
      console.error('Push registration error:', err);
      alert('Có lỗi xảy ra khi thiết lập thông báo.');
    } finally {
      setIsPushLoading(false);
    }
  };

  const subscribeUser = async () => {
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    if (permission !== 'granted') {
      alert('Bạn cần cấp quyền thông báo để nhận cập nhật giá vàng.');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js?v=2');
    await waitForActive(registration);

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key is missing on the client.');
      alert('Không tìm thấy mã VAPID public key trên client.');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      }
    };

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription: subscriptionData, action: 'subscribe' }),
    });

    if (response.ok) {
      setIsSubscribed(true);
      alert('Đăng ký nhận thông báo giá vàng thành công! 🎉');
    } else {
      throw new Error('Subscription API returned error');
    }
  };

  const unsubscribeUser = async () => {
    const registration = await navigator.serviceWorker.register('/sw.js?v=2');
    await waitForActive(registration);
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: '',
          auth: ''
        }
      };

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: subscriptionData, action: 'unsubscribe' }),
      });
    }

    setIsSubscribed(false);
    alert('Đã hủy nhận thông báo giá vàng.');
  };

  // Poll live price every 60 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/gold-price?refresh=${Math.random()}`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        if (data && data.buyPrice && data.sellPrice) {
          setLivePrice(data);
          setLastUpdated(new Date());
          setPollingError(false);
        }
      } catch (err) {
        console.error('Error polling live gold price:', err);
        setPollingError(true);
      }
    }, 60 * 1000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fetch history to calculate daily change
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const json = await res.json();
          setRawHistory(json);
        }
      } catch (err) {
        console.error('Error fetching history for dashboard:', err);
      }
    }
    fetchHistory();
  }, []);

  // Client-side fallback for SJC and World Gold to bypass Cloud Run IP blocking
  useEffect(() => {
    if (livePrice && (!livePrice.sjcRing || !livePrice.worldGold)) {
      async function fetchFallback() {
        try {
          const res = await fetch('https://api2.giavang.net/v1/gold/last-price');
          if (res.ok) {
            const json = await res.json();
            if (json && json.data && Array.isArray(json.data)) {
              const sjcData = json.data.find((item: any) => item.type_code === 'SJ9999');
              const worldData = json.data.find((item: any) => item.type_code === 'XAUUSD');
              
              setLivePrice(prev => {
                if (!prev) return prev;

                const sjcYesterdayBuy = sjcData ? ((Number(sjcData.yesterday_buy) || (Number(sjcData.buy) - Number(sjcData.alter_buy))) / 10) : 0;
                const sjcYesterdaySell = sjcData ? ((Number(sjcData.yesterday_sell) || (Number(sjcData.sell) - Number(sjcData.alter_sell))) / 10) : 0;
                const sjcBuy = sjcData ? (Number(sjcData.buy) / 10) : 0;
                const sjcSell = sjcData ? (Number(sjcData.sell) / 10) : 0;

                const worldYesterdayBuy = worldData ? (Number(worldData.yesterday_buy) || (Number(worldData.buy) - Number(worldData.alter_buy))) : 0;
                const worldYesterdaySell = worldData ? Number(worldData.yesterday_sell || 0) : 0;
                const worldBuy = worldData ? Number(worldData.buy) : 0;
                const worldSell = worldData ? Number(worldData.sell || 0) : 0;

                return {
                  ...prev,
                  sjcRing: prev.sjcRing || (sjcData ? {
                    name: "Vàng nhẫn SJC 99.99%",
                    buyPrice: sjcBuy,
                    sellPrice: sjcSell,
                    alterBuy: sjcBuy - sjcYesterdayBuy,
                    alterSell: sjcSell - sjcYesterdaySell,
                    yesterdayBuy: sjcYesterdayBuy,
                    yesterdaySell: sjcYesterdaySell
                  } : null),
                  worldGold: prev.worldGold || (worldData ? {
                    name: "Vàng thế giới",
                    buyPrice: worldBuy,
                    sellPrice: worldSell,
                    alterBuy: worldBuy - worldYesterdayBuy,
                    alterSell: worldSell > 0 && worldYesterdaySell > 0 ? worldSell - worldYesterdaySell : 0,
                    yesterdayBuy: worldYesterdayBuy,
                    yesterdaySell: worldYesterdaySell
                  } : null)
                };
              });
            }
          }
        } catch (err) {
          console.error('Fallback fetch failed:', err);
        }
      }
      fetchFallback();
    }
  }, [livePrice?.sjcRing, livePrice?.worldGold]);

  // Calculate stats based on current live price
  const totalQuantity = initialPortfolio.reduce((acc, item) => acc + item.quantity, 0);
  const totalInvested = initialPortfolio.reduce((acc, item) => acc + (item.quantity * item.buyPrice), 0);
  
  const currentBuyPrice = livePrice ? livePrice.buyPrice : 0;
  
  // Value we would get if we sell gold back to the shop (currentBuyPrice)
  const currentValue = totalQuantity * currentBuyPrice;
  const profitLoss = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Helper to get previous close price (latest record from yesterday or earlier)
  const getPreviousClosePrice = () => {
    const ngocCuaHistory = rawHistory.filter(item => item.name === 'Nhẫn Trơn 9999' || item.name === (livePrice?.name || 'Nhẫn Trơn 9999'));
    if (ngocCuaHistory.length === 0) return initialLivePrice ? initialLivePrice.buyPrice : 0;
    
    const getGmt7DateString = (date: Date) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    };

    const todayStr = getGmt7DateString(new Date());
    const historyBeforeToday = ngocCuaHistory.filter(item => {
      const itemDate = getGmt7DateString(new Date(item.createdAt));
      return itemDate < todayStr;
    });
    
    if (historyBeforeToday.length > 0) {
      // Last item is the latest before today
      return historyBeforeToday[historyBeforeToday.length - 1].buyPrice;
    }
    
    return ngocCuaHistory[0].buyPrice;
  };

  const prevClose = getPreviousClosePrice();
  const absoluteChange = currentBuyPrice - prevClose;

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-gradient page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flower size={32} style={{ color: 'var(--gold-primary)', filter: 'drop-shadow(0 0 6px var(--gold-glow))' }} />
            Giá vàng hôm nay
            {showNotificationBell && (
              <button 
                onClick={handleBellClick}
                disabled={isPushLoading}
                style={{
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSubscribed ? 'var(--gold-primary)' : 'var(--text-secondary)',
                  filter: isSubscribed ? 'drop-shadow(0 0 6px var(--gold-glow))' : 'none',
                  transition: 'all 0.3s ease',
                  marginLeft: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.3)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                  width: '36px',
                  height: '36px'
                }}
                title={isSubscribed ? "Hủy đăng ký nhận thông báo" : "Đăng ký nhận thông báo khi giá vàng thay đổi"}
              >
                <Bell size={20} className={isPushLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>"Vàng lên thì vui vì tài sản tăng giá. Vàng xuống thì vui vì được mua thêm vàng." - Tuấn Hưng</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.5)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: pollingError ? 'var(--danger)' : 'var(--success)',
            boxShadow: pollingError ? '0 0 8px var(--danger)' : '0 0 8px var(--success)',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {pollingError ? 'Mất kết nối' : `Tự động cập nhật trực tiếp (cập nhật lúc ${isClient ? lastUpdated.toLocaleTimeString() : ''})`}
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>

      <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
        {/* Card 1: Live Price Card (Ngoc Cua) */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--gold-glow)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
              <img src="/ngoc-cua-logo.png" alt="Ngọc Của Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              {(livePrice?.name === 'Nhẫn Trơn 9999' || !livePrice?.name) ? 'Nhẫn trơn 9999 Ngọc Của' : `${livePrice.name} Ngọc Của`}
            </h2>
          </div>
          
          {livePrice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Dòng 1: Giá mua vào và Giá bán ra */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá mua vào</p>
                  <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatMoney(livePrice.buyPrice)}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá bán ra</p>
                  <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatMoney(livePrice.sellPrice)}
                  </p>
                </div>
              </div>
              
              <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
              
              {/* Dòng 2: Chênh lệch và Thay đổi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Chênh lệch</p>
                  <p className="font-numbers" style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold-dark)' }}>
                    {formatMoney(livePrice.sellPrice - livePrice.buyPrice)}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Thay đổi</p>
                  <p className="font-numbers" style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 700, 
                    color: absoluteChange >= 0 ? 'var(--success)' : 'var(--danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'flex-end'
                  }}>
                    {absoluteChange >= 0 ? '+' : ''}{formatMoney(absoluteChange)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      ({(prevClose > 0 ? (absoluteChange / prevClose) * 100 : 0).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--danger)' }}>Không thể tải giá trực tiếp.</p>
          )}
        </div>

        {/* Card 2: Vàng Nhẫn SJC 99.99% */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--gold-glow)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
              <img src="/sjc-logo.png" alt="SJC Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Vàng nhẫn SJC 99.99%
            </h2>
          </div>
          
          {livePrice?.sjcRing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Dòng 1: Giá mua vào và Giá bán ra */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá mua vào</p>
                  <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {formatMoney(livePrice.sjcRing.buyPrice)}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá bán ra</p>
                  <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatMoney(livePrice.sjcRing.sellPrice)}
                  </p>
                </div>
              </div>
              
              <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
              
              {/* Dòng 2: Chênh lệch và Thay đổi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Chênh lệch</p>
                  <p className="font-numbers" style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold-dark)' }}>
                    {formatMoney(livePrice.sjcRing.sellPrice - livePrice.sjcRing.buyPrice)}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Thay đổi</p>
                  <p className="font-numbers" style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 700, 
                    color: livePrice.sjcRing.alterBuy >= 0 ? 'var(--success)' : 'var(--danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'flex-end',
                    whiteSpace: 'nowrap'
                  }}>
                    {livePrice.sjcRing.alterBuy >= 0 ? '+' : ''}{formatMoney(livePrice.sjcRing.alterBuy)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      ({(livePrice.sjcRing.yesterdayBuy > 0 ? (livePrice.sjcRing.alterBuy / livePrice.sjcRing.yesterdayBuy) * 100 : 0).toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Đang tải giá nhẫn SJC...</p>
          )}
        </div>

        {/* Card 3: Vàng thế giới */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--gold-glow)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
              <img src="/world-logo.png" alt="World Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Vàng thế giới (XAUUSD)
            </h2>
          </div>
          
          {livePrice?.worldGold ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Dòng 1: Giá hiện tại và đơn vị */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá hiện tại</p>
                  <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {livePrice.worldGold.buyPrice.toLocaleString('vi-VN')} USD/oz
                  </p>
                </div>
              </div>
              
              <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
              
              {/* Dòng 2: Giá hôm qua và Thay đổi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá hôm qua</p>
                  <p className="font-numbers" style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--gold-dark)' }}>
                    {livePrice.worldGold.yesterdayBuy.toLocaleString('vi-VN')} USD
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Thay đổi</p>
                  <p className="font-numbers" style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 700, 
                    color: livePrice.worldGold.alterBuy >= 0 ? 'var(--success)' : 'var(--danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'flex-end',
                    whiteSpace: 'nowrap'
                  }}>
                    {livePrice.worldGold.alterBuy >= 0 ? '+' : ''}{livePrice.worldGold.alterBuy.toLocaleString('vi-VN')} USD
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      ({(livePrice.worldGold.yesterdayBuy > 0 ? (livePrice.worldGold.alterBuy / livePrice.worldGold.yesterdayBuy) * 100 : 0).toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Đang tải giá thế giới...</p>
          )}
        </div>


      </div>
    </div>
  );
}
