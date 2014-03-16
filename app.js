var express = require('express')
  , db = require('./models/db.js')
  , models = require('./models/index.js')


  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);


server.listen(8055);


app.use('/files', express.static(__dirname + '/files'));
app.use(express.bodyParser());

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Finds the rooms based on a users lon / lat location
app.get('/api/rooms', function(req, res) {
  
  var lon = req.query.lon
    , lat = req.query.lat;

  models.Room.find(function(err, rooms) {
    console.log('Found %s rooms', rooms);
    res.send({ success: true, results: rooms });
  });

});

app.post('/api/rooms', function(req, res) {

  var room = new models.Room({
    name: req.body.name,
    lon: req.body.lon,
    lat: req.body.lat
  });

  room.save(function(err, room, numberAffected) {
    if(err) {
      res.send({ success: false, results: null });
    } else {
      res.send({ success: true, results: room });
    }
  });

});

app.get('/api/messages', function(req, res) {

  var idroom  = req.query.idroom
    , ObjectId = require('mongoose').Types.ObjectId;

  models.Message
    .find({ idroom: new ObjectId(idroom) })
    .limit(25)
    .sort({ created: -1})
    .exec(function(err, messages) {
      if(err) {
        res.send({ success: false, results: null, error: err });
      } else {

        messages = messages.reverse();
        res.send({ success: true, results: messages });
      }
    });

});


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
