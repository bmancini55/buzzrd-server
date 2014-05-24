
// Module dependencies
var crypto            = require('crypto')
  , Models            = require('../models')
  , User              = Models.User
  , OAuthAccessToken  = Models.OAuthAccessToken
  , OAuthClient       = Models.OAuthClient


function OAuthModel() { }


// retrieve the access token from the store
OAuthModel.prototype.getAccessToken = function(bearerToken, next) {
  OAuthAccessToken.findAccessToken(accesstoken, next);
}

// gets the client from the client data store
OAuthModel.prototype.getClient = function(clientId, clientSecret, next) {
    Models.OAuthClient.findClient(clientId, next);
}

// checks if the grant type is allowed
OAuthModel.prototype.grantTypeAllowed = function(clientId, grantType, next) {
  if(grantType === 'password') {
    next(null, true);
  }
}

// saves the access token
OAuthModel.prototype.saveAccessToken = function(accessToken, clientId, expires, user, next) {
    var accessToken = new Models.OAuthToken({
      clientId: clientId,
      accessToken: accessToken,
      expires: expires,
      userId: user.id
    });
    accessToken.save(next);
}

// call out to storage to retrieve the user
OAuthModel.prototype.getUser = function(username, password, next) {
  User.findOne({ username: username }, function(err, user) {
    if(err) {
      next(err);
    } else {
      user.verifyPassword(password, function(err, valid) {
        if(err) {
          return next(err);
        } else {
          next(null, user);
        }
      });
    }
  });
}


///
/// Exports
///
module.exports = OAuthModel;