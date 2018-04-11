import AnimationHelper from './AnimationHelper'
import GeoJSON from 'ol/format/geojson'
import Group from 'ol/layer/group'
import ImageWMS from 'ol/source/imagewms'
import TileWMS from 'ol/source/tilewms'
import URLS from '../urls/urls'
import Vector from 'ol/source/vector'
import { default as VectorLayer } from 'ol/layer/vector'
class LayersHelper {
    constructor(proxyURL = null) {
        this.urlHelpers = new URLS(proxyURL)
    }
    isWMSLayer(layer) {
        return layer.getSource() instanceof TileWMS || layer.getSource() instanceof ImageWMS
    }
    layerName(typeName) {
        return typeName.split(":").pop()
    }
    layerNameSpace(typeName) {
        return typeName.split(":")[0]
    }
    getLayerURL(layer, accessToken = null) {
        var wmsURL = null
        try {
            wmsURL = layer.getSource().getUrls()[0]
        } catch (err) {
            wmsURL = layer.getSource().getUrl()
        }

        return `${wmsURL}${accessToken ? `?access_token=${accessToken}` : ""}`
    }
    getLocalLayers(map) {
        let layers = []
        map.getLayers().getArray().map(layer => {
            if (!(layer instanceof Group)) {
                layers.push(layer)
            }
        })
        return layers.slice(0).reverse()
    }
    getLegends(layers, accessToken) {
        let legends = []
        layers.map(layer => {
            const layerTitle = layer.getProperties().title
            legends.push({
                layer: layerTitle,
                url: this.getLegendURL(layer, accessToken)
            })
        })
        return legends
    }
    getLegendURL(layer, accessToken) {
        let wmsURL = this.getLayerURL(layer, accessToken)
        const url = this.urlHelpers.getParamterizedURL(wmsURL, {
            'REQUEST': 'GetLegendGraphic',
            'VERSION': '1.0.0',
            'FORMAT': 'image/png',
            "LAYER": layer.getProperties().name
        })
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