
// Module dependencies
var util        = require('util')
  , Q           = require('q')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  , debug       = require('debug')('venue')
  , debugSort   = require('debug')('venue:sort')
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
  userCount: { type: Number, default: 0 },
  lastMessage: { type: Date },
  messageCount: { type: Number, default: 0 }
});

var VenueSearchSchema = new Schema({
  lng: { type: Number },
  lat: { type: Number },
  search: { type: String },
  results: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});
VenueSearchSchema.index({ lng: 1, lat: 1, search: 1 }, { unique: true });



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

        return Q
        .all([          
          Q
          .ninvoke(Room, "findByVenue", id, 1, 3)
          .then(function(rooms) {
            venue.rooms = rooms;
          }),      

          Q
          .ninvoke(Room, "findVenueDefault", id)
          .then(function(room) {
            venue.defaultRoom = room;
          })
        ])        
        .then(function() {
          return venue;
        })
      })
    )
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
    "roomCount": { $gt: 0 },
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ lng, lat ] }, 
        "$maxDistance" : meters 
      }
    }
  })
  .limit(100)   // 100 is the max returned for $near op
  .exec(function(err, venues) {

    if(err) next(err);
    else next(null, sort(lat, lng, venues));

  });
}

/** 
 * findNearby
 * Finds locations near a  latitude, longitude coordinate within
 * the specified number of meters of that coordinate ordered by proximity
 * @params options
 *   @param lat latitude part of coordinate pair
 *   @param lng longitude part of coordinate pair
 *   @param radius limits results to meter radius of coordinates
 *   @param search the text to search for
 * @param next node callback of form (err, [Venue])
 */
VenueSchema.statics.findNearby = function(options, next) {
  debug('findNearby lat: %d, lng: %d, %dm', options.lat, options.lng, options.meters);

  // check for recent searches  
  VenueSearch.findRecentSearch(options, function(err, search) {

    // if there is a recent search
    if(search) {
      debug('search cache hit');
      Venue.findNearbyFromCache(options, next);
    } 

    // if there isn't a recent search
    else {
      debug('search cache miss');
      Venue.findNearbyFromFoursquare(options, next);
    }

  });
}

/** 
 * findNearbyFromCache
 * Retrieves the venues from the cache
 */
VenueSchema.statics.findNearbyFromCache = function(options, next) {
  debug('querying venue cache');

  var search = { 
    "coord": { 
      "$near" : { 
        "$geometry" : { type: "Point", coordinates: [ options.lng, options.lat ] }, 
        "$maxDistance" : options.meters 
      }
    }
  };

  if(options.search) {
    search.name = new RegExp(options.search, "i");
  }

  this.find(search)
  .limit(50)
  .exec(next);
}

/** 
 * findNearbyFromFoursquare
 * Retrieves the venues from the Foursquare API and 
 * updates the venue cache with the latest info
 */
