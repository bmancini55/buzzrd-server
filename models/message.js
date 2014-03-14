var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var messageSchema = new Schema({
  message: String,
  room: Schema.Types.ObjectId,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

var messageModel = mongoose.model("Message", messageSchema);

module.exports = messageModel;