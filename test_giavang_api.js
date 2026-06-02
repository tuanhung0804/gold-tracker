async function testGiaVangAPI() {
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
      console.log("Response structure keys:", Object.keys(data));
      console.log("Status:", data.status);
      console.log("Current Time:", data.current_time);
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`Total records returned: ${data.data.length}`);
        
        // Find gold items containing "nhẫn SJC" or "thế giới" or "XAUUSD"
        console.log("\n--- Searching for target gold types ---");
        data.data.forEach((item, idx) => {
          const code = item.type_code || '';
          const name = item.type_name || '';
          
          // Let's print some samples
          if (idx < 5) {
            console.log(`Sample ${idx}:`, item);
          }
          
          if (
            name.toLowerCase().includes('nhẫn') || 
            code.toLowerCase().includes('nhan') ||
            name.toLowerCase().includes('thế giới') ||
            code.toLowerCase().includes('xau')
          ) {
            console.log(`MATCHED: Code='${code}', Name='${name}', Buy=${item.buy}, Sell=${item.sell}, ChangeBuy=${item.alter_buy}, ChangeSell=${item.alter_sell}`);
          }
        });
      } else {
        console.log("No data array found or it is not an array:", data);
      }
    } else {
      console.log("Failed. Text response:", await response.text());
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

testGiaVangAPI();
