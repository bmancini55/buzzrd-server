
// Module dependencies
var mongoose  = require('mongoose')
  , crypto    = require('crypto')
  , Schema    = mongoose.Schema

///
/// Schema definition
///
var OAuthClientSchema = new Schema({
  clientId: { type: String, required: true },
  clientSecret: { type: String, required: true },
  clientName: { type: String, required: true },
  redirectUri: { type: String },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});


///
/// Static methods
///

OAuthClientSchema.statics.generateClientId = function(next) {
  var CLIENT_ID_LENGTH = 16
  crypto.randomBytes(CLIENT_ID_LENGTH, function(err, buffer) {
    if(err) next(err);
    else next(null, buffer.toString('hex'));
  });
}

// Generates a cryptographically secure client secret
OAuthClientSchema.statics.generateClientSecret = function(next) {
  var CLIENT_SECRET_LENGTH = 64
  crypto.randomBytes(CLIENT_SECRET_LENGTH, function(err, buffer) {
    if(err) next(err);
    else next(null, buffer.toString('hex'));
  });
}

// Finds all clients sorted by name
OAuthClientSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ name: 1 })
    .exec(next);
}

// Finds a client by clientId and clientSecret
OAuthClientSchema.statics.findClient = function(clientId, clientSecret, next) {
  this.findOne({ clientId: clientId, clientSecret: clientSecret }, next);
}


///
/// Create and export the model
///
var oauthClientModel = mongoose.model('OAuthClient', OAuthClientSchema);
module.exports = oauthClientModel;