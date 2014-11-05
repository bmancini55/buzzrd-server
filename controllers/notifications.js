// Module dependencies
var Q             = require('q')
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
	, user = req.user;
	
  Notification.findByUser(user._id).sort({ date: 'desc' }).exec(JsonResponse.expressHandler(res));
};

/**
 * removeFriend
 * Remove the provided friend from the current user's friend list
 */
exports.removeNotification = function(req, res) {
  var user = req.user
    , notificationId = req.body.notificationId;

  Notification.removeNotification(notificationId, JsonResponse.expressHandler(res));
}

/**
 * updateNotificationRead
 * Marks a notification as either being read or not read
 */
exports.updateNotificationRead = function(req, res) {
  var user = req.user
    , notificationId = req.body.notificationId
    , read = req.body.read;

  Notification.updateNotificationRead(notificationId, read, JsonResponse.expressHandler(res));
}