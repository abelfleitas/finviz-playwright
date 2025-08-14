async function getProxies() {
    const url = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text';
    const res = await fetch(url);
    const text = await res.text();
    return text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

async function testProxy(proxy) {
    try {
        const browser = await firefox.launch({
            headless: true,
            proxy: { server: proxy }
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://www.google.com', { timeout: 8000 });
        await browser.close();
        return true;
    } catch {
        return false; 
    }
}

function getRandomProxy(proxies) {
    const rnd = Math.floor(Math.random() * proxies.length);
    return proxies[rnd];
}

module.exports = { 
    getProxies, 
    getRandomProxy, 
    testProxy 
};
