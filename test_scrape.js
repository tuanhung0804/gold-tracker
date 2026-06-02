const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('sjc_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log("--- SJC Gold ---");
$('table tr').each((i, el) => {
    const text = $(el).text();
    if (text.includes('nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ')) {
        console.log($(el).html());
        console.log("Extracted Row:");
        const cols = $(el).find('td');
        console.log("Name:", $(cols[0]).text().trim());
        console.log("Buy:", $(cols[1]).text().trim());
        console.log("Sell:", $(cols[2]).text().trim());
    }
});

console.log("--- World Gold ---");
// try to find XAUUSD or "Giá vàng Thế giới"
const xauusd = $('*:contains("XAUUSD")').last();
if (xauusd.length > 0) {
    console.log("Found XAUUSD parent:");
    console.log(xauusd.parent().html());
}

// Another heuristic for world gold
$('div').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Giá vàng Thế giới') && text.includes('XAUUSD')) {
        // trying to narrow down
        if ($(el).children().length < 5) {
             // console.log("Possible world gold container:", $(el).html());
        }
    }
});
