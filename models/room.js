
// Module dependencies
var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var RoomSchema = new Schema({
  name: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  lon: Number,
  lat: Number
});


/// 
/// Static methods
///

// Finds all rooms, likely an admin function
// and being used for testing purposes now
RoomSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ name: 1 })
    .exec(next);
}

// Finds nearby rooms
RoomSchema.statics.findByLocation = function(lon, lat, next) {
  // TODO
}


///
/// Create and export the model
var roomModel = mongoose.model('Room', RoomSchema);
module.exports = roomModel;