
// Module Dependencies
var JsonResponse      = require('../common/jsonresponse')
  , Models            = require('../models')
  , OAuthAccessToken  = Models.OAuthAccessToken;


// Finds all clients
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  OAuthAccessToken.findAll(page, pagesize, function(err, clients) {
    if(err) res.send(500, new JsonResponse(err));
    else res.send(new JsonResponse(null, clients));
  })

}