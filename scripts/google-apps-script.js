function setDynamicTrigger() {
  var now = new Date();
  var hour = now.getHours();
  var minutes;

  // 1. Determine the interval based on time of day
  // Day: 7:00 (7) to 21:59 (20) -> 10 minutes
  if (hour >= 7 && hour < 22) {
    minutes = 5;
  } else {
    // Night: 22:00 to 06:59 -> 180 minutes
    minutes = 180;
  }

  // 2. Delete existing triggers for this function to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'recordGoldPriceHistory') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 3. Create a new trigger for the next run
  ScriptApp.newTrigger('recordGoldPriceHistory')
    .timeBased()
    .after(minutes * 60 * 1000) // Convert minutes to milliseconds
    .create();
  
  Logger.log("Next trigger set for " + minutes + " minutes from now.");
}

function updateCandlestickData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var historySheet = ss.getSheetByName("Historical");
  var chartSheet = ss.getSheetByName("CandlestickChart");
  
  if (!chartSheet) { chartSheet = ss.insertSheet("CandlestickChart"); }

  var rawData = historySheet.getRange(2, 1, historySheet.getLastRow() - 1, 5).getValues();
  var dailyLogs = {};
  var firstDate = new Date(rawData[0][3]);
  var lastDate = new Date();

  // 1. Process Data
  rawData.forEach(row => {
    var price = row[1]; 
    var startTs = new Date(row[3]);
    var endTs = new Date(row[4]);
    var dateKey = Utilities.formatDate(startTs, "GMT+7", "yyyy-MM-dd");
    
    if (!dailyLogs[dateKey]) { dailyLogs[dateKey] = { records: [], openAt7: null }; }
    dailyLogs[dateKey].records.push({ price: price, start: startTs, end: endTs });

    var sevenAM = new Date(startTs);
    sevenAM.setHours(7, 0, 0, 0);
    if (startTs <= sevenAM && endTs >= sevenAM) { dailyLogs[dateKey].openAt7 = price; }
  });

  // 2. Build Output with TEXT dates
  var output = [["Date", "Low", "Open", "Close", "High"]];
  var runningClose = rawData[0][1];
  var current = new Date(firstDate);
  current.setHours(0,0,0,0);

  while (current <= lastDate) {
    var dateKey = Utilities.formatDate(current, "GMT+7", "yyyy-MM-dd");
    // FORMAT AS TEXT: We use a ' prefix or force string to ensure Sheets sees it as a label
    var dateLabel = Utilities.formatDate(current, "GMT+7", "dd/MM/yyyy"); 
    
    var dayData = dailyLogs[dateKey];
    var open, close, high, low;

    if (dayData) {
      open = (dayData.openAt7 !== null) ? dayData.openAt7 : runningClose;
      dayData.records.sort((a, b) => b.end - a.end);
      close = dayData.records[0].price;
      var allPrices = dayData.records.map(r => r.price);
      allPrices.push(open);
      high = Math.max(...allPrices);
      low = Math.min(...allPrices);
      runningClose = close;
    } else {
      open = close = high = low = runningClose;
    }

    output.push([dateLabel, low, open, close, high]); // dateLabel is a String
    current.setDate(current.getDate() + 1);
  }

  // 3. Write to Sheet & Force Format
  chartSheet.clear();
  
  // Set the format of the first column to Plain Text BEFORE writing data
  chartSheet.getRange(1, 1, output.length, 1).setNumberFormat("@"); 
  
  chartSheet.getRange(1, 1, output.length, 5).setValues(output);
  
  // Optional: Set the price columns to standard number format (no scientific notation)
  chartSheet.getRange(2, 2, output.length - 1, 4).setNumberFormat("#,##0");

  Logger.log("Chart refreshed with text-based dates.");
}

