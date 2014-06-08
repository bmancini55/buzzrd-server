
// Module Dependencies
var JsonResponse  = require('jsonresponse')
  , Models        = require('../models')
  , Message       = Models.Message


/** 
 * findByRoom
 * Finds messages for a room
 */
exports.findByRoom = function(req, res) {

  var idroom = req.param('idroom')
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  if(!idroom) {
    res.send(new JsonResponse('Room must be supplied'));
  } else {
    Message.findByRoom(idroom, page, pagesize, JsonResponse.expressHandler(res));
  }

}