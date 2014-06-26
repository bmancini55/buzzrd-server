
// Module dependencies
var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var RoomSchema = new Schema({
  name: { type: String, required: true },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  venueId: Schema.Types.ObjectId,
  venueDefault: { type: Boolean, default: false },
  userCount: { type: Number, default: 0 }
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
  this.find()
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
  this.find({ venueId: new mongoose.Types.ObjectId(venueId) })
  .skip((page - 1) * pagesize)
  .limit(pagesize)
  .sort({ userCount: -1, name: 1 })
  .exec(next);
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
var model = mongoose.model('Room', RoomSchema);
var DefaultRoom = mongoose.model('DefaultRoom', DefaultRoomSchema);

module.exports = model;