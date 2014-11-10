
// Module dependencies
var Q             = require('q')
  , _             = require('underscore')
  , util          = require('util')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Room          = models.Room
  , UserRoom      = models.UserRoom
  , Venue         = models.Venue
  , Message       = models.Message
  , Notification  = models.Notification;


/**
 * Finds a room by its ID
 */
exports.findById = function(req, res) {
  var idroom = req.param('idroom');
  Room.findById(idroom, JsonResponse.expressHandler(res));
}


/**
 * Finds rooms based on proximity and search criteria 
 */ 
exports.findNearby = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 1610
    , search = req.query.search
    , userId = req.userId;
  
  Room.findNearby({ 
    lat: lat,
    lng: lng,
    meters: radius,
    search: search
  })  
  .then(function(rooms) {
    return joinUserData(userId, rooms)
  })
  .then(function(rooms) {
    res.send(new JsonResponse(null, rooms));
  })
  .catch(function (err) {
    console.log(err);
    res.send(500, new JsonResponse(err));
  });
}


/**
 * Finds rooms for the current user
 */
exports.findCurrentUser = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)    
    , userId = req.userId;

  // find the user's rooms
  Q.fcall(function() {
    return UserRoom.findByUser(userId);
  })

  // load the room details
  .then(function(userrooms) {      
    var roomIds = _.pluck(userrooms, 'roomId').map(function(id) { return id.toString() });    
    return Room.findByIds(roomIds)
  })

  // join on user data
  .then(function(rooms) {    
    return joinUserData(userId, rooms);
  })

  // return results
  .then(function(rooms) {
      res.send(new JsonResponse(null, rooms))
  })

  // handle errors
  .catch(function(err) {
    console.log(err);
    res.status(500).send(new JsonResponse(err));
  });  

}


/**
 * findByVenue
 * Finds a paged list of rooms by specific venue
 */
exports.findByVenue = function(req, res) {

  var venueId = req.param('venueid')
    , page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 5, 1), 1000);

  Room.findByVenue(venueId, page, pagesize, JsonResponse.expressHandler(res));
}

/**
 * findAll
 * Finds all rooms
 */
exports.findAll = function(req, res) {
  
  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000);

  Room.findAll(page, pagesize, JsonResponse.expressHandler(res));
}



/** 
 * create
 * Creates a new room
 */ 
exports.create = function(req, res) {  
  var name = req.body.name
    , venueId = req.body.venueId
    , lat = req.body.lat
    , lng = req.body.lng;

  Room.createRoom(name, req.userId, lat, lng, venueId, JsonResponse.expressHandler(res));
};


/**
 * Finds rooms for the current user
 */
exports.findByUserId = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
    , userId = req.query.userId;

  Room.findByUser(userId, JsonResponse.expressHandler(res));

}

/** 
 * inviteFriends
 * Invite friends to a room
 */ 
exports.inviteFriends = function(req, res) {
  var user = req.user
    , notificationTypeId = 1 // Invitation
    , roomId = req.body.roomId
    , users = JSON.parse(req.body.users)
    , payload
    , description
    , senderName;

    Room.findById(roomId, function(err, room) {
      message = 'invited you to chat in the room';

      debugger;

      if ((user.firstName) && (user.lastName)) {
        senderName = user.firstName + ' ' + user.lastName;
      } else {
        senderName = user.username;
      }

      payload = {
        senderId: user._id
        , roomId: room._id
        , senderName: senderName
        , roomName: room.name
      };

      var notifications = [];

      for (var i = 0; i < users.length; i++) {
        var notification = new Notification({
          typeId: notificationTypeId
          , recipientId: users[i].iduser
          , message: message
          , payload: payload
          , badgeCount: 1
          , created: new Date()
          , updated: new Date()
        });
        
        notifications.push(notification);
      }

      var promises = notifications.map(function(notification) {
 
        return Notification.createNotification(notification);  

      });

      Q.all(promises)
      .then(function() {
        res.send(new JsonResponse(null, 'success'));
      })
      .fail(function(err) {
        res.send(new JsonResponse(err));
      });
    });
};


/**
 * Update user room record for the user
 */
exports.updateUserRoom = function(req, res) {
  
  var userId = req.userId
    , roomId = req.param('roomId')
    , notify = req.param('notify');

  // toggle the notification
  if(notify != null) {    
    UserRoom.toggleNotification(userId, roomId, notify, JsonResponse.expressHandler(res));
  } 

  // Nothing else to update
  else {
    res.send(new JsonResponse('No values to update'));
  }
}


/**
 * Attaches userroom metadata to a list of rooms
 * 
 * @param {String} userId
 * @param {Array} rooms - array of Room instance
 * @param {Array} userrooms (optional) - array of userroom instances 
 * @param {Array} notifications (optional) - array of notification instances
 * @return {Promise}
 */
function joinUserData(userId, rooms, userrooms, notifications) {

  var scope = {
    rooms: rooms,
    userrooms: userrooms,
    notifications: notifications
  };

  // get userooms
  return Q.fcall(function() {
    if(!userrooms) return UserRoom.findByUser(userId);
    else return userrooms;
  })

  // store the results
  .then(function(userrooms) {
    scope.userrooms = userrooms;
  })

  // get notifications
  .then(function() {    
    if(!notifications) return Notification.findByUser(userId)
    else return notifications;
  })

  // store the results
  .then(function(notifications) {
    scope.notifications = notifications;
  })

  // finally join data
  .then(function() {
    // create lookup based on roomId
    var userroomLookup = _.indexBy(scope.userrooms, 'roomId');
    var notificationLookup = _.indexBy(scope.notifications, function(n) { return n.payload.roomId });

    // process each room in the list
    scope.rooms.forEach(function(room) {

      // check if the userroom metadata exists
      var userroom = userroomLookup[room._id];
      var notification = notificationLookup[room._id];
          
      room.notify      = (userroom ? userroom.notify : false)
      room.watchedRoom = (userroom ? true : false);
      room.newMessages = (notification ? notification.badgeCount > 0 : false)
      
    });

    return scope.rooms;
  });
}