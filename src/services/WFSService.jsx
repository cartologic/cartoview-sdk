import GML3 from 'ol/format/gml3'
import LayerHelper from '../helpers/LayersHelper'
import LayersHelper from '../helpers/LayersHelper'
import Map from 'ol/map'
import URLS from '../urls/urls'
import WFS from 'ol/format/wfs'
import { doGet } from '../utils/utils'
import filter from 'ol/format/filter'
const INITIAL_TYPE_MAPPING = {
    string: "text",
    double: "number",
    int: "number",
    number: "number",
    long: "number",
    boolean: "checkbox",
    "date-time": "datetime",
    date: "date",
}
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
    getAttributeLocalType(attributes = [], attributeName) {
        let localType = this.getAttributeType(attributes, attributeName)
        return INITIAL_TYPE_MAPPING[localType]
    }
    getWriteFeatureCRS(map) {
        let srsName = null
        if (map instanceof Map) {
            srsName = map.getView().getProjection().getCode()
        } else {
            srsName = map
        }
        return srsName
    }
    buildOlFilters(attributes, filters) {
        let olFilters = []
        if (filters) {
            for (let i = 0; i < filters.length; i++) {
                const filterObj = filters[i]
                if (filterObj) {
                    const attrType = this.getAttributeType(attributes, filterObj.attribute)
                    const filter = this.getFilter(attrType, filterObj)
                    olFilters.push(filter)
                }
            }
        }
        return olFilters
    }
    combineFilters(filters, combinationType = 'any') {
        if (filters && !(filters instanceof Array)) {
            throw Error("filters must be array")
        }
        let finalFilter = null
        if (filters.length > 1) {
            switch (combinationType.toLowerCase()) {
            case 'any':
                finalFilter = filter.or(...filters)
                break
            case 'all':
                finalFilter = filter.and(...filters)
                break
            default:
                throw Error("Invalid Combination Type")
            }
        } else if (filters.length === 1) {
            finalFilter = filters[0]
        }
        return finalFilter
    }
    writeWFSGetFeature(map, typename, wfsOptions = { filters: [], outputFormat: 'application/json', maxFeatures: 25, startIndex: 0, combinationType: 'any', pagination: true }) {
        const { filters, maxFeatures, startIndex, combinationType, pagination, outputFormat } = wfsOptions
        let wfsPromise = new Promise((resolve, reject) => {
            this.describeFeatureType(typename).then(featureType => {
                const nameSpaceURL = featureType.targetNamespace
                const srsName = this.getWriteFeatureCRS(map)
                const olFilters = this.buildOlFilters(featureType.featureTypes[0].properties, filters)
                const finalFilter = this.combineFilters(olFilters, combinationType)
                let props = {
                    srsName,
                    featureNS: nameSpaceURL,
                    featurePrefix: LayersHelper.layerNameSpace(typename),
                    outputFormat: outputFormat,
                    featureTypes: [LayersHelper.layerName(typename)],
                }
                if (pagination) {
                    props = {
                        ...props,
                        maxFeatures,
                        startIndex
                    }
                }
                if (finalFilter) {
                    props.filter = finalFilter
                }
                let request = new WFS({
                    gmlFormat: new GML3()
                }).writeGetFeature(props)
                resolve(request)
            }).catch(err => {
                reject(err)
            })
        })
        return wfsPromise
    }
    getFilter(filterType, filterObj = { value: "", operator: "=", attribute: null, start: null, end: null }) {
        const { attribute, value, start, end, operator } = filterObj
        /* 
        this function should return the proper filter based on 
        filter type
        working with strings & numbers
        test Needed 😈
        */
        const localType = INITIAL_TYPE_MAPPING[filterType]
        let olFilter = null
        if (localType === "number") {
            switch (operator) {
            case '=':
                olFilter = filter.equalTo(attribute, value)
                break
            case '<':
                olFilter = filter.lessThan(attribute, value)
                break
            case '<=':
                olFilter = filter.lessThanOrEqualTo(attribute, value)
                break
            case '>':
                olFilter = filter.greaterThan(attribute, value)
                break
            case '>=':
                olFilter = filter.greaterThanOrEqualTo(attribute, value)
                break
            case '<>':
                olFilter = filter.notEqualTo(attribute, value)
                break
            default:
                throw Error("Invalid Filter")

            }
        } else if (localType === "text") {
            switch (operator) {
            case 'LIKE':
                olFilter = filter.like(attribute, '%' + value + '%',
                        undefined, undefined, undefined, false)
                break
            case '=':
                olFilter = filter.equalTo(attribute, value)
                break
            case '<>':
                olFilter = filter.notEqualTo(attribute, value)
                break
            default:
                throw Error("Invalid Filter")

            }
        } else if (localType === "date" || localType === "datetime") {
            switch (operator) {
            case 'DURING':
                olFilter = filter.between(attribute, start, end)
                break
            case '=':
                olFilter = filter.equalTo(attribute, value)
                break
            case '<>':
                olFilter = filter.notEqualTo(attribute, value)
                break
            default:
                throw Error("Invalid Filter")

            }
        }
        return olFilter
    }
    buildGetFeatureURL(typeNames, projectionCode = null, startIndex = null, pagination = null, sortBy = null, cqlFilter = null, format = "json", token) {
        let query = {
            service: 'wfs',
            version: '2.0.0',
            request: 'GetFeature',
            typeNames,
            outputFormat: format,
            access_token: token

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
    wfsTransaction(feature, layerName, crs, type = "insert") {
        let writeTransactionPromise = new Promise((resolve, reject) => {
            this.describeFeatureType(layerName).then(featureType => {
                const nameSpaceURL = featureType.targetNamespace
                let formatWFS = new WFS
                let formatGMLOptions = {
                    featureNS: nameSpaceURL,
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
                    reject("Invalid Type")
                }
                var serializer = new XMLSerializer()
                var stringXML = serializer.serializeToString(node)
                resolve(stringXML)
            })
        })
        return writeTransactionPromise
    }
    readResponse(response) {
        let formatWFS = new WFS
        return formatWFS.readTransactionResponse(response)
    }
}