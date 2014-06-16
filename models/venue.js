
// Module dependencies
var util        = require('util')
  , Q           = require('q')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  , debug       = require('debug')('venue')
  , config      = require('../common/confighelper').env()
  , foursquare  = require('node-foursquare-venues')(config.foursquare.clientId, config.foursquare.clientSecret)
  , Room        = require('./room');

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
  roomCount: { type: Number, default: 0 },
  userCount: { type: Number, default: 0 }
});



///
/// Statics
///

/**
 * findById
 * Finds a venue by identifier
 * @param id identifier for the venue
 */
VenueSchema.statics.findById = function(id, next) {
  debug('findById ' + id);

  Venue.findOne({
    _id: new mongoose.Types.ObjectId(id)
  }, next);
}

/** 
 * findWithRooms
 * Finds venues with rooms near the location
 * @param lat latitude of the coordinate
 * @param lng longtitude of the coordinate
 * @param meters limits result to the meter radius of coordinates
 * @param next node callback of for (err, [Venue])
 */
VenueSchema.statics.findWithRooms = function(lat, lng, meters, next)  {
  debug('findWithRooms lat %d, lng %d, %dm', lat, lng, meters);

  Q.ninvoke(Venue, "findNearbyWithRooms", lat, lng, meters)
  .then(function(venues) {  
    return Q.all(
      // map each venue into a promise
      // that loads the rooms for that venue
      venues.map(function(venue) {
        var id = venue._id.toString();              

        return Q.ninvoke(Room, "findByVenue", id, 1, 5)            
        .then(function(rooms) {
          venue.rooms = rooms;
          return venue;
        });

      })
    );  
  })
  .then(function(venues) {
    debug('found %d venues', venues.length);    
    next(null, venues);
  })
  .fail(function(err) {
    next(err);
  });

}

/** 
 * findNearbyWithRooms
 * Finds locations neara latitude, longitude coordinate within
 * the specified number of meters 
 * @param lat latitude part of coordinate pair
 * @param lng longitude part of coordinate pair
 * @param meters limits results to meter radius of coordinates
 * @param next node callback of form (err, [Venue])
 */
VenueSchema.statics.findNearbyWithRooms = function(lat, lng, meters, next) {
  debug('querying store for venues with rooms');

  this.find({ 
    "roomCount": { $gt: 1 },
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
  .limit(50)
  .exec(next);
}

/** 
 * findNearby
 * Finds locations near a  latitude, longitude coordinate within
 * the specified number of meters of that coordinate ordered by proximity
 * @param lat latitude part of coordinate pair
 * @param lng longitude part of coordinate pair
 * @param meters limits results to meter radius of coordinates
 * @param next node callback of form (err, [Venue])
 */
VenueSchema.statics.findNearby = function(lat, lng, meters, next) {
  debug('findNearby lat: %d, lng: %d, %dm', lat, lng, meters);

  // attempt to load from cache first
  Venue.findNearbyFromCache(lat, lng, meters, function(err, venues) {

    // return venues if we have them...
    if(venues && venues.length > 15) {
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
  debug('querying venue cache');

  this.find({ 
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
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
 * @remarks This fires off an upsert for each venue in the list
 *          and has the potential to be very costly for large
 *          lists of venues. Use with caution... possibly add
 *          a check to throw an exception if array is too large
 */ 
VenueSchema.statics.upsertVenues = function(venues, next) {
  debug('upserting %d venues', venues.length);
  
  // upsert all of the venues
  Q.all(

    // create a promise for each venue
    venues.map(function(venue) {    
      var search = {
          _id: mongoose.Types.ObjectId(venue.id)
        },
        categories = venue.categories.map(function(category) {
          category._id = new mongoose.Types.ObjectId(category.id);
          delete category.id;
          return category;
        }),
        data = {
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
            roomCount: 0,
            userCount: 0
          }
        };      
      return Q.ninvoke(Venue, "findOneAndUpdate", search, data, { upsert: true });
    })
  )
  .then(function(venue) {
    next(null, venue);
  })
  .fail(function(err) {
    next(err);
  });

}



///
/// Instance methods
///

/**
 * addRoom
 * adds a room by saving the room and incrementing the room count
 * @param {Room} room to add
 */
VenueSchema.methods.addRoom = function(room, next) {
  var venue = this;

  // save the room
  room.save(function(err, room) {
    if(err) next(err);
    else {

      // increment the room count
      venue.update({ $inc: { roomCount: 1 } }, function(err) {
        if(err) next(err);
        else next(null, room);
      });

    }    
  });
}

/** 
 * toClient
 * @override
 * To client method that will also include rooms if they are available
 */
VenueSchema.methods.toClient = function() {
  var client = mongoose.Model.prototype.toClient.call(this);
  if(this.rooms) {
    client.rooms = this.rooms.map(function(room) {
      return room.toClient();
    });
  }
  return client;
}


///
/// Create and export the model
///
var model = Venue = mongoose.model("Venue", VenueSchema);
module.exports = model;

