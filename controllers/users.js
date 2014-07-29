// Module dependencies
var JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , User          = models.User
  , mongoose = require("mongoose");

// Finds all users
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  User.findAll(page, pagesize, JsonResponse.expressHandler(res));
};

// Returns the user with the provided username
exports.findByUsername = function(req, res) {

  //username: String

  var username = req.body.username;

  User.findByUsername(username, function(err, user) {
    if (err) {
      res.send(500, new JsonResponse(err));
    } else {
      if (user) {
        delete user['password'];
        res.send(new JsonResponse(null, user)); 
      } else {
        res.send(new JsonResponse(null, false));
      }
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

  User.findByUsername(req.body.username, function(err, user) {
    if (err) {

      res.send(500, new JsonResponse(err));

    } else {

      if (user) {

        var error = new Error("The username you entered already exists.");

        res.send(500, new JsonResponse(error)); 
        // res.send(new JsonResponse("The username you entered already exists.")); 

      } else {
        
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
    
            user.save(JsonResponse.expressHandler(res));
          });
        });
      }
    }
  });
};

// Returns a boolean indicating whether or not a user witht the provided username exists
exports.usernameExists = function(req, res) {
  
  //username: String

  var username = req.body.username;

  User.findByUsername(username, function(err, user) {
    if (err) {
      res.send(new JsonResponse(err));
    } else {
      if (user) {
        res.send(new JsonResponse(null, true)); 
      } else {
        res.send(new JsonResponse(null, false));
      }
    }
  });
};

// Updates the URI for the user's profile picture
exports.updateProfilePic = function(req, res) {
  
  var userId = req.body.userId,
    profilePic = req.body.profilePic;
  
  User.updateProfilePic(userId, profilePic, function(err, user){
    if(err) {
      res.send(500, new JsonResponse(err));
    } else {
      res.send(new JsonResponse(null, userId));
    }
  });
};