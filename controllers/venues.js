
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

  var includeRooms = req.query.includeRooms || false
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 100

  Q.ninvoke(Venue, "findNearby", lat, lng, radius)
  .then(function(venues) {
    var promises = [];

    if(!includeRooms) {
      return venues;
    } else {
      return Q.all(
        // map each venue into a promise
        // that loads the rooms for that venue
        venues.map(function(venue) {
          var id = venue._id.toString();
                  
          return Q.ninvoke(Room, "findByVenue", id, 1, 5)            
          .then(function(rooms) {
            venue.rooms = rooms;
            return venue;
          });
        })
      );
    }
  })
  .then(function(venues) {
    res.send(new JsonResponse(null, venues));
  })
  .fail(function(err) {
    res.send(500, new JsonResponse(err));
  });
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