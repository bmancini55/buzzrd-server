
// Module Dependencies
var apn           = require('apn')
  , Q             = require('Q')
  , debug         = require('debug')('apnclient')
  , JsonResponse  = require('jsonresponse')
  , Models        = require('./models')
  , configHelper  = require('./common/confighelper')
  , config        = configHelper.env()
  , UserRoom      = Models.UserRoom
  , conn;

conn = new apn.Connection(config.apn);

exports.notifyRoom = function(roomId, message, excludeUsers) {
  debug('notifyRoom %s', roomId);

  // update notification counts
  UserRoom.updateBadgeCounts(roomId, excludeUsers)
  .then(function(count) {
    debug('updated %d notifications', count);
    return UserRoom.getNotifiable(roomId, excludeUsers);
  })
  .then(function(notifications) {
    debug('found %d notifications', notifications.length);

    notifications.forEach(function(notification) {
      if(notification.deviceId) {
        debug('sending notification to %s', notification.deviceId);

        // construct notification
        var note = new apn.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + 3600; // expire 1 hour from now
        note.badge = notification.badgeCount;
        note.setAlertText(message);
        note.payload = { 'room': roomId };
        note.trim();

        // send notifications    
        conn.pushNotification(note, notification.deviceId);  

      }
    });

  })
  .catch(function(err) {
    console.log('Error notifying room: %j' + err);
  })  
}