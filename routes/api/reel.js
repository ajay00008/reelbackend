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



// Create Reel
router.post("/",upload.single('video'), auth, async (req, res) => {
    const { text, postType, image } = req.body;
    console.log(req.file)
    try {
      const user = await User.findById(req.user.id).select("-password");
        const newReel = new Post({
          text: text,
          user: req.user.id,
          media: `media/video/${req.file.originalname}`,
          image:image,
          postType: postType,
          mimeType:req.file.mimetype
        });
        const reel = await newReel.save();
        return res.json({ reel, status: 200 });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  });
  


module.exports = router