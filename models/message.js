
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

var MessageUpvote = {
  _id: Schema.Types.ObjectId,
  when: { type: Date, default: Date.now }
}

var MessageSchema = new Schema({
  message: { type: String, required: true },
  user: { type: MessageUser, required: true },
  revealed: { type: Boolean, default: false },
  coord: { type: [ Number ], index: '2dsphere' },
  tags: [ MessageTag ],
  upvotes: [ MessageUpvote ],
  upvoteCount: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});


///
/// Statics
///

/** 
 * Finds a message by its id
 * @param {String} idroom

 */
MessageSchema.statics.findById = function(idroom, next) {

  this.findOne({ _id: new mongoose.Types.ObjectId(idroom) }, next);

}

/** 
 * Find messages for a room
 */
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
/// Instance methods
///

MessageSchema.methods.upvote = function (iduser, next) {

  var me = this
    , idmessage = this._id

  // Lets only log up to 100 upvotes... not much point above this  
  if(this.upvoteCount < 100) {

    // ensure only one vote per user
    Message.count({
        "_id": this._id,
        "upvotes._id": new mongoose.Types.ObjectId(iduser)
      }, 
      function (err, count) {

        if(err) next(err);
        else {

          // only add if we don't have one already
          if(count > 0) next(null, me);
          else {      
            Message.findByIdAndUpdate({
                _id: idmessage
              }, { 
                $inc: { upvoteCount: 1 }, 
                $push: { upvotes: {
                    _id: new mongoose.Types.ObjectId(iduser),
                    when: Date.now 
                  }
                }
              },
              next);
          }
        }
      });

    
  } else {
    next(null, me);
  }
}


///
/// Create and export the model
///
var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;