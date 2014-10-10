// Module dependencies
var Rooms             = require('./rooms')
  , Messages          = require('./messages')
  , Users             = require('./users')
  , OAuthClients      = require('./oauthclients')
  , OAuthAccessTokens = require('./oauthaccesstokens')
  , Venues            = require('./venues')
  , Images            = require('./images')
  , Disclaimers       = require('./disclaimers')
  , Friends           = require('./friends');

module.exports = {
  Rooms: Rooms,
  Messages: Messages,
  Users: Users,
  OAuthClients: OAuthClients,
  OAuthAccessTokens: OAuthAccessTokens,
  Venues: Venues,
  Images: Images,
  Disclaimers: Disclaimers,
  Friends: Friends
}