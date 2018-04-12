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
import extent from 'ol/extent'
import interaction from 'ol/interaction'
import pica from 'pica/dist/pica'
import proj from 'ol/proj'

class BasicViewerHelper {
    getCenterOfExtent(ext) {
        const center = extent.getCenter(ext)
        return center
    }
    mapInit(mapJsonUrl, map, proxyURL, callback = () => { }) {
        doGet(mapJsonUrl).then((config) => {
            MapConfigService.load(MapConfigTransformService.transform(
                config), map, proxyURL)
            callback()
        })
    }
    resizeSendThumbnail(originalCanvas, thumnailURL) {
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
                        doPost(thumnailURL, postData, {}, 'xml').then(result => console.log(result))
                    } catch (err) {
                        console.error(err.message)
                    }
                }
            })
    }
    setThumbnail(map, thumnailURL) {
        map.once('postcompose', (event) => {
            var canvas = event.context.canvas
            this.resizeSendThumbnail(canvas, thumnailURL)
        })
        map.renderSync()
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
    getMap(config = { dragRotateAndZoom: true, scaleLine: true, zoomSlider: true, fullScreen: true }) {
        let controls = this.getControls(config)
        let interactions = this.getInteractions(config)
        let map = new Map({
            interactions: interaction.defaults().extend(interactions),
            layers: [
                new Tile({
                    title: 'OpenStreetMap',
                    source: new OSM()
                })
            ],
            loadTilesWhileInteracting: true,
            view: new View({
                center: proj.fromLonLat([0, 0]),
                minZoom: 5,
                zoom: 1,
                maxZoom: 19,
            })
        })
        controls.map(ctrl => map.addControl(ctrl))
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
