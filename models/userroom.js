
// Module dependencies
var mongoose    = require('mongoose')
  , Q           = require('Q')
  , Schema      = mongoose.Schema
  , debug       = require('debug')('userroom');

///
/// Schema definition
///

var UserRoomSchema = new Schema({
  userId: mongoose.Schema.ObjectId,
  roomId: mongoose.Schema.ObjectId,
  deviceId: String,
  notify: Boolean,  
  badgeCount: Number,
  created: Date,
  updated: Date  
});


/**
 * Finds the UserRoom records by UserId
 *
 * @param {String} userId
 */

UserRoomSchema.statics.findByUser = function(userId, next) {
  debug('findByUserId for user %s', userId);
  var $query;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId)
  };

  UserRoom.find($query, next);
}


/** 
 * Adds the UserRoom record by performing an upsert
 * If the UserRoom record already exists it will update the information
 *
 * @param {String} userId
 * @param {String} roomId
 * @param {String} deviceId - the current deviceId of the user
 */

UserRoomSchema.statics.addRoom = function(userId, roomId, deviceId, next) {
  debug('addRoom for user %s', userId); 
  var $query, $update, $options;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId), 
    roomId: new mongoose.Types.ObjectId(roomId) 
  };
  
  $update = {
    updated: new Date(),
    $setOnInsert: {       
      userId: new mongoose.Types.ObjectId(userId), 
      roomId: new mongoose.Types.ObjectId(roomId),
      deviceId: deviceId,
      notify: true,
      badgeCount: 0,
      created: new Date()
    }
  };
  
  $options = {
    upsert: true
  }
  
  UserRoom.update($query, $update, $options, next);        
}


/** 
 * Remove the UserRoom record for the provided userId and roomId
 *
 * @param {String} userId
 * @param {String} roomId
 */

UserRoomSchema.statics.removeRoom = function(userId, roomId, next) {
  debug('removeRoom for user %s', userId); 
  var $query;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId), 
    roomId: new mongoose.Types.ObjectId(roomId) 
  };
  
  UserRoom.remove($query, next);        
}


/**
 * Updates the device information for all rooms for a specific user
 *
 * @param {String} userId
 * @param {String} deviceId
 * @param {Function} next
 */

UserRoomSchema.statics.updateDevice = function(userId, deviceId, next) {
  debug('updateDevice for user %s', userId);
  var $query, $update, $options;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId)    
  };

  $update = {
    deviceId: deviceId,
    updated: new Date()
  };

  $options = {
    multi: true
  };

  UserRoom.update($query, $update, $options, next);
}


/**
 * Updates the userroom record by resetting the badgecount
 * and updating the timestamp to incidate the last join for the user
 *
 * @param {String} userId
 * @param {String} roomId
 * @param {Function} next 
 */

UserRoomSchema.statics.logJoin = function(userId, roomId, next) {
  debug('joinRoom for user %s', userId); 

  var $query = { 
    userId: new mongoose.Types.ObjectId(userId), 
    roomId: new mongoose.Types.ObjectId(roomId) 
  };
  
  UserRoom.findOne($query, function(err, userroom) {
    if(err) return next(err);
    else {
      var priorCount = userroom ? userroom.badgeCount : 0;

      if(priorCount > 0) {
        userroom.badgeCount = 0;
        userroom.updated = new Date();
        userroom.save();
      }

      return next(null, priorCount);
    }
  });
}


/**
 * Update the badge counts for a specific room but exclude the users that
 * are currently in the room as supplied by the excludeUsers property
 *
 * @param {String} roomId - The room to update badges for
 * @param {Array} excludeUsers - Array of UsersIds to exclude
 * @param {Callback} next
 */

UserRoomSchema.statics.updateBadgeCounts = function(roomId, excludeUsers, next) {
  var deferred = new Q.defer()
    , $query
    , $update
    , $options;

  $query = { 
    userId: { $nin: excludeUsers },
    roomId: new mongoose.Types.ObjectId(roomId), 
    notify: true
  };

  $update = { $inc: { badgeCount: 1 } };  
  $options = { multi: true };

  UserRoom.update($query, $update, $options, function(err, number, raw) {     
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
 * @param {String} roomId - the room to find the notifications for
 * @param {Array} excludeUsers - Array of UserIds that should be excluded
 * @param {Callback} next
 */

UserRoomSchema.statics.getNotifiable = function(roomId, excludeUsers, next) {
  debug('getNotifiable for room %s', roomId);

  var deferred = new Q.defer()
    , $userQuery
    , $userProj;

  
  // Setup query for finding user that want notification for the room
  $userQuery = { 
    userId: { $nin: excludeUsers },
    roomId: new mongoose.Types.ObjectId(roomId), 
    notify: true
  };

  $userProj = { 
    _id: false, 
    userId: true 
  };

  // Find users that want notification for the room
  UserRoom.find($userQuery, $userProj, function(err, results) {

    // reject on error
    // TODO remove boilerplate
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    }

    // perform aggregation to get notification counts
    else {
      debug('found %d notifications', results.length);
      
      // create array of userId's
      var userIds = results.map(function(result) { return result.userId; });

      // perform aggregation for all userId's
      UserRoom.aggregate([  
        { $match: { "userId": { $in: userIds } } },
        { $group: { _id: { userId: "$userId", deviceId: "$deviceId"}, badgeCount: { $sum: "$badgeCount" } } },
        { $project: { _id: 0, userId: "$_id.userId", deviceId: "$_id.deviceId", badgeCount: "$badgeCount" } }
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

    }
  });

  // always return the promise
  return deferred.promise;
}



///
/// Create and export the model
///

var UserRoom = mongoose.model('UserRoom', UserRoomSchema);

module.exports = UserRoom;