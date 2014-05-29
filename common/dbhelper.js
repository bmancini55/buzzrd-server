var mongoose      = require('mongoose')
  , configHelper  = require('../common/confighelper')
  , config        = configHelper.env()

  , url = config.mongo.db;

mongoose.connect(url);

mongoose.connection.on('connected', function() {
  console.log('Mongoose connection open to %s', url);
});

mongoose.connection.on('error', function(err) {
  console.log('Mongoose connection error: %s', err);
});

mongoose.connection.on('disconnected', function() {
  console.log('Mongoose disconnected from %s', url);
});

/// 
/// Model extension methods
///

/**
 * convertIds
 * Recursively converts _id to id for the root
 * object and all sub-objects
 * @param Object obj is the object to convert
 */
mongoose.Model.convertIds = function(obj) {
  if(obj instanceof Object) {

    // convert _id
    if(obj instanceof Object && obj._id) {
      obj.id = obj._id;
      delete obj._id;
    }

    // process each property
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        var value = obj[prop];

        // handle items in array
        if(value instanceof Array) {
          value.forEach(function(item) {
            mongoose.Model.convertIds(item);
          })
        }

        // handle other properties
        else {
          mongoose.Model.convertIds(value);
        }
      }
    }
  }
}