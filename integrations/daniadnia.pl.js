const puppeteer = require('puppeteer');

const DISCOUNT_PERCENTAGE = 10;

const getFirstMatch = (string, regex) => {
    const result = string.match(regex);
    return result && result.length && result[1] || undefined;
};

const applyDiscount = price => price - price / DISCOUNT_PERCENTAGE;

const parsePrice = text =>
    Number.parseFloat(text.split(' ')
        .shift()
        .replace(',', '.'));

const getMatches = (text, regex) => {
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
    }
    return matches;
};

const fetchRawMenuData = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1200,
        height: 800
    });
    await page.goto('http://daniadnia.pl/#/krakow/Maraton%20Lunch%20Bar/restaurants', {
        waitUntil: 'networkidle0'
    })
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    return bodyHTML;
};

const getMenuData = async () => {
    const menuText = await fetchRawMenuData();
    const categories = getMatches(menuText, /<section class="meals".*?>([\s\S]*?)<\/section>/g);
    const data = categories.map(category => ({
        title: getFirstMatch(category, /<h3.*?<\/i>\s(.*?)<\/h3>/),
        products: getMatches(category, /<tr(.*?)id="meal-details".*?>([\s\S]*?)<\/tr>/g)
            .map(product => ({
                name: getFirstMatch(product, /<td class="meal-name".*?>(.*?)<\/td>/),
                price: applyDiscount(parsePrice(getFirstMatch(product, /<td class="meal-price".*?>(.*?)<\/td>/)))
            }))
        }));
    return data.filter(category => category && category.products && category.products.length)
};

let menuCache;
let menuCacheTimestamp;

const getMenu = async () => {
    const todayStartTimestamp = (new Date()).setHours(0, 0, 0, 0);
    if (!menuCacheTimestamp || menuCacheTimestamp < todayStartTimestamp) {
        menuCacheTimestamp = Date.now();
        menuCache = await getMenuData();
    }
    return menuCache;
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

module.exports = {getMenu, createOrder};
