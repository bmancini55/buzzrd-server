
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

    console.log('Found %s venues', venues.length);

    // construct room queries
    var promises = [];
    venues.forEach(function(venue) {
      promises.push(Q.ninvoke(Room, "findByVenue", venue._id.toString(), 1, 5));
    });

    Q.all(promises)
    .then(function(roomArrays) {

      console.log('Found %s arrays', roomArrays.length);
      var results = [];
      results.concat.apply(results, roomArrays);
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
