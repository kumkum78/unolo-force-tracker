/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if distance exceeds threshold and generate warning
 * @param {number} distance - Distance in kilometers
 * @param {number} threshold - Threshold in meters (default 500)
 * @returns {object} {shouldWarn: boolean, message: string}
 */
function checkDistanceWarning(distance, threshold = 500) {
    const distanceInMeters = distance * 1000;
    
    if (distanceInMeters > threshold) {
        return {
            shouldWarn: true,
            message: 'You are far from the client location'
        };
    }
    
    return {
        shouldWarn: false,
        message: null
    };
}

module.exports = {
    calculateDistance,
    checkDistanceWarning
};
