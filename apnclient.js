
// Module Dependencies
var apn           = require('apn')
  , Q             = require('Q')
  , debug         = require('debug')('apnclient')
  , JsonResponse  = require('jsonresponse')
  , Models        = require('./models')
  , configHelper  = require('./common/confighelper')
  , config        = configHelper.env()
  , Room          = Models.Room
  , User          = Models.User
  , UserRoom      = Models.UserRoom
  , service
  , feedback;

////////////////////////////////////////////////////////////
// 
// SERVICE HANDLERS
//
////////////////////////////////////////////////////////////

service = new apn.Connection(config.apn);

service.on('connected', function() {
  console.log('Connected to APNS');
});

service.on('disconnected', function() {
  console.log('Disconnected from APNS');
});

service.on('transmissionError', function(errCode, notification, device) {
  console.error("Notification caused error: " + errCode + " for device ", device, notification);    
});

service.on('timeout', function () {
  console.log("APNS connection timeout");
});

service.on('socketError', console.error);


////////////////////////////////////////////////////////////
// 
// FEEDBACK HANDLERS
//
////////////////////////////////////////////////////////////

feedback = new apn.Feedback({
  cert: config.apn.cert,
  key: config.apn.key,
  batchFeedback: true,
  interval: 300
});

feedback.on('feedback', function(items) {
  items.forEach(function(item) {
    console.log('Feedback for item: ', item.device.toString());

    // TODO clear out this device
    User.findOne({ deviceId: item.device.toString() }, function(err, user) {

      if(user) {
        var deviceId = null
          , userId = user._id.toString();

        // updates the user's device ID
        User.updateDevice(userId, deviceId, function(err) {
          if(err) console.log('Error updating deviceId');
        });

        // update device ID for all UserRooms
        UserRoom.updateDevice(userId, deviceId, function(err) {
          if(err) console.log('Error updating deviceId %j', err);
        });
      }

    });

  });
});
feedback.on('error', console.error);
feedback.on('feedbackError', console.error);

console.log('Starting APNS Feedback');
feedback.start();


////////////////////////////////////////////////////////////
// 
// EXPORTED METHODS
//
////////////////////////////////////////////////////////////

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
            service.pushNotification(note, notification.deviceId);
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