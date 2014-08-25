var debug = require('debug')('socketserver')
  , OAuthModel    = require('./common/oauthmodel')
  , models        = require('./models');

function create(app) {

  debug('starting socketserver');

  var server = require('http').createServer(app)
    , io = require('socket.io').listen(server)

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

          // broadcast message        
          io.sockets.in(roomId).emit("message", message.toClient());
        });

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

      // add to room
      socket.roomId = roomId;
        socket.join(roomId);    

      var clients = io.sockets.clients(roomId);
      io.sockets.in(roomId).emit('userjoin', clients.length);

      // log entry into room
      var userIds = clients.map(function (client) {
        return client.userId;
      })
      console.log(userIds);
      models.Room.addUsersToRoom(roomId, userIds, function(err) {
        console.log(err);
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

        var clients = io.sockets.clients(roomId);
        io.sockets.in(roomId).emit('userleave', clients.length);

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


  return server;
}

module.exports = create;