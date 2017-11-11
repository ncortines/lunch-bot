const Botkit = require('botkit');
const fetch = require('node-fetch');

const controller = Botkit.sparkbot({
    debug: true,
    log: true,
    // limit_to_domain: ['mycompany.com'],
    // limit_to_org: 'my_cisco_org_id',
    public_address: 'https://aeea4de9.ngrok.io', // process.env.public_address,
    ciscospark_access_token: 'MmI1M2RlZGItNzE2ZS00YTgxLTllMjgtZTU0MTJiYjBhYjgwMDQ5NTM3YmYtZmJl', // process.env.access_token,
    // studio_token: process.env.studio_token, // get one from studio.botkit.ai to enable content management, stats, message console and more
    secret: 'sm@rtl11nch', // process.env.secret, // this is an RECOMMENDED but optional setting that enables validation of incoming webhooks
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

const getMarkdown = menuData =>
    menuData.map((category, categoryIndex) => {
        const productsText = category.products
            .map((product, productIndex) =>
                `- [${categoryIndex + 1}.${productIndex + 1}] **${product.name}** ${product.description || ''} (${product.price} zł)`)
            .join('\n');

        return `#${category.title}\n` + '___\n' + productsText;
    })
    .join('\n\n');

const getMaratonMenu = () =>
    fetch('http://www.barmaraton.pl/')
        .then(response => response.text())
        .then(text =>
            getMatches(text, /<div class="menucat".*?>([\s\S]*?)<\/div>/g)
                .map(category => ({
                    title: getFirstMatch(category, /<h3 class="category">(.*?)<\/h3>/),
                    products: getMatches(category, /<li itemscope itemtype="http:\/\/schema\.org\/Product">([\s\S]*?)<\/li>/g)
                        .map(product => ({
                            name: getFirstMatch(product, /<b itemprop="name">(.*?)<\/b>/),
                            price: parsePrice(getFirstMatch(product, /<span class="price" itemprop="price">(.*?)<\/span>/)),
                            description: getFirstMatch(product, /<span itemprop="description">(.*?)<\/span>/)
                        }))
                    })));

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
            console.log(getMarkdown(menuData))
            bot.reply(message, {markdown: getMarkdown(menuData)});
        });
});

controller.on('direct_mention', (bot, message) => {
    bot.reply(message, 'You mentioned me and said, "' + message.text + '"');
});

controller.on('direct_message', (bot, message) => {
    bot.reply(message, 'I got your private message. You said, "' + message.text + '"');
});
