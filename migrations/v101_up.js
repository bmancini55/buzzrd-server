
// add the deviceId column to users
db.users.update(
  {}, 
  { $set: { deviceId: null }}, 
  { multi: true }
);

// create notifications schema
db.createCollection('userrooms');
db.userrooms.ensureIndex({ "userId": 1, "roomId": 1}, { unique: true });

// migrate existing rooms into new structure
db.users.find({ }).forEach(function(user) {
  
  var rooms = user.rooms.forEach(function(room) {
    db.userrooms.insert({    
      userId: user._id,
      roomId: room,
      deviceId: user.deviceId,
      notify: true,
      badgeCount: 0,
      created: new Date(),
      updated: new Date(),
    });
  });    
});