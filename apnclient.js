
// Module Dependencies
var apn           = require('apn')
  , Q             = require('Q')
  , debug         = require('debug')('apnclient')
  , JsonResponse  = require('jsonresponse')
  , Models        = require('./models')
  , configHelper  = require('./common/confighelper')
  , config        = configHelper.env()
  , Room          = Models.Room
  , UserRoom      = Models.UserRoom
  , conn;

conn = new apn.Connection(config.apn);

exports.notifyRoom = function(roomId, message, excludeUsers) {
  debug('notifyRoom %s', roomId);

  Room.findById(roomId, function(err, room) {

    if(err) { 
      console.log('Error retrieving room %j, cannot send notification', err);
    }

    else {
    
      // update notification counts
      UserRoom.updateBadgeCounts(roomId, excludeUsers)

      //  get notifications
      .then(function(count) {
        debug('updated %d notifications', count);
        return UserRoom.getNotifiable(roomId, excludeUsers);
      })

      // send notifications
      .then(function(notifications) {
        debug('found %d notifications', notifications.length);

        notifications.forEach(function(notification) {
          if(notification.deviceId) {
            debug('sending notification to %s', notification.deviceId);

            // construct notification
            var note = new apn.Notification();
            note.expiry = Math.floor(Date.now() / 1000) + 3600; // expire 1 hour from now
            note.badge = notification.badgeCount;
            note.setAlertText(room.name + ': ' + message);
            note.payload = { 
              'roomId': roomId,
              'messageCount': room.messageCount
            };
            note.trim();

            // send notifications    
            conn.pushNotification(note, notification.deviceId);
          }
        });

      })

      // handle failure
      .catch(function(err) {
        console.log('Error notifying room: %j' + err);
      });

    }

  });
}