
// Module dependencies
var Q             = require('Q')
  , JsonResponse  = require('../common/jsonresponse')
  , models        = require('../models')
  , Room          = models.Room
  , Venue         = models.Venue
  , Message       = models.Message;

// Finds nearby rooms
exports.findNearby = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 400

  Q.ninvoke(Venue, "findNearby", lat, lng, radius)
  .then(function(venues) {
    var promises = [];

    // join rooms
    return Q.all(

      // map each venue into a promise
      // that loads the rooms for that venue
      venues.map(function(venue) {
        var id = venue._id.toString();
        
        return Q.ninvoke(Room, "findByVenue", id, 1, 5)        
        .then(function(rooms) {

          // return rooms if we have then
          if(rooms.length > 0 ) {
            return rooms;        
          } 

          // otherwise create a new default room
          // NOTE: this should probably be moved to venue caching
          else {
            var newRoom = new Room({ 
              name: 'Default',
              venueId: id,
              venueDefault: true
            });
            return Q.ninvoke(venue, 'addRoom', newRoom)
            .then(function(room) {
              venue.roomCount += 1;
              return [ room ];
            })
          }
        })      
        .then(function(rooms) {
          venue.rooms = rooms;
          return venue;
        });
      })
    );
  })
  .then(function(venues) {
    res.send(new JsonResponse(null, venues));
  })
  .fail(function(err) {
    res.send(500, new JsonResponse(err));
  });
}

// Finds all rooms
exports.findAll = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  Room.findAll(page, pagesize, function(err, rooms) {
    if(err) {
      res.send(500, new JsonResposne(err));
    } else {
      res.send(new JsonResponse(null, rooms));
    }
  });
}

// Creates a new room
exports.create = function(req, res) {
  
  var room = new Room({
    name: req.body.name,
    lon: req.body.lon,
    lat: req.body.lat
  });
  room.save(function(err, room) {
    if(err) {
      res.send(500, new JsonResponse(err));
    } else {
      res.send(new JsonResponse(null, room));
    }
  });

};


