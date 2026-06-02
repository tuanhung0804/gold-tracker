async function testGiaVangFinal() {
  const url = "https://api2.giavang.net/v1/gold/last-price";
  console.log("Fetching live data from GiaVang API...");
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("HTTP error:", response.status);
      return;
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      console.error("Invalid API response format");
      return;
    }

    const sjcRing = data.data.find(item => item.type_code === 'SJ9999');
    const worldGold = data.data.find(item => item.type_code === 'XAUUSD');

    console.log("\n==========================================");
    console.log("   GIAVANG.NET TEST RESULTS (SUCCESS)");
    console.log("==========================================");

    if (sjcRing) {
      console.log("\n[1] VÀNG NHẪN SJC 999.9 (SJ9999):");
      console.log(`  - Giá Mua Vào : ${sjcRing.buy.toLocaleString('vi-VN')} VND/chỉ`);
      console.log(`  - Giá Bán Ra  : ${sjcRing.sell.toLocaleString('vi-VN')} VND/chỉ`);
      console.log(`  - Thay đổi Mua: ${sjcRing.alter_buy.toLocaleString('vi-VN')} VND`);
      console.log(`  - Thay đổi Bán: ${sjcRing.alter_sell.toLocaleString('vi-VN')} VND`);
      
      // Calculate yesterday price & change percent
      const yesterdayBuy = sjcRing.yesterday_buy || (sjcRing.buy - sjcRing.alter_buy);
      const yesterdaySell = sjcRing.yesterday_sell || (sjcRing.sell - sjcRing.alter_sell);
      const pctChangeBuy = (sjcRing.alter_buy / yesterdayBuy) * 100;
      const pctChangeSell = (sjcRing.alter_sell / yesterdaySell) * 100;

      console.log(`  - Giá Mua Hôm Qua: ${yesterdayBuy.toLocaleString('vi-VN')} VND`);
      console.log(`  - Giá Bán Hôm Qua: ${yesterdaySell.toLocaleString('vi-VN')} VND`);
      console.log(`  - % Thay Đổi Mua : ${pctChangeBuy.toFixed(2)}%`);
      console.log(`  - % Thay Đổi Bán : ${pctChangeSell.toFixed(2)}%`);
    } else {
      console.log("\n[1] VÀNG NHẪN SJC 999.9 (SJ9999): Không tìm thấy!");
    }

    if (worldGold) {
      console.log("\n[2] VÀNG THẾ GIỚI (XAUUSD):");
      console.log(`  - Giá Hiện Tại  : ${worldGold.buy.toLocaleString('vi-VN')} USD/oz`);
      console.log(`  - Thay đổi      : ${worldGold.alter_buy.toLocaleString('vi-VN')} USD`);
      
      const yesterdayBuy = worldGold.yesterday_buy || (worldGold.buy - worldGold.alter_buy);
      const pctChange = (worldGold.alter_buy / yesterdayBuy) * 100;

      console.log(`  - Giá Hôm Qua   : ${yesterdayBuy.toLocaleString('vi-VN')} USD`);
      console.log(`  - % Thay Đổi    : ${pctChange.toFixed(2)}%`);
    } else {
      console.log("\n[2] VÀNG THẾ GIỚI (XAUUSD): Không tìm thấy!");
    }
    
    console.log("\n==========================================");
    console.log(`Update time: ${new Date().toLocaleString('vi-VN')}`);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testGiaVangFinal();
