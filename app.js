
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
  , NODE_ENV = process.env.NODE_ENV || 'development'
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
    debug: true
  });

// OAuth API
app.post('/oauth/token', oauth.grant());

if(NODE_ENV === 'development') {
  app.get('/oauth/clients', controllers.OAuthClients.findAll);
  app.post('/oauth/clients', controllers.OAuthClients.create);
}

// Room API
app.get ('/api/rooms', controllers.Rooms.findByLocation);
app.post('/api/rooms', controllers.Rooms.create);
app.get ('/api/rooms/:idroom/messages', controllers.Messages.findByRoom);

// User API
app.get ('/api/users', controllers.Users.findAll);
app.post('/api/users', controllers.Users.create);


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
