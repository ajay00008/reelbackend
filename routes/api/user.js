const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const sendNotifications = require("../../middleware/notifications");
const upload = require("../../middleware/localStorage");



//Get Profile By ID
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").populate('followers').populate('following');
    return res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Errro");
  }
});



//Follow Users
router.post("/follow/:id", auth, async (req, res) => {
  try {
    var notificationUsers = [];
    const followerUser = await User.findById(req.params.id).select("-password");
    const followingUser = await User.findById(req.user.id).select("-password");
    followerUser.followers.unshift(req.user.id);
    followingUser.following.unshift(req.params.id);
    await followerUser.save();
    await followingUser.save();
    notificationUsers.push(followerUser.pushToken);
    sendNotifications(
      notificationUsers,
      "Reelmail",
      `${followingUser.firstName} Started Following You`
    );
    return res.json({
      followingUser,
      msg: `You are now following`,
      status: 200,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

//Unfollow Users
router.post("/unfollow/:id", auth, async (req, res) => {
  try {
    const followerUser = await User.findById(req.params.id).select("-password");
    const followingUser = await User.findById(req.user.id).select("-password");
    var index = followingUser.following.indexOf(req.params.id);
    followingUser.following.splice(index, 1);
    await followingUser.save();
    var index = followerUser.followers.indexOf(req.user.id);
    followerUser.followers.splice(index, 1);
    await followerUser.save();
    return res.json({ status: 200, msg: "Unfollowed" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});


//Update User Details
router.post('/update',upload.single('image'),auth, async (req, res) => {
  const { firstName, lastName, description } = req.body
  try {
      var user = await User.findById(req.user.id);
      if (!user) {
          return res.json({ msg: 'No User Found' })
      }
      user.firstName = firstName ? firstName : user.firstName;
      user.lastName = lastName ? lastName : user.lastName;
      user.description = description ? description : user.description;
      user.media = req.file.originalname ? `media/image/${req.file.originalname}` : user.media;
      await user.save();
      return res.json({ msg: "User Updated", user  });

  } catch (err) {
      console.log(err)
      res.status(500).send("Server Error")
  }
})


module.exports = router;
