/** @constant DOTS_PER_INCH
    @type {Number}
    @default 96
*/
const DOTS_PER_INCH = 96
/** @constant INCHES_PER_METER
    @type {Number}
    @default 39.37
*/
const INCHES_PER_METER = 39.37
/** @constant PRINT_LAYER_NAME
    @type {string}
    @default "sdk_print_lyr"
*/
export const PRINT_LAYER_NAME = "sdk_print_lyr"

import { convToDegree, convToRadian } from '../utils/math'
//WARNING: FIX LAYERS ENCODING ACCORDING TO GEOSERVER PRINT PROTOCOL
import { doGet, doPost, downloadFile } from '../utils/utils'

import BasicViewerHelper from '../helpers/BasicViewerHelper'
import Collection from 'ol/collection'
import Feature from 'ol/feature'
import ImageWMS from 'ol/source/imagewms'
import LayersHelper from '../helpers/LayersHelper'
import OSM from 'ol/source/osm'
import Polygon from 'ol/geom/polygon'
import StyleHelper from '../helpers/StyleHelper'
import TileWMS from 'ol/source/tilewms'
import Translate from 'ol/interaction/translate'
import URLS from '../urls/urls'
import Vector from 'ol/layer/vector'
import { default as VectorSource } from 'ol/source/vector'
import WMTS from 'ol/source/wmts'
import XYZ from 'ol/source/xyz'
import proj from 'ol/proj'
import { sources } from '../services/MapConfigService'

