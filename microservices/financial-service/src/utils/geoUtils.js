const logger = require('../config/logger');

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  try {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in metres
    return Math.round(distance);
  } catch (error) {
    logger.error('Error calculating distance', { 
      error: error.message,
      lat1, lon1, lat2, lon2
    });
    throw new Error('Distance calculation failed');
  }
}

/**
 * Check if a point is within a geofence (circle)
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} storeLat - Store's latitude
 * @param {number} storeLon - Store's longitude
 * @param {number} radius - Geofence radius in meters
 * @returns {boolean} True if user is within geofence
 */
function isWithinGeofence(userLat, userLon, storeLat, storeLon, radius) {
  try {
    const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
    return distance <= radius;
  } catch (error) {
    logger.error('Error checking geofence', { 
      error: error.message,
      userLat, userLon, storeLat, storeLon, radius
    });
    throw new Error('Geofence check failed');
  }
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function validateCoordinates(lat, lon) {
  try {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return false;
    }
    
    if (isNaN(lat) || isNaN(lon)) {
      return false;
    }
    
    if (lat < -90 || lat > 90) {
      return false;
    }
    
    if (lon < -180 || lon > 180) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating coordinates', { 
      error: error.message,
      lat, lon
    });
    return false;
  }
}

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} precision - Decimal places (default: 6)
 * @returns {object} Formatted coordinates
 */
function formatCoordinates(lat, lon, precision = 6) {
  try {
    if (!validateCoordinates(lat, lon)) {
      throw new Error('Invalid coordinates');
    }
    
    return {
      latitude: parseFloat(lat.toFixed(precision)),
      longitude: parseFloat(lon.toFixed(precision)),
      formatted: `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`
    };
  } catch (error) {
    logger.error('Error formatting coordinates', { 
      error: error.message,
      lat, lon, precision
    });
    throw new Error('Coordinate formatting failed');
  }
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  try {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360; // Convert to degrees and normalize

    return Math.round(bearing);
  } catch (error) {
    logger.error('Error calculating bearing', { 
      error: error.message,
      lat1, lon1, lat2, lon2
    });
    throw new Error('Bearing calculation failed');
  }
}

/**
 * Get direction name from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Direction name
 */
function getDirectionName(bearing) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Calculate midpoint between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {object} Midpoint coordinates
 */
function calculateMidpoint(lat1, lon1, lat2, lon2) {
  try {
    if (!validateCoordinates(lat1, lon1) || !validateCoordinates(lat2, lon2)) {
      throw new Error('Invalid coordinates');
    }

    const φ1 = lat1 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;

    const Bx = Math.cos(φ2) * Math.cos(λ2 - λ1);
    const By = Math.cos(φ2) * Math.sin(λ2 - λ1);
    const φ3 = Math.atan2(Math.sin(φ1) + Math.sin(φ2), Math.sqrt((Math.cos(φ1) + Bx) * (Math.cos(φ1) + Bx) + By * By));
    const λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);

    return {
      latitude: φ3 * 180 / Math.PI,
      longitude: λ3 * 180 / Math.PI
    };
  } catch (error) {
    logger.error('Error calculating midpoint', { 
      error: error.message,
      lat1, lon1, lat2, lon2
    });
    throw new Error('Midpoint calculation failed');
  }
}

module.exports = {
  calculateDistance,
  isWithinGeofence,
  validateCoordinates,
  formatCoordinates,
  calculateBearing,
  getDirectionName,
  calculateMidpoint
};