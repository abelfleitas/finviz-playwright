async function getProxies() {
    const url = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text';
    const res = await fetch(url);
    const text = await res.text();
    return text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
}

function getRandomProxy(proxies) {
    const rnd = Math.floor(Math.random() * proxies.length);
    return proxies[rnd];
}

export { 
    getProxies, 
    getRandomProxy 
};