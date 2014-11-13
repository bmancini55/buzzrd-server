// Module dependencies
var Q             = require('q')
  , _             = require('underscore')
  , util          = require('util')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Notification          = models.Notification;

 /**
 * Finds friends for the current user
 */
exports.findCurrentUser = function(req, res) {

	var page = Math.max(req.query.page || 1, 1)
	, pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
	, userId = req.userId;
	
  Notification.findByUser(userId, JsonResponse.expressHandler(res));
};

/**
 * Finds the current notifications for a room
 */
exports.findCurrentUnread = function(req, res) {
  var userId = req.userId;

  Notification.findUnreadForUser(userId, JsonResponse.expressHandler(res)); 
}

/**
 * Remove the notification
 */
exports.removeNotification = function(req, res) {
  var userId = req.userId
    , notificationId = req.param('notificationId');

  Notification.removeNotification(userId, notificationId, JsonResponse.expressHandler(res));
}

/** 
 * Marks a notification as either being read or not read
 */
exports.updateRead = function(req, res) {
  var userId = req.userId
    , notificationId = req.param('notificationId');    

  Notification.markAsRead(userId, notificationId, JsonResponse.expressHandler(res));
}


/** 
 * Marks a room as being read
 */
exports.markRoomAsRead = function(req, res) {
  var roomId = req.param('roomId')
    , userId = req.userId
    , badgeCount;

  // find current notification
  Notification.findByUserAndRoom(userId, roomId)

  // get total badge count of notifications
  .then(function(notifications) {
    var badgeCounts = _.pluck(notifications, 'badgeCount');    
    badgeCount = _.reduce(badgeCounts, function(sum, val) { return sum + val; }, 0);
    return notifications;
  })

  // update all notifications
  .then(function(notifications) {        
    return Q.all(notifications.map(function(notification) {
      return Notification.markAsRead(userId, notification._id.toString());  
    }));
  })

  // return results
  .then(
    function() {      
      res.send(new JsonResponse(null, badgeCount))
    },
    function(err) {
      console.log(err);
      res.status(500).send(new JsonResponse(err));
    }
  );
}


