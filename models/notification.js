// Module dependencies
var mongoose    = require("mongoose")
  , Q           = require('q')
  , _           = require('underscore')
  , debug       = require('debug')('notification')
  , Schema      = mongoose.Schema
  , Room        = require('./room')
  , User        = require('./user')
  , UserRoom    = require('./userroom')
  , apnclient   = require('../apnclient.js');

///
/// Schema definition
///

///
/// Notification Types
/// Room Invitation - 1
/// New Room Message - 2
///

var NotificationSchema = new Schema({
  typeId: { type: Number, required: true },
  recipientId: { type: Schema.Types.ObjectId, required: true},
  message: { type: String, required: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date },
  read: { type: Boolean, default: false },
  badgeCount: { type: Number, default: 0 },
  payload: Schema.Types.Mixed
});


///
/// Static methods
///

/**
 * Create a notification
 * 
 * @param {Number} typeId
 * @param {String} recipientId
 * @param {String} message
 * @param {Mixed} payload
 */ 
NotificationSchema.statics.createNotification = function(notification, next) {
  var deferred = new Q.defer();

  notification.save(function(err, notification) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } 
    else { 
      deferred.resolve(notification);
      if(next) next(null, notification);
    }
  });

  // always return the promise
  return deferred.promise; 
}


/**
 * Gets a notifications for the provided user
 * 
 * @param {String} userId
 *
 */
NotificationSchema.statics.findByUser = function(userId, next) {
  debug('findByUser %s', userId);

  return Notification
    .find({ recipientId: userId })
    .sort({ updated: 'desc' })
    .exec(next);
}



/**
 * Finds the notification by user and room
 *
 * @param {String} userId
 * @param {String} roomId
 * @callback
 * @return {Promise}
 */
NotificationSchema.statics.findByUserAndRoom = function(userId, roomId, next) {
  debug('findByUserAndRoom');
  var deferred = Q.defer()
    , $select;

  $select = {
    recipientId: new mongoose.Types.ObjectId(userId),
    'payload.roomId': new mongoose.Types.ObjectId(roomId)
  };

  Notification.find($select, function(err, notifications) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } else {
      deferred.resolve(notifications);
      if(next) next(null, notifications);
    }
  });

  return deferred.promise;
}


/**
 * Gets unread notifications for the user
 * 
 * @param {String} userId
 * @callback next
 */
NotificationSchema.statics.findUnreadForUser = function(userId, next) {
  debug('findUnreadForUser %s', userId);

  return Notification.find({ recipientId: new mongoose.Types.ObjectId(userId) }, next);
}

/**
 * Removes the notification based on the identifier and the corresponding 
 * user that made the request.
 * 
 * @param {String} userId
 * @param {String} notificatinId
 * @callback
 * @return {Promise}
 */
NotificationSchema.statics.removeNotification = function(userId, notificationId, next) {
  debug('removeNotification %s', notificationId); 
  var deferred = Q.defer()
    , $query;

  $query = { 
    _id: new mongoose.Types.ObjectId(notificationId),
    recipientId: new mongoose.Types.ObjectId(userId)
  };
  
  Notification.remove($query, function(err) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } else {
      deferred.resolve();
      if(next) next(null, null);
    }
  });
}

/**
 * Marks a notification as either being read or not read
 * 
 * @param {String} notificationId
 *
 */
NotificationSchema.statics.markAsRead = function(userId, notificationId, next) {
  debug('updateNotificationRead %s', notificationId); 

  var deferred = Q.defer()
    , $select
    , $updates

  $select = { 
    _id: new mongoose.Types.ObjectId(notificationId),
    recipientId: new mongoose.Types.ObjectId(userId)
  };
  
  $updates = { 
    $set: { 
      read: true,
      badgeCount: 0
    }
  };
  
  Notification.findOneAndUpdate($select, $updates, function(err, notification) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);    
    } else {
      deferred.resolve(notification);
      if(next) next(null, notification);
    }
  });
}


