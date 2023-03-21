const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const Post = require("../../models/Posts");
const { check, validationResult } = require("express-validator");
const uploadImageTos3Bucket = require("../../upload/upload");
const sendNotifications = require('../../middleware/notifications')
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require('multer-s3');
const upload = require("../../middleware/localStorage");
const { baseUrl } = require('../../utils/url');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const genThumbnail = require('simple-thumbnail')
const fs = require("fs");
const path = require("path");
const uploadVideo = require("../../middleware/localVideoStorage");



// Create Reel
router.post("/",uploadVideo.single('video'), auth, async (req, res) => {
    const { text, postType, image } = req.body;
    try {
      // const inputBuffer = req.file.buffer;
      // const inputFileExtension = path.extname(req.file.originalname);
      // const today = new Date();
      // const dateTime = today.toLocaleString();
      // const inputFile = `./media/video/${req.file.originalname}${inputFileExtension}`;
      // console.log("Saving file to disk...", inputFile);
  
      // fs.writeFileSync(inputFile, inputBuffer);
      // console.log("File saved to disk.");

      ffmpeg(req.file.path)
      .output(`./media/video/${'mov_'+req.file.originalname}`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate("500", true)
      .autopad()
      .on("end", async function () {
        fs.unlinkSync(inputFile);
        const user = await User.findById(req.user.id).select("-password");
        const newReel = new Post({
          text: text,
          user: req.user.id,
          media: `media/video/${'mov_'+req.file.originalname}`,
          image:image,
          postType: postType,
          mimeType:req.file.mimetype
        });
        const reel = await newReel.save();
        return res.json({ reel, status: 200 });
      })
  
     
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  });


  // Create Reel
router.post("/post", auth, async (req, res) => {
  const { text, postType, image, video, reelVideo } = req.body;
  try {
    const user = await User.findById(req.user.id).select("-password");
      const newReel = new Post({
        text: text,
        user: req.user.id,
        video: video ? video : null,
        image:image ? image : null,
        reelVideo: reelVideo ? reelVideo : null,
        postType: postType,
      });
      const reel = await newReel.save();
      return res.json({ reel, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

  


module.exports = router