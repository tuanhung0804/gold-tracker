'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Flower } from 'lucide-react';

interface PriceHistoryItem {
  id: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface ChartDataItem extends PriceHistoryItem {
  dateFormatted: string;
}

interface PortfolioItem {
  id: number;
  buyDate: string;
  quantity: number;
  buyPrice: number;
  status: 'Đang giữ' | 'Đã bán';
  sellPrice: number | null;
  updatedAt: string;
}

const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

// Custom tooltip for Area Chart
const AreaChartTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartDataItem }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        border: '1px solid rgba(255, 124, 149, 0.35)', 
        borderRadius: '16px', 
        padding: '12px 16px', 
        backdropFilter: 'blur(10px)', 
        WebkitBackdropFilter: 'blur(10px)', 
        boxShadow: 'var(--shadow-card)', 
        fontSize: '0.85rem', 
        color: 'var(--text-primary)' 
      }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>{data.dateFormatted}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Mua vào:</span>
            <span className="font-numbers" style={{ fontWeight: 600 }}>{formatMoney(data.buyPrice)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Bán ra:</span>
            <span className="font-numbers" style={{ fontWeight: 600 }}>{formatMoney(data.sellPrice)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip for Portfolio Value Chart
const PortfolioTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        border: '1px solid rgba(255, 124, 149, 0.35)', 
        borderRadius: '16px', 
        padding: '12px 16px', 
        backdropFilter: 'blur(10px)', 
        WebkitBackdropFilter: 'blur(10px)', 
        boxShadow: 'var(--shadow-card)', 
        fontSize: '0.85rem', 
        color: 'var(--text-primary)' 
      }}>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>{data.dateFormatted}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Số chỉ đang giữ:</span>
            <span className="font-numbers" style={{ fontWeight: 600 }}>{data.activeQuantity} chỉ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Trị giá hũ:</span>
            <span className="font-numbers" style={{ fontWeight: 600, color: 'var(--gold-dark)' }}>{formatMoney(data.portfolioValue)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom dot showing a small box on gold purchase days
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload && payload.isPurchaseDay) {
    return (
      <rect
        key={props.key || Math.random().toString()}
        x={cx - 6}
        y={cy - 6}
        width={12}
        height={12}
        fill="var(--gold-primary)"
        stroke="#fff"
        strokeWidth={2}
        rx={2}
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' }}
      />
    );
  }
  return null;
};

