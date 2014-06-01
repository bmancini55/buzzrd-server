
// Module dependencies
var express       = require('express')
  , bodyParser    = require('body-parser')
  , serverStatic  = require('serve-static')
  , OAuthServer   = require('node-oauth2-server')

  , OAuthModel    = require('./common/oauthmodel')
  , dbhelper      = require('./common/dbhelper')
  , configHelper  = require('./common/confighelper')

  , models        = require('./models')
  , controllers   = require('./controllers')

// Local variables
  , config = configHelper.env()
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , debug = process.env.NODE_ENV || 'development'
  , oauth;

// Start listening on the server
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
app.get ('/api/rooms', oauth.authorise(), controllers.Rooms.findAll);
app.get ('/api/rooms/nearby', oauth.authorise(), controllers.Rooms.findNearby);
app.post('/api/rooms', oauth.authorise(), controllers.Rooms.create);
app.get ('/api/rooms/:idroom/messages', oauth.authorise(), controllers.Messages.findByRoom);

// Venue API
app.get ('/api/venues/:venueid/rooms', oauth.authorise(), controllers.Rooms.findByVenue)

// User API
app.post('/api/users', controllers.Users.create);
app.get ('/api/users', controllers.Users.findAll);
app.post('/api/users/usernameExists', controllers.Users.usernameExists);

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
}

// TODO - write custom code for managing this that uses JsonResponse
app.use(oauth.errorHandler());

var rooms = [];

io.sockets.on('connection', function(socket) {

  socket.on('join', function(room) {
    if(socket.room) {
      console.log('Leaving room: ' + socket.room);
      socket.leave(socket.room);
    }
    socket.room = room;
    socket.join(room);
    console.log('Joined room: ' + room);
  });

  socket.on('message', function(data) {

    var message = new models.Message({
      idroom: socket.room,
      message: data
    });

    // save the message and broadcast if we successfully saved the message
    message.save(function(err) {
      if(err) {

      } else {
        io.sockets["in"](socket.room).emit("message", data);
      }
    });
  });

  socket.on('disconnect', function() {
    socket.leave(socket.room);
  });

});