
// Module dependencies
var mongoose  = require('mongoose')
  , Q         = require('q')
  , crypto    = require('crypto')
  , debug     = require('debug')('user')
  , Schema    = mongoose.Schema  
  , ObjectId  = Schema.ObjectId;

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
  sex: String,
  profilePic: String,
  deviceId: String
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

/** 
 * Hashes a password using PBKDF2
 * Callback gets two arguments (err, derivedKey)
 */
UserSchema.statics.hashPassword = function(password, salt, next) {
  var ITERATIONS  = 100000
    , KEY_LENGTH  = 128
    , saltBuffer  = new Buffer(salt, 'hex');
  crypto.pbkdf2(password, saltBuffer, ITERATIONS, KEY_LENGTH, function(err, buffer) {
    if(err) next(err);
    else next(null, buffer.toString('hex'));
  });
}

/**
 * Finds all users, likely an admin function
 * and being used for testing purposes now
 */
UserSchema.statics.findAll = function(page, pagesize, next) {
  this.find()
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .sort({ username: 1 })
    .exec(next);
}

/** 
 * Finds the user with the specified Id
 */
UserSchema.statics.findById = function (id, next) {
  this.findOne({ _id: new mongoose.Types.ObjectId(id) }, next);
}

/** 
 * Finds the user with the provided username
 */
UserSchema.statics.findByUsername = function(username, next) {
  this.findOne({ username: username }, next);
}

/**
 * Updates the profile picture path
 */
UserSchema.statics.updateProfilePic = function(userId, profilePic, next) {
  var select = { _id: new mongoose.Types.ObjectId(userId) },
     updates = { $set: { profilePic: profilePic } };

  this.findOneAndUpdate(select, updates, next);
}

/**
 * Updates the device for a user
 * 
 * @param {String} userId
 * @param {String} deviceId
 * @callback next with error and deviceId
 * @return Promise resolves to deviceId
 */
UserSchema.statics.updateDevice = function(userId, deviceId, next) {
  debug('updateDevice for user %s', userId);
  var deferred = Q.defer()
    , $query
    , $update;

  $query = {
    _id: new mongoose.Types.ObjectId(userId)
  };

  $update = {
    $set: { 
      deviceId: deviceId,
      updated: new Date()
    }
  };

  User.update($query, $update, function(err) {
    if(err) {
      deferred.reject(err);
      if(next) return next(err);
    } 
    else {
      deferred.resolve(deviceId);
      if(next) return next(null, deviceId);
    }
  });

  return deferred.promise;
}


/**
 * Updates the user
 */
UserSchema.statics.updateUser = function(userId, user, next) {
  var select = { _id: new mongoose.Types.ObjectId(userId) },
    updates;

  if (user.password) {
    updates = { $set: { 
               password: user.password,
               salt: user.salt,
               firstName: user.firstName,
               lastName: user.lastName,
               sex: user.sex
             } };
  }
  else {
    updates = { $set: { 
               firstName: user.firstName,
               lastName: user.lastName,
               sex: user.sex
             } };
  }

  this.findOneAndUpdate(select, updates, next);
}

///
/// Instance methods
///

/**
 * Verifies the supplied password against the user's password
 * with callback arguments (err, valid) where valid is a boolean.
 */
UserSchema.methods.verifyPassword = function(password, next) {
  var me = this
    , salt = me.salt;
  UserSchema.statics.hashPassword(password, salt, function(err, derivedKey) {
    var result = (me.password === derivedKey);
    next(err, result);  
  });
}

/**
 * Overrides the toClient method to create a secure display of user info
 * @override
 */
UserSchema.methods.toClient = function() {
  var client = mongoose.Model.prototype.toClient.call(this);  
  delete client.password;
  delete client.salt; 
  delete client.deviceId;
  return client;
}


///
/// Create and export the model
///
var User = mongoose.model('User', UserSchema);
module.exports = User;