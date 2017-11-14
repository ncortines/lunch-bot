const Botkit = require('botkit');
const maraton = require('./integrations/daniadnia.pl');

const controller = Botkit.sparkbot({
    debug: true,
    log: true,
    // limit_to_domain: ['mycompany.com'],
    // limit_to_org: 'my_cisco_org_id',
    public_address: process.env.public_address,
    ciscospark_access_token: process.env.access_token,
    // studio_token: process.env.studio_token, // get one from studio.botkit.ai to enable content management, stats, message console and more
    secret: process.env.secret,
    webhook_name: 'smartlunch'
    // studio_command_uri: process.env.studio_command_uri,
});

const bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
    controller.createWebhookEndpoints(webserver, bot, () => {
        console.log("SPARK: Webhooks set up!");
    });
});

controller.hears('menu', 'direct_message,direct_mention', async (bot, message) => {
    const menu = await maraton.getMenu();
    bot.reply(message, {markdown: getMenuMarkdown(menu)});
});

controller.hears('add (.*)', 'direct_message,direct_mention', async (bot, message) => {
    const userOrderProducts = getUserOrderProducts(message.user);
    const request = message.match[1];
    const menu = await maraton.getMenu();
    const newSelectedProductIndexes = request
        .replace(',', ' ')
        .split(' ')
        .filter(product => product.includes('.'))
        .map(product => getProductMenuIndex(product));

    const newSelectedProducts = newSelectedProductIndexes.map(([categoryIndex, productIndex]) => {
        const category = menu[categoryIndex];
        const products = category && category.products;
        return products && products[productIndex];
    });

    let responseText = 'Hi ' + getUserMentionMarkup(message) + ', ';

    if (!newSelectedProducts.length) {
        responseText = responseText + 'I have not updated your order because I could not find any of the things you requested.';
    } else if (newSelectedProducts.includes(undefined)) {
        responseText = responseText + 'I have not updated your order because I could not find some of the things you requested.';
    } else {
        responseText = responseText + 'I have updated your order.';
        userOrderProducts.push(...newSelectedProductIndexes);
    }
    if (userOrderProducts.length > 0) {
        const selectedProducts = userOrderProducts.map(([categoryIndex, productIndex]) => {
            const category = menu[categoryIndex];
            const products = category && category.products;
            return products && products[productIndex];
        });
        responseText = responseText + ' \n\n ' + 'Your order currently has: \n ' + selectedProducts
            .map(product => '- ' + product.name)
            .join('\n')
    }

    bot.reply(message, {markdown: responseText});
});

controller.on(['direct_mention', 'direct_message'], (bot, message) => {
    bot.reply(message, 'Hi ' + getUserMentionMarkup(message) + ', currently I understand only a few simple commands: "menu, "add [number,..]"');
});

let currentOrder;

const getUserMentionMarkup = message => `<@personId:${message.actorId}|${getUserName(message)}>`

const getUserOrderProducts = user => {
    if (!currentOrder) {
        currentOrder = {};
    }
    if (!currentOrder[user]) {
        currentOrder[user] = [];
    }
    return currentOrder[user];
}

const getUserName = message =>
    message.user.split('@')
        .shift()
        .split('.')
        .shift();

const getProductMenuIndex = text =>
    text.trim()
        .split('.')
        .map(text => parseInt(text, 10) - 1);

const getMenuMarkdown = menuData =>
    menuData.map((category, categoryIndex) => {
        const productsText = category.products
            .map((product, productIndex) =>
                `- [${categoryIndex + 1}.${productIndex + 1}] **${product.name}** ${product.description || ''} (${product.price} zł)`)
            .join('\n');

        return `#${category.title}\n` + '___\n' + productsText;
    })
    .join('\n\n');
