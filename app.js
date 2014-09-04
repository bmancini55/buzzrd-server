
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
  , debug = process.env.NODE_ENV || 'development'
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
    accessTokenLifetime: null,
    debug: debug
  });

// OAuth API
app.post('/oauth/grant', oauth.grant());

// Room API
app.post('/api/rooms', oauth.authorise(), controllers.Rooms.create);
app.get ('/api/rooms/:idroom/messages', oauth.authorise(), controllers.Messages.findByRoom);


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

// Image API
app.post('/api/images/upload', controllers.Images.upload);

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
}

// Configure OAuth error handler
app.use(oauth.errorHandler());

// TODO configure our error handler