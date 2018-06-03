import AnimationHelper from './AnimationHelper'
import GeoJSON from 'ol/format/geojson'
import Group from 'ol/layer/group'
import ImageWMS from 'ol/source/imagewms'
import TileWMS from 'ol/source/tilewms'
import URLS from '../urls/urls'
import Vector from 'ol/source/vector'
import { default as VectorLayer } from 'ol/layer/vector'
/** Class for Layers manipulation */
export class LayersHelper {
    /**
    * this function check if layer is a wms layer
    * @param {ol.layer} layer to be checked if it is wms layer or not
    * @returns {bool}
    */
    isWMSLayer(layer) {
        return layer.getSource() instanceof TileWMS || layer.getSource() instanceof ImageWMS
    }
    /**
    * this function return layer name from geoserver typename
    * @param {string} typeName layer typename
    * @returns {string} layer name
    */
    layerName(typeName) {
        return typeName.split(":").pop()
    }
    /**
    * this function return layer namespace/workspace from geoserver typename
    * @param {string} typeName layer typename
    * @returns {string} namespace/workspace
    */
    layerNameSpace(typeName) {
        return typeName.split(":")[0]
    }
    /**
    * this function return layer namespace/workspace from geoserver typename
    * @param {ol.layer} layer layer object
    * @param {string} [accessToken=null] the geoserver accessToken 
    * @param {string} [proxy=null] geoserver proxy(geonode proxy)
    * @returns {string} layer url
    */
    getLayerURL(layer, accessToken = null, proxy = null) {
        var wmsURL = null
        try {
            wmsURL = layer.getSource().getUrls()[0]
        } catch (err) {
            wmsURL = layer.getSource().getUrl()
        }
        return !accessToken ? wmsURL : new URLS(proxy).getParamterizedURL(wmsURL, { 'access_token': accessToken })
    }
    /**
    * this function return layer namespace/workspace from geoserver typename
    * @param {ol.Map} layer layer object
    * @returns {Array} map local layers (i.e layers without base layers)
    */
    getLocalLayers(map) {
        let layers = []
        map.getLayers().getArray().map(layer => {
            if (!(layer instanceof Group) && layer.get('type') !== 'base-group') {
                layers.push(layer)
            } else if (layer instanceof Group && layer.get('type') !== 'base-group') {
                layers.push(...this.getLocalLayers(layer))
            }
        })
        return layers.slice(0).reverse()
    }
    /**
    * this function return layer namespace/workspace from geoserver typename
    * @param {ol.Map} layer layer object
    * @returns {Array} map base layers (ex:osm)
    */
    getBaseLayers(map) {
        let layers = []
        map.getLayers().getArray().map(layer => {
            if (layer instanceof Group && layer.get('type') === 'base-group') {
                layer.getLayers().getArray().map(lyr => layers.push(lyr))
            }
        })
        return layers.slice(0).reverse()
    }
    /**
    * this function return legends of layers 
    * @param {Array.<ol.layer>} layer local layers
    * @param {string} accessToken is the geoserver access token
    * @param {string} proxy is the geoserver proxy/geonode proxy
    * @typedef {Object} Legend
    * @property {string} layer - The title of the layer
    * @property {string} url - The url of the legend
    * @returns {Array.<Legend>} array of Legend
    */
    getLegends(layers, accessToken, proxy = null) {
        let legends = []
        layers.map(layer => {
            if (layer.getVisible()) {
                const layerTitle = layer.getProperties().title
                legends.push({
                    layer: layerTitle,
                    url: this.getLegendURL(layer, accessToken, proxy)
                })
            }
        })
        return legends
    }
    /**
    * this function return legend for layer 
    * @param {ol.layer} layer local layers
    * @param {string} accessToken is the geoserver access token
    * @param {string} proxy is the geoserver proxy/geonode proxy
    * @typedef {Object} Legend
    * @property {string} layer - The title of the layer
    * @property {string} url - The url of the legend
    * @returns {Legend} layer legend object
    */
    getLegendURL(layer, accessToken, proxy = null) {
        let wmsURL = this.getLayerURL(layer, accessToken)
        let query = {
            'REQUEST': 'GetLegendGraphic',
            'VERSION': '1.0.0',
            'FORMAT': 'image/png',
            "LAYER": layer.getProperties().name
        }
        let url = new URLS(proxy).getParamterizedURL(wmsURL, query)

        return url
    }
    addSelectionLayer(map, featureCollection, styleFunction) {
        let source = new Vector({ features: featureCollection })
        new VectorLayer({
            source: source,
            style: styleFunction,
            title: "Selected Features",
            zIndex: 10000,
            format: new GeoJSON({
                defaultDataProjection: map.getView().getProjection(),
                featureProjection: map.getView().getProjection()
            }),
            map: map
        })
        source.on('addfeature', (e) => {
            AnimationHelper.flash(e.feature, map)
        })
    }
    /**
    * this function return map WMS layers from map layers
    * @param {Array.<ol.layer>} mapLayers local layers
    * @returns {Array.<ol.layer>} array of WMS Layers
    */
    getLayers(mapLayers) {
        let children = []
        mapLayers.forEach((layer) => {
            if (layer instanceof Group) {
                children = children.concat(this.getLayers(layer.getLayers()))
            } else if (layer.getVisible() && this.isWMSLayer(
                layer)) {
                children.push(layer)
            }
        })
        return children
    }
    /**
    * this function search for a WMS layer with name
    * @param {string} name LayerName
    * @returns {ol.layer|null}
    */
    getWMSLayer(name, layers) {
        let wmsLayer = null
        layers.forEach((layer) => {
            if (layer instanceof Group) {
                wmsLayer = this.getWMSLayer(name, layer.getLayers())
            } else if (this.isWMSLayer(layer) && layer.getSource()
                .getParams().LAYERS == name) {
                wmsLayer = layer
            }
            if (wmsLayer) {
                return false
            }
        })
        return wmsLayer
    }
}
export default new LayersHelper()