/**
 * this function get django csrf token from cookie
 * @returns {string} return django csrf token
 */
export function getCRSFToken() {
    let csrfToken, csrfMatch = document.cookie.match(/csrftoken=(\w+)/)
    if (csrfMatch && csrfMatch.length > 0) {
        csrfToken = csrfMatch[1]
    }
    return csrfToken
}
/**
 * this function check if URL has a slash at the end
 * @param {string} str url to check
 * @returns {bool} return true if has Trailing Slash, false if not
 */
export function hasTrailingSlash(str) {
    return (/.*\/$/).test(str)
}
/**
 * this function check if URL has a slash at the end
 * @param {string} str url to remove slash from
 * @returns {string}
 */
export function removeTrailingSlash(str) {
    return hasTrailingSlash(str) ? str.slice(0, -1) : str
}
