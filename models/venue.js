
// Module dependencies
var util        = require('util')
  , Q           = require('q')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  , debug       = require('debug')('venue')
  , config      = require('../common/confighelper').env()
  , foursquare  = require('node-foursquare-venues')(config.foursquare.clientId, config.foursquare.clientSecret);

///
/// Schema definition
///
var Location = {
  address: String,
  lat: Number,
  lng: Number,
  cc: String,
  city: String,
  state: String,
  country: String  
};

var VenueCategory = {
  name: String,
  pluralName: String,
  shortName: String,
  icon: Object
};

var VenueSchema = new Schema({
  name: String,
  coord: { type: [ Number ], index: '2dsphere' },
  location: Location,
  categories: [ VenueCategory ],
  verified: Boolean,
  referralId: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  roomCount: { type: Number, default: 0 }
});



///
/// Statics
///

/** 
 * findNearby
 * Finds locations near a  latitude, longitude coordinate within
 * the specified number of meters of that coordinate ordered by proximity
 * @param lat latitude part of coordinate pair
 * @param lng longitude part of coordinate pair
 * @param meters limits results to meter radius of coordinates
 * @param next node callback of form (err, FSVenue)
 */
VenueSchema.statics.findNearby = function(lat, lng, meters, next) {

  // attempt to load from cache first
  debug('querying venue cache');
  Venue.findNearbyFromCache(lat, lng, meters, function(err, venues) {

    // return venues if we have them...
    if(venues && venues.length > 10) {
      debug('cache hit, %s venues found', venues.length);
      next(null, venues);
    }

    // otherwise load from foursquare
    else {
      debug('cache miss');
      Venue.findNearbyFromFoursquare(lat, lng, meters, next);
    }
  });
}


/** 
 * findNearbyFromCache
 * Retrieves the venues from the cache
 */
VenueSchema.statics.findNearbyFromCache = function(lat, lng, meters, next) {
  this.find({ 
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
  .sort({ roomCount: - 1 })
  .limit(50)
  .exec(next);
}

/** 
 * findNearbyFromFoursquare
 * Retrieves the venues from the Foursquare API and 
 * updates the venue cache with the latest info
 */
VenueSchema.statics.findNearbyFromFoursquare = function(lat, lng, meters, next) {
  debug('executing foursqaure venue search');
  
  // construct search
  var search = { 
    ll: util.format('%s,%s', lat, lng),
    limit:  50,
    radius: meters
  };

  // exceute the foursquare search
  foursquare.venues.search(search, function(err, results) {
    if(err) next(results);
    else {            
      debug('foursquare responded with %s venues', results.response.venues.length);
      Venue.upsertVenues(results.response.venues, next);
    }
  });
}

/**
 * findInRadius
 * Finds locations near a long, lat coordinate within
 * the specified number of meters of that coordinate
 * sorted by rooms stats
 */
VenueSchema.statics.findInRadius = function(lat, lng, meters, next) {
  this.find({ 
    "coord": { 
      "$geoWithin": { 
        "$centerSphere": [ [ lng, lat ], meters / 1000 / 6371 ] 
      } 
    } 
  })
  .sort({ roomCount: -1 })
  .limit(25)
  .exec(next);
}

/** 
 * upsertVenues
 * Insert or updates the venues
 * @param [Venue] venues
 * @param function(err, [Venue]) callback function
 */ 
VenueSchema.statics.upsertVenues = function(venues, next) {
  debug('upserting %s venues', venues.length);
  var promises = [];

  // construct upsert data
  venues.forEach(function(venue) {    
    var search = {
      _id: mongoose.Types.ObjectId(venue.id)
    };
    var categories = venue.categories.map(function(category) {
      category._id = new mongoose.Types.ObjectId(category.id);
      delete category.id;
      return category;
    })

    var data = {
      _id: venue.id,
      name: venue.name,
      location: venue.location,
      categories: categories,
      verified: venue.verified,
      referralId: venue.referralId,
      coord: [ venue.location.lng, venue.location.lat ],
      updated: Date.now(),
      $setOnInsert: { 
        created: Date.now(), 
        roomCount: 0 
      }
    };
    promises.push(Q.ninvoke(Venue, "findOneAndUpdate", search, data, { upsert: true }));
  });
  
  // upsert all of the venues
  Q.all(promises)
  .then(next);

}


///
/// Create and export the model
///
var model = Venue = mongoose.model("Venue", VenueSchema);
module.exports = model;