import URLS from '../urls/urls'
const nominatimURL = " http://nominatim.openstreetmap.org/search?"
class OSMGeoCoding {
    constructor() {
        this.OSMSettings = {
            q: '',
            format: 'json',
            addressdetails: 1,
            limit: 10,
            countrycodes: '',
            'accept-language': 'en-US'
        }
        this.url = null
        this.urls = new URLS({})
    }
    getPatamters = (query) => {
        this.OSMSettings.q = query
        return this.OSMSettings
    }
    getURL = (query) => {
        const paramters = this.getPatamters(query)
        return this.urls.getParamterizedURL(nominatimURL, paramters)
    }
    doGet = () => {
        return fetch(this.url, {
            method: 'GET'
        }).then((response) => {
            return response.json()
        })
    }
    search = (query, callBack) => {
        this.url = this.getURL(query)
        this.doGet().then(result => callBack(result))
    }
}
export default new OSMGeoCoding()
