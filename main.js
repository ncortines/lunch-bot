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

controller.hears(['show(.*)order'], 'direct_message,direct_mention', async (bot, message) => {
    const request = message.match[1];
    const menu = await maraton.getMenu();
    let responseText;

    if (request && request.length && request.includes('my')) {
        const userOrderProductsIndexes = getUserOrderProductsIndexes(message.user);

        responseText = 'Hi ' + getUserMentionMarkdown(message) + ', ';

        if (userOrderProductsIndexes.length > 0) {
            const selectedProducts = mapProductIndexes(menu, userOrderProductsIndexes);

            responseText = responseText + 'your order currently has: \n ' + selectedProducts
                .map(getProductMarkdown)
                .join('\n')

            responseText = responseText + ' \n\n ' + 'Total is: **' +
                selectedProducts.reduce((total, product) => {
                    return total + product.price;
                }, 0).toFixed(2) + 'zł**';

        } else {
            responseText = responseText + 'your order is empty.';
        }
    } else {
        const currentOrderData = getCurrentOrderData(currentOrder, menu);
        if (currentOrderData.length > 0) {
            const orderTotal = getCurrentOrderTotal(currentOrderData);

            responseText = `#Current order details (${orderTotal.toFixed(2)}zł)\n ___\n `;
            responseText = responseText + currentOrderData.map(userInfo =>
                `##${getUserName(userInfo.user)} (${userInfo.total.toFixed(2)}zł)\n ___\n ` +
                    userInfo.products
                        .map(getProductMarkdown)
                        .join('\n') +
                    '\n')
                .join('\n\n');
        } else {
            responseText = 'The order is currently empty';
        }
    }
    bot.reply(message, {markdown: responseText});
});

controller.hears('add (.*)', 'direct_message,direct_mention', async (bot, message) => {
    const userOrderProductsIndexes = getUserOrderProductsIndexes(message.user);
    const request = message.match[1];
    const menu = await maraton.getMenu();
    const newSelectedProductIndexes = parseProductIndexes(request);
    const newSelectedProducts = mapProductIndexes(menu, newSelectedProductIndexes);

    let responseText = 'Hi ' + getUserMentionMarkdown(message) + ', ';

    if (!newSelectedProducts.length) {
        responseText = responseText + 'I have not updated your order because I could not find any of the things you requested.';
    } else if (newSelectedProducts.includes(undefined)) {
        responseText = responseText + 'I have not updated your order because I could not find some of the things you requested.';
    } else {
        responseText = responseText + 'I have updated your order.';
        userOrderProductsIndexes.push(...newSelectedProductIndexes);
    }
    if (userOrderProductsIndexes.length > 0) {
        responseText = responseText + '\n\n' + getUsersOrderMarkdown(mapProductIndexes(menu, userOrderProductsIndexes));
    } else {
        responseText = responseText + '\n\n' + 'Your order is empty.';
    }
    bot.reply(message, {markdown: responseText});
});

controller.hears('remove (.*)', 'direct_message,direct_mention', async (bot, message) => {
    const userOrderProductsIndexes = getUserOrderProductsIndexes(message.user);
    const request = message.match[1];
    const toRemoveProductIndexes = parseProductIndexes(request);
    const newUserOrderProductsIndexes = userOrderProductsIndexes.filter(productIndex =>
        !toRemoveProductIndexes.find(toRemoveIndex =>
            toRemoveIndex.toString() === productIndex.toString()
        )
    );

    let responseText = 'Hi ' + getUserMentionMarkdown(message) + ', ';

    if (userOrderProductsIndexes.length - newUserOrderProductsIndexes.length !== toRemoveProductIndexes.length) {
        responseText = responseText + 'I have not updated your order because I could not find in your order some of the things you requested to be removed.';
    } else {
        currentOrder[message.user] = newUserOrderProductsIndexes;
        responseText = responseText + 'I have updated your order.';
    }
    if (newUserOrderProductsIndexes.length > 0) {
        const menu = await maraton.getMenu();
        responseText = responseText + '\n\n' + getUsersOrderMarkdown(mapProductIndexes(menu, newUserOrderProductsIndexes));
    } else {
        responseText = responseText + '\n\n' + 'Your order is empty.';
    }
    bot.reply(message, {markdown: responseText});
});

controller.on(['direct_mention', 'direct_message'], (bot, message) => {
    bot.reply(message, 'Hi ' + getUserMentionMarkdown(message) + ', currently I understand only a few simple commands: "menu, "add [number,..]"');
});

const parseProductIndexes = text =>
    text.replace(',', ' ')
        .split(' ')
        .filter(product => product.includes('.'))
        .map(product => parseProductIndex(product));

const parseProductIndex = text =>
    text.trim()
        .split('.')
        .map(text => parseInt(text, 10) - 1);

let currentOrder;

const mapProductIndexes = (menu, indexes) =>
    indexes.map(([categoryIndex, productIndex]) => {
        const category = menu[categoryIndex];
        const products = category && category.products;
        const product = products && products[productIndex];
        return products && products[productIndex];
    });

const getCurrentOrderTotal = currentOrderData =>
    currentOrderData.reduce((total, userInfo) => total + userInfo.total, 0);

const getCurrentOrderData = (currentOrder, menu) => {
    if (currentOrder) {
        return Object.keys(currentOrder)
            .filter(user => currentOrder[user] && currentOrder[user].length > 0)
            .map(user => {
                const userProducts = mapProductIndexes(menu, currentOrder[user]);
                return {
                    user,
                    products: userProducts,
                    total: userProducts.reduce((total, product) => total + product.price, 0)
                };
            });
    }
    return [];
};

const getUserOrderProductsIndexes = user => {
    if (!currentOrder) {
        currentOrder = {};
    }
    if (!currentOrder[user]) {
        currentOrder[user] = [];
    }
    return currentOrder[user];
}

const getUserName = user =>
    user.split('@')
        .shift()
        .split('.')
        .shift();

const getUserMentionMarkdown = message =>
    `<@personId:${message.actorId}|${getUserName(message.user)}>`;

const getProductMarkdown = product =>
    `- [${product.categoryIndex + 1}.${product.productIndex + 1}] **${product.name}** ${product.description || ''} (${product.price} zł)`;

const getUsersOrderMarkdown = userProducts =>
    'Your order currently has: \n ' +
        userProducts
            .map(getProductMarkdown)
            .join('\n') +
        ' \n\n ' +
        'Total is: **' +
        userProducts
            .reduce((total, product) => total + product.price, 0)
            .toFixed(2) +
        'zł**';

const getMenuMarkdown = menuData =>
    menuData.map(category => {
        const productsText = category.products
            .map(getProductMarkdown)
            .join('\n');

        return `#${category.title}\n` + '___\n' + productsText;
    })
    .join('\n\n');
