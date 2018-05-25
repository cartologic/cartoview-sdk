import Circle from 'ol/style/circle'
import Fill from 'ol/style/fill'
import Icon from 'ol/style/icon'
import Stroke from 'ol/style/stroke'
import Style from 'ol/style/style'
import Text from 'ol/style/text'
import randomColor from 'randomcolor'
/**
* this function return image Style
* @returns {ol.style}
*/
function getImageStyle(fill = null) {
    return new Circle({
        radius: 5,
        fill,
        stroke: new Stroke({ color: 'black', width: 2 })
    })
}
/**
* this function return opaque bright color(rgb) as string
* @returns {string}
*/
function randomBright() {
    return randomColor({
        luminosity: 'bright',
        format: 'rgb'
    })
}
/**
* this function return transparent bright color(rgba) as string
* @returns {string}
*/
function randomBrightTrans() {
    return randomColor({
        luminosity: 'bright',
        format: 'rgba',
        alpha: 0.4
    })
}
/**
* this function return opaque dark color(rgba) as string
* @returns {string}
*/
function randomDark() {
    return randomColor({
        luminosity: 'dark',
        format: 'rgba',
        alpha: 1
    })
}
/**
* this function return transparent dark color(rgba) as string
* @returns {string}
*/
function randomDarkTrans() {
    return randomColor({
        luminosity: 'dark',
        format: 'rgba',
        alpha: 0.4
    })
}
/** @constant styles
    @type {Object}
    @default
*/
const styles = {
    'Point': function () {
        const rc = randomDark()
        return new Style({ image: getImageStyle(new Fill({ color: rc })) })
    },
    'LineString': function () {
        return new Style({
            stroke: new Stroke({
                color: randomDark(), width: 2
            })
        })
    },
    'MultiLineString': function () {
        return new Style({
            stroke: new Stroke({ color: randomBright(), width: 2 })
        })
    },
    'MultiPoint': function () {
        const rc = randomDark()
        return new Style({ image: getImageStyle(new Fill({ color: rc })) })
    },
    'MultiPolygon': function () {
        return new Style({
            stroke: new Stroke({ color: 'black', width: 2 }),
            fill: new Fill({ color: randomBrightTrans() })
        })
    },
    'Polygon': function () {
        return new Style({
            stroke: new Stroke({
                color: 'black',
                lineDash: [4],
                width: 3
            }),
            fill: new Fill({ color: randomBrightTrans() })
        })
    },
    'GeometryCollection': function () {
        return new Style({
            stroke: new Stroke({ color: 'black', width: 2 }),
            fill: new Fill({ color: randomBrightTrans() }),
            image: new Circle({
                radius: 10,
                fill: null,
                stroke: new Stroke({ color: 'black' })
            })
        })
    },
    'Circle': function () {
        return new Style({
            stroke: new Stroke({ color: 'black', width: 2 }),
            fill: new Fill({ color: randomBrightTrans() })
        })
    }
}
class StylesGenerator {
    constructor() {
        this._stylesCache = {}
    }
    getStyle(geometryType) {
        if (this._stylesCache[geometryType]) {
            return this._stylesCache[geometryType]
        }
        this._stylesCache[geometryType] = styles[geometryType]()
        return this._stylesCache[geometryType]
    }

}
const generator = new StylesGenerator()
/** Class for Styles manipulation */
class StyleHelper {
    /**
    * Create a StyleHelper instance.
    * @param {string} [iconImage="https://openlayers.org/en/v4.6.5/examples/data/icon.png"] default marker icon
    */
    constructor(iconImage = "https://openlayers.org/en/v4.6.5/examples/data/icon.png") {
        this.icon = iconImage
    }
    /**
    * this function feature styles based on geometry type
    * @param {ol.Feature} feature feature you want to get style for it
    * @returns {ol.style}
    */
    styleFunction(feature) {
        const style = feature ? generator.getStyle(feature.getGeometry().getType()) : null
        return style
    }
    /**
    * this function marker style
    * @returns {ol.style}
    */
    getMarker() {
        const marker = new Style({
            image: new Icon({
                anchor: [
                    0.5, 31
                ],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',

                src: this.icon
            }),
            text: new Text({
                text: '+',
                fill: new Fill({ color: '#fff' }),
                stroke: new Stroke({
                    color: '#fff',
                    width: 2
                }),
                textAlign: 'center',
                offsetY: -20,
                font: '18px serif'
            })
        })
        return marker
    }
}
export default StyleHelper