export default function HistoryContent() {
  const [rawHistory, setRawHistory] = useState<PriceHistoryItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

  useEffect(() => {
    async function fetchData() {
      try {
        const [historyRes, portfolioRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/portfolio')
        ]);
        const historyJson = await historyRes.json();
        const portfolioJson = await portfolioRes.json();
        
        // Only keep 'Nhẫn Trơn 9999' data for the chart
        const filteredData = historyJson.filter((item: PriceHistoryItem) => item.name === 'Nhẫn Trơn 9999');
        setRawHistory(filteredData);
        setPortfolio(portfolioJson);
      } catch (err) {
        console.error('Error fetching data in HistoryContent:', err);
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
    else if (range === '1Y') cutoffDate = subMonths(now, 12);

    const filtered = rawHistory.filter(item => new Date(item.createdAt) >= cutoffDate);

    if (range === '1W') {
      const result = [];
      const nowTime = now.getTime();
      const startHour = new Date(cutoffDate);
      startHour.setMinutes(0, 0, 0); // Align to hour start
      
      let current = new Date(startHour);
      while (current.getTime() <= nowTime) {
        const hourEnd = current.getTime() + 60 * 60 * 1000 - 1; // End of current hour
        
        let lastItem = null;
        // Search rawHistory since it contains all historical data (even before cutoffDate)
        for (let i = rawHistory.length - 1; i >= 0; i--) {
          const itemTime = new Date(rawHistory[i].createdAt).getTime();
          if (itemTime <= hourEnd) {
            lastItem = rawHistory[i];
            break;
          }
        }
        
        if (lastItem) {
          result.push({
            ...lastItem,
            dateFormatted: format(current, 'dd/MM HH:00'),
          });
        }
        
        current = new Date(current.getTime() + 60 * 60 * 1000);
      }
      return result;
    }

    return getDailyData(filtered, 'dd/MM/yyyy');
  };

  const areaChartData = getFilteredData();

  // Helper to get start of day string (YYYY-MM-DD)
  const getStartOfDay = (dateOrStr: string | Date) => {
    const d = new Date(dateOrStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const portfolioChartData = areaChartData.map(point => {
    const pointDate = new Date(point.createdAt);
    const pointDayStr = getStartOfDay(pointDate);

    // Sum active quantities up to this point
    const activeQuantity = portfolio.reduce((sum, item) => {
      const buyDayStr = getStartOfDay(item.buyDate);
      const isBought = buyDayStr <= pointDayStr;
      
      // If sold, check if sold on or before this day
      const isSold = item.status === 'Đã bán' && getStartOfDay(item.updatedAt) <= pointDayStr;
      
      if (isBought && !isSold) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);

    const portfolioValue = activeQuantity * point.buyPrice;

    // Check if there was any purchase on this calendar day
    const isPurchaseDay = portfolio.some(item => {
      return getStartOfDay(item.buyDate) === pointDayStr;
    });

    return {
      ...point,
      portfolioValue,
      activeQuantity,
      isPurchaseDay
    };
  });

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-gradient page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flower size={32} style={{ color: 'var(--gold-primary)', filter: 'drop-shadow(0 0 6px var(--gold-glow))' }} />
            Lịch sử giá và hũ vàng
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Theo dõi biến động giá vàng nhẫn tròn trơn.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Date Range Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.4)', padding: '4px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((r) => (
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
                {r === '1W' ? '1 tuần' : r === '1M' ? '1 tháng' : r === '3M' ? '3 tháng' : r === '1Y' ? '1 năm' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ minHeight: '520px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Đang tải dữ liệu biểu đồ...</p>
        ) : areaChartData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Không tìm thấy dữ liệu lịch sử trong khoảng thời gian đã chọn.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <h3 style={{ 
              textAlign: 'center', 
              margin: '0 0 1.5rem 0', 
              color: 'var(--text-primary)', 
              fontWeight: 600,
              fontSize: '1.2rem',
              letterSpacing: '0.02em'
            }}>
              Biểu đồ lịch sử giá vàng Ngọc Của
            </h3>
            <div style={{ height: '420px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
                    stroke="var(--text-secondary)" 
                    fontSize={11} 
                    tickMargin={10} 
                    axisLine={true}
                    tickLine={true}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-secondary)" 
                    fontSize={11} 
                    tickFormatter={formatAxisMoney} 
                    axisLine={true}
                    tickLine={true}
                    tickMargin={5}
                    width={55}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                  <Tooltip content={<AreaChartTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    height={36} 
                    iconType="line"
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="buyPrice" 
                    name="Mua vào" 
                    stroke="var(--gold-primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorBuy)" 
                    activeDot={{ r: 6, stroke: 'var(--gold-primary)', strokeWidth: 2, fill: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sellPrice" 
                    name="Bán ra" 
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
          </div>
        )}
      </div>

      <div className="glass-card" style={{ minHeight: '520px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Đang tải dữ liệu biểu đồ...</p>
        ) : portfolioChartData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Không tìm thấy dữ liệu hũ vàng trong khoảng thời gian đã chọn.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <h3 style={{ 
              textAlign: 'center', 
              margin: '0 0 1.5rem 0', 
              color: 'var(--text-primary)', 
              fontWeight: 600,
              fontSize: '1.2rem',
              letterSpacing: '0.02em'
            }}>
              Biểu đồ biến động giá trị hũ vàng của Linh
            </h3>
            <div style={{ height: '420px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="dateFormatted" 
                    stroke="var(--text-secondary)" 
                    fontSize={11} 
                    tickMargin={10} 
                    axisLine={true}
                    tickLine={true}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-secondary)" 
                    fontSize={11} 
                    tickFormatter={formatAxisMoney} 
                    axisLine={true}
                    tickLine={true}
                    tickMargin={5}
                    width={55}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                  <Tooltip content={<PortfolioTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    height={36} 
                    iconType="line"
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="portfolioValue" 
                    name="Giá trị hũ" 
                    stroke="var(--gold-primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorPortfolio)" 
                    dot={<CustomDot />}
                    activeDot={{ r: 6, stroke: 'var(--gold-primary)', strokeWidth: 2, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
