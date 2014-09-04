// Module dependencies
var JsonResponse  = require('jsonresponse')
  , path          = require('path')
  , fs            = require('fs')
  , Q             = require('Q')
  , models        = require('../models')
  , User          = models.User;

/**
 * Finds all users
 */
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 1000, 1), 1000);

  User.findAll(page, pagesize, JsonResponse.expressHandler(res));
};

/**
 * Uses the current oauth bearer token to retrieve the current user
 * The user property is attached to the request object during the 
 * call to getAccessToken in the OAuthModel we have implemented
 */
exports.findCurrent = function (req, res) {
  var user = req.user;
  res.send(new JsonResponse(null, user));
}


/** 
 * Creates a new user
 */
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

/** 
 * Updates a user
 */
exports.update = function(req, res) {

  //username: String,
  //password: String,
  //firstName: String,
  //lastName: String,
  //sex: String

  var originalUser;

  User.findByUsername(req.body.username, function(err, user) {
    originalUser = user;

    if (err) {

      res.send(500, new JsonResponse(err));

    } else {

      if (user) {

        // If  req.body.password is not nil, then 
        // then get the password salt and 

        if (req.body.password) {
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
            
              User.update(originalUser.id, user, function(err, user){
                if(err) {
                  res.send(500, new JsonResponse(err));
                } else {
                  res.send(new JsonResponse(null, user));
                }
              });

            });
          });
        }
        else {
          // save everything except for the password
          var user = new User({
                username: req.body.username,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                sex: req.body.sex
              });
            
              User.update(originalUser.id, user, function(err, user){
                if(err) {
                  res.send(500, new JsonResponse(err));
                } else {
                  res.send(new JsonResponse(null, user));
                }
              });
        }

      } else {
        var error = new Error("The user you are trying to update does not exist.");

        res.send(500, new JsonResponse(error));
      }
    }
  });
};

/** 
 * Returns a boolean indicating whether or not a user witht the provided username exists
 */
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

/**
 * Updates the URI for the user's profile picture
 */
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

exports.findProfilePic = function(req, res) {

  var userId = req.param('userid')
    , rootPath = path.resolve(__dirname + '/../');

  Q.ninvoke(User, "findById", userId)
  .then(function(user) {    
    
    var defaultPath = path.join(rootPath, '/uploads/default.png')
      , userPath
      , deferred = Q.defer();

    // verify profile pic exists and respond
    // with the profile path or the default path
    if(user && user.profilePic) {      
      userPath = path.join(rootPath, user.profilePic);    

      fs.exists(userPath, function(exists) {
        if(exists)
          deferred.resolve(userPath);
        else
          deferred.resolve(defaultPath);
      })
      
      return deferred.promise;      
    } 

    // return the default path
    else {
      return path.join(rootPath, '/uploads/default.png')
    }
  })
  .done(

    // send the specified file
    function(path) {    
      res.sendfile(path);
    }, 

    // otherwise send error code
    function(err) {
      res.send(new JsonResponse(err));
    }
  );

}