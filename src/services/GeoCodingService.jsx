import URLS from '../urls/urls'
import { doExternalGet } from '../utils/utils'

class OSMGeoCoding {
    constructor() {
        this.nominatimURL = "https://nominatim.openstreetmap.org/search?"
        this.OSMSettings = {
            q: '',
            format: 'json',
            addressdetails: 1,
            limit: 10,
            countrycodes: '',
            'accept-language': 'en-US'
        }
        this.url = null
        this.urls = new URLS(null)
    }
    getPatamters(query) {
        this.OSMSettings.q = query
        return this.OSMSettings
    }
    getURL(query) {
        const paramters = this.getPatamters(query)
        return this.urls.getParamterizedURL(this.nominatimURL, paramters)
    }
    search(query, callBack) {
        this.url = this.getURL(query)
        doExternalGet(this.url).then(result => callBack(result))
    }
}
export default new OSMGeoCoding()
