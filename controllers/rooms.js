
// Module dependencies
var Q             = require('q')
  , util          = require('util')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Room          = models.Room
  , UserRoom      = models.UserRoom
  , Venue         = models.Venue
  , Message       = models.Message
  , Notification  = models.Notification;


/**
 * Finds rooms based on proximity and search criteria 
 */ 
exports.findNearby = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , lng = req.query.lng
    , lat = req.query.lat
    , radius = req.query.radius || 10000
    , search = req.query.search;
  
  Room.findNearby({ 
    lat: lat,
    lng: lng,
    meters: radius,
    search: search
  })
  .then(function(rooms) {

    var userId
      , roomIds;

    userId = req.user._id.toString();
    roomIds = rooms.map(function(room) {
      return room._id.toString();
    });

    // find rooms for the user and attach metadata to the 
    // actual rooms 
    return UserRoom.findByUserAndRooms(userId, roomIds)
    .then(function(userrooms) {

      // process the userrooms
      Room.attachUserRooms(rooms, userrooms);

      // send the result
      res.send(new JsonResponse(null, rooms));

    });
  })
  .catch(function (err) {
    res.send(new JsonResponse(err));
  });
}


/**
 * Finds rooms for the current user
 */
exports.findCurrentUser = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
    , user = req.user
    , userId = user._id.toString();

  Room.findByUser(userId, JsonResponse.expressHandler(res));

}


/**
 * Finds unread rooms for the currently authenticated user
 */
exports.findCurrentUnread = function(req, res) {
  
  var userId = req.userId;

  Room.findCurrentUnread(userId, JsonResponse.expressHandler(res));  
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
    , message = 'Chat Invitation'
    , payload
    , description;

    Room.findById(roomId, function(err, room) {
      if ((user.firstName) && (user.lastName)) {
        description = user.firstName + ' ' + user.lastName + ' invited you to chat in ' + room.name;
        } else {
        description = user.username + ' invited you to chat in ' + room.name;
      }

      payload = {
        senderId: user._id
        , roomId: room._id
        , description: description
      };

      var notifications = [];

      for (var i = 0; i < users.length; i++) {
        var notification = new Notification({
          typeId: notificationTypeId
          , recipientId: users[i].iduser
          , message: message
          , payload: payload
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
 * Update userroom record and return the updated badgeCount value
 */
exports.resetBadgeCount = function(req, res) {
  var userId = req.userId
    , roomId = req.param('roomId');

  UserRoom.logJoin(userId, roomId, JsonResponse.expressHandler(res));
}