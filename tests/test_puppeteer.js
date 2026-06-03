const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://sjc.com.vn/', { waitUntil: 'networkidle2' });
    const html = await page.content();
    require('fs').writeFileSync('sjc_puppeteer.html', html);
    await browser.close();
    console.log("Done");
})();
