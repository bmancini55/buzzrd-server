
// Module dependencies
var mongoose = require('mongoose')
  , crypto = require('crypto')
  , Schema = mongoose.Schema;

///
/// Schema definition
///
var UserSchema = new Schema({
  username: String,
  password: String,
  salt: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  firstName: String,
  lastName: String,
  sex: String
  //image: Read GridFs documentation
});



///
/// Static methods
///

UserSchema.statics.generateSalt = function(next) {
  var SALT_LENGTH = 8;
  crypto.randomBytes(SALT_LENGTH, function(err, buffer) {
    if(err) next(err);
    else next(null, buffer.toString('hex'));
  });
}

// Hashes a password using PBKDF2
// Callback gets two arguments (err, derivedKey)
UserSchema.statics.hashPassword = function(password, salt, next) {
  var ITERATIONS  = 100000
    , KEY_LENGTH  = 128
    , saltBuffer  = new Buffer(salt, 'hex');
  crypto.pbkdf2(password, saltBuffer, ITERATIONS, KEY_LENGTH, function(err, buffer) {
    if(err) next(err);
    else next(null, buffer.toString('hex'));
  });
}

// Finds all users, likely an admin function
// and being used for testing purposes now
UserSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ username: 1 })
    .exec(next);
}

// Finds the user with the provided username
UserSchema.statics.findByUsername = function(username, next) {
  this.findOne({ username: username }, next);
}

///
/// Instance methods
///

// Verifies the supplied password against the user's password
// with callback arguments (err, valid) where valid is a boolean.
UserSchema.methods.verifyPassword = function(password, next) {
  var me = this
    , salt = me.salt;
  UserSchema.statics.hashPassword(password, salt, function(err, derivedKey) {
    var result = (me.password === derivedKey);
    next(err, result);
  });
}

///
/// Create and export the model
///
var userModel = mongoose.model('User', UserSchema);
module.exports = userModel;