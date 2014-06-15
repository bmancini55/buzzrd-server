
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

/** 
 * createVenueDefault
 * Creates a default room for a venue
 */
RoomSchema.statics.createVenueDefault = function(venue, next) {
  var room = new Room({
    name: venue.name,
    venueId: venue._id,
    venueDefault: true
  });
  room.save(next);
}


///
/// Create and export the model
///
var model = mongoose.model('Room', RoomSchema);
module.exports = model;