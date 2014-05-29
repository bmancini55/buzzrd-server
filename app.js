
// Module dependencies
var express       = require('express')
  , bodyParser    = require('body-parser')
  , serverStatic        = require('serve-static')

  , dbhelper      = require('./common/dbhelper')
  , configHelper  = require('./common/confighelper')

  , models        = require('./models')
  , controllers   = require('./controllers')

// Local variables
  , config = configHelper.env()
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

// Start listening on the server
server.listen(config.express.port);

// Enable POST body parsing
app.use(bodyParser());

// Temporarily add a debug page for connecting
app.use('/public', serverStatic(__dirname + '/public'));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Room API
app.get ('/api/rooms', controllers.rooms.findByLocation);
app.post('/api/rooms', controllers.rooms.create);
app.get ('/api/rooms/:idroom/messages', controllers.messages.findByRoom);

// User API
app.get ('/api/users', controllers.users.findAll);
app.post('/api/users', controllers.users.create);
app.post('/api/users/usernameExists', controllers.users.usernameExists);

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
