
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

},

/** 
 * upvote
 * Upvotes a message for the currently authenticated use
 */
exports.upvote = function (req, res) {

  var idmessage = req.param('idmessage')
    , iduser = req.user._id.toString()

  Models.Message.findById(idmessage, function (err, message) {
    if(err) return new res.send(500, new JSonResponse(err));
    else {
      message.upvote(iduser, JsonResponse.expressHandler(res));
    }
  })
}