/**
 * Creates room notification for the usr
 *
 * @param {String} roomId - The room to create the notification for
 * @param {ObjectId} userId - The id specified for the user
 * @param {Callback} next
 */
NotificationSchema.statics.createRoomNotification = function(roomId, userId, next) {
  debug('createRoomNotification for room %s and user %s', roomId, userId);
  var deferred = Q.defer();

  var notification = new Notification({    
    typeId: 2,   
    recipientId: userId,
    message: 'Unread messages',
    created: new Date(),
    updated: new Date(),
    read: false,
    badgeCount: 0,
    payload: { 
      roomId: new mongoose.Types.ObjectId(roomId)
    }  
  });

  notification.save(function(err, notification) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } else {
      deferred.resolve(notification);
      if(next) next(null, notification);
    }
  });

  return deferred.promise;
}


/**
 * Creates room notifications for each of the supplied users
 *
 * @param {String} roomId - The room to update badges for
 * @param {Array} users - Array of ObjectId instances to insert
 * @param {Callback} next
 */
NotificationSchema.statics.createRoomNotifications = function(roomId, users, next) {
  debug('createRoomNotifications');
  var deferred = Q.defer()
    , requestedIds = _.pluck(users, '_id')
    , $query;

  $query = { 
    recipientId: { $in: requestedIds },
    typeId: 2,
    'payload.roomId': new mongoose.Types.ObjectId(roomId)
  };

  // find the existing records
  Notification.find($query, function(err, foundNotifications) {
    debug('createRoomNotifications: founds %d notifications', foundNotifications.length);

    var foundLookup = _.indexBy(foundNotifications, 'recipientId')      
      , missingIds = [];

    // get the missing ids
    requestedIds.forEach(function(requestedId) {       
      if(!foundLookup[requestedId]) {
        missingIds.push(requestedId);
      }
    });

    // insert all the missing ids 
    debug('createRoomNotifications: creating %d new notifications', missingIds.length);
    Q.all(missingIds.map(function(missingId) {
      return Notification.createRoomNotification(roomId, missingId);
    }))
    .then(

      // handle success
      function(results) {
        deferred.resolve(results);
        if(next) next(null, results);
      }, 

      // handle failure
      function(err) {
        deferred.reject(err);
        if(next) next(err);
      }
    );

  });
 
  return deferred.promise;  
}

/**
 * Increments the badge counts for a room for the list of users that are
 * specified. If the notifications don't exist, we create them.
 *
 * @param {String} roomId - The room to update badges for
 * @param {Array} users - Array of ObjectIds for the users
 * @param {Callback} next
 */
NotificationSchema.statics.incRoomBadgeCount = function(roomId, users, next) {
  debug('incRoomBadgeCount for room %s, and %d users', roomId, users.length);
  var deferred = new Q.defer()
    , $query
    , $update
    , $options
    , userIds = _.pluck(users, '_id');
  
  $query = {
    typeId: 2,
    recipientId: { $in: userIds },
    'payload.roomId': new mongoose.Types.ObjectId(roomId),
  };

  $update = { 
    $inc: { badgeCount: 1 },
    $set: { updated: new Date() }
  };

  $options = { multi: true };

  Notification.update($query, $update, $options, function(err, number, raw) {     
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } 
    else { 
      deferred.resolve(number);
      if(next) next(null, number);
    }
  });

  // always return the promise
  return deferred.promise;
}


/**
 * Retrieves the notifications for a room by finding
 * users that want notifications for the room and that aren't currently
 * in the room
 *
 * @param {Array} users - the list of users to get aggregate info for 
 * @param {Callback} next
 * @return {Promise}
 */
