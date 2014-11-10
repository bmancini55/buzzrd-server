
// Module Dependencies
var apn           = require('apn')
  , Q             = require('q')
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

/** 
 * 
 * @param {Room} room
 * @param {Message} message
 * @param {Array} recipients - array of objects
 * @config userId
 * @config deviceId
 * @config badgeCount
 * @param {String} message
 * @callback next
 */
exports.notifyRoom = function(room, message, recipients) {
  debug('notifyRoom');
  
  // process all recipients
  recipients.forEach(function(recipient) {    
    if(recipient.deviceId) {
      debug('notifyRoom:sending %j', recipient);

      // construct notification
      var note = new apn.Notification();
      note.expiry = Math.floor(Date.now() / 1000) + 21600; // expire 6 hour from now
      note.badge = recipient.badgeCount;
      note.setAlertText(room.name + ': ' + message.message);
      note.payload = {
        'type': 'message',
        'roomId': room._id.toString(),
        'messageCount': room.messageCount
      };
      note.trim();

      // send notifications    
      service.pushNotification(note, recipient.deviceId);
    }
  });      
}



exports.notifyRoomInvite = function(invites) {
  debug('notifyRoomInvite')

  var userIds = invites.map(function(invite) { 
    return invite.recipientId;
  });
  
  User.findByIds(userIds)
  .then(function(users) {

    var usersLookup = {};
    users.forEach(function(user) {
      usersLookup[user._id.toString()] = user;
    });

    invites.forEach(function(invites) {
      var user = usersLookup[invites.recipientId.toString()];
      if(user && user.deviceId) {
        debug('sending notification to %s', user.deviceId);

        var note = new apn.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + 21600; // expire 6 hours from now
        note.badge = 1// increment total count by 1...
        note.setAlertText('Someone invited you to a room: ');
        note.payload = {
          'type': 'roominvite',
          'roomId': roomId          
        }

      }
    })

  })
}
