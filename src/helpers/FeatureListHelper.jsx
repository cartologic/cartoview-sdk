import LayerHelper from './LayersHelper'
import { doGet } from '../utils/utils'
import isURL from 'validator/lib/isURL'

class FeatureListHelper {
    getAttachmentTags(config) {
        const configTags = config.attachmentTags
        const tags = (configTags && configTags.length > 0) ? configTags : [
            `feature_list_${LayerHelper.layerName(config.layer)}`]
        return tags
    }
    getSelectOptions(arr, label = null, value = null) {
        let options = []
        if (arr && arr.length > 0) {
            options = arr.map(item => {
                if (!label) {
                    return { value: item, label: item }
                }
                return { value: item[label], label: item[value ? value : label] }
            })
        }
        return options

    }
    loadAttachments(attachmentURL) {
        return doGet(attachmentURL)
    }
    checkImageSrc(src, good, bad) {
        let img = new Image()
        img.onload = good
        img.onerror = bad
        img.src = src
    }
    searchById(id) {
        const { attachments } = this.state
        let result = []
        if (attachments) {
            attachments.map((imageObj) => {
                if (imageObj.is_image && imageObj.feature_id === id) {
                    result.push(imageObj)
                }
            })
        }
        return result
    }
    getFilterByName(attrs, attrName) {
        let attributeType = null
        if (attrs) {
            attrs.forEach(attr => {
                if (attr.attribute === attrName) {
                    attributeType = attr.attribute_type
                }
            })
        }
        return attributeType
    }
    checkURL(value) {
        /* validator validate strings only */
        if (typeof (value) === "string") {
            return isURL(value)
        }
        return false
    }
}
export default new FeatureListHelper()
