const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const {sendFirebaseNotifications }= require("../../middleware/notifications");
const upload = require("../../middleware/localStorage");
const Notification = require("../../models/Notification");
const { Configuration, OpenAIApi } = require("openai");
const Posts = require("../../models/Posts");
const Art = require("../../models/Art");
const { findUserByIdentifier , makeOpenAIRequest } = require("../../utils/helpers");
// console.log(process.env)
const configuration = new Configuration({
  apiKey:process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



//Get Profile By Identifer id or username
router.get("/:identifier",auth , async (req, res) => {
  const {identifier} = req.params;
  try {
    const user = await findUserByIdentifier(identifier);    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({error:"Server Error" , message : err?.message || '' , success:false});
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
  const loggedInUserId = req.user?.id
  try {
    const followerUser = await User.findById(req.params.id).select("-password");
    const followingUser = await User.findById(req.user.id).select("-password");
    // Remove all occurrences of the user ID from the following array
    followingUser.following = followingUser?.following.filter(id => id.toString() !== req.params.id);
    await followingUser.save();

    // Remove all occurrences of the logged-in user's ID from the followers array
    followerUser.followers = followerUser?.followers.filter(id => id.toString() !== req.user.id);
    await followerUser.save();
    
    // Delete all notifications that match the condition
    await Notification.deleteMany({
      user: req.params.id,
      otherUser: loggedInUserId,
      type: "profile"
    });

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
    console.log(req.body ,"image req body")

    const postData = {
      prompt: text,
      n: 1,
      size: "512x512",
    }
    // const response = await openai.createImage(postData);
    const responseData = await makeOpenAIRequest(postData);
    var image_url = responseData.data[0].url;
    console.log(image_url , "image generate")
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
    console.log(req.body ,"req.body")
    const postData = {
      prompt: text,
      n: 1,
      size: "512x512",
    }
    const responseData = await makeOpenAIRequest(postData);
    var image_url = responseData.data[0].url;
    console.log(image_url , "art imageUrl")
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
  console.log(user ,"user")
    if(!user){
      return res.status(200).json({msg:"user not found" ,error:'unknown user', succes:false })
    }
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
  const loggedInUserId = req.user?.id;
  const { id } = req.params;

  try {
    const user = await User.findById(loggedInUserId);
    const userToBlock = await User.findById(id);
      //  console.log(user ,"s", userToBlock)   
    if (!userToBlock) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (userToBlock._id.equals(user._id)) {
      return res.status(400).json({ msg: 'You cannot block/unblock yourself' });
    }

    const isBlocked = user.blockedUsers.includes(userToBlock._id);
    const hasBlockedBy = userToBlock.blockedBy.includes(user._id);

    if (hasBlockedBy) {
      // Unblock the user
      userToBlock.blockedBy.pull(user._id);
    } else if (isBlocked) {
      // Unblocking the user
      user.blockedUsers.pull(userToBlock._id);
    } else {
      // Blocking the user
      user.blockedUsers.push(userToBlock._id);
      userToBlock.blockedBy.push(user._id);
    }

    await user.save();
    await userToBlock.save();

    const action = hasBlockedBy ? 'unblocked' : (isBlocked ? 'unblocked' : 'blocked');
    return res.json({ msg: `User ${action} successfully`, status: 200 });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err?.message });
  }
});



module.exports = router;
