import URLS from '../urls/urls'

export default class Configuration {
    constructor(proxyURL = null) {
        this.urls = new URLS(proxyURL)
    }
    getMapApiURL(MapsURL, username, userMaps = false, limit, offset, query = {}) {
        let params = {
            'limit': limit,
            'offset': offset,
            ...query
        }
        if (userMaps) {
            params['owner__username'] = username
        }
        const url = this.urls.getParamterizedURL(MapsURL, params)
        return url
    }
    getMapApiSearchURL(MapsURL, username, userMaps = false, text) {
        let params = { 'title__contains': text }
        if (userMaps) {
            params['owner__username'] = username
        }

        const url = this.urls.getParamterizedURL(MapsURL, params)
        return url
    }
}