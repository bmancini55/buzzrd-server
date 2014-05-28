
// Module dependencies
var JsonResponse  = require('../common/jsonresponse')
  , models        = require('../models')
  , Venue          = models.Venue;

// Finds a venue by location
exports.findByLocation = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat

  Venue.findNearby(lat, lng, 100, function(err, venues) {
    if(err) res.send(500, new JsonResponse(err));
    else res.send(new JsonResponse(null, venues));
  });
};

