
// Module dependencies
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Venue = require('./venue')
  , Room = require('./room')
  , User = require('./user');    

///
/// Schema definition
///

var MessageUser = {
  _id: Schema.Types.ObjectId,
  username: String
};

var MessageTag = new Schema({
  type: { type: String },
  value: { type: Schema.Types.Mixed }
}, { _id: false });

var MessageSchema = new Schema({
  message: { type: String, required: true },
  user: { type: MessageUser, required: true },
  revealed: { type: Boolean, default: false },
  coord: { type: [ Number ], index: '2dsphere' },
  tags: [ MessageTag ],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

///
/// Statics
///

// Find messages for a room
MessageSchema.statics.findByRoom = function(idroom, page, pagesize, next) {
  this.find({ 'tags.type': 'room', 'tags.value': new mongoose.Types.ObjectId(idroom) })
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

/** 
 * Persists a message for a specific room
 */
MessageSchema.statics.saveRoomMessage = function(idroom, iduser, message, next) {
  User.findOne({ _id: new mongoose.Types.ObjectId(iduser) }, function(err, user) {
    if(err) next(err);
    else {
      Room.findOne({ _id: new mongoose.Types.ObjectId(idroom) }, function(err, room) {
        if(err) next(err);
        else {
          Venue.findOne({ _id: room.venueId }, function(err, venue) {
            if(err) next(err);
            else {
              var instance = new Message({
                message: message,
                user: { 
                  _id: user._id,
                  username: user.username
                },
                coord: venue.coord,
                tags: [
                  { type: 'venue', value: venue._id },
                  { type: 'room', value: room._id }
                ]
              });

              instance.save(function(err, message) {
                if(err) next(err);
                else next(null, message);
              });
            }
          });
        }    
      });
    }
  });
}


///
/// Create and export the model
///
var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;