export function toSize(size, opt_size) {
    if (Array.isArray(size)) {
        return size
    }
    if (opt_size === undefined) {
        opt_size = [size, size]
    } else {
        opt_size[0] = opt_size[1] = /** @type {number} */ (size)
    }
    return opt_size

}
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
        this._cachedFeature = []
        this._cachedAngle = 0
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
    * value of {@link DOTS_PER_INCH}
    * @param {string} [layout=null]  print layout name
    * @returns {Array.<Number>} extent
    */
    getPolygonCoords(printScale, dpi = DOTS_PER_INCH, layout = null) {
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
        let geom = this._getPolygonGeomtry(extent)
        const anchor = BasicViewerHelper.getCenterOfExtent(geom.getExtent())
        geom.rotate(convToRadian(this._cachedAngle), anchor)
        feature.setGeometryName(geometryName)
        feature.setGeometry(geom)
        return feature
    }
    /**
    * this function create print layer
    * @returns {ol.layer}
    */
    createPrintLayer() {
        let lyr = new Vector({
            source: new VectorSource({
                features: this.featureCollection
            }),
            style: new StyleHelper().styleFunction,
        })
        lyr.set('name', PRINT_LAYER_NAME)
        return lyr
    }
    /**
    * this function search for print layer and return it back
    * @returns {ol.layer|null}
    */
    findPrintLayer() {
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
    /**
    * this function check if print layer exists or not
    * @returns {boolean}
    */
    _checkPrintLayer() {
        return this.findPrintLayer() !== null ? true : false
    }
    /**
    * this function add print layer and interaction to map
    * @returns {void}
    */
    addPrintLayer(feature) {
        this.featureCollection.clear()
        this.featureCollection.extend([feature])
        if (!this._checkPrintLayer()) {
            const layer = this.createPrintLayer()
            this.map.addLayer(layer)
            this.map.addInteraction(this.translate)
        }
    }
    /**
    * this function remove print layer and print interaction from map
    * @returns {void}
    */
    removePrintLayer() {
        const lyr = this.findPrintLayer()
        if (lyr) {
            this.map.removeLayer(lyr)
            this.map.removeInteraction(this.translate)
            this._cachedFeature = []
        }
    }
    /**
    * this function return geoserver print scales values
    * @returns {Array.<number>}
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
    createPDF(title, comment, layout, dpi, scale, filename = "print.pdf") {
        let targetURL = this.geoserverPdfURL + "create.json"
        targetURL = this.urls.getParamterizedURL(targetURL, { "access_token": this.accessToken })
        const proxiedURL = this.urls.getProxiedURL(targetURL)
        let printPromise = new Promise((resolve, reject) => {
            doPost(proxiedURL, this.printPayload(title, comment, layout, scale, dpi), { 'content-type': 'application/json' }).then(result => {
                let pdfURL = result.getURL
                const pfdFileID = pdfURL.split('/').pop()
                let downloadURL = this.urls.getParamterizedURL(this.geoserverPdfURL + pfdFileID, { "access_token": this.accessToken })
                downloadURL = this.urls.getProxiedURL(this.geoserverPdfURL + pfdFileID)
                downloadFile(downloadURL, filename).then(downloaded => {
                    resolve(downloaded)
                }).catch(err => {
                    reject(err)
                })
            })
        })
        return printPromise
    }
    /**
    * this function return geoserver print scale index by it's value
    * @returns {number}
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
        const scales = this.getGeoserverScales()
        if (scales) {
            return scales.reduce((prevScale, currentScale) => Math.abs(currentScale - scale) < Math.abs(prevScale - scale) ? currentScale : prevScale)
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
        const units = this._getMetersPerUnit(mapProjection.getUnits())
        const unitsRatio = units * INCHES_PER_METER
        const pointResolution = unitsRatio * mapResolution
        return Math.round(pointResolution * dpi)
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
        const layers = this.getPrintLocalLayers()
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
    getAllUrlParams(url) {

        // get query string from url (optional) or window
        var queryString = url ? url.split('?')[1] : window.location.search.slice(1)

        // we'll store the parameters here
        var obj = {}

        // if query string exists
        if (queryString) {

            // stuff after # is not part of query string, so get rid of it
            queryString = queryString.split('#')[0]

            // split our query string into its component parts
            var arr = queryString.split('&')

            for (var i = 0; i < arr.length; i++) {
                // separate the keys and the values
                var a = arr[i].split('=')

                // in case params look like: list[]=thing1&list[]=thing2
                var paramNum = undefined
                var paramName = a[0].replace(/\[\d*\]/, function (v) {
                    paramNum = v.slice(1, -1)
                    return ''
                })

                // set parameter value (use 'true' if empty)
                var paramValue = typeof (a[1]) === 'undefined' ? true : a[1]

                // (optional) keep case consistent
                paramName = paramName.toLowerCase()
                paramValue = paramValue.toLowerCase()

                // if parameter name already exists
                if (obj[paramName]) {
                    // convert value to array (if still string)
                    if (typeof obj[paramName] === 'string') {
                        obj[paramName] = [obj[paramName]]
                    }
                    // if no array index number specified...
                    if (typeof paramNum === 'undefined') {
                        // put the value on the end of the array
                        obj[paramName].push(paramValue)
                    }
                    // if array index number specified...
                    else {
                        // put the value at that index number
                        obj[paramName][paramNum] = paramValue
                    }
                }
                // if param name doesn't exist yet, set it
                else {
                    obj[paramName] = paramValue
                }
            }
        }

        return obj
    }
    /**
    * this function rotate print box
    * @param {angle} Rotation angle in degree.
    * @returns {object}
    */
    rotatePrintBox(angle) {
        if (this.featureCollection.getArray().length > 0) {
            if (this._cachedFeature.length === 0) {
                this._cachedFeature.push(this.featureCollection.getArray()[0])
            }
            const currentFeature = this._cachedFeature[0]
            const geom = currentFeature.getGeometry()
            const center = BasicViewerHelper.getCenterOfExtent(geom.getExtent())
            geom.rotate(convToRadian(angle) - convToRadian(this._cachedAngle), center)
            currentFeature.setGeometry(geom)
            this.featureCollection.clear()
            this.featureCollection.extend([currentFeature])
            this._cachedAngle = angle
        }
    }
    /**
    * this function return map base layer ex: OSM,GoogleMaps
    * @returns {object}
    */
    baseLayerEncoder(lyr) {
        let encodedBaseLayer = null
        const source = lyr.getSource()
        if (source instanceof OSM) {
            const tileGrid = lyr.getSource().getTileGrid()
            const tileSize = toSize(tileGrid.getTileSize())
            const layerURL = new URL(LayersHelper.getLayerURL(lyr))
            let maxExtent = this.getBaseLayerMaxExtent(lyr)
            maxExtent = BasicViewerHelper.reprojectExtent(maxExtent, this.map)
            let layerObj = {
                baseURL: layerURL.origin,//TODO: get the correct URL
                opacity: lyr.getOpacity(),
                maxExtent,
                type: "OSM",//TODO:Check types supported by openlayers in geoserver
                tileSize,
                extension: "png",
                resolutions: lyr.getSource().getTileGrid().getResolutions()
            }
            encodedBaseLayer = layerObj
        } else if (source instanceof XYZ) {
            const tileGrid = lyr.getSource().getTileGrid()
            const tileSize = toSize(tileGrid.getTileSize())
            const layerURL = new URL(LayersHelper.getLayerURL(lyr))
            const hostname = layerURL.hostname
            const Ismapbox = hostname.includes('mapbox')
            const baseURL = layerURL.origin + decodeURIComponent(layerURL.pathname).split('/{')[0]
            const customParams = this.getAllUrlParams(layerURL.toString())
            let maxExtent = this.getBaseLayerMaxExtent(lyr)
            maxExtent = BasicViewerHelper.reprojectExtent(maxExtent, this.map)
            let layerObj = {
                baseURL,//TODO: get the correct URL
                opacity: lyr.getOpacity(),
                maxExtent,
                customParams,
                tileOrigin: tileGrid.getOrigin(),
                tileOriginCorner: 'bl',
                type: "XYZ",//TODO:Check types supported by openlayers in geoserver
                tileSize,
                extension: Ismapbox ? "" : "png",
                resolutions: lyr.getSource().getTileGrid().getResolutions()
            }
            if (Ismapbox) {
                layerObj.path_format = '/${z}/${x}/${y}'
            }
            encodedBaseLayer = layerObj
        }
        return encodedBaseLayer
    }
    /**
    * this function return map base layers ex: OSM,GoogleMaps
    * @returns {Array.<ol.layer>}
    */
    encodeBaseLayers() {
        const baseLayers = LayersHelper.getBaseLayers(this.map).filter(baselyr => baselyr.getVisible())
        let layers = []
        baseLayers.forEach(lyr => {
            const encodedBaseLayer = this.baseLayerEncoder(lyr)
            if (encodedBaseLayer) {
                layers.push(encodedBaseLayer)
            }
        }, this)
        return layers
    }
    /**
    * this function map layers without print layer
    * @returns {Array.<ol.layer>}
    */
    getPrintLocalLayers() {
        let printLayers = []
        const layers = LayersHelper.getLocalLayers(this.map)
        for (let i = 0; i < layers.length; i++) {
            const lyr = layers[i]
            if (lyr.get('name') !== PRINT_LAYER_NAME) {
                printLayers.push(lyr)
            }
        }
        return printLayers
    }
    /**
    * this function return encoded wms layer 
    * @param {ol.layer} lyr openlayers layer to be encoded
    * @param {boolean} [singleTile=false] 
    * @returns {object}
    */
    _encodeWMS(lyr, singleTile = false) {
        const params = lyr.getSource().getParams()
        const layerObj = {
            baseURL: LayersHelper.getLayerURL(lyr, this.accessToken),
            opacity: lyr.getOpacity(),
            singleTile,
            type: "WMS",//TODO: get layer type from openlayers
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
    /**
    * this function return encoded wmts layer 
    * @param {ol.layer} lyr openlayers layer to be encoded
    * @returns {object}
    */
    _encodeWMTS(lyr) {
        const source = lyr.getSource()
        const projection = source.getProjection()
        const tileGrid = source.getTileGrid()
        const matrixIds = tileGrid.getMatrixIds()
        const matrices = []
        for (let i = 0, ii = matrixIds.length; i < ii; ++i) {
            const tileRange = tileGrid.getFullTileRange(i)
            matrices.push(({
                identifier: matrixIds[i],
                scaleDenominator: tileGrid.getResolution(i) *
                    projection.getMetersPerUnit() / 0.28E-3,
                tileSize: toSize(tileGrid.getTileSize(i)),
                topLeftCorner: tileGrid.getOrigin(i),
                matrixSize: [
                    tileRange.maxX - tileRange.minX,
                    tileRange.maxY - tileRange.minY
                ]
            }))
        }
        const dimensions = source.getDimensions()
        const dimensionKeys = Object.keys(dimensions)
        const layerObj = ({
            baseURL: LayersHelper.getLayerURL(lyr, this.accessToken),
            dimensions: dimensionKeys,
            dimensionParams: dimensions,
            imageFormat: source.getFormat(),
            layer: source.getLayer(),
            matrices: matrices,
            matrixSet: source.getMatrixSet(),
            opacity: lyr.getOpacity(),
            requestEncoding: source.getRequestEncoding(),
            style: source.getStyle(),
            type: 'WMTS',
            version: source.getVersion()
        })
        return layerObj
    }
    /**
    * this function return encoded layer 
    * @param {ol.layer} lyr openlayers layer to be encoded
    * @returns {object}
    */
    _layersEncoder(lyr) {
        let encodedLayer = null
        const source = lyr.getSource()
        if (source instanceof TileWMS) {
            encodedLayer = this._encodeWMS(lyr)
        }
        else if (source instanceof ImageWMS) {
            encodedLayer = this._encodeWMS(lyr, true)
        }
        else if (source instanceof WMTS) {
            encodedLayer = this._encodeWMTS(lyr)
        }
        return encodedLayer
    }
    /**
    * this function return layer objects for print
    * @returns {Array}
    */
    encodeLocalLayers() {
        let layers = this.getPrintLocalLayers()
        let encodedLayers = []
        for (let i = 0; i < layers.length; i++) {
            const lyr = layers[i]
            if (lyr.getVisible()) {
                const layerObj = this._layersEncoder(lyr)
                encodedLayers.push(layerObj)
            }
        }
        return encodedLayers.reverse()
    }
    /**
    * this function return full print Object to send to geoserver
    * @returns {object}
    */
    getPrintObj(options = { dpi: DOTS_PER_INCH, layout: null, title: "", comment: "", scale: null }) {
        let { dpi, title, comment, layout, scale } = options
        const mapView = this.map.getView()
        const mapProjection = mapView.getProjection()
        const srs = mapProjection.getCode()
        const rotationRadian = mapView.getRotation()
        const currentFeature = this.featureCollection.getArray()[0]
        const featureExtent = currentFeature.getGeometry().getExtent()
        // const center = BasicViewerHelper.getCenterOfExtent(featureExtent)
        let legends = this.getPrintLegends()
        const printObj = {
            units: mapProjection.getUnits(),
            srs,
            mapTitle: title,
            comment,
            layout,
            outputFormat: 'pdf',
            layers: [
                ...this.encodeBaseLayers(),
                ...this.encodeLocalLayers()
            ],
            legends,
            pages: [
                {
                    dpi,
                    geodetic: false,
                    strictEpsg4326: false,
                    bbox: featureExtent,
                    // scale,
                    // center,
                    //TODO:FIX Rotation
                    // I think we need to get geometry coordinates and rotate the and get extent
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