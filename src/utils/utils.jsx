import FileSaver from 'file-saver'
import copy from 'clipboard-copy'
import { getCRSFToken } from '../helpers/helpers'
/**
 * send get Request to an URL 
 * @param {string} url to send request to
 * @param {object} [extraHeaders={}] custom headers to add to the request
 * @param {string} [type='json'] expected response type to parse
 * @returns {Promise} result
 */
export function doGet(url, extraHeaders = {}, type = 'json') {
    return fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            "X-CSRFToken": getCRSFToken(),
            ...extraHeaders
        }
    }).then((response) => {
        if (type === 'json') {
            return response.json()
        } else if (type === 'xml') {
            return response.text()
        }
    })
}
/**
 * send get Request to an External URL (i.e not on the same domain)
 * @param {string} url to send request to
 * @param {object} [extraHeaders={}] custom headers to add to the request
 * @param {string} [type='json'] expected response type to parse
 * @returns {Promise} result
 */
export function doExternalGet(url, extraHeaders = {}, type = 'json') {
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
            ...extraHeaders
        }
    }).then((response) => {
        if (type === 'json') {
            return response.json()
        } else if (type === 'xml') {
            return response.text()
        }
    })
}
/**
 * capitalize First Letter of string
 * @param {string} string the word to capitalize
 * @returns {string} capitalized word
 */
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
/**
 * send post Request to an URL 
 * @param {string} url to send request to
 * @param {object} [extraHeaders={}] custom headers to add to the request
 * @param {string} [type='json'] expected response type to parse
 * @returns {Promise} result
 */
export function doPost(url, data, extraHeaders = {}, type = 'json') {
    return fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: new Headers({
            "X-CSRFToken": getCRSFToken(),
            ...extraHeaders
        }),
        body: data
    }).then((response) => {
        if (type === 'json') {
            return response.json()
        } else if (type === 'xml') {
            return response.text()
        }
    })
}
/**
 * Download binary data as file from the server
 * @param {string} url to send request to
 * @param {string} fileName the desired name of the file
 * @param {string} [data=null] request body if you want to send post request
 * @returns {Promise}
 */
export function downloadFile(url, fileName, data = null) {
    let downloadPromise = new Promise((resolve, reject) => {
        let mainProps = { method: 'GET' }
        if (data) {
            mainProps.method = 'POST'
            mainProps.body = data
        }
        fetch(url, {
            ...mainProps,
            credentials: 'include',
            cache: 'no-cache',
            mode: 'cors',
            headers: new Headers({
                "X-CSRFToken": getCRSFToken(),
            }),
        }).then(response => {
            if (response.ok) {
                return response.blob()
            }
            throw Error("Error Downloading file")
        }).then(data => {
            FileSaver.saveAs(data, fileName)
            resolve(true)
        }).catch(err => {
            reject(err)
        })
    })
    return downloadPromise

}
/**
 * Copy data to system Clipboard
 * @param {string} [text=''] text you want to copy
 * @returns {Promise}
 */
export function copyToClipboard(text = '') {
    return copy(text)
}
/**
 * ensure default paramters
 * @param {object} optsParam 
 * @param {object} defaultOpts
 * @returns {object}
 */
export function ensureOptsDefaults(optsParam, defaultOpts) {
    let newOpts = { ...optsParam }
    Object.keys(defaultOpts).forEach(key => {
        if (!newOpts[key]) {
            newOpts[key] = defaultOpts[key]
        }
    }, this)
    return newOpts
}