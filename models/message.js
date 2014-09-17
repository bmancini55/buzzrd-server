
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
MessageSchema.statics.saveRoomMessage = function(idroom, user, message, next) {  
  Room.findOne({ _id: new mongoose.Types.ObjectId(idroom) }, function(err, room) {
    if(err) next(err);
    else {
      Venue.findOne({ _id: room.venueId }, function(err, venue) {
        if(err) next(err);
        else {

          // update the counts
          Room.update({ _id: room._id }, { 
            $set: { lastMessage: Date.now() },
            $inc: { messageCount: 1 }
          }).exec();
          Venue.update({ _id: venue._id }, { 
            $set: { lastMessage: Date.now() },
            $inc: { messageCount: 1 }
          }).exec();     

          // create and update the message
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



///
/// Instance methods
///

MessageSchema.methods.upvote = function (iduser, next) {

  var original = this;

  // Lets only log up to 100 upvotes... not much point above this  
  if(this.upvoteCount < 100) {

    // ensure only one vote per user    
    Message.findOneAndUpdate({
        "_id": this._id,
        "upvotes._id": { $not: { $eq: new mongoose.Types.ObjectId(iduser) } }
      }, { 
        $inc: { upvoteCount: 1 }, 
        $push: { upvotes: {
            _id: new mongoose.Types.ObjectId(iduser),
            when: Date.now 
          }
        }
      },
      function (err, message) {
        if(err) next(err);
        else if (message) next(null, message);
        else next(null, original);
      });
    
  } else {
    next(null, this);
  }
}


///
/// Create and export the model
///
var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;