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
const fs = require("fs");
const path = require("path");
const uploadVideo = require("../../middleware/localVideoStorage");



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
        image: val.image ? val.image : undefined,
        video: val.video ? val.video : undefined,
        reelVideo: val.reelVideo ? val.reelVideo : undefined,
        reel:val.reel,
        messageType:val.messageType,
        isReelCompleted:val.isReelCompleted
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
        video: user.video ? `${url}${user.video}` : null,
        reelVideo: user.reelVideo ? `${url}${user.reelVideo}` : null,
        reel: user.reel,
        messageType:user.messageType,
        isReelCompleted:user.isReelCompleted
      };
    });

    return res.json({ transformedUsers, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", auth, async (req, res) => {
  const { roomId, user, reciver, text, reel, image, video, isReelCompleted } = req.body;
  try {
    const newMessage = await new Message({
      roomId: roomId,
      sender: user,
      reciever: reciver,
      image: image ? image: null,
      video:video ? video : null,
      message: text,
      reel:reel ? reel : false,
      isReelCompleted:isReelCompleted ? isReelCompleted :false
    });

    await newMessage.save();

    return res.json({ newMessage, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});


router.post("/reelmessage", auth, async (req, res) => {
  const { roomId, user, reciver, text, reel, image, isReelCompleted, reelVideo } = req.body;
  try {
    // const inputBuffer = req.file.buffer;
    // const inputFileExtension = path.extname(req.file.originalname);
    // const today = new Date();
    // const dateTime = today.toLocaleString();
    // const inputFile = `./media/video/${req.file.originalname}${inputFileExtension}`;
    // console.log("Saving file to disk...", inputFile);

    // fs.writeFileSync(inputFile, inputBuffer);
    // console.log("File saved to disk.");

    // console.log(`Checking input filesize in bytes`);
      ffmpeg(req.files.video.tempFilePath)
      .output(`./media/video/${req.files.video.name}`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate("500", true)
      .autopad()
      .on("end", async function () {
        // fs.unlinkSync(req.file.path);
        const newMessage = await new Message({
          roomId: roomId,
          sender: user,
          reciever: reciver,
          image: image ? image: null,
          video: `media/video/${req.files.video.name}`,
          reelVideo: reelVideo ? reelVideo : null,
          message: text,
          reel:reel ? reel : false,
          isReelCompleted:isReelCompleted ? isReelCompleted :false
        });
    
        console.log(newMessage,'New Message')
    
        await newMessage.save();
    
        return res.json({ newMessage, status: 200 });
      }).run()


    
  } catch (err) {
    console.log(err,'Err')
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
