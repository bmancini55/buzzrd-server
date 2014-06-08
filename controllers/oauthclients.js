
// Module Dependencies
var JsonResponse  = require('jsonresponse')
  , Models        = require('../models')
  , OAuthClient   = Models.OAuthClient


/** 
 * create
 * Creates a new client
 */
exports.create = function(req, res) {

  var clientName  = req.body.clientName
    , redirectUri = req.body.redirectUri;

  OAuthClient.generateClientId(function(err, clientId) {
    if(err) res.send(new JsonResponse(err));

    OAuthClient.generateClientSecret(function(err, clientSecret) {
      if(err) res.send(new JsonResponse(err));

      var client = new OAuthClient({
          clientId: clientId,
          clientSecret: clientSecret,
          clientName: clientName,
          redirectUri: redirectUri
      });

      client.save(JsonResponse.expressHandler(res));
    })
  })
}

/** 
 * findAll
 * Finds all clients
 */
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  OAuthClient.findAll(page, pagesize, JsonResponse.expressHandler(res))

}