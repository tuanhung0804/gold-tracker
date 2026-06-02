async function testSJCDirect() {
  const url = "https://sjc.com.vn/GoldPrice/Services/PriceService.ashx";
  console.log("Sending POST request to SJC API via Node.js fetch...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "vi,en-US;q=0.9,en;q=0.8"
      },
      body: ""
    });

    console.log("Status Code:", response.status_code || response.status);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log("Success status:", data.success);
      console.log("Total records:", data.data ? data.data.length : 0);
      if (data.data && data.data.length > 0) {
        console.log("First few records:");
        data.data.slice(0, 5).forEach((item, idx) => {
          console.log(`Sample ${idx}: Name='${item.TypeName}', Branch='${item.BranchName}', Buy=${item.BuyValue}, Sell=${item.SellValue}`);
        });
      }
    } catch (e) {
      console.log("Failed to parse JSON. Raw response length:", text.length);
      console.log("Preview response (first 500 chars):");
      console.log(text.substring(0, 500));
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

testSJCDirect();
