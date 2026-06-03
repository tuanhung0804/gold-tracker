const html = require('fs').readFileSync('ngoccuanhabe.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
console.log('Ngoc Cua tables');
$('table').each((i, t) => {
    console.log('Table', i);
    $(t).find('tr').each((j, r) => {
        const txt = $(r).text().trim().replace(/\s+/g, ' ');
        if (txt.includes('SJC') || txt.includes('Thế giới') || txt.includes('vàng') || txt.includes('Vàng')) console.log(txt);
    });
});
