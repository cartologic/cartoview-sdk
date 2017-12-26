import { getCRSFToken } from '../helpers/helpers.jsx'
const reponseMapping = {
    'json': ( response ) => response.json(),
    'xml': ( response ) => response.text()
}
export const doGet = ( url, extraHeaders = {}, resultType = 'json' ) => {
    return fetch( url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            "X-CSRFToken": getCRSFToken(),
            ...extraHeaders
        }
    } ).then( reponseMapping[ resultType ] )
}
export const doPost = ( url, data, extraHeaders = {}, resultType = 'json' ) => {
    return fetch( url, {
        method: 'POST',
        credentials: 'include',
        headers: new Headers( {
            "X-CSRFToken": getCRSFToken(),
            ...extraHeaders
        } ),
        body: data
    } ).then( reponseMapping[ resultType ] )
}
