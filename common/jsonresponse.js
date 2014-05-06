
// Creates a uniform Json Response
var JsonResponse = function(err, results) {
  if(err) { 
    this.success = false;
    this.error = err;
    this.results = null;
  } else {
    this.success = true;
    this.error = null;
    this.results = results;
  }
}

module.exports = JsonResponse;