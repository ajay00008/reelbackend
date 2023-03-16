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
const { baseUrl } = require("../../utils/url");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const genThumbnail = require("simple-thumbnail");
const { currentBaseUrl } = require("../../utils/activeUrl");

router.get("/:id", auth, async (req, res) => {
  const url = baseUrl(req)
  try {
    var messages = await Message.find({ roomId: req.params.id })
      .sort({ date: -1 })
      .populate("sender");

    var newMessages = messages.map((val) => {
      return {
        _id: val._id,
        user: val.sender,
        createdAt: val.date,
        text: val.message,
        image: val.media ? val.media : undefined,
      };
    });

    const transformedUsers = newMessages.map((user) => {
      return {
        user: {
          _id: user.user._id,
          name: user.user.username,
          avatar: `${url}${user.user.media}`,
        },
        createdAt: user.createdAt,
        text: user.text,
        _id: user._id,
        image: user.image ? `${url}${user.image}` : null,
      };
    });

    return res.json({ transformedUsers, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  const { roomId, user, reciver, text, media } = req.body;
  try {
    const newMessage = await new Message({
      roomId: roomId,
      sender: user,
      reciever: reciver,
      media: media,
      message: text,
    });

    await newMessage.save();

    return res.json({ newMessage, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