function sendPriceChangeEmail(name, newBuy, newSell, lastBuy, lastSell, yesterdayPrice) {
  var recipient = "vutuanhung1997@gmail.com, thuylinhtruong0512@gmail.com"; // UPDATE THIS
  var dateString = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  var subject = "🔔 Giá vàng ngày " + dateString;
  // Unique ID to prevent Gmail from trimming/collapsing the email
  var uniqueId = Math.random().toString(36).substring(7);
  
  var diffLast = newBuy - lastBuy;
  var diffYest = newBuy - yesterdayPrice;
  
  var fmt = (val) => (val > 0 ? "+" : "") + val.toLocaleString('vi-VN') + " đ";
  var trendSymbol = diffLast > 0 ? '▲' : (diffLast < 0 ? '▼' : '▬');
  var trendColor = diffLast > 0 ? '#28a745' : (diffLast < 0 ? '#dc3545' : '#777777'); // Green, Red, Gray

  var htmlBody = `
    <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px; line-height: 1.6; color: #333;">
      <h2 style="color: #d4af37; margin-top: 0; font-size: 1.2em; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">
        ${name} 
        <span style="color: ${trendColor};">${trendSymbol}${fmt(diffLast)}</span> 
      </h2>
      
      <p style="margin: 15px 0 10px 0;">Chi tiết giá <strong>${name}</strong> hiện tại:</p>
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

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody
  });
}

function recordGoldPriceHistory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var liveSheet = ss.getSheetByName("Live"); 
  var historySheet = ss.getSheetByName("Historical");
  
  // 1. Force Refresh of IMPORTHTML
  var cell = liveSheet.getRange("A1"); 
  cell.setFormula('=IMPORTHTML("https://ngoccuanhabe.com/?refresh=' + Math.random() + '", "table", 1)');
  SpreadsheetApp.flush();
  Utilities.sleep(10000); 
  
  // --- NEW: ERROR CHECKING GATEKEEPER ---
  var checkValue = cell.getValue();
  // Check if A1 contains #N/A, #REF!, #ERROR! or is empty
  if (checkValue === "#N/A" || checkValue === "" || checkValue instanceof Error) {
    Logger.log("Website table not found or returned N/A. Skipping this run.");
    setDynamicTrigger(); // Ensure next run is still scheduled
    return; // Exit the function early
  }
  // 2. Get and Clean New Data
  var rowData = liveSheet.getRange("A2:C2").getValues()[0];
  var name = rowData[0];
  var buyPrice = Number(rowData[1].toString().replace(/[^\d]/g, ""));
  var sellPrice = Number(rowData[2].toString().replace(/[^\d]/g, ""));
  
  if (buyPrice <= 0) return; 

  var lastRow = historySheet.getLastRow();
  var timestamp = new Date();
  
  // Normalized "Today" at Midnight
  var today = new Date();
  today.setHours(0,0,0,0);

  if (lastRow > 1) {
    var historyData = historySheet.getRange(2, 1, lastRow - 1, 5).getValues();
    
    // 3. Find the Actual Latest Record
    var latestRecord = historyData.reduce((prev, curr) => {
      return (new Date(prev[3]) > new Date(curr[3])) ? prev : curr;
    });
    
    // 4. Find Yesterday's Record (Safety first)
    var yesterdayPrice = latestRecord[1]; // Default
    var potentialYesterdayRows = historyData.filter(row => {
      var rowDate = new Date(row[3]);
      rowDate.setHours(0,0,0,0);
      return rowDate.getTime() < today.getTime();
    });

    if (potentialYesterdayRows.length > 0) {
      // Get the most recent one among the "older" rows
      var yesterdayRecord = potentialYesterdayRows.reduce((prev, curr) => {
        return (new Date(prev[3]) > new Date(curr[3])) ? prev : curr;
      });
      yesterdayPrice = yesterdayRecord[1];
    }

    var lastBuy = latestRecord[1];
    var lastSell = latestRecord[2];

    // --- CASE A: PRICE UNCHANGED ---
    if (buyPrice === lastBuy && sellPrice === lastSell) {
      // Find the row number of that latest record to update Column E
      // We look for the exact timestamp match in the sheet
      for (var i = 0; i < historyData.length; i++) {
        if (new Date(historyData[i][3]).getTime() === new Date(latestRecord[3]).getTime()) {
          var rowToUpdate = i + 2; // Offset for header (1) and zero-index (1)
          historySheet.getRange(rowToUpdate, 5).setValue(timestamp).setNumberFormat("yyyy-mm-dd HH:mm:ss");
          break;
        }
      }
      Logger.log("Price same. Heartbeat updated.");
    } 
    // --- CASE B: PRICE CHANGED ---
    else {
      sendPriceChangeEmail(name, buyPrice, sellPrice, lastBuy, lastSell, yesterdayPrice);
      historySheet.appendRow([name, buyPrice, sellPrice, timestamp, timestamp]);
      Logger.log("Price change! Email sent.");
    }
  } else {
    historySheet.appendRow([name, buyPrice, sellPrice, timestamp, timestamp]);
  }

  // 5. Final Sort to keep Sheet healthy
  var finalLastRow = historySheet.getLastRow();
  if (finalLastRow > 1) {
    historySheet.getRange(2, 4, finalLastRow - 1, 2).setNumberFormat("yyyy-mm-dd HH:mm:ss");
  }
  // --- NEW: Schedule the next run dynamically ---
  triggerNextJsCron();
  setDynamicTrigger();
  updateCandlestickData();
}

function triggerNextJsCron() {
  var url = "https://gold-tracker-app-479335197996.asia-northeast1.run.app/api/cron/track";
  var token = "83b0f5223e7486f4cb4c1e8ba3c78a0d";
  var options = {
    "method": "get",
    "headers": {
      "Authorization": "Bearer " + token
    },
    "muteHttpExceptions": true
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Next.js cron triggered: " + response.getContentText());
  } catch (e) {
    Logger.log("Failed to trigger Next.js cron: " + e.toString());
  }
}

function triggerSentinel() {
  var triggers = ScriptApp.getProjectTriggers();
  var isMainRunning = false;

  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'recordGoldPriceHistory') {
      // Check the status using the method you found
      if (triggers[i].isDisabled()) {
        Logger.log("Main trigger found but it is DISABLED. Force starting...");
      } else {
        isMainRunning = true;
        Logger.log("Main trigger is active and enabled.");
      }
      break; 
    }
  }

  // If the trigger is disabled OR missing entirely, restart the chain
  if (!isMainRunning) {
    try {
      recordGoldPriceHistory();
      Logger.log("Sentinel successfully restarted the operation.");
    } catch (e) {
      Logger.log("Sentinel restart attempt failed: " + e.toString());
    }
  }
}
