async function testLiveAPI() {
  const url = "http://localhost:3000/api/gold-price";
  console.log("Sending GET request to local dev server:", url);
  try {
    const response = await fetch(url);
    console.log("Status Code:", response.status);
    if (response.ok) {
      const data = await response.json();
      console.log("\n==========================================");
      console.log("      API LIVE RESPONSE TEST (SUCCESS)");
      console.log("==========================================");
      console.log("Base Gold (Ngọc Của):", {
        name: data.name,
        buyPrice: data.buyPrice,
        sellPrice: data.sellPrice
      });
      
      console.log("\nSJC Ring Gold:", data.sjcRing ? {
        name: data.sjcRing.name,
        buyPrice: data.sjcRing.buyPrice,
        sellPrice: data.sjcRing.sellPrice,
        alterBuy: data.sjcRing.alterBuy,
        alterSell: data.sjcRing.alterSell,
        yesterdayBuy: data.sjcRing.yesterdayBuy,
        yesterdaySell: data.sjcRing.yesterdaySell
      } : "NOT FOUND");

      console.log("\nWorld Gold (XAUUSD):", data.worldGold ? {
        name: data.worldGold.name,
        buyPrice: data.worldGold.buyPrice,
        sellPrice: data.worldGold.sellPrice,
        alterBuy: data.worldGold.alterBuy,
        alterSell: data.worldGold.alterSell,
        yesterdayBuy: data.worldGold.yesterdayBuy,
        yesterdaySell: data.worldGold.yesterdaySell
      } : "NOT FOUND");
      console.log("==========================================");
    } else {
      console.log("Failed. Status:", response.status, "Content:", await response.text());
    }
  } catch (error) {
    console.error("Connection failed. Dev server might be reloading. Error:", error.message);
  }
}

testLiveAPI();
