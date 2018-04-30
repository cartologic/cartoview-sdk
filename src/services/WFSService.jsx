import GML3 from 'ol/format/gml3'
import LayerHelper from '../helpers/LayersHelper'
import LayersHelper from '../helpers/LayersHelper'
import URLS from '../urls/urls'
import WFS from 'ol/format/wfs'
import { doGet } from '../utils/utils'
import filter from 'ol/format/filter'

export const getFilterObj = (attribute = null, operator = "=", value = "") => {
    return { attribute: "", operator: "=", value: value }
}
export default class WFSService {
    constructor(wfsURL, proxyURL = null) {
        this.wfsURL = wfsURL
        this.urlsHelper = new URLS(proxyURL)
    }
    describeFeatureType(typeName) {
        let query = {
            service: "wfs",
            version: "1.1.0",
            request: "DescribeFeatureType",
            typeName,
            outputFormat: "application/json"
        }
        let targetURL = this.urlsHelper.getParamterizedURL(this.wfsURL, query)
        targetURL = this.urlsHelper.getProxiedURL(targetURL)
        return doGet(targetURL)
    }
    getAttributeType(attributes = [], attributeName) {
        let attributeType = null
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i]
            if (attr.name === attributeName) {
                attributeType = attr.type.split(":").pop()
                break
            }
        }
        return attributeType
    }
    writeWFSGetFeature(map, typename, filterObj, maxFeatures = 100) {
        let wfsPromise = new Promise((resolve, reject) => {
            this.describeFeatureType(typename).then(featureType => {
                const nameSpaceURL = featureType.targetNamespace
                const attrType = this.getAttributeType(featureType.featureTypes[0].properties, filterObj.attribute)
                var request = new WFS({
                    gmlFormat: new GML3()
                }).writeGetFeature({
                    srsName: map.getView().getProjection().getCode(),
                    featureNS: nameSpaceURL,
                    featurePrefix: LayersHelper.layerNameSpace(typename),
                    outputFormat: 'application/json',
                    featureTypes: [LayersHelper.layerName(typename)],
                    filter: this.getFilter(filterObj.attribute, attrType, filterObj.value, filterObj.operator),
                    maxFeatures
                })
                resolve(request)
            }).catch(err => {
                reject(err)
            })
        })
        return wfsPromise
    }
    getFilter(filterAttribute, filterType, value, op = "=") {
        /* 
        this function should return the proper filter based on 
        filter type
        working with strings & numbers
        test Needed 😈
        */
        let olFilter = null
        if (filterType !== "string") {
            switch (op) {
                case '<':
                    olFilter = filter.lessThan(filterAttribute, value)
                    break
                case '<=':
                    olFilter = filter.lessThanOrEqualTo(filterAttribute, value)
                    break
                case '>':
                    olFilter = filter.greaterThan(filterAttribute, value)
                    break
                case '>=':
                    olFilter = filter.greaterThanOrEqualTo(filterAttribute, value)
                    break
                case '<>':
                    olFilter = filter.notEqualTo(filterAttribute, value)
                    break
                default:
                    throw Error("Invalid Filter")

            }
        } else {
            switch (op) {
                case 'LIKE':
                    olFilter = filter.like(filterAttribute, '%' + value + '%',
                        undefined, undefined, undefined, false)
                    break
                case '=':
                    olFilter = filter.equalTo(filterAttribute, value)
                    break
                case '<>':
                    olFilter = filter.notEqualTo(filterAttribute, value)
                    break
                default:
                    throw Error("Invalid Filter")

            }
        }
        return olFilter
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