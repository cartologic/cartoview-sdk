class URLS {
    constructor(proxyURL) {
        this.proxy = proxyURL
    }
    encodeURL = (url) => {
        return encodeURIComponent(url).replace(/%20/g, '+')
    }
    getParamterizedURL = (url, query) => {
        let newURL = url
        if (Object.keys(query).length > 0 && newURL.indexOf('?') === -1) {
            newURL += '?'
        } else {
            newURL += '&'
        }
        let newQuery = []
        Object.keys(query).map((key, index) => {
            newQuery.push(`${key}=${query[key]}`)
        })
        return newURL + newQuery.join('&')
    }
    getProxiedURL = (url) => {
        const proxy = this.proxy
        let proxiedURL = url
        if (proxy) {
            proxiedURL = this.proxy + this.encodeURL(url)
        }
        return proxiedURL
    }
}
export default URLS
