
// Module dependencies
var mongoose    = require('mongoose')
  , Q           = require('q')
  , Schema      = mongoose.Schema
  , debug       = require('debug')('userroom')
  , User        = require('./user');

///
/// Schema definition
///

var UserRoomSchema = new Schema({
  userId: mongoose.Schema.ObjectId,
  roomId: mongoose.Schema.ObjectId,
  notify: Boolean,
  created: Date,
  updated: Date  
});


/**
 * Finds the UserRoom records by UserId. This is used to load the
 * My Rooms records.
 *
 * @param {String} userId
 * @callback
 * @return {Promise}
 */
UserRoomSchema.statics.findByUser = function(userId, next) {
  debug('findByUserId for user %s', userId);
  var deferred = Q.defer()
    , $query;

  $query = { 
    userId: new mongoose.Types.ObjectId(userId)
  };

  UserRoom.find($query, function(err, userrooms) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } else {
      deferred.resolve(userrooms);
      if(next) next(null, userrooms);
    }
  });

  return deferred.promise;
}



/**
 * Finds the UserRoom records associated with the 
 * user and the supplied list of rooms
 *
 * @param {String} userId the identifier for the user
 * @param {Array} roomsIds the array of RoomId strings
 * @callback next
 * @return {Promise}
 */
UserRoomSchema.statics.findByUserAndRooms = function(userId, roomIds, next) {
  debug('findByUserAndRooms %s', userId);

  var deferred = Q.defer()
    , roomObjectIds
    , $query;

  roomObjectIds = roomIds.map(function(roomId) {
    return new mongoose.Types.ObjectId(roomId);
  });

  $query = {
    userId: new mongoose.Types.ObjectId(userId),
    roomId: { $in: roomObjectIds }
  };

  UserRoom.find($query, function(err, userrooms) {
    if(err) {
      deferred.reject(err);
      if(next) return next(err);
    }
    else {
      deferred.resolve(userrooms);
      if(next) return next(null, userrooms);
    }
  });

  return deferred.promise;
}


/**
 * Finds the users for a room that have notification enabled for that room.
 * This will also exclude users passed into the excludeUsers array to filter
 * out users that are already in the room.
 *
 * @param {String} roomId
 * @param {Array} excludeUsers - array of string values for users to exclude
 * @callback next
 * @return {Promise}
 */
UserRoomSchema.statics.findNotifiableUsersForRoom = function (roomId, excludeUsers, next){
  debug('findUsersForRoom for room %s', roomId);  
  var deferred = Q.defer()
    , $query;

  $query = {
    roomId: new mongoose.Types.ObjectId(roomId),
    notify: true,
    userId: { $nin: excludeUsers }
  };

  UserRoom.find($query, function(err, userrooms) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } else {      
      deferred.resolve(userrooms);
      if(next) next(null, userrooms);
    }
  });

  return deferred.promise;
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
      notify: true,      
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
 * Toggles the notification value for the UserRoom
 * 
 * @param {String} userId
 * @param {String} roomId
 * @param {Boolean} notify
 * @callback next
 */
UserRoomSchema.statics.toggleNotification = function(userId, roomId, notify, next) {
  debug('toggleNotification for user %s, room %s', userId, roomId);  
  var $query
    , $update;

  $query = {
    userId: new mongoose.Types.ObjectId(userId),
    roomId: new mongoose.Types.ObjectId(roomId)
  };

  $update = {
    $set: { notify: notify }
  };

  User.findById(userId, function(err, user) {
    if(err) return next(err);
    else {
  
      // attempt to update an existing record
      UserRoom.update($query, $update, function(err, rows) {    
        if(err) return next(err);    

        // if there is no update, we need to insert
        else if (notify && rows == 0) {                              
          UserRoom.addRoom(userId, roomId, user.deviceId, next);
        }

        // otherwise, we're good to go
        else next(null, user);

      });

    }

  });
}






///
/// Create and export the model
///

var UserRoom = mongoose.model('UserRoom', UserRoomSchema);

module.exports = UserRoom;
