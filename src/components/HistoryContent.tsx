'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Bar, ComposedChart, Cell } from 'recharts';
import { Flower } from 'lucide-react';

interface PriceHistoryItem {
  id: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  createdAt: string;
  updatedAt: string;
}

const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

// Custom tooltips
const CandlestickTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 124, 149, 0.35)', borderRadius: '16px', padding: '12px 16px', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-card)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>{data.dateFormatted}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Mở cửa (open):</span>
            <span className="font-numbers" style={{ fontWeight: 600 }}>{formatMoney(data.open)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--success)' }}>Cao nhất (high):</span>
            <span className="font-numbers" style={{ fontWeight: 600, color: 'var(--success)' }}>{formatMoney(data.high)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--danger)' }}>Thấp nhất (low):</span>
            <span className="font-numbers" style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatMoney(data.low)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Đóng cửa (close):</span>
            <span className="font-numbers" style={{ fontWeight: 600 }}>{formatMoney(data.close)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SpreadTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 124, 149, 0.35)', borderRadius: '16px', padding: '8px 12px', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-card)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{data.dateFormatted}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Chênh lệch (spread):</span>
          <span className="font-numbers" style={{ fontWeight: 600, color: 'var(--gold-dark)' }}>{formatMoney(data.spread)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function HistoryContent() {
  const [rawHistory, setRawHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [priceType, setPriceType] = useState<'buyPrice' | 'sellPrice'>('buyPrice');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/history');
        const json = await res.json();
        // Chỉ lấy dữ liệu của Nhẫn Trơn 9999 để vẽ biểu đồ
        const filteredData = json.filter((item: PriceHistoryItem) => item.name === 'Nhẫn Trơn 9999');
        setRawHistory(filteredData);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  // Format for axis label to be minimized in millions (e.g. 14,35 tr)
  const formatAxisMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val / 1000000) + ' tr';
  };

  // Helper to group by day for Area Chart
  const getDailyData = (data: PriceHistoryItem[], dateFormatStr: string) => {
    const dailyMap: { [key: string]: PriceHistoryItem } = {};
    data.forEach(item => {
      const dayKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
      dailyMap[dayKey] = item;
    });
    return Object.values(dailyMap).map(item => ({
      ...item,
      dateFormatted: format(new Date(item.createdAt), dateFormatStr),
    }));
  };

  // Get filtered data based on range
  const getFilteredData = () => {
    const now = new Date();
    
    if (range === 'ALL') {
      return getDailyData(rawHistory, 'dd/MM/yyyy');
    }

    let cutoffDate = now;
    if (range === '1W') cutoffDate = subDays(now, 7);
    else if (range === '1M') cutoffDate = subMonths(now, 1);
    else if (range === '3M') cutoffDate = subMonths(now, 3);

    const filtered = rawHistory.filter(item => new Date(item.createdAt) >= cutoffDate);

    if (range === '1W') {
      return filtered.map(item => ({
        ...item,
        dateFormatted: format(new Date(item.createdAt), 'dd/MM HH:mm'),
      }));
    }

    return getDailyData(filtered, 'dd/MM/yyyy');
  };

  const getFilteredRawItems = () => {
    if (range === 'ALL') return rawHistory;
    
    const now = new Date();
    let cutoffDate = now;
    if (range === '1W') cutoffDate = subDays(now, 7);
    else if (range === '1M') cutoffDate = subMonths(now, 1);
    else if (range === '3M') cutoffDate = subMonths(now, 3);
    
    return rawHistory.filter(item => new Date(item.createdAt) >= cutoffDate);
  };

  // Generate candlestick data (always grouped by day)
  const getCandlestickData = (filteredHistory: PriceHistoryItem[], type: 'buyPrice' | 'sellPrice') => {
    const groups: { [key: string]: PriceHistoryItem[] } = {};
    
    filteredHistory.forEach(item => {
      const dayKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(item);
    });
    
    const result = Object.keys(groups).map(dayKey => {
      const items = groups[dayKey];
      // Sort chronologically
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const prices = items.map(item => type === 'buyPrice' ? item.buyPrice : item.sellPrice);
      const open = prices[0];
      const close = prices[prices.length - 1];
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      
      const lastItem = items[items.length - 1];
      const spread = Math.abs(lastItem.sellPrice - lastItem.buyPrice);
      
      return {
        date: dayKey,
        dateFormatted: format(new Date(dayKey), 'dd/MM/yyyy'),
        open,
        close,
        high,
        low,
        spread,
        wickRange: [low, high],
        bodyRange: [open, close]
      };
    });
    
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const areaChartData = getFilteredData();
  const rawItems = getFilteredRawItems();
  const candleChartData = getCandlestickData(rawItems, priceType);



  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-gradient page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flower size={32} style={{ color: 'var(--gold-primary)', filter: 'drop-shadow(0 0 6px var(--gold-glow))' }} />
            Lịch sử giá và hũ vàng
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Biểu đồ lịch sử giá vàng Ngọc Của.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Chart Type Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.4)', padding: '4px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <button
              onClick={() => setChartType('area')}
              className="btn"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                borderRadius: '20px',
                minWidth: '70px',
                background: chartType === 'area' ? 'var(--gold-primary)' : 'transparent',
                color: chartType === 'area' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: chartType === 'area' ? '0 4px 10px var(--gold-glow)' : 'none',
                transition: 'all 0.2s ease',
                fontWeight: chartType === 'area' ? 600 : 500
              }}
            >
              Vùng
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className="btn"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                borderRadius: '20px',
                minWidth: '70px',
                background: chartType === 'candlestick' ? 'var(--gold-primary)' : 'transparent',
                color: chartType === 'candlestick' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: chartType === 'candlestick' ? '0 4px 10px var(--gold-glow)' : 'none',
                transition: 'all 0.2s ease',
                fontWeight: chartType === 'candlestick' ? 600 : 500
              }}
            >
              Nến Nhật
            </button>
          </div>

          {/* Price Type Selector (only for candlestick) */}
          {chartType === 'candlestick' && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.4)', padding: '4px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              <button
                onClick={() => setPriceType('buyPrice')}
                className="btn"
                style={{
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '20px',
                  background: priceType === 'buyPrice' ? 'var(--gold-primary)' : 'transparent',
                  color: priceType === 'buyPrice' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: priceType === 'buyPrice' ? '0 4px 10px var(--gold-glow)' : 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: priceType === 'buyPrice' ? 600 : 500
                }}
              >
                Giá mua vào
              </button>
              <button
                onClick={() => setPriceType('sellPrice')}
                className="btn"
                style={{
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '20px',
                  background: priceType === 'sellPrice' ? 'var(--gold-primary)' : 'transparent',
                  color: priceType === 'sellPrice' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: priceType === 'sellPrice' ? '0 4px 10px var(--gold-glow)' : 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: priceType === 'sellPrice' ? 600 : 500
                }}
              >
                Giá bán ra
              </button>
            </div>
          )}

          {/* Date Range Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.4)', padding: '4px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            {(['1W', '1M', '3M', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="btn"
                style={{
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '20px',
                  minWidth: '60px',
                  background: range === r ? 'var(--gold-primary)' : 'transparent',
                  color: range === r ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: range === r ? '0 4px 10px var(--gold-glow)' : 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: range === r ? 600 : 500
                }}
              >
                {r === '1W' ? '1 tuần' : r === '1M' ? '1 tháng' : r === '3M' ? '3 tháng' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ minHeight: '520px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Đang tải dữ liệu biểu đồ...</p>
        ) : chartType === 'area' ? (
          /* AREA CHART MODE */
          areaChartData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Không tìm thấy dữ liệu lịch sử trong khoảng thời gian đã chọn.</p>
          ) : (
            <div style={{ height: '480px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSell" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold-light)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--gold-light)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="dateFormatted" 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    tickMargin={10} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    tickFormatter={formatAxisMoney} 
                    axisLine={false}
                    tickLine={false}
                    tickMargin={5}
                    width={45} // Minimal width to expand chart area
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 124, 149, 0.35)', borderRadius: '16px', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-card)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}
                    formatter={(value: unknown) => [formatMoney(Number(value)), '']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="buyPrice" 
                    name="Mua vào (Cửa hàng mua)" 
                    stroke="var(--gold-primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorBuy)" 
                    activeDot={{ r: 6, stroke: 'var(--gold-primary)', strokeWidth: 2, fill: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sellPrice" 
                    name="Bán ra (Cửa hàng bán)" 
                    stroke="var(--gold-light)" 
                    strokeWidth={2} 
                    fillOpacity={1}
                    fill="url(#colorSell)" 
                    strokeDasharray="4 4"
                    activeDot={{ r: 5, stroke: 'var(--gold-light)', strokeWidth: 1, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )
        ) : (
          /* CANDLESTICK + SPREAD MODE */
          candleChartData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Không tìm thấy dữ liệu nến trong khoảng thời gian đã chọn.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {/* Candlestick Chart using native overlapping bars (Top) */}
              <div style={{ height: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={candleChartData} barGap="-100%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="var(--text-muted)" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tick={false} // Hide ticks to combine with bottom chart
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke="var(--text-muted)" 
                      fontSize={11} 
                      tickFormatter={formatAxisMoney} 
                      axisLine={false}
                      tickLine={false}
                      tickMargin={5}
                      width={45} // Minimal width to expand chart area
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                    <Tooltip content={<CandlestickTooltip />} />
                    
                    {/* Wick - drawn first as a narrow bar */}
                    <Bar 
                      dataKey="wickRange" 
                      barSize={2} 
                    >
                      {candleChartData.map((entry, index) => {
                        const isGrowing = entry.close >= entry.open;
                        return <Cell key={`wick-${index}`} fill={isGrowing ? 'var(--success)' : 'var(--danger)'} />;
                      })}
                    </Bar>

                    {/* Body - drawn on top as a wider bar */}
                    <Bar 
                      dataKey="bodyRange" 
                      barSize={12} 
                    >
                      {candleChartData.map((entry, index) => {
                        const isGrowing = entry.close >= entry.open;
                        return <Cell key={`body-${index}`} fill={isGrowing ? 'var(--success)' : 'var(--danger)'} stroke={isGrowing ? 'var(--success)' : 'var(--danger)'} strokeWidth={1} />;
                      })}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Divider / Title */}
              <div style={{ paddingLeft: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chênh lệch mua - bán (spread)</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              </div>

              {/* Spread Line Chart (Bottom) */}
              <div style={{ height: '130px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={candleChartData} margin={{ top: 5, right: 10, left: 10, bottom: 10 }}>
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="var(--text-muted)" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis 
                      stroke="var(--text-muted)" 
                      fontSize={9} 
                      tickFormatter={formatAxisMoney} 
                      axisLine={false}
                      tickLine={false}
                      tickMargin={5}
                      width={45} // Align perfectly with top chart YAxis
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                    <Tooltip content={<SpreadTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="spread" 
                      name="Chênh lệch"
                      stroke="var(--gold-primary)" 
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
