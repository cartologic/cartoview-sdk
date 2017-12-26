import UrlAssembler from 'url-assembler'
export default class URLS {
    encodeURL( url ) {
        return encodeURIComponent( url ).replace( /%20/g, '+' )
    }
    getParamterizedURL( url, query ) {
        return UrlAssembler( url ).query( query ).toString()
    }
    getProxiedURL( url, proxyURL = null ) {
        let proxiedURL = url
        if ( proxyURL ) {
            proxiedURL = proxyURL + this.encodeURL( url )
        }
        return proxiedURL
    }
}