const puppeteer = require('puppeteer');

const getMenu = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 800
    });
    await page.goto('http://daniadnia.pl/#/krakow/Maraton%20Lunch%20Bar/restaurants', {
        waitUntil: 'networkidle0'
    })
    await page.screenshot({path: 'menu.png'});
    await browser.close();
};

const createOrder = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 800
    });
    await page.goto('http://daniadnia.pl/#/krakow/Maraton%20Lunch%20Bar/restaurants', {
        waitUntil: ['networkidle0']
    })
    await page.click('a[id=order-dashboard-link]');
    await page.waitForNavigation({
        waitUntil: 'networkidle0'
    });
    const url = page.url();
    await browser.close();
    return url;
};

createOrder();

module.exports = {getMenu, createOrder};
