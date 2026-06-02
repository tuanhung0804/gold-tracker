import { Resend } from 'resend';

let resend: Resend | null = null;

function getResendClient() {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export async function sendPriceChangeEmail(
  name: string,
  newBuy: number,
  newSell: number,
  lastBuy: number,
  lastSell: number,
  yesterdayPrice: number
) {
  const client = getResendClient();
  if (!client) {
    console.warn('⚠️ RESEND_API_KEY is missing. Skipping email notification.');
    return;
  }

  const dateString = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

  const subject = `🔔 Giá vàng ngày ${dateString}`;
  const uniqueId = Math.random().toString(36).substring(7);

  const diffLast = newBuy - lastBuy;
  const diffYest = newBuy - yesterdayPrice;

  const fmt = (val: number) => {
    const formatted = val.toLocaleString('vi-VN') + ' đ';
    return val > 0 ? `+${formatted}` : formatted;
  };
  
  const trendSymbol = diffLast > 0 ? '▲' : (diffLast < 0 ? '▼' : '▬');
  const trendColor = diffLast > 0 ? '#28a745' : (diffLast < 0 ? '#dc3545' : '#777777');
  
  const safeName = escapeHtml(name);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; line-height: 1.6; color: #333;">
      <h2 style="color: #d4af37; margin-top: 0; font-size: 1.2em; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">
        ${safeName} 
        <span style="color: ${trendColor};">${trendSymbol}${fmt(diffLast)}</span> 
      </h2>
      
      <p style="margin: 15px 0 10px 0;">Chi tiết giá <strong>${safeName}</strong> hiện tại:</p>
      <ul style="list-style-type: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 5px; display: block;">
          <span style="color: #d4af37; margin-right: 8px;">•</span><strong>Mua vào:</strong> ${newBuy.toLocaleString('vi-VN')} đ
        </li>
        <li style="margin-bottom: 5px; display: block;">
          <span style="color: #d4af37; margin-right: 8px;">•</span><strong>Bán ra:</strong> ${newSell.toLocaleString('vi-VN')} đ
        </li>
        <li style="margin-bottom: 5px; display: block;">
          <span style="color: #d4af37; margin-right: 8px;">•</span><strong>Chênh lệch:</strong> ${(newSell - newBuy).toLocaleString('vi-VN')} đ
        </li>
      </ul>

      <div style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 15px;">
        <p style="margin: 0; font-size: 0.95em;">📈 <strong>So với giá gần nhất:</strong> ${fmt(diffLast)}</p>
        <p style="margin: 5px 0 0 0; font-size: 0.95em;">📅 <strong>So với giá hôm qua:</strong> ${fmt(diffYest)}</p>
      </div>

      <div style="display:none; white-space:nowrap; font:15px courier; line-height:0;">
        ${uniqueId}
      </div>
    </div>`;

  try {
    const data = await client.emails.send({
      from: 'Gold Tracker <onboarding@resend.dev>',
      to: ['vutuanhung1997@gmail.com', 'thuylinhtruong0512@gmail.com'],
      subject: subject,
      html: htmlBody,
    });
    console.log('✉️ Email dispatched via Resend successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to send email via Resend:', error);
    throw error;
  }
}
