/**
 * convert radian to degree
 * @param {Number} radian angle in radian
 * @returns {Number} angle in degree
 */
export function convToDegree(radian) {
    return radian * (180 / Math.PI)
}
/**
 * convert degree to radian
 * @param {number} degree angle in degree
 * @returns {number} angle in radian
 */
export function convToRadian(degree) {
    return degree * (Math.PI / 180)
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {Array} point Location on a cartesian graph formatted as [x, y]
 * @param {Number} angle Angle at which a point should move in degrees
 * @param {Number} distance How far should the point move at the given angle in pixels?
 * @returns {Array} Newly moved point formatted as [x, y]
 */
export function moveTopRight(point, angle, distance) {
    return [
        point[0] + (Math.sin(convToRadian(angle)) * distance),
        point[1] + (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {Array} point Location on a cartesian graph formatted as [x, y]
 * @param {Number} angle Angle at which a point should move in degrees
 * @param {Number} distance How far should the point move at the given angle in pixels?
 * @returns {Array} Newly moved point formatted as [x, y]
 */
export function moveTopLeft(point, angle, distance) {
    return [
        point[0] - (Math.sin(convToRadian(angle)) * distance),
        point[1] + (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {Array} point Location on a cartesian graph formatted as [x, y]
 * @param {Number} angle Angle at which a point should move in degrees
 * @param {Number} distance How far should the point move at the given angle in pixels?
 * @returns {Array} Newly moved point formatted as [x, y]
 */
export function moveBottomRight(point, angle, distance) {
    return [
        point[0] + (Math.sin(convToRadian(angle)) * distance),
        point[1] - (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {Array} point Location on a cartesian graph formatted as [x, y]
 * @param {Number} angle Angle at which a point should move in degrees
 * @param {Number} distance How far should the point move at the given angle in pixels?
 * @returns {Array} Newly moved point formatted as [x, y]
 */
export function moveBottomLeft(point, angle, distance) {
    return [
        point[0] - (Math.sin(convToRadian(angle)) * distance),
        point[1] - (Math.cos(convToRadian(angle)) * distance)
    ]
}