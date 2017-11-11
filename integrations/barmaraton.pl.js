const fetch = require('node-fetch');

const getMenu = () =>
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

module.exports = {getMenu};
