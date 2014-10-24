
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

// OAuth API
app.post('/oauth/grant', oauth.grant());

// Room API
app.post('/api/rooms', oauth.authorise(), controllers.Rooms.create);
app.get ('/api/rooms/:idroom/messages', oauth.authorise(), controllers.Messages.findByRoom);
app.get ('/api/rooms/nearby', oauth.authorise(), controllers.Rooms.findNearby);

// Messages API
app.get ('/api/messages/:idmessage/upvote', oauth.authorise(), controllers.Messages.upvote);

// Venue API
app.get ('/api/venues', oauth.authorise(), controllers.Venues.find);
app.get ('/api/venues/:venueid/rooms', oauth.authorise(), controllers.Rooms.findByVenue)

// User API
app.post('/api/users', controllers.Users.create);
app.post('/api/users/usernameExists', controllers.Users.usernameExists);
app.post('/api/users/updateProfilePic', controllers.Users.updateProfilePic);
app.get ('/api/users/current', oauth.authorise(), controllers.Users.findCurrent);
app.get ('/api/users/:userid/pic', oauth.authorise(), controllers.Users.findProfilePic);
app.post('/api/users/update/', controllers.Users.update);

// Disclaimer API
app.get('/api/disclaimers/termsofservice', controllers.Disclaimers.termsofservice);
app.get('/api/disclaimers/privacypolicy', controllers.Disclaimers.privacypolicy);

// User Rooms
app.get ('/api/me', oauth.authorise(), controllers.Users.findCurrent);
app.get ('/api/me/rooms', oauth.authorise(), controllers.Rooms.findCurrentUser);
app.put ('/api/me/device', oauth.authorise(), controllers.Users.updateDevice);
app.post('/api/me/removeRoom', oauth.authorise(), controllers.Users.removeRoom);

// Image API
app.post('/api/images/upload', controllers.Images.upload);

// Friend API
app.post('/api/friends', oauth.authorise(), controllers.Friends.create);
app.get ('/api/me/friends', oauth.authorise(), controllers.Friends.findCurrentUsers);
app.get ('/api/me/findPotentialFriends', oauth.authorise(), controllers.Friends.findPotentialFriends);
app.post('/api/me/removeFriend', oauth.authorise(), controllers.Friends.removeFriend);


  app.get ('/api/users/findByUsername', controllers.Users.findByUsername);
  app.get ('/api/me/rooms2', controllers.Rooms.findByUserId);

// DEBUG ONLY MOUNTS
if(debug) {

  // OAuth API
  app.get('/oauth/clients', controllers.OAuthClients.findAll);
  app.post('/oauth/clients', controllers.OAuthClients.create);
  app.get('/oauth/tokens', controllers.OAuthAccessTokens.findAll);

  // User API
  app.get ('/api/users', controllers.Users.findAll);

  // Venues API
  app.get('/api/venues', controllers.Venues.findByLocation);
  app.get('/api/venues/foursquare', controllers.Venues.findNearbyFromFoursquare);

  // Rooms API
  app.get ('/api/rooms', oauth.authorise(), controllers.Rooms.findAll);

  // Friends API
  app.get ('/api/friends', controllers.Friends.findAll);
}

// Configure OAuth error handler
app.use(oauth.errorHandler());

// TODO configure our error handler