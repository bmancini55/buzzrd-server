
// Module Dependencies
var JsonResponse      = require('jsonresponse')
  , Models            = require('../models')
  , OAuthAccessToken  = Models.OAuthAccessToken;


/** 
 * findAll
 * Finds all access tokens
 */
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  OAuthAccessToken.findAll(page, pagesize, JsonResponse.expressHandler(res))

}