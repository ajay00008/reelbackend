const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const sendFirebaseNotifications = require("../../middleware/notifications");
const upload = require("../../middleware/localStorage");
const Notification = require("../../models/Notification");
const { Configuration, OpenAIApi } = require("openai");
const Posts = require("../../models/Posts");
const Art = require("../../models/Art");
const configuration = new Configuration({
  apiKey:process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



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
    if (followerUser.fcmToken) {
      sendFirebaseNotifications(`${followingUser.firstName} Started Following You`, followerUser.fcmToken, followerUser._id.toString(), 'profile')
      var userNotification = new Notification({
        message: `${followingUser.firstName} Started Following You`,
        post: null,
        user: followerUser?._id,
        otherUser: followingUser?._id,
        type: 'profile'
      })
      await userNotification.save()
    }

    // sendNotifications(
    //   notificationUsers,
    //   "Reelmail",
    //   `${followingUser.firstName} Started Following You`
    // );
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
router.post('/update', auth, async (req, res) => {
  const { firstName, lastName, description, media, subscription, subType } = req.body
  try {
    var user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ msg: 'No User Found' })
    }
    user.firstName = firstName ? firstName : user.firstName;
    user.lastName = lastName ? lastName : user.lastName;
    user.description = description ? description : user.description;
    user.media = media ? media : user.media;
    user.subscription = subscription ? subscription : user?.subscription
    user.subscriptionType.subType = subType ? subType : user?.subscriptionType?.subType
    await user.save();
    return res.json({ msg: "User Updated", user });

  } catch (err) {
    console.log(err)
    res.status(500).send("Server Error")
  }
})


//Complete Onboarding
router.post('/onboarding', auth, async (req, res) => {
  const { categories } = req.body
  try {
    var user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ msg: 'No User Found' })
    }
    // categories.map(val => {
    //   user.categories.unshift(val)
    // })

    // console.log(categories,'CAT')
    user.isFirstTime = true;
    await user.save();
    return res.json({ msg: "User Updated", user });

  } catch (err) {
    console.log(err)
    res.status(500).send("Server Error")
  }
})


router.post('/image/generate', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const response = await openai.createImage({
      prompt: text,
      n: 1,
      size: "512x512",
    });
    var image_url = response.data.data[0].url;
    const user = await User.findById(req.user.id).select("-password");
    user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25
    console.log(user,'USER')
    await user.save()
    return res.json({ msg: 'IMAGE', image_url })
  } catch (err) {
    console.log(err)
    res.status(500).send("Server Error")
  }
})

//Update User Details
router.post('/block-post', auth, async (req, res) => {
  const { postId } = req.body
  try {
    var user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ msg: 'No User Found' })
    }
    user.hiddenPost.push(postId)
    await user.save();
    return res.json({ msg: "User Updated", user });
  } catch (err) {
    console.log(err)
    res.status(500).send("Server Error")
  }
})


router.delete("/delete", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    await user.deleteOne();
    await Posts.deleteMany({
      user: req.user.id
    })
    return res.json({ msg: "User Deleted", status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/report-user/:id", auth, async (req, res) => {
  try {
    const { reason } = req.body
    const user = await User.findById(req.params.id);
    sendFirebaseNotifications(
      `You have been reported due to ${reason}. Your account will remain active for now but too many reports can cause suspension or deletion`,
      user.fcmToken,
      user?._id.toString(),
      "profile"
    );
    return res.json({ msg: "User Reported", status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post('/art', async(req,res) => {
  try{
    const { email } = req.body
    const user = await Art.findOne({email:email})
    if(user){
      return res.json({msg:'User has already used Art Generator', userExist:true})
    } else {
      var newData = new Art({
        email:email
      })
      await newData.save()
      return res.json({msg:'User Registered', userExist:false})
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
})

router.post('/art/generate', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await openai.createImage({
      prompt: text,
      n: 1,
      size: "512x512",
    });
    var image_url = response.data.data[0].url;
    return res.json({ msg: 'IMAGE', image_url })
  } catch (err) {
    console.log(err)
    res.status(500).send("Server Error")
  }
})

//  blocked
router.get('/actions/blocked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const blockedUsers = await User.find({
      _id: { $in: user.blockedUsers }
    }).select('-password -blockedUsers');

    return res.status(200).json({ blockedUsers, status: 200 });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


router.put('/actions/block/:id', auth, async (req, res) => {
  const loggedInUserId = req.user?.id
  const {id} = req.params
  try {
    const user = await User.findById(loggedInUserId);
    const userToBlock = await User.findById(id);

    if (!userToBlock) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (userToBlock._id.toString() === user._id.toString()) {
      return res.status(400).json({ msg: 'You cannot block/unblock yourself' });
    }

    const isBlocked = user.blockedUsers.includes(userToBlock._id);

    if (isBlocked) {
      // User is blocked, unblock them
      user.blockedUsers.pull(userToBlock._id);
    } else {
      // User is not blocked, block them
      user.blockedUsers.push(userToBlock._id);
    }

    await user.save();

    const action = isBlocked ? 'unblocked' : 'blocked';
    return res.json({ msg: `User ${action} successfully`, status: 200 });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: 'Server Error' , error:err?.message});
  }
});


module.exports = router;
