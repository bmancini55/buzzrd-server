/**
 * @module Foursquare Service
 * Service layer for brokering calls between Foursquare and Mongodb
 */

// Modules dependencies
var util    = require('util')
  , debug   = require('debug')('foursquare-service')
  , config  = require('../common/confighelper').env()

  , Models  = require('../models')
  , Venue   = Models.Venue

  , fsAPI   = require('node-foursquare-venues')(config.foursquare.clientId, config.foursquare.clientSecret);


/**
 * findVenues
 * @param lat latitude part of coordinate pair
 * @param lng longitude part of coordinate pair
 * @param radius limits results to meter radius of coordinates
 * @param next node callback of form (err, FSVenue)
 */
module.exports.findNearby = function(lat, lng, radius, next) {

  // attempt to load from cache first
  Venue.findNearby(lat, lng, radius, function(err, venues) {

    // return venues if we have them...
    if(venues && venues.length > 0) {
      debug('found %s venues from cache', venues.length);
      next(null, venues);
    }

    // otherwise load from foursquare
    else {
      venuesFromAPI(lat, lng, radius, next);
    }
  });
}




///
/// Private helper functions
///


/** 
 * venuesFromAPI
 * Retrieves the venues from the Foursquare API and 
 * updates the venue cache with the latest info
 * @private
 */
function venuesFromAPI(lat, lng, radius, next) {
  var ll = util.format('%s,%s', lat, lng)
    , limit = 50
    , intent = 'browse';

  // retrieve the venues from foursquare
  fsAPI.venues.search({
    ll: ll,
    limit: limit,
    intent: intent,
    radius: radius
  }, function(err, results) {
    if(err) next(err);
    else {      
      if(!results.response || !results.response.venues)
        next('Foursquare responded with unknown response object');
      else       
      {
        // persist the venues
        var venues = results.response.venues;
        debug('upserting %s venues', venues.length);
        Venue.upsertVenues(venues, next);
      }
    }
  });
}