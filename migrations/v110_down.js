
// add the deviceId column to users
db.users.update(
  {}, 
  { $unset: { deviceId: 1 }},
  { multi: true }
);