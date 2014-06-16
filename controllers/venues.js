
// Module dependencies
var Q             = require('Q')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Venue         = models.Venue
  , Room          = models.Room;


/**
 * findNearby
 * Finds venues and rooms near the specified location
 */
exports.find = function(req, res) {

  var includeRooms = parseInt(req.query.includeRooms) === 1
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 100;

  if(includeRooms) {    
    Venue.findWithRooms(lat, lng, radius, JsonResponse.expressHandler(res));
  } else {
    Venue.findNearby(lat, lng, radius, JsonResponse.expressHandler(res));
  }
}


/** 
 * findByLocation
 * Finds venues by location
 */
exports.findByLocation = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat

  Venue.findNearby(lat, lng, 100, JsonResponse.expressHandler(res));
};

exports.findNearbyFromFoursquare = function(req, res) {
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat

  Venue.findNearbyFromFoursquare(lat, lng, 100, JsonResponse.expressHandler(res));
}