const DOTS_PER_INCH = 96
const INCHES_PER_METER = 39.37

import { doGet, doPost, downloadFile } from '../utils/utils'

import BasicViewerHelper from '../helpers/BasicViewerHelper'
import LayersHelper from '../helpers/LayersHelper'
import URLS from '../urls/urls'
import { convToDegree } from '../utils/math'
import { sources } from '../services/MapConfigService'

export default class Print {
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
    }
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
    getGeoserverScales() {
        let scales = this.pdfInfo.scales.map(scale => Number(scale.value))
        this.geoserverScales = scales
        return scales
    }
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
    getClosestScale(scale) {
        if (this.geoserverScales) {
            return this.geoserverScales.reduce((prevScale, currentScale) => Math.abs(currentScale - scale) < Math.abs(prevScale - scale) ? currentScale : prevScale)
        }
        return 0.35

    }
    getScaleFromResolution(resolution = null, dpi = DOTS_PER_INCH) {
        const mapResolution = !resolution ? this.map.getView().getResolution() : resolution
        const mapProjection = this.map.getView().getProjection()
        const pointResolution = mapProjection.getMetersPerUnit() * mapResolution
        return Math.round(pointResolution * dpi * INCHES_PER_METER)
    }
    getResolutionFromScale(scale, dpi) {
        const mapProjection = this.map.getView().getProjection()
        let resolution = parseFloat(scale) / (dpi * INCHES_PER_METER * mapProjection.getMetersPerUnit())
        return resolution
    }
    getMapScales() {
        let scales = {}
        this.pdfInfo.dpis.map(dpi => {
            const dpiNumber = Number(dpi.value)
            scales[dpi.name] = this.getScaleFromResolution(null, dpiNumber)
        })
        return scales
    }
    getLayerParams(layer) {
        return layer.getSource().getParams()
    }
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
    getPrintLegends() {
        const layers = LayersHelper.getLocalLayers(this.map)
        let printLegends = LayersHelper.getLegends(layers, this.accessToken).map(legend => this.getLegendItem(legend))
        return printLegends
    }
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
    getBaseLayerMaxExtent(lyr) {
        const sourceProjection = lyr.getSource().getProjection()
        return sourceProjection.getWorldExtent()

    }
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
    getPrintLocalLayers() {
        let layers = LayersHelper.getLocalLayers(this.map)
        layers = layers.map(lyr => {
            if (lyr.getVisible()) {
                const layerObj = {
                    baseURL: LayersHelper.getLayerURL(lyr, this.accessToken),
                    opacity: lyr.getOpacity(),
                    singleTile: false,
                    type: "WMS",//TODO: get layer type from openlayers
                    layers: [lyr.getProperties().name],
                    format: this.getSourceFormat(lyr), // TODO get format from source
                    styles: [],
                    customParams: {
                        ...this.getCustomParams(lyr)
                    }
                }
                return layerObj
            }
        })
        return layers.reverse()
    }
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
    getSourceFormat(lyr) {
        const sourceParams = { ...lyr.getSource().getParams() }
        return Object.keys(sourceParams).includes("FORMAT") ? sourceParams["FORMAT"] : "image/png"
    }
    getCustomParams(lyr) {
        let sourceParams = { ...lyr.getSource().getParams() }
        delete sourceParams['LAYERS']
        delete sourceParams['FORMAT']
        delete sourceParams['SERVERTYPE']
        delete sourceParams['VERSION']
        return sourceParams
    }
    printPayload(title, comment, layout = "A4", scale, dpi = DOTS_PER_INCH) {
        let payload = JSON.stringify(this.getPrintObj({ dpi, comment, title, layout, scale }))
        return payload
    }
}