
// add the deviceId column to users
db.users.update(
  {}, 
  { $set: { deviceId: null }}, 
  { multi: true }
);