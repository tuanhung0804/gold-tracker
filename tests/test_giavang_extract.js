const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlPath = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\1b79c1d2-166b-46c9-86eb-1f836dfef02c\\.system_generated\\steps\\440\\content.md";

try {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  const separatorIndex = html.indexOf('---');
  if (separatorIndex !== -1) {
    html = html.substring(separatorIndex + 3);
  }

  const $ = cheerio.load(html);

  console.log("=== Printing ALL rows of Table 1 ===");
  const table = $('#tbl');
  const rows = table.find('tr');
  console.log(`Total rows: ${rows.length}`);
  rows.each((rIdx, tr) => {
    const cells = $(tr).find('td, th');
    const cellTexts = [];
    cells.each((cIdx, td) => {
      cellTexts.push($(td).text().trim().replace(/\s+/g, ' '));
    });
    console.log(`Row ${rIdx + 1}:`, cellTexts.join(' | '));
  });

  console.log("\n=== Checking for script tags with JSON or APIs ===");
  $('script').each((idx, script) => {
    const src = $(script).attr('src');
    const content = $(script).text();
    if (src) {
      if (src.includes('gold') || src.includes('price') || src.includes('giavang')) {
        console.log(`Script with src: ${src}`);
      }
    } else {
      if (content.includes('price') || content.includes('SJC') || content.includes('XAUUSD')) {
        console.log(`Script inline (index ${idx}), length ${content.length}, preview:`);
        console.log(content.substring(0, 300).trim());
        console.log("...");
      }
    }
  });

  console.log("\n=== Checking for iframe tags ===");
  $('iframe').each((idx, iframe) => {
    console.log(`Iframe ${idx + 1}: src='${$(iframe).attr('src') || 'none'}', id='${$(iframe).attr('id') || 'none'}', class='${$(iframe).attr('class') || 'none'}'`);
  });

} catch (error) {
  console.error("Error analyzing HTML:", error);
}
