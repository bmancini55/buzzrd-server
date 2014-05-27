
// Module dependencies
var mongoose  = require('mongoose')
  , Q         = require('q')
  , Schema    = mongoose.Schema;

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
  id: String,
  name: String,
  pluralName: String,
  shortName: String,
  icon: Object
};

var VenueSchema = new Schema({
  id: { type: String, index: { unique: true } },
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
 */
VenueSchema.statics.findNearby = function(lat, lng, meters, next) {
  this.find({ 
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
  .sort({ roomCount: - 1 })
  .limit(25)
  .exec(next);
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
 */ 
VenueSchema.statics.upsertVenues = function(venues, next) {

  var promises = [];

  // construct upsert data
  venues.forEach(function(venue) {
    var data = {
      id: venue.id,
      name: venue.name,
      location: venue.location,
      categories: venue.categories,
      verified: venue.verified,
      referralId: venue.referralId,
      coord: [ venue.location.lng, venue.location.lat ],
      updated: Date.now(),
      $setOnInsert: { 
        created: Date.now(), 
        roomCount: 0 
      }
    }    
    promises.push(Q.ninvoke(Venue, "findOneAndUpdate", { id: venue.id }, data, { upsert: true }));
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