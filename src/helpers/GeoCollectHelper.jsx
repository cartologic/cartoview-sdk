import Collection from 'ol/collection'
import Feature from 'ol/feature'
import Modify from 'ol/interaction/modify'
import MultiPoint from 'ol/geom/multipoint'
import Point from 'ol/geom/point'
import StyleHelper from './StyleHelper'
import Vector from 'ol/layer/vector'
import { default as VectorSource } from 'ol/source/vector'
import t from 'tcomb-form'
const FeatureTypeMapping = {
    'Point': Point,
    'MultiPoint': MultiPoint,
}
const Int = t.refinement(t.Number, (n) => n % 1 == 0)
class GeoCollectHelper {
    constructor() {
        this.styleHelper = new StyleHelper()
    }
    getGeomerty(coordinates, geometryType) {
        let point = new FeatureTypeMapping[geometryType](geometryType === "Point" ? coordinates : [coordinates, coordinates], 'XY')
        return point
    }
    getPointFeature(position, geometryName = "the_geom", geometryType = "Point") {
        let feature = new Feature({})
        feature.setGeometryName(geometryName)
        feature.setGeometry(this.getGeomerty(position, geometryType))
        return feature
    }
    getModifyInteraction(feature) {
        let modifyInteraction = new Modify({
            features: new Collection([feature]),
            pixelTolerance: 32
        })
        return modifyInteraction
    }
    getVectorLayer(feature) {
        let vectorLayer = new Vector({
            source: new VectorSource({
                features: [feature]
            }),
            style: this.styleHelper.getMarker(),
        })
        return vectorLayer
    }
    buildForm(attributes) {
        let schema = {},
            fields = {},
            value = {}
        attributes.forEach(a => {
            if (a.included) {
                fields[a.name] = {
                    label: a.label,
                    help: a.helpText,
                    type: a.fieldType,
                    attrs: {
                        placeholder: a.placeholder
                    }
                }
                value[a.name] = a.defaultValue
                if (a.fieldType == "select") {
                    const options = {}
                    a.options.forEach(o => options[o.value] = o
                        .label)
                    schema[a.name] = t.enums(options)
                } else if (a.fieldType == "number") {
                    fields[a.name].type = 'number'
                    schema[a.name] = a.dataType == "int" ? Int :
                        t.Number
                } else if (a.fieldType == "checkbox") {
                    schema[a.name] = t.Bool
                }
                //default case if data type is string
                // here field type may be text or textarea
                else if (a.dataType == "string") {
                    schema[a.name] = t.String
                }
                if (schema[a.name]) {
                    if (a.required) {
                        fields[a.name].help += " (Required)"
                    } else {
                        schema[a.name] = t.maybe(schema[a.name])
                    }
                }
            }
        })
        return {
            schema,
            value,
            fields
        }
    }
}
export default new GeoCollectHelper()
