const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const Post = require("../../models/Posts");
const { check, validationResult } = require("express-validator");
const sendNotifications = require("../../middleware/notifications");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require("fs");
const sendFirebaseNotifications = require("../../middleware/notifications");
const Notification = require("../../models/Notification");


// Create Post
router.post("/", auth, async (req, res) => {
  const { text, postType, location, media, mimeType } = req.body;
  try {
    const user = await User.findById(req.user.id).select("-password");
    const newPost = new Post({
      text: text,
      user: req.user.id,
      media: media,
      postType: postType,
      location: location,
      mimeType: mimeType,
    });
    const post = await newPost.save();
    return res.json({ post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Create Post
router.post("/video", auth, async (req, res) => {
  const { text, postType, location } = req.body;
  try {
    // const inputFileExtension = path.extname(req.file.originalname);
    // const today = new Date();
    // const dateTime = today.toLocaleString();
    // console.log("Saving file to disk...", inputFile);

    // console.log("File saved to disk.");

    // console.log(`Checking input filesize in bytes`);
    // var inputFile = `./media/video/${'mov_'+req.file.originalname}`

    ffmpeg(req.files.video.tempFilePath)
      .output(`./media/video/${req.files.video.name}`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate("500", true)
      .autopad()
      .on("end", async function () {

        // await checkFileSize(`./media/video/${req.file.originalname}`);
        ffmpeg(req.files.video.tempFilePath)
        .screenshots({
          timestamps: ['00:00:02'],
          filename: `${req.files.video.name}_thumbnail.png`,
          folder: './media/thumbnail',
          size: '400x350'
        });
        // fs.unlinkSync(inputFile);

        const newPost = new Post({
          text: text,
          user: req.user.id,
          media: `media/video/${req.files.video.name}`,
          postType: postType,
          location: location,
          mimeType: req.files.video.mimetype,
          thumbnail_url: `media/thumbnail/${req.files.video.name}_thumbnail.png`,
        });
        console.log("Files uploaded successfully.");
        const post = await newPost.save();
        return res.json({ post, status: 200 });
      }).run();

  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Post
router.get("/", auth, async (req, res) => {
  try {
    const post = await Post.find({ postType: "Post" })
      .sort({ date: -1 })
      .populate("user")
      .populate({
        path: "comments.user",
        model: "user",
      });
    return res.json({ post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/user/:id", auth, async (req, res) => {
  try {
    const post = await Post.find({ user: req.params.id })
      .populate("user")
      .populate({
        path: "comments.user",
        model: "user",
      });
    return res.json({ post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Post
router.get("/story", auth, async (req, res) => {
  try {
    const url = baseUrl(req);
    const post = await Post.find({ postType: "Story" })
      .sort({ date: -1 })
      .populate("user");
    var totalRecords = [];
    var j = 0;
    for (i = 0; i < post.length; i++) {
      var index = totalRecords.findIndex(
        (x) => x?.user_id == post[i].user?._id
      );

      if (index > -1) {
        var story_id = post[i]._id;
        var story_image = `${post[i].media}`;
        var newStory = {
          story_id,
          story_image,
        };
        totalRecords[index].stories.push(newStory);
      } else {
        var user_id = post[i].user._id;
        var user_name = post[i].user.username;
        var user_image = post[i].user.media
          ? `${post[i].user.media}`
          : "https://t4.ftcdn.net/jpg/03/59/58/91/360_F_359589186_JDLl8dIWoBNf1iqEkHxhUeeOulx0wOC5.jpg";
        var story_id = post[i]._id;
        var story_image = `${post[i].media}`;
        var newStory = {
          story_id,
          story_image,
        };
        var newObj = {
          user_id,
          user_name,
          user_image,
          stories: [newStory],
        };
        totalRecords[j++] = newObj;
      }
    }

    return res.json({ totalRecords, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get Post By Id
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user');
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }
    return res.json({ post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete Post
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user.toString() !== req.user.id) {
      return res.status(400).json({ msg: "User not authorized" });
    }
    await post.deleteOne();
    return res.json({ msg: "Post Deleted", status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Like Post
router.put("/like/:id", auth, async (req, res) => {
  try {
    var notificationUsers = [];
    const post = await Post.findById(req.params.id).populate("user").populate({
      path: "comments.user",
      model: "user",
    });
    const user = await User.findById(req.user.id).select("-password");
    if (
      post.likes.filter((like) => like.user.toString() == req.user.id).length >
      0
    ) {
      var index = post.likes.indexOf(req.user.id);
      post.likes.splice(index, 1);
      await post.save();
      return res.json({ msg: "Post Unliked", status: 200 });
    } else {
      post.likes.unshift({ user: req.user.id });
      await post.save();
      sendFirebaseNotifications(`${user.firstName} Liked Your Post`, post.user.fcmToken, post?._id.toString(), 'post')
      var userNotification = new Notification({
        message:`${user.firstName} Liked Your Post`,
        post:post?._id,
        user:post?.user?._id,
        otherUser:user?._id,
        type:'post'
      })
      await userNotification.save()
      res.json({ post, status: 200, msg: "Post Liked" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Add Comment
router.post(
  "/comment/:id",
  [auth, [check("text", "text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    var notificationUsers = [];
    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id).populate("user");
      const newComment = {
        text: req.body.text,
        user: req.user.id,
      };

      post.comments.unshift(newComment);
      await post.save();
      sendFirebaseNotifications(`${user.firstName} Commented On Your Post`, post.user.fcmToken, post?._id.toString(), 'post')
      var userNotification = new Notification({
        message:`${user.firstName} Commented On Your Post`,
        post:post?._id,
        user:post?.user?._id,
        otherUser:user?._id,
        type:'post'
      })
      await userNotification.save()
      res.json({ post, status: 200, msg: "Post Liked" });
      res.json({ post, msg: "Comment Added", status: 200 });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// Get Post Comment By Id
router.get("/comment/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate({
      path: "comments.user",
      model: "user",
    });
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }
    var postComments = post?.comments;
    return res.json({ postComments, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete Comment
router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = await post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );
    if (!comment) {
      return res.status(404).json({ msg: "comment not found" });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }
    const removeIndex = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);
    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json({ post, msg: "Comment Deleted", status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
