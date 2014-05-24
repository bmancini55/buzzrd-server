
// Module dependencies
var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var OAuthAccessTokenSchema = new Schema({
  accessToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});


///
/// Static methods
///

// Finds an access token
OAuthAccessTokenSchema.statics.findAccessToken = function(accessToken, next) {
  this.findOne({ accessToken: accessToken }, next);
}


///
/// Create and export the model
var oauthAccessTokenModel = mongoose.model('OAuthAccessToken', OAuthAccessTokenSchema);
module.exports = oauthAccessTokenModel;