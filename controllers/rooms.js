
// Module dependencies
var Q             = require('Q')
  , util          = require('util')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Room          = models.Room
  , Venue         = models.Venue
  , Message       = models.Message;


/**
 * Finds rooms based on proximity and search criteria 
 */ 
exports.findNearby = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 10000
    , search = req.query.search;
  
  Room.findNearby({ 
    lat: lat,
    lng: lng,
    meters: radius,
    search: search
  }, JsonResponse.expressHandler(res));
}


/**
 * Finds rooms for the current user
 */
exports.findCurrentUser = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
    , user = req.user
    , userId = user._id.toString();

  Room.findByUser(userId, JsonResponse.expressHandler(res));

}

/**
 * findByVenue
 * Finds a paged list of rooms by specific venue
 */
exports.findByVenue = function(req, res) {

  var venueId = req.param('venueid')
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 5, 1), 1000);

  Room.findByVenue(venueId, page, pagesize, JsonResponse.expressHandler(res));
}

/**
 * findAll
 * Finds all rooms
 */
exports.findAll = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  Room.findAll(page, pagesize, JsonResponse.expressHandler(res));
}



/** 
 * create
 * Creates a new room
 */ 
exports.create = function(req, res) {  
  var name = req.body.name
    , venueId = req.body.venueId;

  Venue.findById(venueId, function(err, venue) {

    if(err) res.send(new Jsonrespon(err));
    else {

      var isDefault = (venue.roomCount === 0);

      // create the default room
      if(isDefault) {
        room = new Room({
          name: venue.name,
          venueId: venue._id,
          venueDefault: true
        });
      } 

      // create a new room
      else {
        room = new Room({
          name: name || util.format('%s %s', venue.name, (venue.roomCount + 1)),
          venueId: venue._id,
          venueDefault: false
        });
      }

      // add the room to the venue
      venue.addRoom(room, function(err, newRoom) {
        if(err) res.send(new JsonResponse(err));
        else {
          return res.send(new JsonResponse(null, {
            venue: venue,
            room: newRoom
          }));
        }
      })
    }
  });  
};


