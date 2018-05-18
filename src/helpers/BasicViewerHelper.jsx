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

class BasicViewerHelper {
    getCenterOfExtent(ext) {
        const center = extent.getCenter(ext)
        return center
    }
    mapInit(mapJsonUrl, map, proxyURL, access_token, callback = () => { }) {
        doGet(mapJsonUrl).then((config) => {
            MapConfigService.load(MapConfigTransformService.transform(config), map, proxyURL, access_token)
            callback()
        })
    }
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
    getInteractions(config) {
        let interactions = []
        if (config.dragRotateAndZoom) {
            interactions.push(new DragRotateAndZoom())
        }
        return interactions
    }
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
    zoomToLocation(pointArray, map, changeZoom = true) {
        const zoom = map.getView().getMaxZoom()
        const lonLat = this.reprojectLocation(pointArray, map)
        map.getView().setCenter(lonLat)
        if (changeZoom) {
            map.getView().setZoom(zoom - 4)
        }

    }
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
    fitExtent(extent, map, duration = undefined) {
        map.getView().fit(extent, map.getSize(), { duration })
    }
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
