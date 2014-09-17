
// Module dependencies
var mongoose = require("mongoose")
  , Q = require('Q')
  , debug = require('debug')('room')
  , debugSort   = require('debug')('room:sort')  
  , Schema = mongoose.Schema
  , User = require('./user')
  , Venue = require('./venue');

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
  messageCount: { type: Number, default: 0 },
  coord: { type: [ Number ], index: '2dsphere' }
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
 * Finds rooms based on proximity and search criteria
 * @param options 
 * @config lat
 * @config lng
 * @config meters
 * @config search
 */
RoomSchema.statics.findNearby = function(options, next) {
  debug('findNearby %j', options);

  var lng = options.lng
    , lat = options.lat
    , meters = options.meters;

  this.find({  
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
  .limit(100)   // 100 is the max returned for $near op
  .exec(function(err, rooms) {
    if(err) next(err);        
    else {
      sort(lat, lng, rooms);
      attachVenues(rooms, next);
    }

  });

}

/**
 * Finds the rooms belonging to the specified user.
 * This method will find the array of users in the User collection
 * record matching the userId parameter and will then look up
 * all rooms matching those records.
 * 
 * @param {String} userId 
 */ 
RoomSchema.statics.findByUser = function(userId, next) {
  debug('findByUser %s', userId);

  User.findById(userId, function(err, user) {
    if(err) next(err);
    else {

      Room.find({ _id: { $in: user.rooms }}, function(err, rooms) {
        if(err) next(err);
        else {
          attachVenues(rooms, next);
        }
      });

    }
  });
}


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


/** 
 * toClient
 * @override
 * To client method that will also include rooms if they are available
 */
RoomSchema.methods.toClient = function() {
  var client = mongoose.Model.prototype.toClient.call(this);
  if(this.venue) {
    client.venue = this.venue.toClient();
  }
  return client;
}












/** 
 * Attaches venues to the room objects. The corresponding
 * venue for each room will be attached to the `venue` 
 * property.
 *
 * @param {[Room]} rooms
 * @param {Callback} next
 * @api private
 */
function attachVenues(rooms, next) {

  var venueIds = rooms.map(function(room) {
    return room.venueId;
  });

  Venue.findVenues(venueIds, function(err, venues) {

    if(err) next(err);
    else {

      // construct a quick lookup for the venues based on ID
      var venueLookup = {};
      venues.forEach(function(venue) {
        venueLookup[venue._id.toString()] = venue;
      });

      // attach the venue to each room
      rooms.forEach(function(room) {
        room.venue = venueLookup[room.venueId.toString()] || null;
      });

      next(null, rooms);
    }

  });

}


/**
 * Sort function for rooms. 
 * Sorts on a custom algorithm of proximity,
 * days since last message, and number of messages.
 *
 * @param {Number} lat
 * @param {Number} lng
 * @param {[Venue]} rooms
 * @api private
 */

function sort(lat, lng, rooms) {

  var distanceHelper = require('../common/distancehelper')
    , dateHelper = require('../common/datehelper');

  function calculateWeight (proximity, days, messages) {
    var p = proximity
      , d = days
      , m = messages
      , p2 = Math.pow(proximity, 2)      // number of miles squared
      , d2 = Math.pow(days, 2)           // number of days squared
      , m2 = Math.pow(messages, 2)       // number of messages squared
      , pw = 2                           // promixity weight
      , dw = 3                           // days weight
      , mw = 1                           // messages weight
      , pa = 10                          // proximity asymptotic factor
      
      , da = 30                          // days asymptotic factor
      , ma = 2000                        // messasges asymptoptic factor
      ;

    return  ( (pw * (1 - (p2 / (p2 + pa)))) + (dw * (1 - (d2 / (d2 + da)))) + (mw * (m / (m + ma))) ) / (pw + dw + mw);
  }

  function log(items) {
    items.forEach(function(result) {
      debugSort("%d: %dmi, %d days, %d messages: %s", 
        (result.sortWeight * 100).toFixed(2), 
        result.sortProximity.toFixed(2), 
        result.sortDays.toFixed(2), 
        result.sortMessages, 
        result.name);
    })
  }

  function sort(items) {
    return items.sort(function(a, b) {
      return b.sortWeight - a.sortWeight;
    });
  }

  rooms.forEach(function(item) {
    var proximity = distanceHelper.inMiles(lat, lng, item.coord[1], item.coord[0])
      , days = dateHelper.daysAgo(item.lastMessage ? new Date(item.lastMessage) : new Date(0))
      , messages = item.messageCount;

    item.sortProximity = proximity;
    item.sortDays = days;
    item.sortMessages = messages;
    item.sortWeight = calculateWeight(proximity, days, messages);
  });

  var results = sort(rooms);
  log(results);
  return results;
}     



///
/// Create and export the model
///

var Room = mongoose.model('Room', RoomSchema);
var DefaultRoom = mongoose.model('DefaultRoom', DefaultRoomSchema);
var RoomUser = mongoose.model('RoomUser', RoomUserSchema);

module.exports = Room;