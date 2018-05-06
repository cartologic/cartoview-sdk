class URLS {
    constructor(proxyURL) {
        this.proxy = proxyURL
    }
    encodeURL(url) {
        return encodeURIComponent(url)
    }
    getParamterizedURL(url, query) {
        let newURL = url
        if (query && query != {}) {
            if (Object.keys(query).length > 0 && newURL.indexOf('?') === -1) {
                newURL += '?'
            } else {
                newURL += '&'
            }
            let newQuery = []
            Object.keys(query).map((key) => {
                newQuery.push(`${key}=${query[key]}`)
            })
            newURL += newQuery.join('&')
        }
        return newURL
    }
    getProxiedURL(url) {
        const proxy = this.proxy
        let proxiedURL = url
        if (proxy) {
            proxiedURL = this.proxy + this.encodeURL(url)
        }
        return proxiedURL
    }
}
export default URLS