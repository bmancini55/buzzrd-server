
// Module Dependencies
var JsonResponse  = require('../common/jsonresponse')
  , Models        = require('../models')
  , Message       = Models.Message


// Finds messages for the room
exports.findByRoom = function(req, res) {

  var idroom = req.param('idroom')
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  if(!idroom) {
    res.send(new JsonResponse('Room must be supplied'));
  } else {
    Message.findByRoom(idroom, page, pagesize, function(err, messages) {
      res.send(new JsonResponse(err, messages));
    });
  }

}