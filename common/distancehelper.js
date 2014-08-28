/** 
 * Convert degrees to radians
 */

function deg2rad(deg) {
  return deg * (Math.PI/180)
}


/** 
 * Calculates using the Haversine formula
 * and returns the distance in KM
 * @param {Number} lat1
 * @param {Number} lon1
 * @param {Number} lat2
 * @param {Number} lon2
 * @api public
 */
exports.inKilomenters = inKilomenters = function(lat1, lon1, lat2, lon2) {
  var R = 6371 // Radius of the earth in km
    , dLat, dLon, a, c, d;

  dLat = deg2rad(lat2-lat1);
  dLon = deg2rad(lon2-lon1);
  a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  d = R * c;

  return d;
}

/**
 * Calculates distance using Haversine formula
 * and returns the distance in Miles
 * 
 * @param {Number} lat1
 * @param {Number} lon1
 * @param {Number} lat2
 * @param {Number} lon2
 * @api public
 */ 
exports.inMiles = inMiles = function(lat1, lon1, lat2, lon2) {
  var kmPmi = 0.621371;
  return inKilomenters(lat1, lon1, lat2, lon2) * kmPmi;
} 