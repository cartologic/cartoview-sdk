import URLS from '../urls/urls'
import { doExternalGet } from '../utils/utils'
/** Class for Geocoding Search */
export class OSMGeoCoding {
    /**
    * Create a OSMGeoCoding instance.
    * @typedef {Object} Settings
    * @property {string} q - search keyword
    * @property {string} format - result format
    * @property {Number} addressdetails - osm address details
    * @property {Number} limit - result limit
    * @param {string} [url="https://nominatim.openstreetmap.org/search?"] geocoding service url
    * @param {Settings} [settings={q: '',format: 'json',addressdetails: 1,limit: 10,countrycodes: '','accept-language': 'en-US'}] geocoding service url
    */
    constructor(url = "https://nominatim.openstreetmap.org/search?", settings = {
        q: '',
        format: 'json',
        addressdetails: 1,
        limit: 10,
        countrycodes: '',
        'accept-language': 'en-US'
    }) {
        this.geocodingURL = url
        this.settings = settings
        this.urls = new URLS(null)
    }
    /**
    * this function return query string object for geocoding service
    * @param {string} query keyword to search by
    * @param {Settings}
    */
    getPatamters(query) {
        if (this.settings) {
            this.settings.q = query
            return this.OSMSettings
        }
        return {}
    }
    /**
    * this function url with query string if any
    * @param {string} query keyword to search by
    */
    getURL(query) {
        const paramters = this.getPatamters(query)
        return this.urls.getParamterizedURL(this.geocodingURL, paramters)
    }
    /**
    * this function performe search and return result
    * @param {string} query keyword to search by
    * @param {Function} callBack Function to be executed after result return , takes result of search as paramter
    */
    search(query, callBack) {
        this.url = this.getURL(query)
        doExternalGet(this.url).then(result => callBack(result))
    }
}
export default new OSMGeoCoding()