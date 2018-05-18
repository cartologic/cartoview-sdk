/**
 * convert radian to degree
 * @param {number} radian angle in radian
 * @returns {number} angle in degree
 */
export const convToDegree = (radian) => {
    return radian * (180 / Math.PI)
}
/**
 * convert degree to radian
 * @param {number} degree angle in degree
 * @returns {number} angle in radian
 */
export const convToRadian = (degree) => {
    return degree * (Math.PI / 180)
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {array} point Location on a cartesian graph formatted as [x, y]
 * @param {number} angle Angle at which a point should move in degrees
 * @param {number} distance How far should the point move at the given angle in pixels?
 * @returns {array} Newly moved point formatted as [x, y]
 */
export const moveTopRight = (point, angle, distance) => {
    return [
        point[0] + (Math.sin(convToRadian(angle)) * distance),
        point[1] + (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {array} point Location on a cartesian graph formatted as [x, y]
 * @param {number} angle Angle at which a point should move in degrees
 * @param {number} distance How far should the point move at the given angle in pixels?
 * @returns {array} Newly moved point formatted as [x, y]
 */
export const moveTopLeft = (point, angle, distance) => {
    return [
        point[0] - (Math.sin(convToRadian(angle)) * distance),
        point[1] + (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {array} point Location on a cartesian graph formatted as [x, y]
 * @param {number} angle Angle at which a point should move in degrees
 * @param {number} distance How far should the point move at the given angle in pixels?
 * @returns {array} Newly moved point formatted as [x, y]
 */
export const moveBottomRight = (point, angle, distance) => {
    return [
        point[0] + (Math.sin(convToRadian(angle)) * distance),
        point[1] - (Math.cos(convToRadian(angle)) * distance)
    ]
}
/**
 * Moves a vertex at an angle for a specific distance, 0 degrees points up and 180 degrees points down
 * @param {array} point Location on a cartesian graph formatted as [x, y]
 * @param {number} angle Angle at which a point should move in degrees
 * @param {number} distance How far should the point move at the given angle in pixels?
 * @returns {array} Newly moved point formatted as [x, y]
 */
export const moveBottomLeft = (point, angle, distance) => {
    return [
        point[0] - (Math.sin(convToRadian(angle)) * distance),
        point[1] - (Math.cos(convToRadian(angle)) * distance)
    ]
}