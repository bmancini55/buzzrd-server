
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
  updated: { type: Date, default: Date.now }
});



///
/// Statics
///

/** 
 * findNearby
 * Finds locations near a  latitude, longitude coordinate within
 * the specified number of meters of that coordinate
 */
VenueSchema.statics.findNearby = function(lat, lng, meters, next) {


  this.find({ 
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  }, next);
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
      updated: Date.now(),
      coord: [ venue.location.lng, venue.location.lat ],
      $setOnInsert: { created: Date.now() }
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