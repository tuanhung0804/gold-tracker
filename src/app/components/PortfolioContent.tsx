'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Award, CheckCircle, Flower } from 'lucide-react';
import { format } from 'date-fns';

interface PortfolioItem {
  id: number;
  buyDate: string;
  quantity: number;
  buyPrice: number;
  status: 'Đang giữ' | 'Đã bán';
  sellPrice: number | null;
  updatedAt: string;
}

interface PriceHistoryItem {
  id: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  createdAt: string;
  updatedAt: string;
}

export default function PortfolioContent() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'holding' | 'sold'>('holding');
  
  // Live market price to calculate live P/L in the holding list
  const [liveBuyPrice, setLiveBuyPrice] = useState<number>(0);

  // Form State
  const [buyDate, setBuyDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | null }>({ message: '', type: null });
  const [showBuyModal, setShowBuyModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'danger') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3500);
  };

  const fetchLivePrice = async () => {
    try {
      const res = await fetch(`/api/gold-price?refresh=${Math.random()}`);
      if (res.ok) {
        const data = await res.json();
        setLiveBuyPrice(data.buyPrice || 0);
      }
    } catch (err) {
      console.error('Error fetching live price for portfolio:', err);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      showToast('Không thể tải lịch sử giao dịch danh mục.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data);
      }
    } catch (err) {
      console.error('Error fetching price history for portfolio form:', err);
    }
  };

  useEffect(() => {
    setBuyDate(format(new Date(), 'yyyy-MM-dd'));
    const timer = setTimeout(() => {
      fetchPortfolio();
      fetchLivePrice();
      fetchHistory();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyDate || !quantity || !buyPrice) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyDate,
          quantity: parseFloat(quantity),
          buyPrice: parseFloat(buyPrice),
          status: 'Đang giữ'
        })
      });

      if (!res.ok) throw new Error('Failed to create transaction');

      setQuantity('');
      setBuyPrice('');
      fetchPortfolio();
      showToast('Ghi nhận giao dịch mua vàng thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi ghi nhận giao dịch mua vàng. Vui lòng thử lại.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch sử giao dịch này không?')) return;
    
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');
      
      fetchPortfolio();
      showToast('Xóa giao dịch thành công.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa giao dịch.', 'danger');
    }
  };

  const handleSell = async (id: number, quantityVal: number, initialBuyPrice: number) => {
    // Propose current live shop buyPrice as default sell price suggestion
    const defaultSellPrice = liveBuyPrice > 0 ? String(liveBuyPrice) : '';
    const priceInput = prompt(
      `Bán ${quantityVal} chỉ vàng.\nNhập giá bán mỗi chỉ (giá bán/chỉ):`, 
      defaultSellPrice
    );
    
    if (priceInput === null) return; // cancelled
    
    const sellPrice = parseFloat(priceInput);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      showToast('Vui lòng nhập giá bán hợp lệ.', 'danger');
      return;
    }

    try {
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status: 'Đã bán', 
          sellPrice 
        })
      });

      if (!res.ok) throw new Error('Failed to update status');

      fetchPortfolio();
      const profit = (sellPrice - initialBuyPrice) * quantityVal;
      const profitFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(profit);
      showToast(`Đã bán! Lợi nhuận thực tế: ${profitFormatted}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi cập nhật giao dịch bán.', 'danger');
    }
  };

  // Format with standard VND keeping 3 zeros at the end
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Get unique sellPrice values recorded on the selected buyDate
  const getSellPricesForSelectedDate = () => {
    if (!buyDate) return [];
    const matches = priceHistory.filter(item => {
      const itemDate = format(new Date(item.createdAt), 'yyyy-MM-dd');
      return itemDate === buyDate;
    });
    const prices = matches.map(item => item.sellPrice);
    return Array.from(new Set(prices));
  };

  // Filter items
  const activeHoldings = items.filter(item => item.status === 'Đang giữ');
  const soldHistory = items.filter(item => item.status === 'Đã bán');

  // Calculate stats based on current live price
  const totalQuantity = activeHoldings.reduce((acc, item) => acc + item.quantity, 0);
  const totalInvested = activeHoldings.reduce((acc, item) => acc + (item.quantity * item.buyPrice), 0);
  
  const currentValue = totalQuantity * liveBuyPrice;
  const profitLoss = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  // Calculate weighted average holding time in years for active holdings
  const totalHoldingTimeYears = activeHoldings.reduce((acc, item) => {
    const ageMs = new Date().getTime() - new Date(item.buyDate).getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    return acc + (ageYears * item.quantity);
  }, 0);
  const weightedHoldingTimeYears = totalQuantity > 0 ? totalHoldingTimeYears / totalQuantity : 0;
  
  // Calculate weighted average buy price
  const weightedBuyPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-gradient page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flower size={32} style={{ color: 'var(--gold-primary)', filter: 'drop-shadow(0 0 6px var(--gold-glow))' }} />
            Hũ vàng của bé Linh
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"Vì một cuộc sống đếm vàng xả stress." - bé Linh</p>
        </div>
        <button 
          onClick={() => setShowBuyModal(true)} 
          className="btn btn-primary"
          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '24px', padding: '12px 24px' }}
        >
          <Plus size={20} /> Ghi nhận hốt vàng
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Portfolio Summary Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--gold-glow)', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/gold-pot-icon.png" alt="Hũ vàng" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Trị giá hũ vàng
            </h2>
          </div>
          
          <div className="portfolio-summary-grid">
            <div className="summary-item-qty">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', whiteSpace: 'nowrap' }}>Số chỉ vàng</p>
              <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{totalQuantity} chỉ</p>
            </div>
            <div className="summary-item-holding">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', whiteSpace: 'nowrap' }}>Đã ôm vàng</p>
              <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{weightedHoldingTimeYears.toFixed(1)} năm</p>
            </div>
            <div className="summary-item-value">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Giá trị hiện tại</p>
              <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatMoney(currentValue)}</p>
            </div>
            <div className="summary-item-profit">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tổng lãi / lỗ</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <p className="font-numbers" style={{ fontSize: '1.5rem', fontWeight: 700, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                  {formatMoney(profitLoss)}
                </p>
                <span className={`badge ${isProfit ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
                  {isProfit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {roi.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Transactions Listing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Glassmorphic Tabs Selector */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.4)', padding: '4px', borderRadius: '24px', alignSelf: 'flex-start', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <button
              onClick={() => setActiveTab('holding')}
              className="btn"
              style={{
                padding: '8px 20px',
                fontSize: '0.9rem',
                borderRadius: '20px',
                background: activeTab === 'holding' ? 'var(--gold-primary)' : 'transparent',
                color: activeTab === 'holding' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: activeTab === 'holding' ? '0 4px 10px var(--gold-glow)' : 'none',
                transition: 'all 0.2s ease',
                fontWeight: activeTab === 'holding' ? 600 : 500
              }}
            >
              Đang ôm
            </button>
            <button
              onClick={() => setActiveTab('sold')}
              className="btn"
              style={{
                padding: '8px 20px',
                fontSize: '0.9rem',
                borderRadius: '20px',
                background: activeTab === 'sold' ? 'var(--gold-primary)' : 'transparent',
                color: activeTab === 'sold' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: activeTab === 'sold' ? '0 4px 10px var(--gold-glow)' : 'none',
                transition: 'all 0.2s ease',
                fontWeight: activeTab === 'sold' ? 600 : 500
              }}
            >
              Đã chốt
            </button>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', minHeight: '300px', padding: '12px 16px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Đang tải lịch sử giao dịch...</p>
            ) : activeTab === 'holding' ? (
              /* TAB 1: ACTIVE HOLDINGS */
              activeHoldings.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Không có khoản đầu tư vàng nào đang hoạt động. Hãy mua vàng để bắt đầu.</p>
              ) : (
                <div className="scrollable-table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>Ngày hốt</th>
                        <th style={{ textAlign: 'center' }}>Số chỉ</th>
                        <th style={{ textAlign: 'center' }}>Lãi/lỗ</th>
                        <th style={{ textAlign: 'center' }}>Giá hốt</th>
                        <th style={{ textAlign: 'center' }}>Giá thị trường</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHoldings.map(item => {
                        // Calculate active metrics
                        const currentVal = item.quantity * liveBuyPrice;
                        const costVal = item.quantity * item.buyPrice;
                        const profitLoss = liveBuyPrice > 0 ? currentVal - costVal : 0;
                        const roi = liveBuyPrice > 0 && costVal > 0 ? (profitLoss / costVal) * 100 : 0;
                        const isProfit = profitLoss >= 0;

                        return (
                          <tr key={item.id}>
                            <td className="font-numbers">{format(new Date(item.buyDate), 'dd/MM/yyyy')}</td>
                            <td className="font-numbers" style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>
                              {liveBuyPrice > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', textAlign: 'right' }}>
                                  <span className="font-numbers" style={{ color: isProfit ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(profitLoss)}</span>
                                  <span className={`badge ${isProfit ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 6px', fontSize: '0.75rem' }}>
                                    {isProfit ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                    {roi.toFixed(1)}%
                                  </span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="font-numbers" style={{ textAlign: 'right' }}>{formatMoney(item.buyPrice)}</td>
                            <td className="font-numbers" style={{ textAlign: 'right' }}>
                              {liveBuyPrice > 0 ? formatMoney(liveBuyPrice) : 'Đang tải...'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleSell(item.id, item.quantity, item.buyPrice)}
                                  className="btn"
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    borderRadius: '20px',
                                    background: 'rgba(76, 175, 80, 0.12)',
                                    color: 'var(--success)',
                                    border: '1px solid rgba(76, 175, 80, 0.3)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Bán
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)} 
                                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', padding: '6px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Summary Row */}
                      <tr className="summary-row" style={{ borderTop: '2px dashed var(--gold-primary)', fontWeight: 'bold', background: 'rgba(255, 215, 0, 0.04)' }}>
                        <td>Ôm {weightedHoldingTimeYears.toFixed(1)} năm</td>
                        <td className="font-numbers" style={{ textAlign: 'center' }}>{totalQuantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {liveBuyPrice > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', textAlign: 'right' }}>
                              <span className="font-numbers" style={{ color: isProfit ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(profitLoss)}</span>
                              <span className={`badge ${isProfit ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 6px', fontSize: '0.75rem' }}>
                                {isProfit ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {roi.toFixed(1)}%
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="font-numbers" style={{ textAlign: 'right' }}>{formatMoney(weightedBuyPrice)}</td>
                        <td className="font-numbers" style={{ textAlign: 'right' }}>
                          {liveBuyPrice > 0 ? formatMoney(liveBuyPrice) : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TAB 2: SOLD TRANSACTIONS HISTORY */
              soldHistory.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Chưa có giao dịch bán nào được ghi nhận.</p>
              ) : (
                <div className="scrollable-table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>Ngày hốt</th>
                        <th style={{ textAlign: 'center' }}>Ngày chốt</th>
                        <th style={{ textAlign: 'center' }}>Số chỉ</th>
                        <th style={{ textAlign: 'center' }}>Giá hốt</th>
                        <th style={{ textAlign: 'center' }}>Giá chốt</th>
                        <th style={{ textAlign: 'center' }}>Lợi nhuận thực tế</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soldHistory.map(item => {
                        const sellPriceVal = item.sellPrice || 0;
                        const costVal = item.quantity * item.buyPrice;
                        const sellVal = item.quantity * sellPriceVal;
                        const realizedProfit = sellVal - costVal;
                        const realizedRoi = costVal > 0 ? (realizedProfit / costVal) * 100 : 0;
                        const isProfit = realizedProfit >= 0;

                        return (
                          <tr key={item.id}>
                            <td className="font-numbers">{format(new Date(item.buyDate), 'dd/MM/yyyy')}</td>
                            <td className="font-numbers">{format(new Date(item.updatedAt), 'dd/MM/yyyy')}</td>
                            <td className="font-numbers" style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td className="font-numbers" style={{ textAlign: 'right' }}>{formatMoney(item.buyPrice)}</td>
                            <td className="font-numbers" style={{ color: 'var(--gold-dark)', textAlign: 'right' }}>{formatMoney(sellPriceVal)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', textAlign: 'right' }}>
                                <span className="font-numbers" style={{ color: isProfit ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(realizedProfit)}</span>
                                <span className={`badge ${isProfit ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 6px', fontSize: '0.75rem' }}>
                                  {isProfit ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                  {realizedRoi.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDelete(item.id)} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', padding: '6px' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {showBuyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(74, 21, 37, 0.15)', // Super dream-like rose tint
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '480px',
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(255, 124, 149, 0.35)',
            boxShadow: '0 20px 50px rgba(216, 75, 100, 0.12)',
            animation: 'scaleUp 0.3s ease-out forwards',
            borderRadius: '24px'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => setShowBuyModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255, 124, 149, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              &times;
            </button>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-dark)' }}>
              <Flower size={22} style={{ color: 'var(--gold-primary)' }} /> Ghi nhận hốt vàng
            </h2>

            <form onSubmit={async (e) => {
              await handleBuy(e);
              setShowBuyModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ngày hốt</label>
                <input 
                  type="date" 
                  className="input-field font-numbers" 
                  value={buyDate} 
                  onChange={e => setBuyDate(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Số chỉ (phân lượng)</label>
                <input 
                  type="number" 
                  step="any" 
                  className="input-field font-numbers" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  required 
                  placeholder="Ví dụ: 5" 
                  min="0.001" 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Giá hốt (VND/chỉ)</label>
                <input 
                  type="number" 
                  className="input-field font-numbers" 
                  value={buyPrice} 
                  onChange={e => setBuyPrice(e.target.value)} 
                  required 
                  placeholder="Ví dụ: 14680000" 
                  min="1"
                  list="sell-prices-list"
                />
                <datalist id="sell-prices-list">
                  {getSellPricesForSelectedDate().map(price => (
                    <option key={price} value={price}>{formatMoney(price)}</option>
                  ))}
                </datalist>
                
                {/* Pill suggestions for ease of use */}
                {getSellPricesForSelectedDate().length > 0 && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Giá bán ra ghi nhận trong ngày này:</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {getSellPricesForSelectedDate().map(price => (
                        <button
                          key={price}
                          type="button"
                          onClick={() => setBuyPrice(String(price))}
                          className="font-numbers"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '12px',
                            background: buyPrice === String(price) ? 'var(--gold-primary)' : 'rgba(255, 124, 149, 0.08)',
                            color: buyPrice === String(price) ? '#fff' : 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            fontWeight: 600
                          }}
                        >
                          {formatMoney(price)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', fontWeight: 600, padding: '12px', borderRadius: '24px' }} disabled={isSubmitting}>
                <Plus size={18} /> {isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận hốt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Luxury Sakura Toast Notifications */}
      {toast.message && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          border: toast.type === 'success' ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(244, 67, 54, 0.4)',
          borderRadius: '16px',
          padding: '16px 24px',
          boxShadow: '0 10px 30px rgba(216, 75, 100, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(10px)',
          animation: 'slideIn 0.3s ease-out forwards',
          color: 'var(--text-primary)',
          maxWidth: '400px'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
          ) : (
            <Award size={20} style={{ color: 'var(--danger)' }} />
          )}
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