NotificationSchema.statics.getAggregateBadgeCount = function(users, next) {
  debug('getAggregateBadgeCount');

  var deferred = new Q.defer()
    , ids;

  // create array of userId's
  ids = _.pluck(users, '_id');

  // perform aggregation for all userId's
  Notification.aggregate([  
    { $match: { recipientId: { $in: ids } } },
    { $group: { _id: '$recipientId', badgeCount: { $sum: '$badgeCount' } } }    
  ], 
  function(err, results) {

    // TODO remove boilerplate
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    }

    // TODO remove boilerplate
    else {
      deferred.resolve(results);
      if(next) next(results);
    }

  });

  // always return the promise
  return deferred.promise;
}


/**
 * Notifies the room
 *
 * @param {String} roomId - The room to update badges for
 * @param {Message} message - The message that was sent
 * @param {Array[String]} excludeUsers - The users that are in the room to exclude
 * @Callback next
 * @return {Promise}
 */
NotificationSchema.statics.notifyRoom = function(roomId, message, excludeUsers, next) {
  debug('notifyRoom');

  var deferred = Q.defer();

  var scope = {      
    room: null,
    users: null,
    badgeCounts: null
  };
  

  // find the room
  Q.fcall(function() {    
    debug('notifyRoom: finding room'); 

    // find the room
    return Room.findById(roomId)

    // scope the room for user later
    .then(function(room) {
      debug('notifyRoom: found room %s', room._id);
      scope.room = room;
    });    
  })


  // retrieve the users that want to be notified
  .then(function() {
    debug('notifyRoom: retrieving users');

    // find the userroom record where notify = true
    return UserRoom.findNotifiableUsersForRoom(roomId, excludeUsers)

    // join to the user records
    .then(function(userrooms) {        
      debug('notifyRoom: found %d userrooms', userrooms.length);

      debug('notifyRoom: finding users');
      var ids = userrooms.map(function(userroom) { return userroom.userId.toString(); });
      return User.findByIds(ids)      
    })

    // add users to scope for later use
    .then(function(users) {
      debug('notifyRoom: found %d users', users.length);
      scope.users = users;
    });
  })


  // create notifications for the users
  .then(function() {
    debug('notifyRoom: creating notifications');
    
    return Notification.createRoomNotifications(roomId, scope.users);  
  })


  // increment the badge counts for the room
  .then(function() {  
    debug('notifyRoom: incrementing badge counts');

    return Notification.incRoomBadgeCount(roomId, scope.users)
  })


  // get the aggregated badge counts for these users
  .then(function() {
    debug('notifyRoom: aggregating badge counts');
    
    return Notification.getAggregateBadgeCount(scope.users)

    // add badge count to scope for later use
    .then(function(badgeCounts) {
      debug('notifyRoom: aggregated bagde counts for %d users', badgeCounts);
      scope.badgeCounts = badgeCounts;
    });
  })
  

  // send out APNS notifications
  .then(function() {      
    debug('notifyRoom: sending notifications via APNS');

    // create user lookup
    var userLookup = {};
    scope.users.forEach(function(user) {
      userLookup[user._id] = user;
    });

    // create the apn recipient
    var apnRecipients = [];
    scope.badgeCounts.forEach(function(badgeCount) {

      var user = userLookup[badgeCount._id];      
      if(user.deviceId) {
        debug('notifyRoom: created apn for %s', user._id);

        var apn = {
          userId: user._id.toString(),
          deviceId: user.deviceId,
          badgeCount: badgeCount.badgeCount
        };        
        apnRecipients.push(apn);
      };

    });

    // send notifications
    return apnclient.notifyRoom(scope.room, message, apnRecipients);
  })

  .then(
    function() {
      deferred.resolve();
      if(next) next(null, null);
    },
    function(err) {
      deferred.reject(err);
      if(next) next(err);
    }
  );

  return deferred.promise
}


/**
 * Notifies invitees to a room
 *
 * @param {String} roomId - The room to update badges for 
 * @param {Array[String]} userIds - The users to be invited
 * @param {User} user - The sender of the invite
 * @callback next
 * @return {Promise}
 */
