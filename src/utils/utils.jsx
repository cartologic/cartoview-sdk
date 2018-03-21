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
        try {
            if (type === 'json') {
                return response.json()
            } else if (type === 'xml') {
                return response.text()
            }
        } catch (err) {
            console.error(url, err.message)
            if (!response.ok) {
                console.error(url, response.status)
            }
            return response.text().then(errMsg => { throw errMsg })
        }
    })
}
export const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
export const doPost = (url, data, extraHeaders = {}, type = 'json') => {
    return fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: new Headers({
            "X-CSRFToken": getCRSFToken(),
            ...extraHeaders
        }),
        body: data
    }).then((response) => {
        try {
            if (type === 'json') {
                return response.json()
            } else if (type === 'xml') {
                return response.text()
            }
        } catch (err) {
            console.error(url, err.message)
            if (!response.ok) {
                console.error(url, response.status)
            }
            return response.text().then(errMsg => { throw errMsg })
        }

    })
}