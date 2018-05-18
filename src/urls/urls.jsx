/** Class for URLS manipulation */
class URLS {
    /**
     * Create a URLS helper.
     * @param {string|null} proxyURL - proxy
     */
    constructor(proxyURL=null) {
        this.proxy = proxyURL
    }
    /**
     * This function encodes special characters. In addition, it encodes the following characters: , / ? : @ & = + $ #
     * @param {string} url url to encode
     * @returns {string} encoded url
     */
    encodeURL(url) {
        return encodeURIComponent(url)
    }
    /**
     * This function add paramters to url as query string
     * @param {string} url url to add paramters to 
     * @param {object} query paramters to be added to the url
     * @returns {string} paramterized url
     */
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
    /**
     * This function add paramters to url as query string
     * @param {string} url url to to be proxied
     * @returns {string} proxied url
     */
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