VenueSchema.statics.findNearbyFromFoursquare = function(options, next) {
  debug('executing foursqaure venue search');
  
  // construct search
  var search = { 
    ll: util.format('%s,%s', options.lat, options.lng),
    limit:  50,
    radius: options.meters,
    query: options.search
  };

  // exceute the foursquare search
  foursquare.venues.search(search, function(err, results) {
    if(err) next(results);
    else {            
      debug('foursquare responded with %s venues', results.response.venues.length);
      VenueSearch.logSearch(options, results.response.venues);
      Venue.upsertVenues(results.response.venues, next);
    }
  });
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
  if(room.venueDefault) {

    room.saveDefault(function(err, room) {
      if(err) next(err);
      else {

        // increment the room count
        venue.update({ $inc: { roomCount: 1 } }, function(err) {
          if(err) next(err);
          else next(null, room);
        });

      }    
    });


  } else {

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
  if(this.defaultRoom) {
    client.defaultRoom = this.defaultRoom.toClient();
  }
  return client;
}


///
/// Helper functions
/// 

/** 
 * Rounds a float to the decimal precision
 */
Math.roundp = function(number, precision) {
  return parseFloat(parseFloat(number).toFixed(precision));
}

///
/// VenueSearch
///

/** 
 * Finds a recent search within the last day
 */
VenueSearchSchema.statics.findRecentSearch = function(options, next) {

  var lng = Math.roundp(options.lng, 4)
    , lat = Math.roundp(options.lat, 4)
    , conditions;

  condition = {
    lng: lng,
    lat: lat,
    search: options.search || null
  }

  this.findOne(condition, function(err, result) {
    var daysAgo = 1
      , pastDate = new Date();

    pastDate.setDate(pastDate.getDate() - 1);

    if(err) next(err);
    else {      
      if(!result || result.updated < pastDate) {
        next(null, null);
      } else {
        next(null, result);
      }
    }
  })

}

/** 
 * Inserts or updates a log entry
 */
VenueSearchSchema.statics.logSearch = function(options, venues) {
  debug('logging venue search');

  var lng = Math.roundp(options.lng, 4) 
    , lat = Math.roundp(options.lat, 4)
    , search = options.search || null
    , condition
    , update
    , options;

  condition = { 
    lng: lng,
    lat: lat,
    search: search
  };

  update = {
    lng: lng,
    lat: lat,
    search: search,
    results: venues.length,
    updated: Date.now(),
    $setOnInsert: { 
      created: Date.now()          
    }     
  };

  options = {
    upsert: true
  };

  this.findOneAndUpdate(condition, update, options, function(err, result) {
    if(err) console.log(err);
  });
}



/**
 * Sort function for venues. 
 * Sorts on a custom algorithm of proximity,
 * days since last message, and number of messages.
 *
 * @param {Number} lat
 * @param {Number} lng
 * @param {[Venue]} venues
 ( @api private)
 */

function sort(lat, lng, venues) {

  var distanceHelper = require('../common/distancehelper')
  , dateHelper = require('../common/datehelper');

  function calculateWeight (proximity, days, messages) {
    var p = proximity
      , d = days
      , m = messages
      , p2 = Math.pow(proximity, 2)      // number of miles squared
      , d2 = Math.pow(days, 2)           // number of days squared
      , m2 = Math.pow(messages, 2)       // number of messages squared
      , pw = 2                           // promixity weight
      , dw = 3                           // days weight
      , mw = 1                           // messages weight
      , pa = 10                          // proximity asymptotic factor
      
      , da = 30                          // days asymptotic factor
      , ma = 2000                        // messasges asymptoptic factor
      ;

    return  ( (pw * (1 - (p2 / (p2 + pa)))) + (dw * (1 - (d2 / (d2 + da)))) + (mw * (m / (m + ma))) ) / (pw + dw + mw);
  }

  function log(results) {
    results.forEach(function(result) {
      debugSort("%d: %dmi, %d days, %d messages: %s", 
        (result.sortWeight * 100).toFixed(2), 
        result.sortProximity.toFixed(2), 
        result.sortDays.toFixed(2), 
        result.sortMessages, 
        result.name);
    })
  }

  function sort(venues) {
    return venues.sort(function(a, b) {
      return b.sortWeight - a.sortWeight;
    });
  }

  venues.forEach(function(item) {
    var proximity = distanceHelper.inMiles(lat, lng, item.coord[1], item.coord[0])
      , days = dateHelper.daysAgo(item.lastMessage ? new Date(item.lastMessage) : new Date(0))
      , messages = item.messageCount;

    item.sortProximity = proximity;
    item.sortDays = days;
    item.sortMessages = messages;
    item.sortWeight = calculateWeight(proximity, days, messages);
  });

  var results = sort(venues);
  log(results);
  return results;
}     


///
/// Create and export the model
///
var Venue = mongoose.model("Venue", VenueSchema);
var VenueSearch = mongoose.model('VenueSearch', VenueSearchSchema);
module.exports = Venue;

