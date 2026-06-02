async function testGiaVangAPIClean() {
  const url = "https://api2.giavang.net/v1/gold/last-price";
  console.log("Sending GET request to GiaVang API: " + url);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    console.log("Status Code:", response.status);
    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        console.log(`Total records: ${data.data.length}`);
        
        console.log("\n=== ALL AVAILABLE GOLD CODES AND NAMES ===");
        data.data.forEach((item) => {
          console.log(`- Code: '${item.type_code}' | Name: '${item.type_name}'`);
        });

        console.log("\n=== FILTERED TARGET VALUES ===");
        
        const targets = ['XAUUSD', 'SJCHN', 'SJCHCM', 'NHANSJC'];
        
        data.data.forEach((item) => {
          const code = item.type_code || '';
          const name = item.type_name || '';
          
          const isTarget = targets.includes(code.toUpperCase()) || 
                           name.toLowerCase().includes('nhẫn sjc') ||
                           name.toLowerCase().includes('vàng thế giới');
                           
          if (isTarget) {
            console.log(`\nMATCHED DATA FOR: [${code}] - ${name}`);
            console.log(`  Current Buy : ${item.buy}`);
            console.log(`  Current Sell: ${item.sell}`);
            console.log(`  Open Buy    : ${item.open_buy}`);
            console.log(`  Open Sell   : ${item.open_sell}`);
            console.log(`  Alter Buy   : ${item.alter_buy}`);
            console.log(`  Alter Sell  : ${item.alter_sell}`);
            console.log(`  Yesterday Buy : ${item.yesterday_buy}`);
            console.log(`  Yesterday Sell: ${item.yesterday_sell}`);
            console.log(`  Update Time   : ${new Date(item.update_time * 1000).toLocaleString('vi-VN')}`);
          }
        });
      } else {
        console.log("No data array found:", data);
      }
    } else {
      console.log("Failed. Text response:", await response.text());
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

testGiaVangAPIClean();
