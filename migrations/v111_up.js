

// remove deviceId and badgeCount from userroom
// since it is now in notification
db.userrooms.update(
  {}, 
  {
    $unset: {
      deviceId: '',
      badgeCount: ''
    }
  },
  { multi: true }
)


