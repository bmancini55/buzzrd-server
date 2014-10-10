var Room              = require('./room')
  , Message           = require('./message')
  , User              = require('./user')

  , OAuthAccessToken  = require('./oauthaccesstoken')
  , OAuthClient       = require('./oauthclient')

  , Venue             = require('./venue')

  , Friend            = require('./friend')
  
module.exports = {
  Room: Room,
  Message: Message,
  User: User,
  OAuthAccessToken: OAuthAccessToken,
  OAuthClient: OAuthClient,
  Venue: Venue,
  Friend: Friend
}