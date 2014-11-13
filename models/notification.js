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
  var $query;

  $query = {
    recipientId: new mongoose.Types.ObjectId(userId),
    read: false
  };
  return Notification.find($query, next);
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
 * Upserts room invite notifications for each of the supplied users.
 * This method will update the existing notifications by setting them to unread
 * setting the updated value and sets the badge count to 1. Users that do
 * not have a notification will have one created. The result set will contain
 * all of the notifications created or updated.
 *
 * @param {Room} room - The room instance to create the notifications
 * @param {User} sender - the sender of the invitation
 * @param {Array} users - Array of ObjectId instances to insert
 * @param {Callback} next
 * @return {Promise} returns a promise with all of the notifications
 */
NotificationSchema.statics.upsertRoomInviteNotifications = function(room, sender, users, next) {
  debug('upsertRoomInviteNotifications');  

  var deferred = Q.defer()
    , requestedIds = _.pluck(users, '_id')
    , $query
    , $update
    , updatedNotifications
    , insertedNotifications;

  $query = { 
    recipientId: { $in: requestedIds },
    typeId: 1,
    'payload.roomId': room._id,
    'payload.senderId': sender._id
  };

  $update = {
    $set: {
      read: false,
      updated: new Date(),
      badgeCount: 1
    }
  };

  // update the existing records
  Q.fcall(function() {
    var deferred = Q.defer();

    // update
    Notification.update($query, $update, { multi: true}, function(err) {
      debug('upsertRoomInviteNotifications: updating notifications');
      if(err) deferred.reject(err);        
      
      // find
      Notification.find($query, function(err, updated) {
        debug('upsertRoomInviteNotifications: updated %d notifications', updated.length);
        if(err) deferred.reject(err);

        updatedNotifications = updated;
        deferred.resolve(updated);
      });

    });

    return deferred.promise;
  })
  
  // insert the remainder
  .then(function() {    
    var foundLookup = _.indexBy(updatedNotifications, 'recipientId')      
      , missingIds = [];        

    // get users that need inserts
    requestedIds.forEach(function(requestedId) {       
      if(!foundLookup[requestedId]) {
        missingIds.push(requestedId);
      }
    });

    // insert the missing users
    debug('upsertRoomInviteNotifications: creating %d new notifications', missingIds.length);
    return Q.all(missingIds.map(function(missingId) {
      return Notification.createRoomInviteNotification(room, sender, missingId);
    }))
    .then(function(inserted) {
      debug('upsertRoomInviteNotifications: created %d new notifications', inserted.length);
      insertedNotifications = inserted;
    });
  })

  .then(

    // handle success
    function() {
      var results = updatedNotifications.concat(insertedNotifications)
      deferred.resolve(results);
      if(next) next(null, results);
    }, 

    // handle failure
    function(err) {      
      deferred.reject(err);  
      if(next) next(err);      
    }
  );

  return deferred.promise;
}


/**
 * Creates a room invite notification for the user and assumes that one
 * does not exist already. This method is used by the upsertRoomInviteNotification
 * method and makes one off calls for each user that needs to be inserted.
 *
 * @param {Room} room - The room to create the notification for
 * @param {User} sender - the sender making the invitation
 * @param {ObjectId} userId - The id specified for the user
 * @param {Callback} next
 * @return {Promise} returns a promise that is fulfilled with the created notification
 */
