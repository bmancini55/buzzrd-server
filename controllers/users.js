
// Module dependencies
var JsonResponse  = require('../common/jsonresponse')
  , models        = require('../models')
  , User          = models.User;

// Finds all users
exports.findAll = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  User.findAll(page, pagesize, function(err, users) {
    if(err) {
      res.send(500, new JsonResposne(err));
    } else {
      res.send(new JsonResponse(null, users));
    }
  });
};

// Creates a new user
exports.create = function(req, res) {
  
  //username: String,
  //password: String,
  //firstName: String,
  //lastName: String,
  //sex: String


  var user = new User({
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    sex: req.body.sex
  });
  user.save(function(err, user) {
    if(err) {
      res.send(500, new JsonResponse(err));
    } else {
      res.send(new JsonResponse(null, user));
    }
  });

};