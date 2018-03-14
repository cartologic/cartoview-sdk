class URLS {
    constructor(urls) {
        this.urls = urls
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
    getMapApiURL = (username, userMaps = false, limit, offset, query = {}) => {
        let params = {
            'limit': limit,
            'offset': offset,
            ...query
        }
        if (userMaps) {
            params['owner__username'] = username
        }
        const url = this.getParamterizedURL(this.urls.MapsAPI, params)
        return url
    }
    getMapApiSearchURL = (username, userMaps = false, text) => {
        let params = { 'title__contains': text }
        if (userMaps) {
            params['owner__username'] = username
        }

        const url = this.getParamterizedURL(this.urls.MapsAPI, params)
        return url
    }
    getProxiedURL = (url) => {
        const proxy = this.urls.proxy
        let proxiedURL = url
        if (proxy) {
            proxiedURL = this.urls.proxy + this.encodeURL(url)
        }
        return proxiedURL
    }
}
export default URLS
