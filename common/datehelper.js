
/** 
 * Calcultes the number of days ago the passed in Date object was
 */
exports.daysAgo = function(date) {
  return (Date.now() - date.getTime()) / (1000 * 3600 * 24);
}

/**
 * Returns a new Date based on the supplied date
 */
exports.addDays = function(date, days) {
  var result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}