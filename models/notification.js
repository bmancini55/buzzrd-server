// Module dependencies
var mongoose    = require("mongoose")
  , Q           = require('Q')
  , Schema      = mongoose.Schema;

///
/// Schema definition
///

var NotificationSchema = new Schema({  
});

///
/// Notification Types
/// Invitation - 1
///

var NotificationSchema = new Schema({
  typeId: { type: Number, required: true },
  recipientId: { type: Schema.Types.ObjectId, required: true},
  message: { type: String, required: true },
  created: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  payload: Schema.Types.Mixed
});


///
/// Static methods
///

/**
 * Create a notification
 * 
 * @param {Number} typeId
 * @param {String} recipientId
 * @param {String} message
 * @param {Mixed} payload
 */ 
NotificationSchema.statics.createNotification = function(notification, next) {
  var deferred = new Q.defer();

  notification.save(function(err, notification) {
    if(err) {
      deferred.reject(err);
      if(next) next(err);
    } 
    else { 
      deferred.resolve(notification);
      if(next) next(null, notification);
    }
  });

  // always return the promise
  return deferred.promise; 
}

///
/// Create and export the model
///

var Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;