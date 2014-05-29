
// Module dependencies
var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var OAuthAccessTokenSchema = new Schema({
  accessToken: { type: String, required: true },
  clientId: { type: String, required: true },
  userId: { type: String, required: true },
  expires: { type: Date },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});


///
/// Static methods
///

// Finds an access token
OAuthAccessTokenSchema.statics.findAccessToken = function(accessToken, next) {
  this.findOne({ accessToken: accessToken }, next);
}

// Finds all access tokens
OAuthAccessTokenSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ name: 1 })
    .exec(next);
}


///
/// Create and export the model
var oauthAccessTokenModel = mongoose.model('OAuthAccessToken', OAuthAccessTokenSchema);
module.exports = oauthAccessTokenModel;