NotificationSchema.statics.createRoomInviteNotification = function(room, sender, userId, next) {
  debug('createRoomInviteNotification for room %s and user %s', room._id, userId);
  var deferred = Q.defer()
    , senderName;

  if (sender.firstName && sender.lastName) {
    senderName = sender.firstName + ' ' + sender.lastName;
  } else {
    senderName = sender.username;
  }

  var notification = new Notification({    
    typeId: 1,   
    recipientId: userId,
    message: 'invited you to chat in the room',
    created: new Date(),
    updated: new Date(),
    read: false,
    badgeCount: 1,
    payload: { 
      roomId: room._id,
      roomName: room.name,
      senderId: sender._id,
      senderName: senderName
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
 * Upserts unread message room notifications for each of the supplied users.
 * This method will update the existing notifications by setting them to unread
 * setting the updated value and increamenting their badge count. Users that do
 * not have a notification will have one created. The result set will contain
 * all of the notifications created or updated.
 *
 * @param {String} roomId - The room to update badges for
 * @param {Array} users - Array of ObjectId instances to insert
 * @param {Callback} next
 * @return {Promise} returns a promise with all of the notifications
 */
NotificationSchema.statics.upsertUnreadRoomNotifications = function(room, users, next) {
  debug('upsertUnreadRoomNotifications');  

  var deferred = Q.defer()
    , requestedIds = _.pluck(users, '_id')
    , $query
    , $update
    , updatedNotifications
    , insertedNotifications;

  $query = { 
    recipientId: { $in: requestedIds },
    typeId: 2,
    'payload.roomId': room._id
  };

  $update = {
    $set: {
      read: false,
      updated: new Date(),
    },
    $inc: { badgeCount: 1 }
  };

  // update the existing records
  Q.fcall(function() {
    var deferred = Q.defer();

    // update
    Notification.update($query, $update, { multi: true}, function(err) {
      debug('upsertUnreadRoomNotifications: updating notifications');
      if(err) deferred.reject(err);        
      
      // find
      Notification.find($query, function(err, updated) {
        debug('upsertUnreadRoomNotifications: updated %d notifications', updated.length);
        if(err) deferred.reject(err);

        updatedNotifications = updated;
        deferred.resolve(updated);
      });

    });

    return deferred.promise;
  })
  
  // insert the remainder
  .then(function() {    
    var foundLookup = _.indexBy(updatedNotifications, 'recipientId')      
      , missingIds = [];        

    // get users that need inserts
    requestedIds.forEach(function(requestedId) {       
      if(!foundLookup[requestedId]) {
        missingIds.push(requestedId);
      }
    });

    // insert the missing users
    debug('upsertUnreadRoomNotifications: creating %d new notifications', missingIds.length);
    return Q.all(missingIds.map(function(missingId) {
      return Notification.createUnreadRoomNotification(room, missingId);
    }))
    .then(function(inserted) {
      debug('upsertUnreadRoomNotifications: created %d new notifications', inserted.length);
      insertedNotifications = inserted;
    });
  })

  .then(

    // handle success
    function() {
      var results = updatedNotifications.concat(insertedNotifications)
      deferred.resolve(results);
      if(next) next(null, results);
    }, 

    // handle failure
    function(err) {      
      deferred.reject(err);  
      if(next) next(err);      
    }
  );

  return deferred.promise;
}


/**
 * Creates a room notification for the user and assumes that one
 * does not exist already. This method is used by the upsertUnreadRoomNotification
 * method and makes one off calls for each user that needs to be inserted.
 *
 * @param {String} roomId - The room to create the notification for
 * @param {ObjectId} userId - The id specified for the user
 * @param {Callback} next
 * @return {Promise} returns a promise that is fulfilled with the created notification
 */
NotificationSchema.statics.createUnreadRoomNotification = function(room, userId, next) {
  debug('createUnreadRoomNotification for room %s and user %s', room._id, userId);
  var deferred = Q.defer();

  var notification = new Notification({    
    typeId: 2,   
    recipientId: userId,
    message: '[badgeCount] unread messages in the room',
    created: new Date(),
    updated: new Date(),
    read: false,
    badgeCount: 1,
    payload: { 
      roomId: room._id,
      roomName: room.name
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
    { $group: { _id: '$recipientId', totalBadgeCount: { $sum: '$badgeCount' } } }    
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
    badgeCounts: null,
    notifications: null
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


  // upsert notifications
  .then(function() {
    debug('notifyRoom: upserting notifications');
    
    return Notification.upsertUnreadRoomNotifications(scope.room, scope.users)
    .then(function(notifications) {
      debug('notifyRoom: %d unread message notifications', notifications.length);      
      scope.roomNotifications = notifications;
    });
  })


  // get the aggregated badge counts for these users
  .then(function() {
    debug('notifyRoom: aggregating badge counts');
    
    return Notification.getAggregateBadgeCount(scope.users)

    // add badge count to scope for later use
    .then(function(badgeCounts) {
      debug('notifyRoom: aggregated badge counts for %d users', badgeCounts.length);
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

    // create notification lookup for room based badge count
    var notificationLookup = {};
    scope.roomNotifications.forEach(function(notification) {
      notificationLookup[notification.recipientId] = notification;
    });

    // create the apn recipient
    var apnRecipients = [];
    scope.badgeCounts.forEach(function(badgeCount) {

      var user = userLookup[badgeCount._id];      
      var notification = notificationLookup[badgeCount._id];

      if(user.deviceId) {
        debug('notifyRoom: created apn for %s', user._id);

        var apn = {
          userId: user._id.toString(),
          deviceId: user.deviceId,
          badgeCount: badgeCount.totalBadgeCount,
          message: notification.badgeCount + ' unread messages in the room\r' + scope.room.name
        };        
        apnRecipients.push(apn);
      };

    });      

    // send notifications
    return apnclient.notifyRoom(scope.room, apnRecipients);
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

  // upsert notifications entries
  .then(function() {
    debug('notifyInvites: upserting notifications');

    return Notification.upsertRoomInviteNotifications(scope.room, scope.sender, scope.users)
    .then(function(notifications) {
      debug('notifyInvites: %d unread message notifications', notifications.length);      
      scope.notifications = notifications;
    })
  })

  // get aggregate badge counts
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
