
// Module dependencies
var Q             = require('q')
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
    , venueId = req.body.venueId
    , lat = req.body.lat
    , lng = req.body.lng;

  Room.createRoom(name, req.userId, lat, lng, venueId, JsonResponse.expressHandler(res));
};


/**
 * Finds rooms for the current user
 */
exports.findByUserId = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
    , userId = req.query.userId;

  Room.findByUser(userId, JsonResponse.expressHandler(res));

}