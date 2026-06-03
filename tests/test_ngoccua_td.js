const cheerio = require('cheerio');
fetch('https://ngoccuanhabe.com/?refresh='+Math.random())
.then(r => r.text())
.then(d => {
    const $ = cheerio.load(d);
    const results = [];
    $('td').each((i, td) => {
        const text = $(td).text().toLowerCase();
        if(text.includes('sjc') || text.includes('vàng') || text.includes('xauusd')) {
            results.push($(td).text().replace(/\s+/g, ' ').trim());
        }
    });
    console.log('NgocCua td matches:', results.length);
    console.log(results.slice(0, 10).join('\n'));
});
