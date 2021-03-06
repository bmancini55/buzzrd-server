
// Module dependencies
var express       = require('express')
  , bodyParser    = require('body-parser')
  , serverStatic  = require('serve-static')
  , OAuthServer   = require('node-oauth2-server')
  , socketServer  = require('./socketserver')

  , OAuthModel    = require('./common/oauthmodel')
  , dbhelper      = require('./common/dbhelper')
  , configHelper  = require('./common/confighelper')

  , models        = require('./models')
  , controllers   = require('./controllers')

// Local variables
  , config = configHelper.env()
  , app = express()
  , server = socketServer(app)
  , debug = configHelper.NODE_ENV === 'development'
  , oauth;

// Start listening on the configured port
server.listen(config.express.port);

// Enable POST body parsing
app.use(bodyParser());

// Temporarily add a debug page for connecting
app.use('/public', serverStatic(__dirname + '/public'));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Configure OAuth2 Server
app.oauth = oauth = OAuthServer({
    model: new OAuthModel(),
    grants: ['password'],
    accessTokenLifetime: null
  });


//////////////////////////////////////////////////////////////////
//
// Version 1.0.0 MOUNTS 
// REMOVE AFTER FUTURE RELEASE
//
//////////////////////////////////////////////////////////////////
app.post('/api/users/updateProfilePic', controllers.Users.updateProfilePic);
app.get ('/api/users/current', oauth.authorise(), controllers.Users.findCurrent);
app.post('/api/users/update/', controllers.Users.update);


//////////////////////////////////////////////////////////////////
//
// UNSECURED MOUNTS
//
//////////////////////////////////////////////////////////////////

// OAuth API
app.post('/oauth/grant', oauth.grant());

app.post ('/api/rooms/inviteFriends', oauth.authorise(), controllers.Rooms.inviteFriends);
// User API
app.post('/api/users', controllers.Users.create);
app.post('/api/users/usernameExists', controllers.Users.usernameExists);

// Disclaimer API
app.get('/api/disclaimers/termsofservice', controllers.Disclaimers.termsofservice);
app.get('/api/disclaimers/privacypolicy', controllers.Disclaimers.privacypolicy);


//////////////////////////////////////////////////////////////////
//
// SECURE MOUNTS - All mounts below require authorization
//
//////////////////////////////////////////////////////////////////

// Authorize all requests for the /api mount
app.all('/api/*', oauth.authorise());

// userId preprocessor
app.all('/api/*', function(req, res, next) {
  if(req.user) {
    req.userId = req.user._id.toString();
  }
  next();
});

// Room API
app.post('/api/rooms', controllers.Rooms.create);
app.post('/api/rooms/inviteFriends', oauth.authorise(), controllers.Rooms.inviteFriends);
app.get ('/api/rooms/nearby', controllers.Rooms.findNearby);
app.get ('/api/rooms/:idroom', controllers.Rooms.findById);
app.get ('/api/rooms/:idroom/messages', controllers.Messages.findByRoom);

// Messages API
app.get ('/api/messages/:idmessage/upvote', controllers.Messages.upvote);

// Venue API
app.get ('/api/venues', controllers.Venues.find);
app.get ('/api/venues/:venueid/rooms', controllers.Rooms.findByVenue)

// User API
app.get ('/api/users/:userid/pic', controllers.Users.findProfilePic);

// Current User API
app.get ('/api/me', controllers.Users.findCurrent);
app.put ('/api/me', controllers.Users.update);
app.put ('/api/me/pic', controllers.Users.updateProfilePic);
app.get ('/api/me/rooms', controllers.Rooms.findCurrentUser);
app.put ('/api/me/rooms/:roomId/read', controllers.Notifications.markRoomAsRead);
app.put ('/api/me/rooms/:roomId', controllers.Rooms.updateUserRoom);
app.put ('/api/me/device', controllers.Users.updateDevice);
app.post('/api/me/removeRoom', controllers.Users.removeRoom);
app.get ('/api/me/notifications', controllers.Notifications.findCurrentUser);
app.get ('/api/me/notifications/unread', controllers.Notifications.findCurrentUnread);

// Image API
app.post('/api/images/upload', controllers.Images.upload);

// Friend API
app.post('/api/friends', controllers.Friends.create);
app.get ('/api/me/friends', controllers.Friends.findCurrentUsers);
app.get ('/api/me/findPotentialFriends', controllers.Friends.findPotentialFriends);
app.post('/api/me/removeFriend', controllers.Friends.removeFriend);

// Notification API
app.del ('/api/notifications/:notificationId', controllers.Notifications.removeNotification);
app.put ('/api/notifications/:notificationId/read', controllers.Notifications.updateRead);

//
// DEBUG MOUNTS
//
//////////////////////////////////////////////////////////////////
if(debug) {

  // OAuth API
  app.get('/oauth/clients', controllers.OAuthClients.findAll);
  app.post('/oauth/clients', controllers.OAuthClients.create);
  app.get('/oauth/tokens', controllers.OAuthAccessTokens.findAll);

  // User API
  app.get ('/api/users', controllers.Users.findAll);
  app.get ('/api/users/findByUsername', controllers.Users.findByUsername);

  // Venues API
  app.get('/api/venues', controllers.Venues.findByLocation);
  app.get('/api/venues/foursquare', controllers.Venues.findNearbyFromFoursquare);

  // Rooms API
  app.get ('/api/rooms', controllers.Rooms.findAll);

  // Friends API
  app.get ('/api/friends', controllers.Friends.findAll);
}


// Configure OAuth error handler
app.use(oauth.errorHandler());

// TODO configure our error handler