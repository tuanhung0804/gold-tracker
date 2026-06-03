const cheerio = require('cheerio');
const fs = require('fs');

try {
    const html = fs.readFileSync('sjc_allorigins.html', 'utf8');
    const $ = cheerio.load(html);

    console.log("--- SJC Gold ---");
    $('table tr').each((i, el) => {
        const text = $(el).text();
        if (text.includes('nhẫn SJC 99,99% 1 chỉ, 2 chỉ, 5 chỉ')) {
            console.log("Found SJC!");
            console.log($(el).html());
            const cols = $(el).find('td');
            console.log("Name:", $(cols[0]).text().trim());
            console.log("Buy:", $(cols[1]).text().trim());
            console.log("Sell:", $(cols[2]).text().trim());
        }
    });

    console.log("--- World Gold ---");
    const worldGoldHeading = $('h3:contains("Giá vàng Thế giới"), h2:contains("Giá vàng Thế giới"), div:contains("Giá vàng Thế giới")').filter(function() {
        return $(this).text().trim() === "Giá vàng Thế giới";
    });

    if (worldGoldHeading.length > 0) {
        console.log("Found heading:", worldGoldHeading.prop('tagName'));
        console.log(worldGoldHeading.parent().html());
    }

    const xauusd = $('*:contains("XAUUSD")').last();
    if (xauusd.length > 0) {
        console.log("Found XAUUSD parent:");
        console.log(xauusd.parent().parent().html());
    }
} catch (e) {
    console.error("Error reading or parsing", e);
}
