const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Notification = require("../../models/Notification");

// Get All Notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ date: -1 })
      .populate("user")
      .populate("post")
      .populate('otherUser');
    return res.json({ notifications, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});


router.get("/status", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id, read:false })
      .sort({ date: -1 })
    var notificationsLength = notifications.length
    return res.json({ notificationsLength, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/read", auth, async (req, res) => {
  try {
    let notifications = await Notification.find({ user: req.user.id, read:false })
      .sort({ date: -1 })
      if(notifications.length > 0) {
        notifications.map(val => {
          val.read = true
        })
        await Notification.updateMany({user:req.user.id}, {$set: {read:true}})
        var readNotifications = notifications.filter(x => !x.read)
        var notificationsLength = readNotifications.length

        return res.json({ notificationsLength, status: 200 });
      }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});


module.exports = router;
