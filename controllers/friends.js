
// Module dependencies
var Q             = require('q')
  , util          = require('util')
  , JsonResponse  = require('jsonresponse')
  , models        = require('../models')
  , Friend          = models.Friend;

 /**
 * Finds friends for the current user
 */
exports.findCurrentUsers = function(req, res) {

	var page = Math.max(req.query.page || 1, 1)
	, pagesize = Math.min(Math.max(req.query.pagesize || 100, 1), 1000)
	, user = req.user;
	
  	Friend.findByUser(user._id, JsonResponse.expressHandler(res));
};

/** 
 * Creates a new friend
 */ 
exports.create = function(req, res) {  
  var user = req.user
  	, friendId = req.body.friendId;

  Friend.createFriend(user._id, friendId, JsonResponse.expressHandler(res));
};

/**
 * Finds all friends
 */
exports.findAll = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pagesize = Math.min(Math.max(req.query.pagesize || 1000, 1), 1000);

  Friend.findAll(page, pagesize, JsonResponse.expressHandler(res));
};

/**
 * findPotentialFriends
 * Finds users for the provided search string that aren't friends with the current user
 */
exports.findPotentialFriends = function(req, res) {

  var page = Math.max(req.query.page || 1, 1)
    , pageSize = Math.min(Math.max(req.query.pagesize || 25, 1), 1000)
    , search = req.query.search;

    Friend.findPotentialFriends({
      search: search,
      page: page,
      pageSize: pageSize,
      userId: req.user.id
    }, JsonResponse.expressHandler(res));
}