const html = require('fs').readFileSync('ngoccuanhabe2.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

console.log('Tables:');
$('table').each((i, t) => {
    console.log('--- Table', i, '---');
    $(t).find('tr').each((j, r) => {
        const cols = $(r).find('td, th');
        if(cols.length >= 3) {
            const c1 = $(cols[0]).text().trim().replace(/\s+/g, ' ');
            const c2 = $(cols[1]).text().trim().replace(/\s+/g, ' ');
            const c3 = $(cols[2]).text().trim().replace(/\s+/g, ' ');
            console.log(`Row ${j}: ${c1} | ${c2} | ${c3}`);
        }
    });
});
