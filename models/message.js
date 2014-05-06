
// Module dependencies
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var MessageSchema = new Schema({
  message: String,
  idroom: Schema.Types.ObjectId,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

///
/// Statics
///

// Find messages for a room
MessageSchema.statics.findByRoom = function(idroom, page, pagesize, next) {
  this.find({ idroom: new mongoose.Types.ObjectId(idroom) })
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ created: -1 })
    .exec(function(err, rooms) {
      if(err) {
        next(err);
      } else {
        rooms = rooms.reverse();
        next(null, rooms);
      }
    });
}


///
/// Create and export the model
///
var model = mongoose.model("Message", MessageSchema);
module.exports = model;