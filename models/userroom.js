
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
  inRoom: Boolean,
  lastEnter: Date,
  lastLeave: Date,
  badgeCount: Number
});


UserRoomSchema.statics.addRoom = function(userId, roomId, deviceId, next) {
  debug('addRoom');  
  var $query, $update, $options;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId), 
    roomId: new mongoose.Types.ObjectId(roomId) 
  };
  
  $update = {
    userId: new mongoose.Types.ObjectId(userId), 
    roomId: new mongoose.Types.ObjectId(roomId),
    deviceId: deviceId,
    notify: true,
    inRoom: true,
    lastEnter: Date.now(),
    lastLeave: null,
    badgeCount: 0
  };
  
  $options = {
    upsert: true
  }
  
  UserRoom.update($query, $update, $options, next);        
}


/**
 * Updates the device information for all rooms for a specific user
 *
 * @param {String} userId
 * @param {String} deviceId
 * @param {Function} next
 */
UserRoomSchema.statics.updateDevice = function(userId, deviceId, next) {
  var $query, $update, $options;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId)
  };

  $update = {
    deviceId: deviceId
  };

  $options = {
    multi: true
  };

  UserRoom.update($query, $update, $options, next);
}


UserRoomSchema.statics.joinRoom = function(userId, roomId, next) {

}


UserRoomSchema.statics.leaveRoom = function(userId, roomId, next) {

}


UserRoomSchema.statics.updateBadgeCounts = function(roomId, next) {
  var deferred = new Q.defer()
    , $query
    , $update
    , $options;

  $query = { 
    roomId: new mongoose.Types.ObjectId(roomId), 
    notify: true,
    inRoom: false
  }  ;

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

UserRoomSchema.statics.getNotifiable = function(roomId, next) {
  debug('getNotifiable for room %s', roomId);

  var deferred = new Q.defer()
    , $userQuery
    , $userProj;

  
  // Setup query for finding user that want notification for the room
  $userQuery = { 
    roomId: new mongoose.Types.ObjectId(roomId), 
    notify: true,
    inRoom: false
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