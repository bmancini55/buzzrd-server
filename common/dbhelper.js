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
 * toClient
 * Converts the model document into a clean and API friendly 
 * POJO object by removing _id. This method should and can 
 * be overridden by individual models.
 */
mongoose.Model.prototype.toClient = function() {  
  var client = this.toObject({ virtuals: true, minimize: false });
  toClient(client);
  return client;
}

/** 
 * Converts the object to a client
 * @private
 * 
 */
function toClient(obj) {

  // process objects only
  if(obj instanceof Object) {

    // perform conversions    
    convertId(obj);
    stripVersion(obj);

    // process all properties
    recurseProperties(obj);
  }
}

/** 
 * Calls toClient on each property in an object
 */
function recurseProperties(obj) {

  // process each property
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop)) {

      // get the value
      var value = obj[prop];

      // handle items in array
      if(value instanceof Array) {
        value.forEach(function(item) {
          toClient(item);
        })
      }

      // handle other properties
      else {
        toClient(value);
      }
    }
  }
}


/** 
 * Converts an object that has an _id property
 * to use the id property. This will also
 * reorder other properties behind the id property
 * @private
 */
function convertId(obj) {
  if(obj instanceof Object && obj._id) {

    // add id property
    obj.id = obj._id;
    delete obj._id;

    // reorder remaining properties
    for(var prop in obj) {
      if(prop !== 'id') {
        var val = obj[prop];
        delete obj[prop];
        obj[prop] = val;
      }
    }

  }
}

/**
 * Removes the __v value from object
 * @private
 */ 
function stripVersion(obj) {
  delete obj['__v'];
}