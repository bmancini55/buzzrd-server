
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

    // construct room join
    var promises = [];
    venues.forEach(function(venue) {      
      var id = venue.id
        , page = 1
        , pagesize = 5;
      venue = venue.toObject();
      promises.push(
        Q.ninvoke(Room, "findByVenue", id, page, pagesize)
        .then(function(rooms) {          
          venue.rooms = rooms;
          return venue;
        })      
      );
    });

    Q.all(promises)
    .then(function(results) {
      res.send(new JsonResponse(null, results));
    }, function(err) {
      res.send(500, new JsonResponse(err));
    })

  }, function(err) {
    res.send(500, new JsonReponse(err));
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
