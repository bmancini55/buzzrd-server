var mongoose = require('mongoose')

  , url = 'mongodb://192.168.0.152/chatapp';

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