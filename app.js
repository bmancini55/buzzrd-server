
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
app.post('/api/rooms', oauth.authorise(), controllers.Rooms.create);
app.get ('/api/rooms/:idroom/messages', oauth.authorise(), controllers.Messages.findByRoom);

// Venue API
app.get ('/api/venues', oauth.authorise(), controllers.Venues.find);
app.get ('/api/venues/:venueid/rooms', oauth.authorise(), controllers.Rooms.findByVenue)

// User API
app.post('/api/users', controllers.Users.create);
app.get ('/api/users', controllers.Users.findAll);
app.get ('/api/user', controllers.Users.findByUsername);
app.post('/api/users/usernameExists', controllers.Users.usernameExists);
app.post('/api/users/updateProfilePic', controllers.Users.updateProfilePic);

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
}

// Configure OAuth error handler
app.use(oauth.errorHandler());

// TODO configure our error handler



io.sockets.on('connection', function(socket) {

  socket.on('authenticate', function(bearerToken) {
    authenticate(socket, bearerToken);
  });

  socket.on('join', function(roomId) {    
    var userId = socket.userId;

    if(userId) {  

      // leave existing room
      if(socket.roomId) {
        leaveRoom(socket);
      }

      // join new room
      joinRoom(socket, roomId);
    };

  });

  socket.on('message', function(data) {
    var userId = socket.userId
      , roomId = socket.roomId;

    if(userId && roomId) {

      // save the message
      models.Message.saveRoomMessage(roomId, userId, data, function(err, message) {        
        if(err) console.log('Error saving message: ' + err);
      });

      // broadcast message
      io.sockets["in"](roomId).emit("message", data);

    }
  });

  socket.on('disconnect', function() {
    leaveRoom(socket);
  });



  function authenticate(socket, bearerToken) {

    // authenticate chat
    models.OAuthAccessToken.findAccessToken(bearerToken, function(err, token) {

      socket.userId = token.userId
      socket.emit('authenticate', bearerToken);

    });
  }


  function joinRoom(socket, roomId) {
    var userId = socket.userId;

    // log entry into room
    models.Room.addUserToRoom(roomId, userId, function() {
      socket.roomId = roomId;
      socket.join(roomId);    
    });

    // log user history
    new models.UserHistory({ 
      userId: userId, 
      action: 'join', 
      objectType: 'room', 
      objectId: roomId
    })
    .save(function(err, userhistory) {
      console.log(err);
    });
  }

  function leaveRoom(socket) {
    var roomId = socket.roomId
      , userId = socket.userId;

    if(roomId && userId) {

      // leave the room
      socket.leave(roomId);
      socket.roomId = null;

      // decrement room count
      models.Room.removeUserFromRoom(roomId, userId, function() {
        //debug('removed user %s from room %s', userId, roomId);
      });

      // add to user history
      new models.UserHistory({ 
        userId: userId, 
        action: 'leave', 
        objectType: 'room', 
        objectId: roomId
      })
      .save();
    };
  }

});