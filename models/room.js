var mongoose = require("mongoose")
  , Schema = mongoose.Schema;

var roomSchema = new Schema({
  name: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  lon: Number,
  lat: Number
});

var roomModel = mongoose.model('Room', roomSchema);

module.exports = roomModel;