NotificationSchema.statics.notifyInvites = function(roomId, userIds, sender, next) {
  debug('notifyInvites');  
  var deferred = Q.defer() 
    , scope;

  scope = {
    sender: sender,
    room: null,
    recipients: null,
    notifications: null,
    badgeCounts: null
  };

  // retrieves the room
  Q.fcall(function() {
    debug('notifyInvites: retrieving room %s', roomId);
    return Room.findById(roomId)

    .then(function(room) {
      debug('notifyInvites: found room %s', room._id);
      scope.room = room;
    });
  })

  // find recipient users
  .then(function () {
    debug('notifyInvites: finding  %d users', userIds.length);    
    return User.findByIds(userIds)

    .then(function(recipients) {
      scope.recipients = recipients;
    });
  })

  // create notifications entries
  .then(function() {
    debug('notifyInvites: saving notifications');
    var recipientLookup
      , notifications
      , payload
      , senderName
      , promises
      , message = 'invited you to chat in the room'
      , sender = scope.sender
      , room = scope.room      
      , recipients = scope.recipients;      

    if (sender.firstName && sender.lastName) {
      senderName = sender.firstName + ' ' + sender.lastName;
    } else {
      senderName = sender.username;
    }

    recipientLookup = {};
    recipients.forEach(function(recipient) {
      recipientLookup[recipient._id] = recipient;
    });

    payload = {
      senderId: sender._id,
      roomId: room._id,
      senderName: senderName,
      roomName: room.name
    };

    notifications = [];
    recipients.forEach(function(recipient) {
      notifications.push(new Notification({
        typeId: 1,
        recipientId: recipient._id,
        message: message,
        payload: payload,
        badgeCount: 1,
        created: new Date(),
        updated: new Date()
      }));
    });

    // save all of the notifications
    return Q.all(notifications.map(function(notification) {
      return Notification.createNotification(notification);  
    }))
    .then(function(notifications) {
      debug('notifyInvites: saved %d invites', notifications.length);
      scope.notifications = notifications;
    });
  })

  // get aggregate badge countds
  .then(function() {
    debug('notifyInvites: getting aggregate badge counts');
    return Notification.getAggregateBadgeCount(scope.recipients)

    .then(function(badgeCounts) {
      debug('notifyInvites: found %d badgeCounts', badgeCounts.length);
      scope.badgeCounts = badgeCounts;
    });
  })

  // send requests to APNS
  .then(function() {
    debug('notifyInvites: sending APNS notification for %d', scope.badgeCounts.length);
    var userLookup
      , notificationLookup
      , room = scope.room
      , notifications = scope.notifications
      , users = scope.recipients
      , badgeCounts = scope.badgeCounts
      , apnRecipients = [];
    
    userLookup = _.indexBy(users, '_id');
    notificationLookup = _.indexBy(notifications, 'recipientId');    
    
    // create the apn recipient    
    badgeCounts.forEach(function(badgeCount) {
      var user
        , notification
        , messageTitle
        , apn;

      user = userLookup[badgeCount._id];
      notification = notificationLookup[badgeCount._id];

      if(user.deviceId) {
        debug('notifyInvites: created apn for %s', user._id);              
        apn = {
          userId: user._id.toString(),
          deviceId: user.deviceId,
          badgeCount: badgeCount.badgeCount,
          message: notification.payload.senderName + ' invited you to chat in the room \'' + notification.payload.roomName + '\''
        };
        apnRecipients.push(apn);
      };

    });

    // send notifications
    return apnclient.notifyInvites(room, apnRecipients);
  })

  // handle callback if one exists
  .then(
    function() {
      deferred.resolve(scope.notifications);
      if(next) next(null, scope.notifications);
    },
    function(err) {
      deferred.reject(err);
      if(next) next(err);
    }
  );

  return deferred.promise;
}


///
/// Create and export the model
///

var Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
