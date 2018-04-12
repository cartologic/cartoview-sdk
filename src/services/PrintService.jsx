const DOTS_PER_INCH = 96
const INCHES_PER_METER = 39.37

import { doGet, doPost, downloadFile } from '../utils/utils'

import LayersHelper from '../helpers/layersHelper'
import URLS from '../urls/urls'

export default class Print {
    constructor(map, geoserverURL, accessToken, proxyURL = null) {
        this.map = map
        this.geoserverURL = `${geoserverURL}`
        this.geoserverWMSURL = `${geoserverURL}wms${accessToken ? `?access_token=${accessToken}` : ""}`
        this.infoURL = `${geoserverURL}pdf/info.json`
        this.pdfInfo = null
        this.geoserverScales = null
        this.proxyURL = proxyURL
        this.accessToken = accessToken
        this.urls = new URLS(this.proxyURL)
        this.getPrintInfo().then(result => this.getGeoserverScales())
    }
    getPrintInfo() {
        let infoPromise = new Promise((resolve, reject) => {
            doGet(this.infoURL).then(result => {
                this.pdfInfo = result
                resolve(this.pdfInfo)
            })
        })
        return infoPromise
    }
    getGeoserverScales() {
        let scales = this.pdfInfo.scales.map(scale => Number(scale.value))
        this.geoserverScales = scales
        return scales
    }
    createPDF(title, comment, layout) {
        const targetURL = this.urls.getProxiedURL(this.pdfInfo.createURL)
        doPost(targetURL, this.printPayload(title, comment, layout), { 'content-type': 'application/json' }).then(result => {
            const pdfURL = this.urls.getProxiedURL(result.getURL)
            downloadFile(pdfURL, "print.pdf")
        })
    }
    getClosestScale(scale) {
        if (this.geoserverScales) {
            return this.geoserverScales.reduce((prevScale, currentScale) => Math.abs(currentScale - scale) < Math.abs(prevScale - scale) ? currentScale : prevScale)
        }
        return 0.35

    }
    getMapScales() {
        const mapResolution = this.map.getView().getResolution()
        const mapProjection = this.map.getView().getProjection()
        const pointResolution = mapProjection.getMetersPerUnit() * mapResolution
        let scales = {}
        this.pdfInfo.dpis.map(dpi => {
            const dpiNumber = Number(dpi.value)
            scales[dpi.name] = Math.round(pointResolution * dpiNumber * INCHES_PER_METER)
        })
        return scales
    }
    getLayerParams(layer) {
        return layer.getSource().getParams()
    }
    getLegendItem(legend) {
        let template = `{  
            "name":"${legend.layer}",
            "classes":[  
               {  
                  "name":"",
                  "icons":[  
                     "${legend.url}"
                  ]
               }
            ]
         }`
        return template
    }
    getPrintLegends(legends) {
        let printLegends = legends.map(legend => this.getLegendItem(legend))
        return printLegends.join(",")
    }
    printPayload(title, comment, layout = "A4", dpi = DOTS_PER_INCH) {
        let layers = LayersHelper.getLocalLayers(this.map)
        let legends = LayersHelper.getLegends(layers, this.accessToken)
        layers = layers.map(lyr => '"' + lyr.getProperties().name + '"')
        const mapScale = this.getMapScales()[dpi]
        const printScale = this.getClosestScale(mapScale)
        let payload = `
        {  
            "units":"m",
            "srs":"${this.map.getView().getProjection().getCode()}",
            "layout":"${layout}",
            "dpi":${DOTS_PER_INCH},
            "outputFormat":"pdf",
            "comment":"${comment}",
            "mapTitle":"${title}",
            "layers":[  
               {  
                  "baseURL":"http://a.tile.openstreetmap.org/",
                  "opacity":1,
                  "type":"OSM",
                  "maxExtent":[  
                     -20037508.3392,
                     -20037508.3392,
                     20037508.3392,
                     20037508.3392
                  ],
                  "tileSize":[  
                     256,
                     256
                  ],
                  "extension":"png",
                  "resolutions":[  
                     156543.03390625,
                     78271.516953125,
                     39135.7584765625,
                     19567.87923828125,
                     9783.939619140625,
                     4891.9698095703125,
                     2445.9849047851562,
                     1222.9924523925781,
                     611.4962261962891,
                     305.74811309814453,
                     152.87405654907226,
                     76.43702827453613,
                     38.218514137268066,
                     19.109257068634033,
                     9.554628534317017,
                     4.777314267158508,
                     2.388657133579254,
                     1.194328566789627,
                     0.5971642833948135,
                     0.29858214169740677,
                     0.14929107084870338,
                     0.07464553542435169,
                     0.037322767712175846,
                     0.018661383856087923,
                     0.009330691928043961,
                     0.004665345964021981,
                     0.0023326729820109904,
                     0.0011663364910054952
                  ]
               },
               {  
                  "baseURL":"${this.geoserverWMSURL}",
                  "opacity":1,
                  "singleTile":false,
                  "type":"WMS",
                  "layers":[${layers.join(',')}],
                  "format":"image/png",
                  "styles":[  
                     ""
                  ],
                  "customParams":{  
                     "TRANSPARENT":true,
                     "TILED":true
                  }
               }
            ],
            "pages":[  
               {  
                  "center":[${this.map.getView().getCenter().join(',')}],
                  "scale":${printScale},
                  "rotation":${this.map.getView().getRotation()}
               }
            ],
            "legends":[${this.getPrintLegends(legends)}]
         }
        `
        return payload
    }
}