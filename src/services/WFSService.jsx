import LayerHelper from '../helpers/LayersHelper'
import URLS from '../urls/urls'
import WFS from 'ol/format/wfs'
import { doGet } from '../utils/utils'

export default class WFSService {
    constructor(wfsURL, proxyURL = null) {
        this.wfsURL = wfsURL
        this.urlsHelper = new URLS(proxyURL)
    }
    buildGetFeatureURL(typeNames, projectionCode = null, startIndex = null, pagination = null, sortBy = null, cqlFilter = null, format = "json") {
        let query = {
            service: 'wfs',
            version: '2.0.0',
            request: 'GetFeature',
            typeNames,
            outputFormat: format,

        }
        if (projectionCode) {
            query.srsName = projectionCode
        }
        if (pagination) {
            query.count = pagination
        }
        if (cqlFilter) {
            query.cql_filter = this.urlsHelper.encodeURL(cqlFilter)
        }
        if (startIndex) {
            query.startIndex = startIndex
        }
        if (sortBy) {
            query.sortBy = sortBy
        }
        const requestUrl = this.urlsHelper.getParamterizedURL(this.wfsURL, query)
        const proxiedURL = this.urlsHelper.getProxiedURL(requestUrl)
        return proxiedURL

    }
    getFeatures(typeNames, projectionCode = null, startIndex = null, pagination = null, sortBy = null, cqlFilter = null, format = "json") {
        const url = this.buildGetFeatureURL(typeNames, projectionCode, startIndex, pagination, sortBy, cqlFilter, format)
        return doGet(url)

    }
    wfsTransaction(feature, layerName, targetNameSpace, crs, type = "insert") {
        let formatWFS = new WFS
        var formatGMLOptions = {
            featureNS: targetNameSpace,
            featurePrefix: LayerHelper.layerNameSpace(layerName),
            featureType: LayerHelper.layerName(layerName),
            gmlOptions: {
                srsName: `${crs}`
            },
        }
        let node = null
        if (type === "insert") {
            node = formatWFS.writeTransaction([feature], null, null, formatGMLOptions)
        } else if (type == "delete") {
            node = formatWFS.writeTransaction(null, null, [feature], formatGMLOptions)
        } else if (type === "update") {
            node = formatWFS.writeTransaction(null, [feature], null, formatGMLOptions)

        } else {
            throw Error("Invalid Type")
        }
        var serializer = new XMLSerializer()
        var stringXML = serializer.serializeToString(node)
        return stringXML
    }
    readResponse(response) {
        let formatWFS = new WFS
        return formatWFS.readTransactionResponse(response)
    }
}