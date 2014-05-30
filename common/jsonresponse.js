var util = require('util')  
  , NODE_ENV = process.env.NODE_ENV || 'development';

// Creates a uniform Json Response
var JsonResponse = function(err, results) {
  if(err) {
    this.success = false;
    this.error = err;
    this.results = null;

    // customize error for error types
    if(util.isError(err)) {
      this.error = {
        message: err.message,
        type: err.type,
        arguments: err.arguments
      };
      if(NODE_ENV === 'development') {
        this.error.stack = err.stack;
      }
    }    

  } else {
    this.success = true;
    this.error = null;
    this.results = results;
  }
}

module.exports = JsonResponse;