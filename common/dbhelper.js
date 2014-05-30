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
  convertIds(client);
  return client;
}


/**
 * convertIds
 * Recursively converts _id to id for the root
 * object and all sub-objects
 * @param Object obj is the object to convert
 */
function convertIds(obj) {
  if(obj instanceof Object) {

    // convert _id
    if(obj instanceof Object && obj._id) {
      convertId(obj);    
    }

    // process each property
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        var value = obj[prop];

        // handle items in array
        if(value instanceof Array) {
          value.forEach(function(item) {
            convertIds(item);
          })
        }

        // handle other properties
        else {
          convertIds(value);
        }
      }
    }
  }
}

/** 
 * convertId
 * Converts an object that has an _id property
 * to use the id property. This will also
 * reorder other properties behind the id property
 */
function convertId(obj) {
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