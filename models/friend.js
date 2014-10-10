
// Module dependencies
var mongoose    = require("mongoose")
  , Schema      = mongoose.Schema
  , User        = require('./user')
  
///
/// Schema definition
///

var FriendSchema = new Schema({  
});

var FriendSchema = new Schema({
  userId: Schema.Types.ObjectId,
  friends: Array
});


///
/// Static methods
///


/**
 * Finds the friends belonging to the specified user.
 * This method will find the array of users in the User collection
 * record matching the userId parameter and will then look up
 * all friends matching those records.
 * 
 * @param {String} userId 
 */ 
FriendSchema.statics.findByUser = function(userId, next) {
  

  return Friend.findOne({ userId: userId}, {}).exec(function(err, friend) {

    if(err) return next(err);
    else {
      return User.find({ _id: { $in: friend.friends }}, next);
    }

   });
}


/**
 * Creates a friend.
 * 
 * @param {String} userId
 * @param {String} friendId
 * @callback
 */
FriendSchema.statics.createFriend = function(userId, friendId, next) {

  this.findOne({ userId: userId }, function(err, friend) {
    if (friend) {
      Friend.update(
        { userId: userId },
        { 
          $addToSet: { friends: new mongoose.Types.ObjectId(friendId) } 
        },
        next);
    } else {
      Friend.create(
        { 
          userId: userId,
          $addToSet: { friends: new mongoose.Types.ObjectId(friendId) } 
        },
        function (err, friend) {
          Friend.update(
            { userId: userId },
            { 
              $addToSet: { friends: new mongoose.Types.ObjectId(friendId) } 
            },
            next);
        });
    }
  });

  
}


/**
 * Finds all friends, likely an admin function
 * and being used for testing purposes now
 */
FriendSchema.statics.findAll = function(page, pagesize, next) {

    // Friend.collection.drop(function (err) {});
    
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .exec(next);
}


///
/// Create and export the model
///

var Friend = mongoose.model('Friend', FriendSchema);

module.exports = Friend;
