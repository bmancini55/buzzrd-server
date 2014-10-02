// Module dependencies
var JsonResponse  = require('jsonresponse');

/**
 * Terms of Service text
 */
exports.termsofservice = function(req, res) {

	res.sendfile('resources/termsofservice.txt');
};

/**
 * Privacy Policy text
 */
exports.privacypolicy = function(req, res) {

	res.sendfile('resources/privacypolicy.txt');
};