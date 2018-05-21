import { doGet, doPost } from '../utils/utils'

import DragRotateAndZoom from 'ol/interaction/dragrotateandzoom'
import FileSaver from 'file-saver'
import FullScreen from 'ol/control/fullscreen'
import Map from 'ol/map'
import MapConfigService from '../services/MapConfigService'
import MapConfigTransformService from '../services/MapConfigTransformService'
import OSM from 'ol/source/osm'
import Projection from 'ol/proj/projection'
import ScaleLine from 'ol/control/scaleline'
import Tile from 'ol/layer/tile'
import View from 'ol/view'
import ZoomSlider from 'ol/control/zoomslider'
import control from 'ol/control'
import extent from 'ol/extent'
import interaction from 'ol/interaction'
import pica from 'pica/dist/pica'
import proj from 'ol/proj'

/** Class for Basic Viewer main Operation */
export class BasicViewerHelper {
    /**
    * This function return center of extent
    * @param {ol.Extent} extent openlayers extent
    * @returns {Array.<Number>}
    */
    getCenterOfExtent(ext) {
        const center = extent.getCenter(ext)
        return center
    }
    /**
    * This function initialize openlayer map instance from geonode json obj
    * @param {string} mapJsonUrl url to get geonode json object from 
    * @param {ol.Map} map openlayers map instance
    * @param {string} proxyURL proxy url
    * @param {string} access_token user access token
    * @param {Function} callback function to be invoked after initializtion
    * @returns {void}
    */
    mapInit(mapJsonUrl, map, proxyURL, access_token, callback = () => { }) {
        doGet(mapJsonUrl).then((config) => {
            MapConfigService.load(MapConfigTransformService.transform(config), map, proxyURL, access_token)
            callback()
        })
    }
    /**
    * This function get map as images resizing it and sending it to the server
    * @param {HTMLCanvasElement}  originalCanvas
    * @param {string} thumnailURL save thumbnail url
    * @returns {Promise}
    */
    resizeSendThumbnail(originalCanvas, thumnailURL) {
        let thumbnailPromise = new Promise((resolve, reject) => {
            const picaResizer = pica()
            let resizedCanvas = document.createElement('canvas')
            resizedCanvas.width = 280
            resizedCanvas.height = 210
            picaResizer.resize(originalCanvas, resizedCanvas)
                .then(result => picaResizer.toBlob(result, 'image/jpeg', 0.90))
                .then(blob => {
                    var reader = new FileReader()
                    reader.readAsDataURL(blob)
                    reader.onloadend = () => {
                        const postData = JSON.stringify({
                            image: reader.result,
                            preview: "react"
                        })
                        try {
                            doPost(thumnailURL, postData, {}, 'xml').then(result => resolve(result))
                        } catch (err) {
                            reject(err.message)
                        }
                    }
                })
        })
        return thumbnailPromise

    }
    /**
    * This function get map as images resizing it and sending it to the server
    * @param {ol.Map}  map openlayers map instance
    * @param {string} thumnailURL save thumbnail url
    * @returns {Promise}
    */
    setThumbnail(map, thumnailURL) {
        let generationPromise = new Promise((resolve, reject) => {
            map.once('postcompose', (event) => {
                var canvas = event.context.canvas
                this.resizeSendThumbnail(canvas, thumnailURL).then(result => resolve(result)).catch(err => {
                    reject(err)
                })
            })
            map.renderSync()
        })
        return generationPromise

    }
    /**
    * This function return array of openlayers controls based on configuration object
    * @typedef {Object} Zoom
    * @property {Number} minZoom - minimum zoom of map
    * @property {Number} maxZoom - maximum zoom of map
    * @property {Number} zoom - initial zoom of map
    * @typedef {Object} Configuration
    * @property {Boolean} scaleLine - scaleline control
    * @property {Boolean} zoomSlider - zoom slider control
    * @property {Boolean} fullScreen - fullScreen control
    * @property {Boolean} dragRotateAndZoom - dragRotateAndZoom interaction
    * @property {Zoom} zoom - zoom configuration
    * @property {Array.<string>} attachmentTags - attachment tags
    * @param {Configuration}  config 
    * @returns {Promise}
    */
    getControls(config) {
        let controls = []
        if (config.scaleLine) {
            controls.push(new ScaleLine())
        }
        if (config.zoomSlider) {
            controls.push(new ZoomSlider())
        }
        if (config.fullScreen) {
            controls.push(new FullScreen({ source: "root" }))
        }
        return controls
    }
    /**
    * This function return array of openlayers interactions based on configuration object
    * @param {Configuration}  config 
    * @returns {Promise}
    */
    getInteractions(config) {
        let interactions = []
        if (config.dragRotateAndZoom) {
            interactions.push(new DragRotateAndZoom())
        }
        return interactions
    }
    /**
    * This function return default configuration object
    * @returns {Configuration}
    */
    getMapDefaultConfig() {
        let config = {
            dragRotateAndZoom: true, scaleLine: true, zoomSlider: true, fullScreen: true, zoom: {
                minZoom: 1,
                zoom: 2,
                maxZoom: 19,
            }
        }
        return config
    }
    /**
    * This function return openlayers map instance based on configuration
    * @param {Configuration}  config 
    * @returns {ol.Map}
    */
    getMap(config = this.getMapDefaultConfig()) {
        let zoomConfig = config && config.zoom ? config.zoom : {
            minZoom: 1,
            zoom: 2,
            maxZoom: 19,
        }
        let controls = this.getControls(config)
        let map = new Map({
            interactions: interaction.defaults({ dragPan: true }),
            controls: control.defaults().extend(controls),
            layers: [
                new Tile({
                    title: 'OpenStreetMap',
                    source: new OSM()
                })
            ],
            loadTilesWhileInteracting: true,
            view: new View({
                center: proj.fromLonLat([0, 0]),
                ...zoomConfig
            })
        })
        return map
    }
    /**
    * This function return openlayers map instance for print
    * @returns {ol.Map}
    */
    getPrintMap() {
        let map = new Map({
            interactions: interaction.defaults({
                doubleClickZoom: false,
                mouseWheelZoom: false,
                shiftDragZoom: false,
                pinchZoom: false
            }),
            controls: [],
            layers: [
                new Tile({
                    title: 'OpenStreetMap',
                    source: new OSM()
                })
            ],
            loadTilesWhileInteracting: true,
            view: new View({
                center: proj.fromLonLat([0, 0]),
                minZoom: 1,
                zoom: 2,
                maxZoom: 19,
            })
        })
        map.addControl(new ScaleLine())
        return map
    }
    /**
    * This function fit map view to point or coordinate
    * @param {Array.<Number>} pointArray
    * @param {ol.Map} map
    * @param {Boolean} changeZoom
    * @returns {void}
    */
    zoomToLocation(pointArray, map, changeZoom = true) {
        const zoom = map.getView().getMaxZoom()
        const lonLat = this.reprojectLocation(pointArray, map)
        map.getView().setCenter(lonLat)
        if (changeZoom) {
            map.getView().setZoom(zoom - 4)
        }

    }
    /**
    * This function reproject coordinates from projection to map projection
    * @param {Array.<Number>} pointArray
    * @param {ol.Map} map
    * @param {string|ol.ProjectionLike} from
    * @returns {Array.<Number>}
    */
    reprojectLocation(pointArray, map, from = 'EPSG:4326') {
        /**
         * Reproject x,y .
         * @constructor
         * @param {array} point - [longitude,latitude].
         */
        const mapProjection = map.getView().getProjection()
        if (from instanceof Projection) {
            from = from.getCode()
        }
        return proj.transform(pointArray, from, mapProjection)
    }
    /**
    * This function reproject extent from projection to map projection
    * @param {ol.Extent} extent
    * @param {ol.Map} map
    * @param {string|ol.ProjectionLike} from
    * @returns {ol.Extent}
    */
    reprojectExtent(extent, map, from = 'EPSG:4326') {
        /**
         * Reproject extent .
         * @constructor
         * @param {array} extent - [minX,minY,maxX,maxY].
         */

        const mapProjection = map.getView().getProjection()
        if (from instanceof Projection) {
            from = from.getCode()
        }
        const transformedExtent = from === mapProjection.getCode() ? extent : proj.transformExtent(extent, from, mapProjection)
        return transformedExtent
    }
    /**
    * This function fit map view to extent
    * @param {ol.Extent} extent
    * @param {ol.Map} map
    * @param {Number} duration
    * @returns {void}
    */
    fitExtent(extent, map, duration = undefined) {
        map.getView().fit(extent, map.getSize(), { duration })
    }
    /**
    * This function save map as png
    * @param {ol.Map} map
    * @returns {void}
    */
    exportMap(map) {
        map.once('postcompose', (event) => {
            let canvas = event.context.canvas
            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(canvas.msToBlob(), 'map.png')
            } else {
                canvas.toBlob((blob) => {
                    FileSaver.saveAs(blob, 'map.png')
                })
            }
        })
        map.renderSync()
    }
}
export default new BasicViewerHelper()
