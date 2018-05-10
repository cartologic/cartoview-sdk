import FileSaver from 'file-saver'
import copy from 'clipboard-copy'
import { getCRSFToken } from '../helpers/helpers'
export const doGet = (url, extraHeaders = {}, type = 'json') => {
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
export const doExternalGet = (url, extraHeaders = {}, type = 'json') => {
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
export const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
export const doPost = (url, data, extraHeaders = {}, type = 'json') => {
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
export const downloadFile = (url, fileName, data = null) => {
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
    }).then(response => response.blob().then(data => {
        FileSaver.saveAs(data, fileName)
    }))
}
export const copyToClipboard = (text = '') => {
    return copy(text)
}