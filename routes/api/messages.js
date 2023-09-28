const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const Post = require("../../models/Posts");
const { check, validationResult } = require("express-validator");
const uploadImageTos3Bucket = require("../../upload/upload");
const sendNotifications = require("../../middleware/notifications");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const upload = require("../../middleware/localStorage");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const sendFirebaseNotifications = require("../../middleware/notifications");
const Notification = require("../../models/Notification");

router.get("/:id", auth, async (req, res) => {
  try {
    var messages = await Message.find({ roomId: req.params.id })
      .sort({ date: -1 })
      .populate("reciever")
      .populate("sender").populate("post") ;

    var newMessages = messages.map((val) => {
      return {
        _id: val._id,
        user: val.sender,
        reciver: val.reciever,
        createdAt: val.date,
        text: val.message,
        image: val.image ? val.image : undefined,
        video: val.video ? val.video : val?.replyVideo? val.replyVideo :  undefined,
        reelVideo: val.reelVideo ? val.reelVideo : undefined,
        reel: val.reel,
        messageType: val.messageType,
        isReelCompleted: val.isReelCompleted,
        reaction:val?.reaction,
        messageType:val?.messageType,
        post :val?.post,
        // replyVideo:val?.replyVideo? val.replyVideo : null,
      };
    });

    const transformedUsers = newMessages.map((user) => {
      return {
        user: {
          _id: user.user._id,
          name: user.user.username,
          avatar: `${user.user.media}`,
        },
        reciever: {
          _id: user?.reciver?._id,
          name:user?.reciver?.username,
          avatar:user?.reciver?.media
        },
        createdAt: user.createdAt,
        text: user.text,
        _id: user._id,
        image: user.image ? `${user.image}` : user?.post?.media || null,
        video: user.video ? `${user.video}` : null,
        reelVideo: user.reelVideo ? `${user.reelVideo}` : null,
        reel: user.reel,
        messageType: user.messageType,
        isReelCompleted: user.isReelCompleted,
        reaction:user?.reaction,
        messageType:user?.messageType,
        post :user?.post,
        // replyVideo: user?.replyVideo? user.replyVideo : null,
      };
    });

    return res.json({ transformedUsers, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  console.log("sendmesssage")
  const { roomId, user, reciver, text, reel, image, video, isReelCompleted } = req.body;
  try {
    const newMessage = await new Message({
      roomId: roomId,
      sender: user,
      reciever: reciver,
      image: image ? image : null,
      video: video ? video : null,
      message: text,
      reel: reel ? reel : false,
      isReelCompleted: isReelCompleted ? isReelCompleted : false,
    });
    const recUser = await User.findById(reciver);
    const sendingUser = await User.findById(user);
    await newMessage.save();
    if (recUser.fcmToken) {
     await  sendFirebaseNotifications(
        `${sendingUser.firstName} Sent You A Post`,
        recUser.fcmToken,
        JSON.stringify(sendingUser),
        "chat"
      );
    }
    console.log("heyyy")
    if(reel) {
      let user = await User.findById(req.user.id).select("-password");
      user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25
      await user.save() 
      console.log("innnn")
      var userNotification = new Notification({
        message: `${sendingUser?.username || sender?.firstName} sent a new reel`,
        roomId: roomId,
        user: recUser._id,
        type: "message",
      })
      await userNotification.save()   
    }

    return res.json({ newMessage, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/reelmessage", auth, async (req, res) => {
  const {
    roomId,
    user,
    reciver,
    text,
    reel,
    image,
    isReelCompleted,
    reelVideo,
    video,
  } = req.body;
  try {
    const newMessage = await new Message({
      roomId: roomId,
      sender: user,
      reciever: reciver,
      image: image ? image : null,
      video: video ? video : null,
      reelVideo: reelVideo ? reelVideo : null,
      message: text,
      reel: reel ? reel : false,
      isReelCompleted: isReelCompleted ? isReelCompleted : false,
    });
    const recUser = await User.findById(reciver);
    const sendingUser = await User.findById(user);

    await newMessage.save();
    if (recUser.fcmToken) {
      await sendFirebaseNotifications(
        `${sendingUser.firstName} Sent You A Post`,
        recUser.fcmToken,
        JSON.stringify(sendingUser),
        "chat"
      );
      var userNotification = new Notification({
        message: `${sendingUser?.username || sender?.firstName} sent a new reel`,
        roomId: roomId,
        user: recUser._id,
        type: "message",
      })
      await userNotification.save()  
    }

    return res.json({ newMessage, status: 200 });
  } catch (err) {
    console.log(err, "Err");
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
