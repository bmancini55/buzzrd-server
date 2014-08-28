﻿
// Module dependencies
var mongoose = require("mongoose")
  , debug = require('debug')('room')
  , Schema = mongoose.Schema;

///
/// Schema definition
///

var RoomUserSchema = new Schema({  
});

var RoomSchema = new Schema({
  name: { type: String, required: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  venueId: Schema.Types.ObjectId,
  venueDefault: { type: Boolean, default: false },
  userCount: { type: Number, default: 0 },
  users: { type: [ RoomUser ] },
  lastMesasge: { type: Date },
  messageCount: { type: Number, default: 0 }
});

var DefaultRoomSchema = new Schema({
  roomId: Schema.Types.ObjectId,
  venueId: Schema.Types.ObjectId
});
DefaultRoomSchema.index({ venueId: 1 }, { unique: true });


///
/// Static methods
///

/**
 * findAll
 * Finds all rooms, likely an admin function
 * and being used for testing purposes now
 */
RoomSchema.statics.findAll = function(page, pagesize, next) {
  this.find({ }, { users: 0 })
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ name: 1 })
    .exec(next);
}

/** 
 * findByVenue
 * Finds rooms belonging to a specific venue
 */
RoomSchema.statics.findByVenue = function(venueId, page, pagesize, next) {
  this.find({ venueId: new mongoose.Types.ObjectId(venueId) }, { users: 0 })
  .skip((page - 1) * pagesize)
  .limit(pagesize)
  .sort({ messageCount: -1, name: 1 })
  .exec(next);
}

/**
 * @method findVenueDefault
 * Finds the default room for a specific venue
 */
RoomSchema.statics.findVenueDefault = function(venueId, next) {
  debug('findingVenueDefault for %s', venueId);
  this.findOne(
    { venueId: new mongoose.Types.ObjectId(venueId), venueDefault: true }, 
    { users: 0 }, 
    next
  );
}

/**
 * @method addUsersToRoom
 * Adds the user to the room by pushing an entry into the users array
 * and incrementing the userCount value for the room
 */
RoomSchema.statics.addUsersToRoom = function(roomId, userIds, next) {
  debug('adding %d users to room %s', userIds.length, roomId);
  var roomUsers = userIds.map(function (userId) {
    return new RoomUser({ _id: userId });
  });
  this.update(
    { _id: new mongoose.Types.ObjectId(roomId) }, 
    {
      $set: { 
        users: roomUsers, 
        userCount: roomUsers.length 
      },
    }, 
    next
  );
}

/**
 * @method removeUserFromRoom
 * Adds the user to the room by pushing an entry into the users array
 * and incrementing the userCount value for the room
 */
RoomSchema.statics.removeUserFromRoom = function(roomId, userId, next) {
  debug('removing user %s from room %s', userId, roomId);  
  this.update(
    { _id: new mongoose.Types.ObjectId(roomId) },
    {
      $pull: { users: { _id: new mongoose.Types.ObjectId(userId) } },
      $inc: { userCount: -1 }
    }, 
    next
  );
}



///
/// Instance methods
///

/**
 * save overrides the default functionality to add an
 * additional index for ensuring unique default room values are store
 * @override
 */
RoomSchema.methods.saveDefault = function(next) {

  var me = this;

  // initially downgrade default status
  this.venueDefault = false;

  // persist to ensure id is generated
  this.save(function(err, room) {

    if(err) next(err);
    else {

      // create and persist unique constraint
      var unique = new DefaultRoom({ 
        roomId: room._id,
        venueId: room.venueId
      });
      unique.save(function(err, uniuque) {

        if(err) {
          
          // ignore duplicate key error
          if(err.code === 11000) {
            next(null, room);
          } else {
            next(err);
          }
        }
        else {

          // upgrade room value to default status
          room.venueDefault = true;
          room.save(next);
        }

      });

    }

  });
}



///
/// Create and export the model
///

var Room = mongoose.model('Room', RoomSchema);
var DefaultRoom = mongoose.model('DefaultRoom', DefaultRoomSchema);
var RoomUser = mongoose.model('RoomUser', RoomUserSchema);

module.exports = Room;