import { doExternalGet, doGet } from '../utils/utils'

import BasicViewerHelper from './BasicViewerHelper'
import GeoJSON from 'ol/format/geojson'
import LayersHelper from './LayersHelper'
import URLS from '../urls/urls'
import WMSGetFeatureInfo from 'ol/format/wmsgetfeatureinfo'
import proj4 from 'proj4'

/** @constant wmsGetFeatureInfoFormats
    @type {Object}
    @default
*/
export const wmsGetFeatureInfoFormats = {
    'application/json': new GeoJSON(),
    'application/vnd.ogc.gml': new WMSGetFeatureInfo()
}
/** Class for Features manipulation */
export class FeatureHelper {
    /**
    * This function return openlayers format
    * @param {string} format desired format one of application/json or application/vnd.ogc.gml
    * @returns {ol.format} instance of openlayers format
    */
    getFormat(format) {
        return wmsGetFeatureInfoFormats[format]
    }
    /**
    * This function return feature info url
    * @param {ol.layer} layer openlayers layer to get url from
    * @param {ol.Coordinate} coordinate coordinate 
    * @param {ol.View} view view  map view
    * @param {ol.format} infoFormat format of result
    * @param {string} [token=null] user access token
    * @param {number} [featureCount=null] max number of features to return
    * @returns {string}
    */
    getFeatureInfoUrl(layer, coordinate, view, infoFormat, token = null, featureCount = 10) {
        const resolution = view.getResolution(),
            projection = view.getProjection()
        const url = layer.getSource().getGetFeatureInfoUrl(coordinate,
            resolution, projection, {
                'INFO_FORMAT': infoFormat
            })
        let query = {
            "FEATURE_COUNT": featureCount
        }
        if (token) {
            query.access_token = token
        }
        const paramterizedURL = new URLS(null).getParamterizedURL(url, query)
        return paramterizedURL
    }
    getFeatureByURL(proxyURL = null, url) {
        const proxiedURL = new URLS(proxyURL).getProxiedURL(url)
        return doGet(proxiedURL)
    }
    /**
    * This function return feature info url
    * @param {ol.layer} layer openlayers layer to get url from
    * @param {Array.<ol.Feature>} features to be transformed 
    * @param {ol.Map} map openlayers map instance
    * @param {Number} crs target Projection
    * @param {Array} [attributes=[]] Layer Attributes
    * @returns {Array.<ol.Feature>}
    */
    transformFeatures(layer, features, map, crs, attributes = []) {
        let transformedFeatures = []
        features.forEach((feature) => {
            feature.getGeometry().transform('EPSG:' + crs, map.getView()
                .getProjection())
            if (attributes && attributes.length > 0) {
                let attributesAlias = {}
                attributes.map(metaAttr => attributesAlias[metaAttr.attribute] = metaAttr.attribute_label)
                feature.set("_attributesAlias", attributesAlias)
            }
            feature.set("_layerTitle", layer.get('title'))
            feature.set("_layerName", layer.get('name'))
            transformedFeatures.push(feature)
        })
        return transformedFeatures
    }
    /**
    * This function return feature info url
    * @param {string} metaAtrributesURL layer attributes api url
    * @returns {Promise}
    */
    getAtrributes(metaAtrributesURL) {
        return doGet(metaAtrributesURL)
    }
    getCoordsCenter(coords) {
        if (coords.length === 2 && typeof coords[0] === "number") {
            return coords
        }
        return this.getCoordsCenter(coords[Math.floor(coords.length / 2)])
    }
    /**
    * This function return center of geometry
    * @param {ol.geom} geometry layer attributes api url
    * @returns {Array.<Number>}
    */
    getGeometryCenter(geometry) {
        const type = geometry.getType()
        let center = null
        switch (type) {
        case 'LineString': {
            const coords = geometry.getCoordinates()
            center = this.getCoordsCenter(coords)
            break
        }
        case 'MultiLineString': {
            const coords = geometry.getCoordinates()
            center = this.getCoordsCenter(coords)
            break
        }
        default: {
            const extent = geometry.getExtent()
            center = BasicViewerHelper.getCenterOfExtent(extent)
            break
        }
        }
        return center
    }
    /**
    * This function used to identify features
    * @param {ol.Map} map openlayers map instance
    * @param {ol.Coordinate} coordinate coordinate 
    * @param {string} [proxyURL=null] view  map view
    * @param {string} [token=null] user access token
    * @param {string} [metaAtrributesURL=null] layer atrributes api url
    * @returns {Array.<ol.Feature>}
    */
    featureIdentify(map, coordinate, proxyURL = null, token, metaAtrributesURL = null) {
        const view = map.getView()
        const layers = LayersHelper.getLayers(map.getLayers().getArray()).reverse()
        let identifyPromises = layers.map(
            (layer) => {
                let attributes = []
                const layerName = layer.get("name")
                let identifyPromiseHandler = new Promise((resolve, reject) => {
                    if (metaAtrributesURL) {
                        this.getAtrributes(metaAtrributesURL + "?layer__typename=" + layerName).then(metaAttributes => {
                            attributes = metaAttributes.objects
                            this.readFeaturesThenTransform(proxyURL, layer, coordinate, view, map, token, attributes).then(result => {
                                resolve(result)
                            }).catch(err => {
                                console.error(`Layer ${layerName} => Feature Identify Error:`, err)
                                resolve([])
                            })
                        })
                    }
                    else {
                        this.readFeaturesThenTransform(proxyURL, layer, coordinate, view, map, token, attributes).then(result => {
                            resolve(result)
                        }).catch(err => {
                            console.error(`Layer ${layerName} => Feature Identify Error:`, err)
                            resolve([])
                        })
                    }
                })
                return identifyPromiseHandler


            })
        let identifyAllPromise = new Promise((resolve, reject) => {
            Promise.all(identifyPromises).then(result => {
                let featureIdentifyResult = result.reduce((array1,
                    array2) => array1.concat(array2), [])
                //sort features based on layer order
                let sortedFeatures = []
                layers.forEach(lyr => {
                    const layerName = lyr.get('name')
                    featureIdentifyResult.map(f => {
                        const featureLayer = f.get('_layerName')
                        if (layerName === featureLayer) {
                            sortedFeatures.push(f)
                        }
                    })
                }, this)
                resolve(sortedFeatures)
            })
        })
        return identifyAllPromise

    }
    /**
    * This function check if crs defiend or not , if not defined if define the crs and return it back
    * @param {Number} crs projection number e.g 4326
    * @returns {Promise}
    */
    getCRS(crs) {
        let promise = new Promise((resolve, reject) => {
            if (proj4.defs('EPSG:' + crs)) {
                resolve(crs)
            } else {
                doExternalGet(`https://epsg.io/?format=json&q=${crs}`).then(
                    projres => {
                        proj4.defs('EPSG:' + crs, projres.results[
                            0].proj4)
                        resolve(crs)
                    }).catch(err => { reject(err) })
            }
        })
        return promise
    }
    /**
    * This function return feature info url
    * @param {string} [proxyURL=null] user access token
    * @param {ol.layer} layer openlayers layer to get url from
    * @param {ol.Coordinate} coordinate coordinate 
    * @param {ol.View} view view  map view
    * @param {ol.Map} map openlayers map instance
    * @param {string} user access token
    * @param {Array} attributes layer attributes
    * @returns {Array.<ol.Feature>}
    */
    readFeaturesThenTransform(proxyURL = null, layer, coordinate, view, map, token, attributes) {
        const url = this.getFeatureInfoUrl(layer, coordinate, view,
            'application/json', token)
        return this.getFeatureByURL(proxyURL, url).then(
            (result) => {
                var promise = new Promise((resolve, reject) => {
                    const features = wmsGetFeatureInfoFormats[
                        'application/json'].readFeatures(
                            result)
                    if (features.length > 0) {
                        const crs = result.features.length > 0 ?
                            result.crs.properties.name.split(":").pop() : null
                        this.getCRS(crs).then((newCRS) => {
                            const transformedFeatures = this.transformFeatures(
                                layer, features,
                                map, newCRS, attributes)
                            resolve(transformedFeatures)
                        }, (error) => {
                            reject(error)
                        })
                    } else {
                        resolve([])
                    }
                })
                return promise
            })
    }

}
export default new FeatureHelper()