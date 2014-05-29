
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

  var rawPassword = req.body.password;

  User.generateSalt(function(err, salt) {
    if(err) res.send(500, new JsonResponse(err));

    User.hashPassword(rawPassword, salt, function(err, derivedKey) {
      var user = new User({
        username: req.body.username,
        password: derivedKey,
        salt: salt,
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

// Returns the user with the provided username
exports.usernameExists = function(req, res) {
  
  //username: String

  var username = req.body.username;

  User.findByUsername(username, function(err, user) {
      if (err) {
        res.send(new JsonResponse(null, err));
      } else {

        if (user) {
          res.send(new JsonResponse(null, true)); 
        } else {
          res.send(new JsonResponse(null, false));
        }
      }
    });
  });
};