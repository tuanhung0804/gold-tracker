const fs = require('fs');
const cheerio = require('cheerio');

const htmlPath = "C:\\Users\\admin\\.gemini\\antigravity\\brain\\1b79c1d2-166b-46c9-86eb-1f836dfef02c\\.system_generated\\steps\\440\\content.md";

try {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  const separatorIndex = html.indexOf('---');
  if (separatorIndex !== -1) {
    html = html.substring(separatorIndex + 3);
  }

  const $ = cheerio.load(html);
  
  console.log("=== Extracting Table Rows with data-code ===");
  const rows = $('#tbl tr');
  rows.each((idx, tr) => {
    const code = $(tr).attr('data-code');
    const title = $(tr).find('td').first().text().trim().replace(/\s+/g, ' ');
    if (code) {
      console.log(`Row ${idx + 1}: Code='${code}' | Name='${title}'`);
    } else {
      console.log(`Row ${idx + 1}: [Header/Separator] | Name='${title}'`);
    }
  });
} catch (e) {
  console.error(e);
}
