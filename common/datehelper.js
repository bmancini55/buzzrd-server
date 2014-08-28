
/** 
 * Calcultes the number of days ago the passed in Date object was
 */
exports.daysAgo = function(date) {
  return (Date.now() - date.getTime()) / (1000 * 3600 * 24);
}