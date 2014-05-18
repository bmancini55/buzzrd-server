
// Module dependencies
var JsonResponse  = require('../common/jsonresponse')
  , models        = require('../models')
  , Room          = models.Room
  , Message       = models.Message;

// Finds a room by the users current location
exports.findByLocation = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lon = req.query.lon
    , lat = req.query.lat;

  Room.findAll(page, pagesize, function(err, rooms) {
    if(err) {
      res.send(500, new JsonResposne(err));
    } else {
      res.send(new JsonResponse(null, rooms));
    }
  });
};

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


// Finds the messages for a room
exports.findMessages = function(req, res) {
  var idroom  = req.param.idroom

  Message.findByRoom(idroom, function(err, rooms) {
    if(err) {
      res.send(500, new JsonResponse(err));
    } else {
      res.send(new JsonResponse(null, rooms));
    }
  });
};