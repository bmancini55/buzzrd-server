
// Module dependencies
var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var UserSchema = new Schema({
  username: String,
  password: String,
  firstName: String,
  lastName: String,
  sex: String
  //image: Read GridFs documentation
});


/// 
/// Static methods
///

// Finds all users, likely an admin function
// and being used for testing purposes now
UserSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ username: 1 })
    .exec(next);
}

///
/// Create and export the model
var userModel = mongoose.model('User', UserSchema);
module.exports = userModel;