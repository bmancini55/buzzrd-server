
// Module dependencies
var mongoose = require('mongoose')
  , debug       = require('debug')('userhistory')
  , Schema = mongoose.Schema;


///
/// Schema definition
///

var UserHistorySchema = new Schema({
  userId: Schema.Types.ObjectId,
  action: String,
  when: { type: Date, default: Date.now },
  objectType: String,
  objectId: String
});



///
/// Create and export the model
///

var model = Venue = mongoose.model("UserHistory", UserHistorySchema);
module.exports = model;
