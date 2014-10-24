var debug       = require('debug')('socketserver')
  , OAuthModel  = require('./common/oauthmodel')
  , models      = require('./models')
  , apnclient   = require('./apnclient');

function create(app) {

  debug('starting socketserver');

  var server = require('http').createServer(app)
    , io = require('socket.io').listen(server)

  io.set('log level', 1); // reduce logging
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

        // find the user
        models.User.findById(userId, function(err, user) {

          if(err) console.log('Error getting users: ' + err);
          else {

            // save the message
            models.Message.saveRoomMessage(roomId, user, data, function(err, message) {        
              if(err) console.log('Error saving message: ' + err);

              // broadcast message        
              io.sockets.in(roomId).emit("message", message.toClient());

              // broadcase notifications
              var excludeUsers = getUserInRoom(roomId);
              apnclient.notifyRoom(roomId, message.message, excludeUsers);

            });

            // add the room to the user's list
            models.UserRoom.addRoom(userId, roomId, user.deviceId, function(err) {
              if(err) console.log('Error adding room for user: ' + err);
            });

          }
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

      // get users in room
      var userIds = getUserInRoom(roomId);
      io.sockets.in(roomId).emit('userjoin', userIds.length);

      // update room user count
      models.Room.addUsersToRoom(roomId, userIds, function(err) {
        if(err) console.log('Error updating rooms user count %j', err);
      });

      // update userroom records and emit notification to decrement
      // the badge count for the room
      models.UserRoom.logJoin(userId, roomId, function(err, badgeCount) {
        socket.emit('clearbadgecount', badgeCount);
        if(err) console.log('Error logging join in userroom %j', err);
      });

    }

    function leaveRoom(socket) {
      var roomId = socket.roomId
        , userId = socket.userId;

      if(roomId && userId) {

        // leave the room
        socket.leave(roomId);
        socket.roomId = null;

        // notify room of user leaving
        var userIds = getUserInRoom(roomId);
        io.sockets.in(roomId).emit('userleave', userIds.length);

        // decrement room count
        models.Room.removeUserFromRoom(roomId, userId, function(err) {
          if(err) console.log(err);
        });
      };
    }

    function getUserInRoom(roomId) {
      var clients = io.sockets.clients(roomId);
      return clients.map(function (client) {
        return client.userId;
      });
    }

  });


  return server;
}

module.exports = create;