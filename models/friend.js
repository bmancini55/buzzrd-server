
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
      if (friend) {
        return User.find({ _id: { $in: friend.friends }}, next);
      }
      else {
        return next(null, {});
      }
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

  this.findOneAndUpdate(
    { 
      userId: userId 
    },
    { 
      $addToSet: { friends: new mongoose.Types.ObjectId(friendId) } 
    },
    { 
      upsert: true 
    },
    next
  );  
}


/** 
 * find
 * Finds users for the provided search string that aren't already friends with the current user
 * @params options
 *   @param search the text to search for
 * @param next node callback of form (err, [User])
 */
FriendSchema.statics.findPotentialFriends = function(options, next) {

var search = new RegExp(options.search, "i"),
    userId = options.userId;

  Friend.findOne({ userId: userId}, {}).exec(function(err, friend) {

    if(err) return next(err);
    else {
      if (friend) {
          User.find({
            $and: [
              { _id: { $nin: friend.friends } },
              {
                $or:[ {'username': search}, {'firstName': search}, {'lastName': search} ]
              }
            ]
          }) .skip((options.page - 1) * options.pageSize)
             .limit(options.pageSize)
             .sort({ username: 1 })
             .exec(next);
      }
      else {
        User.find({
            $and: [
              { _id: { $ne: userId } },
              {
                $or:[ {'username': search}, {'firstName': search}, {'lastName': search} ]
              }
            ]
          }) .skip((options.page - 1) * options.pageSize)
             .limit(options.pageSize)
             .sort({ username: 1 })
             .exec(next);
      }
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
