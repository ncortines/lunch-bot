const Botkit = require('botkit');

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

const getFirstMatch = (string, regex) => {
    const result = string.match(regex);
    return result && result.length && result[1] || undefined;
};

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

const getMenuMarkdown = menuData =>
    menuData.map((category, categoryIndex) => {
        const productsText = category.products
            .map((product, productIndex) =>
                `- [${categoryIndex + 1}.${productIndex + 1}] **${product.name}** ${product.description || ''} (${product.price} zł)`)
            .join('\n');

        return `#${category.title}\n` + '___\n' + productsText;
    })
    .join('\n\n');

controller.setupWebserver(process.env.PORT || 3000, (err, webserver) => {
    controller.createWebhookEndpoints(webserver, bot, () => {
        console.log("SPARK: Webhooks set up!");
    });
});

controller.hears('hello', 'direct_message,direct_mention', (bot, message) => {
    const name = message.user.split('@')
        .shift()
        .split('.')
        .shift();

    bot.reply(message, 'Hi, ' + name);
});

controller.hears('menu', 'direct_message,direct_mention', (bot, message) => {
    console.log('getting menu...')
    getMaratonMenu()
        .then(menuData => {
            console.log('got the menu data')
            bot.reply(message, {markdown: getMenuMarkdown(menuData)});
        });
});

controller.on('direct_mention', (bot, message) => {
    bot.reply(message, 'You mentioned me and said, "' + message.text + '"');
});

controller.on('direct_message', (bot, message) => {
    bot.reply(message, 'I got your private message. You said, "' + message.text + '"');
});
