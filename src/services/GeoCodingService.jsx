import { moveBottomLeft, moveTopRight } from '../utils/math'

import URLS from '../urls/urls'
import { doExternalGet } from '../utils/utils'

/** @constant OSM_GEOCODING_URL
    @type {string}
    @default "https://nominatim.openstreetmap.org/search"
*/
export const OSM_GEOCODING_URL = "https://nominatim.openstreetmap.org/search"
/** @constant OSM_SETTINGS
    @type {object}
    @default {q: '',format: 'json',addressdetails: 1,limit: 10,countrycodes: '','accept-language': 'en-US'}
*/
export const OSM_SETTINGS = {
    q: '',
    format: 'json',
    addressdetails: 1,
    limit: 10,
    countrycodes: '',
    'accept-language': 'en-US'
}
/** @constant OPENCADGE_GEOCODING_URL
    @type {string}
    @default 'https://api.opencagedata.com/geocode/v1/json'
*/
export const OPENCADGE_GEOCODING_URL = 'https://api.opencagedata.com/geocode/v1/json'

/** @constant OPENCAGE_SETTINGS
    @type {object}
    @default {q: '',language: 'en',pretty: 1,key:'YOUR-API-KEY'}
*/
export const OPENCAGE_SETTINGS = {
    q: '',
    language: 'en',
    pretty: 1,
    key: 'YOUR-API-KEY'
}
/** @constant ESRI_GEOCODING_URL
    @type {string}
    @default "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"
*/
export const ESRI_GEOCODING_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"
/** @constant ESRI_SETTINGS
    @type {object}
    @default {q: '',language: 'en',pretty: 1,key:'YOUR-API-KEY'}
*/
export const ESRI_SETTINGS = {
    SingleLine: '',
    category: '',
    outFields: '*',
    forStorage: false,
    f: 'json'
}
/** @constant BOUNDLESS_GEOCODING_URL
    @type {string}
    @default "https://bcs.boundlessgeo.io/geocode/mapbox/address/"
*/
export const BOUNDLESS_GEOCODING_URL = "https://bcs.boundlessgeo.io/geocode/mapbox/address/"
/** @constant ESRI_SETTINGS
    @type {object}
    @default {version: '0.1',apikey: '',q: ''}
*/
export const BOUNDLESS_SETTINGS = {
    version: '0.1',
    apikey: '',
    q: ''
}
/** Class for Geocoding Search */
export class Geocoding {
    /**
    * Create a Geocoding instance.
    * @typedef {Object} Settings
    * @property {string} q - search keyword
    * @property {string} format - result format
    * @property {Number} addressdetails - osm address details
    * @property {Number} limit - result limit
    * @param {string} [url="https://nominatim.openstreetmap.org/search?"] geocoding service url
    * @param {Settings|object} [settings={q: '',format: 'json',addressdetails: 1,limit: 10,countrycodes: '','accept-language': 'en-US'}] geocoding service url
    */
    constructor(url = "https://nominatim.openstreetmap.org/search", settings = OSM_SETTINGS) {
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
            if (typeof (this.settings.q) !== 'undefined') {
                this.settings.q = query
            } else if (typeof (this.settings.SingleLine) !== 'undefined') {
                this.settings.SingleLine = query
            }
            return this.settings
        }
        return {}
    }
    /**
    * this function url with query string if any
    * @param {string} query keyword to search by
    */
    getURL(query) {
        const paramters = this.getPatamters(query)
        if (this.geocodingURL === BOUNDLESS_GEOCODING_URL) {
            const _params = { ...paramters }
            const address = _params.q
            delete _params.q
            return this.urls.getParamterizedURL(`${this.geocodingURL}${address}`, paramters)
        }
        return this.urls.getParamterizedURL(this.geocodingURL, paramters)


    }
    /**
    * this function return geocoding result
    * @param {any} response response of geocoding api
    * @typedef {Object} GeocodingItem
    * @property {Array.<Number>} bbox - bbox of item
    * @property {string} formatted - item formatted address
    * @property {Array.<Number>} location - item coordinate
    * @property {string} srs - projection code
    * @returns {Array.<GeocodingItem>} array of geocoding items
    */
    opencageResultHandler(response) {
        let result = response.results
        result = result.map((obj) => {
            const NE = obj.bounds ? obj.bounds.northeast : { lng: obj.geometry.lng, lat: obj.geometry.lat }
            const SW = obj.bounds ? obj.bounds.southwest : { lng: obj.geometry.lng, lat: obj.geometry.lat }
            return {
                bbox: [SW.lng, SW.lat, NE.lng, NE.lat],
                formatted: `${obj.annotations.flag || ""} ${obj.formatted}`,
                location: [obj.geometry.lng, obj.geometry.lat],
                srs: 'EPSG:4326'

            }
        })
        return result
    }
    boundlessResultHandler(response) {
        let result = response.geocodePoints
        result = result.map((obj) => {
            const location = [obj.x, obj.y]
            return {
                bbox: [...moveBottomLeft(location, 45, .1), ...moveTopRight(location, 45, .1)],
                formatted: `${obj.candidatePlace}`,
                location: [obj.x, obj.y],
                srs: 'EPSG:4326'

            }
        })
        return result
    }
    esriResultHandler(response) {
        let result = response.candidates
        result = result.map((obj) => {
            return {
                bbox: [obj.extent.xmin, obj.extent.ymin, obj.extent.xmax, obj.extent.ymax],
                formatted: `${obj.address}`,
                location: [obj.location.x, obj.location.y],
                srs: 'EPSG:4326'

            }
        })
        return result
    }
    /**
    * this function return geocoding result
    * @param {any} response response of geocoding api
    * @typedef {Object} GeocodingItem
    * @property {Array.<Number>} bbox - bbox of item
    * @property {string} formatted - item formatted address
    * @property {Array.<Number>} location - item coordinate
    * @returns {Array.<GeocodingItem>} array of geocoding items
    */
    osmResultHandler(response) {
        let result = response
        result = result.map((obj) => {
            return {
                bbox: obj.boundingbox ? obj.boundingbox.map(coord => parseFloat(coord)) : [obj.lon, obj.lat, obj.lon, obj.lat],
                formatted: obj.display_name,
                location: [obj.lon, obj.lat],
                srs: 'EPSG:4326'

            }
        })
        return result
    }
    /**
    * this function choose handler to transform response
    * @param {any} response response of geocoding api
    * @typedef {Object} GeocodingItem
    * @property {Array.<Number>} bbox - bbox of item
    * @property {string} formatted - item formatted address
    * @property {Array.<Number>} location - item coordinate
    * @returns {Array.<GeocodingItem>} array of geocoding items
    */
    transformResult(response) {
        let transformedResult = null
        switch (this.geocodingURL) {
        case OSM_GEOCODING_URL:
            transformedResult = this.osmResultHandler(response)
            break
        case OPENCADGE_GEOCODING_URL:
            transformedResult = this.opencageResultHandler(response)
            break
        case ESRI_GEOCODING_URL:
            transformedResult = this.esriResultHandler(response)
            break
        case BOUNDLESS_GEOCODING_URL:
            transformedResult = this.boundlessResultHandler(response)
            break
        default:
            this.transformResult = response
        }
        return transformedResult
    }
    /**
    * this function performe search and return result
    * @param {string} query keyword to search by
    * @param {Function} callBack Function to be executed after result return , takes result of search as paramter
    */
    search(query, callBack) {
        this.url = this.getURL(query)
        doExternalGet(this.url).then(response => callBack(this.transformResult(response)))
    }
}
export default new Geocoding()