/** @constant DOTS_PER_INCH
    @type {Number}
    @default
*/
const DOTS_PER_INCH = 96
/** @constant INCHES_PER_METER
    @type {Number}
    @default
*/
const INCHES_PER_METER = 39.37
export const PRINT_LAYER_NAME = "sdk_print_lyr"

import { doGet, doPost, downloadFile } from '../utils/utils'
import { moveBottomLeft, moveBottomRight, moveTopLeft, moveTopRight } from '../utils/math'

import BasicViewerHelper from '../helpers/BasicViewerHelper'
import Collection from 'ol/collection'
import Feature from 'ol/feature'
import LayersHelper from '../helpers/LayersHelper'
import Modify from 'ol/interaction/modify'
import Polygon from 'ol/geom/polygon'
import StyleHelper from '../helpers/StyleHelper'
import Translate from 'ol/interaction/translate'
import URLS from '../urls/urls'
import Vector from 'ol/layer/vector'
import { default as VectorSource } from 'ol/source/vector'
import { convToDegree } from '../utils/math'
import proj from 'ol/proj'
import { sources } from '../services/MapConfigService'

/** Class for Geoserver Print manipulation */
class Print {
    /**
    * Create a Print instance.
    * @param {ol.Map} map map to be printed
    * @param {string} geoserverURL geoserver URL
    * @param {string} accessToken user accessToken
    * @param {string} [proxyURL=null] geonode/geoserver proxy URL
    */
    constructor(map, geoserverURL, accessToken, proxyURL = null) {
        this.map = map
        this.geoserverURL = `${geoserverURL}`
        this.geoserverWMSURL = `${geoserverURL}wms${accessToken ? `?access_token=${accessToken}` : ""}`
        this.infoURL = `${geoserverURL}pdf/info.json`
        this.pdfInfo = null
        this.dpi = DOTS_PER_INCH
        this.geoserverScales = null
        this.proxyURL = proxyURL
        this.geoserverPdfURL = `${this.geoserverURL}pdf/`
        this.accessToken = accessToken
        this.urls = new URLS(this.proxyURL)
        this.getPrintInfo().then(result => this.getGeoserverScales())
        this.featureCollection = new Collection()
        this.translate = new Translate({
            features: this.featureCollection
        })
    }
    /**
    * this function return geoserver print allowed DPIS
    * @returns {Promise}
    */
    getGeoserverDPIS() {
        let dpisPromise = new Promise((resolve, reject) => {
            if (!this.pdfInfo) {
                this.getPrintInfo().then(pdfInfo => resolve(pdfInfo.dpis)).catch(err => reject(err))
            } else {
                resolve(this.pdfInfo.dpis)
            }
        })
        return dpisPromise
    }
    /**
    * this function return geoserver print capabilities
    * @returns {Promise}
    */
    getPrintInfo() {
        let infoPromise = new Promise((resolve, reject) => {
            const targetURL = this.urls.getProxiedURL(this.infoURL)
            if (!this.pdfInfo) {
                doGet(targetURL).then(result => {
                    this.pdfInfo = result
                    resolve(this.pdfInfo)
                }).catch(err => reject(err))
            } else {
                resolve(this.pdfInfo)
            }
        })
        return infoPromise
    }
    _getLayout(layout) {
        const layouts = this.pdfInfo.layouts
        let targetLayout = null
        if (layout) {
            for (let i = 0; i < layouts.length; i++) {
                const l = layouts[i]
                if (l.name === layout) {
                    targetLayout = l
                    break
                }
            }
        }
        else {
            targetLayout = layouts[0]
        }
        return targetLayout
    }
    _getMetersPerUnit(unit) {
        return proj.METERS_PER_UNIT[unit]
    }
    /**
    * this function print polygon coords
    * @param {Number} printScale 
    * @param {Number} [dpi=DOTS_PER_INCH] DPI
    * @param {string} [layout=null]  print layout name
    * @returns {Array.<Number>} extent
    */
    getPolygonCoords(printScale, dpi = DOTS_PER_INCH, layout = null) {
        // var geom = this.feature.geometry
        // var center = geom.getBounds().getCenterLonLat()
        // var size = this.printProvider.layout.get("size")
        // var units = units || this.feature.layer.map.baseLayer.units || "dd"
        // var unitsRatio = OpenLayers.INCHES_PER_UNIT[units]
        // var w = size.width / 72 / unitsRatio * s / 2
        // var h = size.height / 72 / unitsRatio * s / 2
        // return new OpenLayers.Bounds(center.lon - w, center.lat - h, center.lon + w, center.lat + h);
        const view = this.map.getView()
        const mapProjection = view.getProjection()
        const units = this._getMetersPerUnit(mapProjection.getUnits())
        const mapCenter = view.getCenter()
        layout = this._getLayout(layout)
        const unitsRatio = units * INCHES_PER_METER
        const printMapSize = [layout.map.width, layout.map.height]
        const scaleWidth = printMapSize[0] / dpi / unitsRatio * printScale / 2
        const scaleHeight = printMapSize[1] / dpi / unitsRatio * printScale / 2
        const extent = [mapCenter[0] - scaleWidth, mapCenter[1] - scaleHeight, mapCenter[0] + scaleWidth, mapCenter[1] + scaleHeight]
        // const resolution = view.getResolution()
        // const scaleWidth = (((size[0] / dpi) / INCHES_PER_METER) * printScale / resolution) / 2
        // const scaleHeight = (((size[1] / dpi) / INCHES_PER_METER) * printScale / resolution) / 2
        // const distance = Math.sqrt((Math.pow(scaleWidth, 2) + Math.pow(scaleHeight, 2))) / 2
        // let p1 = moveTopLeft([size[0] / 2, size[1] / 2], 45, distance)
        // let p2 = moveTopRight([size[0] / 2, size[1] / 2], 45, distance)
        // let p3 = moveBottomLeft([size[0] / 2, size[1] / 2], 45, distance)
        // let p4 = moveBottomRight([size[0] / 2, size[1] / 2], 45, distance)
        // p1 = this.map.getCoordinateFromPixel(p1)
        // p2 = this.map.getCoordinateFromPixel(p2)
        // p3 = this.map.getCoordinateFromPixel(p3)
        // p4 = this.map.getCoordinateFromPixel(p4)
        return extent
    }
    getOptimalResolution(printMapSize, printMapScale, dpi = DOTS_PER_INCH) {
        const mapSize = this.map.getSize()
        const dotsPerMeter = dpi * INCHES_PER_METER

        const resolutionX = (printMapSize[0] * printMapScale) / (dotsPerMeter * mapSize[0])
        const resolutionY = (printMapSize[1] * printMapScale) / (dotsPerMeter * mapSize[1])

        const optimalResolution = Math.max(resolutionX, resolutionY)
        return optimalResolution
    }
    getOptimalScale(printMapSize, dpi = DOTS_PER_INCH) {
        const printMapScales = this.getGeoserverScales()
        const mapSize = this.map.getSize()
        const view = this.map.getView()
        const mapResolution = view.getResolution()
        const mapWidth = mapSize[0] * mapResolution
        const mapHeight = mapSize[1] * mapResolution
        const scaleWidth = mapWidth * INCHES_PER_METER * dpi / printMapSize[0]
        const scaleHeight = mapHeight * INCHES_PER_METER * dpi / printMapSize[1]
        const scale = Math.min(scaleWidth, scaleHeight)
        let optimal = -1
        for (let i = 0, ii = printMapScales.length; i < ii; ++i) {
            if (scale > printMapScales[i]) {
                optimal = printMapScales[i]
            }
        }

        return optimal
    }
    _getPolygonGeomtry(extent) {
        return new Polygon.fromExtent(extent)
    }
    /**
    * this function return feature with polygon geometry
    * @param {ol.Extent|Array.<Number>} extent geometry Extent
    * @param {string} [geometryName="the_geom"] geometry name
    * @returns {ol.Feature} feature
    */
    getPolygonFeature(extent, geometryName = "the_geom") {
        let feature = new Feature({})
        feature.setGeometryName(geometryName)
        feature.setGeometry(this._getPolygonGeomtry(extent))
        return feature
    }
    getPrintLayer() {
        let lyr = new Vector({
            source: new VectorSource({
                features: this.featureCollection
            }),
            style: new StyleHelper().styleFunction,
        })
        lyr.set('name', PRINT_LAYER_NAME)
        return lyr
    }
    _getPrintLayer() {
        let targetLayer = null
        const layers = LayersHelper.getLocalLayers(this.map)
        for (let i = 0; i < layers.length; i++) {
            const lyr = layers[i]
            if (lyr.get('name') === PRINT_LAYER_NAME) {
                targetLayer = lyr
                break
            }
        }
        return targetLayer
    }
    _checkPrintLayer() {
        return this._getPrintLayer() !== null ? true : false
    }
    addPrintLayer(feature) {
        if (!this._checkPrintLayer()) {
            this.featureCollection.extend([feature])
            let layer = this.getPrintLayer(feature)
            this.map.addLayer(layer)
            this.map.addInteraction(this.translate)
        } else {
            this.featureCollection.clear()
            this.featureCollection.extend([feature])
        }
    }
    getModifyInteraction() {
        let modifyInteraction = new Modify({
            features: this.featureCollection,
            pixelTolerance: 32
        })
        return modifyInteraction
    }
    removePrintLayer() {
        const lyr = this.getPrintLayer()
        if (lyr) {
            this.map.removeLayer(lyr)
            this.map.removeInteraction(this.translate)
        }
    }
    /**
    * this function return geoserver print scales values
    * @returns {Promise}
    */
    getGeoserverScales() {
        let scales = this.pdfInfo.scales.map(scale => Number(scale.value))
        this.geoserverScales = scales
        return scales
    }
    /**
    * this function return geoserver print scale index by it's value
    * @param {string} title print Title
    * @param {string} comment print Comment
    * @param {string} layout print Layout
    * @param {Number} dpi print DPI
    * @param {Number} scale print Scale
    * @returns {Promise}
    */
    createPDF(title, comment, layout, dpi, scale) {
        let targetURL = this.geoserverPdfURL + "create.json"
        targetURL = this.urls.getParamterizedURL(targetURL, { "access_token": this.accessToken })
        const proxiedURL = this.urls.getProxiedURL(targetURL)
        doPost(proxiedURL, this.printPayload(title, comment, layout, scale, dpi), { 'content-type': 'application/json' }).then(result => {
            let pdfURL = result.getURL
            const pfdFileID = pdfURL.split('/').pop()
            let downloadURL = this.urls.getParamterizedURL(this.geoserverPdfURL + pfdFileID, { "access_token": this.accessToken })
            downloadURL = this.urls.getProxiedURL(this.geoserverPdfURL + pfdFileID)
            downloadFile(downloadURL, "print.pdf")
        })
    }
    /**
    * this function return geoserver print scale index by it's value
    * @returns {Promise}
    */
    getScaleIndex(target) {
        let index = -1
        for (let i = 0; i < this.pdfInfo.scales; i++) {
            const scale = this.pdfInfo.scales
            if (target === Number(scale.value)) {
                index = i
                break
            }
        }
        return index
    }
    /**
    * this function return the geoserver proper scale close to openlayers one
    * @param {Number} scale print Scale
    * @returns {Number}
    */
    getClosestScale(scale) {
        if (this.geoserverScales) {
            return this.geoserverScales.reduce((prevScale, currentScale) => Math.abs(currentScale - scale) < Math.abs(prevScale - scale) ? currentScale : prevScale)
        }
        return 0.35

    }
    /**
    * this function return scale from resolution and dpi
    * @param {Number} [resolution=null] map view Resolution
    * @param {Number} [dpi=DOTS_PER_INCH] map view Resolution
    * @returns {Number} scale value
    */
    getScaleFromResolution(resolution = null, dpi = DOTS_PER_INCH) {
        const mapResolution = !resolution ? this.map.getView().getResolution() : resolution
        const mapProjection = this.map.getView().getProjection()
        const pointResolution = mapProjection.getMetersPerUnit() * mapResolution
        return Math.round(pointResolution * dpi * INCHES_PER_METER)
    }
    /**
    * this function return resolution based on scale and dpi
    * @param {Number} scale Scale
    * @param {Number} dpi DPI
    * @returns {Number} resolution value
    */
    getResolutionFromScale(scale, dpi) {
        const mapProjection = this.map.getView().getProjection()
        let resolution = parseFloat(scale) / (dpi * INCHES_PER_METER * mapProjection.getMetersPerUnit())
        return resolution
    }
    /**
    * this function return mapping for DPIS and Scales
    * @param {Number} scale Scale
    * @param {Number} dpi DPI
    * @returns {Object}
    */
    getMapScales() {
        let scales = {}
        this.pdfInfo.dpis.map(dpi => {
            const dpiNumber = Number(dpi.value)
            scales[dpi.name] = this.getScaleFromResolution(null, dpiNumber)
        })
        return scales
    }
    /**
    * this function return Layer Source Paramters
    * @param {ol.layer} layer Layer to get params for
    * @returns {any}
    */
    getLayerParams(layer) {
        return layer.getSource().getParams()
    }
    /**
    * this function return Print Legend Item
    * @typedef {Object} Legend
    * @property {string} layer - The title of the layer
    * @property {string} url - The url of the legend
    * @typedef {Object} LegendClass
    * @property {string} name - The title of the layer
    * @property {Array.<string>} icons - array of legend urls
    * @typedef {Object} PrintLegend
    * @property {string} name - layer name
    * @property {Array.<LegendClass>} classes - The url of the legend
    * @param {Legend} legend Layer legend
    * @returns {PrintLegend}
    */
    getLegendItem(legend) {
        let legendItem = {
            name: legend.layer,
            classes: [
                {
                    "name": "",
                    "icons": [legend.url]
                }
            ]
        }
        return legendItem
    }
    /**
    * this function return Print Legends
    * @returns {Array.<PrintLegend>}
    */
    getPrintLegends() {
        const layers = LayersHelper.getLocalLayers(this.map)
        let printLegends = LayersHelper.getLegends(layers, this.accessToken).map(legend => this.getLegendItem(legend))
        return printLegends
    }
    /**
    * this function return layer source type
    * @param {ol.layer} lyr openlayers layer to get type for
    * @returns {string|null}
    */
    getSourceType(lyr) {
        const source = lyr.getSource()
        let type = null
        const sourceTypes = Object.keys(sources)
        for (let i = 0; i < Object.keys(sources).length; i++) {
            const sourceType = sourceTypes[i]
            const sourceClass = sources[sourceType]
            if (source instanceof sourceClass) {
                type = sourceType
                break
            }
        }
        return type
    }
    /**
    * this function return world extent for base Layer like OSM
    * @param {ol.layer} lyr openlayers layer to get world extent for
    * @returns {Array.<Number>}
    */
    getBaseLayerMaxExtent(lyr) {
        const sourceProjection = lyr.getSource().getProjection()
        return sourceProjection.getWorldExtent()

    }
    /**
    * this function return map base layers ex: OSM,GoogleMaps
    * @returns {Array.<ol.layer>}
    */
    getBaseLayers() {
        let baseLayers = LayersHelper.getBaseLayers(this.map).filter(baselyr => baselyr.getVisible())
        baseLayers = baseLayers.map(baseLayer => {
            const tileGrid = baseLayer.getSource().getTileGrid()
            const tileSize = tileGrid.getTileSize()
            const layerURL = new URL(LayersHelper.getLayerURL(baseLayer))
            let maxExtent = this.getBaseLayerMaxExtent(baseLayer)
            maxExtent = BasicViewerHelper.reprojectExtent(maxExtent, this.map)
            let lyr = {
                baseURL: layerURL.origin,//TODO: get the correct URL
                opacity: baseLayer.getOpacity(),
                maxExtent,
                // type: this.getSourceType(baseLayer),
                type: "OSM",//TODO:Check types supported by openlayers in geoserver
                tileSize: [
                    tileSize,
                    tileSize
                ],
                extension: "png",
                resolutions: baseLayer.getSource().getTileGrid().getResolutions()
            }
            return lyr
        })
        return baseLayers
    }
    /**
    * this function return layer objects for print
    * @returns {Array}
    */
    getPrintLocalLayers() {
        let layers = LayersHelper.getLocalLayers(this.map)
        layers = layers.map(lyr => {
            if (lyr.getVisible()) {
                const params = lyr.getSource().getParams()
                const layerObj = {
                    baseURL: LayersHelper.getLayerURL(lyr, this.accessToken),
                    opacity: lyr.getOpacity(),
                    // singleTile: false,
                    type: "WMS",//TODO: get layer type from openlayers
                    // layers: [lyr.getProperties().name],
                    layers: params['LAYERS'].split(','),
                    format: this.getSourceFormat(lyr), // TODO get format from source
                    styles: [],
                    version: params['VERSION'],
                    customParams: {
                        ...this.getCustomParams(lyr)
                    }
                }
                return layerObj
            }
        })
        return layers.reverse()
    }
    /**
    * this function return full print Object to send to geoserver
    * @returns {object}
    */
    getPrintObj(options = { dpi: DOTS_PER_INCH, layout: null, title: "", comment: "", scale: null }) {
        let { dpi, title, comment, layout, scale } = options
        const srs = this.map.getView().getProjection().getCode()
        const rotationRadian = this.map.getView().getRotation()
        const center = this.map.getView().getCenter()
        let legends = this.getPrintLegends()
        const printObj = {
            units: 'm',
            srs,
            mapTitle: title,
            comment,
            layout,
            outputFormat: 'pdf',
            layers: [
                ...this.getBaseLayers(),
                ...this.getPrintLocalLayers()
            ],
            legends,
            pages: [
                {
                    dpi,
                    geodetic: false,
                    strictEpsg4326: false,
                    // bbox: this.map.getView().calculateExtent(this.map.getSize()),
                    scale,
                    center,
                    rotation: convToDegree(rotationRadian)
                }
            ]
        }
        return printObj

    }
    /**
    * this function return layer source format
    * @param {ol.layer} lyr openlayers layer to get source format for
    * @returns {string}
    */
    getSourceFormat(lyr) {
        const sourceParams = { ...lyr.getSource().getParams() }
        return Object.keys(sourceParams).includes("FORMAT") ? sourceParams["FORMAT"] : "image/png"
    }
    /**
    * this function return layer custom params to send to geoserver
    * @param {ol.layer} lyr openlayers layer to get source format for
    * @returns {any} sourceParams
    */
    getCustomParams(lyr) {
        let sourceParams = { ...lyr.getSource().getParams() }
        delete sourceParams['LAYERS']
        delete sourceParams['FORMAT']
        delete sourceParams['SERVERTYPE']
        delete sourceParams['VERSION']
        return sourceParams
    }
    /**
    * this function return print request payload
    * @param {string} title print title
    * @param {string} comment print comment
    * @param {string} [layout="A4"] print layout
    * @param {Number} scale print layout
    * @param {Number} [dpi=DOTS_PER_INCH] print dpi
    * @returns {string}
    */
    printPayload(title, comment, layout = "A4", scale, dpi = DOTS_PER_INCH) {
        let payload = JSON.stringify(this.getPrintObj({ dpi, comment, title, layout, scale }))
        return payload
    }
}
export default Print