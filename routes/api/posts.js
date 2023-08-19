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
const sendMultipleNotifications = require("../../middleware/notifications");
const Notification = require("../../models/Notification");
const Message = require("../../models/Message");
const {
  storyreplyValidator,
} = require("../../utils/validators/messageValidator");
const {Types} = require('mongoose');


// Create Post
router.post("/", auth, async (req, res) => {
  const { text, postType, location, media, mimeType } = req.body;
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers");
    const newPost = new Post({
      text: text,
      user: req.user.id,
      media: media,
      postType: postType,
      location: location,
      mimeType: mimeType,
    });
    const post = await newPost.save();
    var fcmTokens = user.followers?.map((val) => {
      return val.fcmToken;
    });
    sendMultipleNotifications(
      `${user.firstName} Posted Just Now`,
      fcmTokens,
      post?._id.toString(),
      "post"
    );

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
        ffmpeg(req.files.video.tempFilePath).screenshots({
          timestamps: ["00:00:02"],
          filename: `${req.files.video.name}_thumbnail.png`,
          folder: "./media/thumbnail",
          size: "400x350",
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
      })
      .run();
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Post
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password +savedPosts"
    );
   
    const savedPosts = user.savedPosts;
    const blockedUserIds = user.blockedUsers;
    const blockedBy = user?.blockedBy
    // console.log(savedPosts ,"savv", user)
    // user: { $in: user.following },
    const post = await Post.find({
      postType: "Post",
      _id: { $nin: user.hiddenPost },
      user:{$nin :[...blockedUserIds, ...blockedBy]}
    }).sort({ date: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        model: "user",
      });
    const postsWithSavedStatus = post.map((post) => ({
      ...post.toObject(),
      isSaved: savedPosts.includes(post._id.toString()),
    }));
    return res.json({ post: postsWithSavedStatus, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Post
router.get("/saved", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+savedPosts");
    const savedPosts = user.savedPosts;
    const hiddenPosts = user.hiddenPost;
    // user: { $in: user.following },
    const post = await Post.find({
      postType: "Post",
      _id: { $in: savedPosts, $nin: hiddenPosts },
    })
      .sort({ date: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        model: "user",
      });
    const postsWithSavedStatus = post.map((post) => ({
      ...post.toObject(),
      isSaved: savedPosts.includes(post._id.toString()),
    }));
    return res.json({ post: postsWithSavedStatus, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});
// for test

router.get("/test", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    const posts = await Post.aggregate([
      {
        $match: {
          postType: "Post",
          _id: { $nin: user.hiddenPost },
        },
      },
      {
        $lookup: {
          from: "users", // Assuming the users collection name
          localField: "_id",
          foreignField: "savedPosts",
          as: "savedBy",
        },
      },
      {
        $addFields: {
          isSaved: { $in: [user._id, "$savedBy"] },
        },
      },
      {
        $sort: { date: -1 },
      },
      {
        $unset: "savedBy",
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.user",
          foreignField: "_id",
          as: "comments.user",
        },
      },
    ]);

    return res.json({ posts, status: 200 });
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
  console.log(req.user);
  try {
    const post = await Post.find({ postType: "Story" })
      .sort({ date: -1 })
      .populate("user");
    var totalRecords = [];
    var j = 0;
    for (i = 0; i < post.length; i++) {

      // if(post[i].user ===null){
      //   continue;
      // }
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

router.get("/stories", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const blockedUserIds = user?.blockedUsers
    const blockedBy = user?.blockedBy
    // console.log(userId)
    const allStories = await Post.find({ postType: "Story" ,  
    user:{$nin :[...blockedUserIds, ...blockedBy]}
  })
      .sort({ date: -1 })
      .populate("user");
    // console.log(allStories, "all");
    const otherUserStories = allStories.filter((story) => {
      if(story.user ===null){
        return;
      }
     return  story.user?._id.toString() !== userId;
    });

    var totalRecords = [];
    var j = 0;
    for (i = 0; i < otherUserStories.length; i++) {
      // console.log(totalRecords, "kkkkkk", i);
      var index = totalRecords.findIndex(
        (x) => x?.user_id == otherUserStories[i].user._id.toString()
      );

      if (index > -1) {
        var story_id = otherUserStories[i]._id;
        var story_image = `${otherUserStories[i].media}`;
        var newStory = {
          story_id,
          story_image,
        };
        totalRecords[index].stories.push(newStory);
      } else {
        var user_id = otherUserStories[i].user._id.toString();
        var user_name = otherUserStories[i].user.username;
        var user_image = otherUserStories[i].user.media
          ? `${otherUserStories[i].user.media}`
          : "https://t4.ftcdn.net/jpg/03/59/58/91/360_F_359589186_JDLl8dIWoBNf1iqEkHxhUeeOulx0wOC5.jpg";
        var story_id = otherUserStories[i]._id;
        var story_image = `${otherUserStories[i].media}`;
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

    // Get stories of the login user
    const userStories = await Post.aggregate([
        { $match: { user:new Types.ObjectId(userId), postType: "Story" } },
        { $sort: { date: -1 } },
        {
          $addFields: {
            story_id: "$_id",
            story_image: "$media"
          }
        },
        {
          $project: {
            _id: 0,
            story_id: 1,
            story_image: 1
          }
        }
      ]);
      

    const userData = {
      user_id: user._id,
      user_name: user.username,
      user_image: user.media
        ? `${user.media}`
        : "https://t4.ftcdn.net/jpg/03/59/58/91/360_F_359589186_JDLl8dIWoBNf1iqEkHxhUeeOulx0wOC5.jpg",
      stories: userStories,
    };

    return res.json({ user_data: userData, otherStories: totalRecords});
    // return res.json({ allStories , otherUserStories });
  } catch (err) {
    console.log(err.message, "fetching stories");
    res.status(500).send({ message: "Server Error", success: false });
  }
});

router.post("/storyreply", auth, storyreplyValidator, async (req, res) => {
  const loggedInUserId = req.user?.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.errors[0].msg, success: false });
  }
  const { roomId, reciver, text, messageType, reaction, postId, replyVideo } =
    req.body;

  try {
    const newMessage = new Message({
      roomId: roomId,
      sender: loggedInUserId,
      reciever: reciver,
      message: text ? text : null,
      reaction: reaction ? reaction : null,
      messageType: messageType ? messageType : null,
      post: postId,
      replyVideo: replyVideo ? replyVideo : null,
    });
    // const recUser = await User.findById(reciver);
    // const sendingUser = await User.findById(user);

    await newMessage.save();
    // if (recUser.fcmToken) {
    //   sendFirebaseNotifications(
    //     `${sendingUser.firstName} Sent You A Post`,
    //     recUser.fcmToken,
    //     JSON.stringify(sendingUser),
    //     "chat"
    //   );
    // }
    res.status(200).json({ newMessage, status: 200, success: true });
  } catch (error) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get Post By Id
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("user");
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
  const loggedInUserId =req.user?.id
  try {
    const post = await Post.findById(req.params.id).populate("user").populate({
      path: "comments.user",
      model: "user",
    });
    const user = await User.findById(req.user.id).select("-password");
    if(!post || !user){
      return res.status(404).json({error:'unknown user or post' , msg :`${!post ? 'user':'post'} not found`})
    }
    if (
      post.likes.filter((like) => like.user.toString() == req.user.id).length >
      0
    ) {
      var index = post.likes.indexOf(req.user.id);
      post.likes.splice(index, 1);
      await post.save();
      const oldNotification = await Notification.findOne({
        post: post?._id,
        user: post?.user?._id,
        otherUser: loggedInUserId,
        type:"post"
       })       
      if(oldNotification){
        await Notification.findByIdAndDelete(oldNotification?._id)
       }
      return res.json({ msg: "Post Unliked", status: 200 });
    } else {
      post.likes.unshift({ user: req.user.id });
      await post.save();
      sendFirebaseNotifications(
        `${user.firstName} Liked Your Post`,
        post.user.fcmToken,
        post?._id.toString(),
        "post"
      );
      var userNotification = new Notification({
        message: `${user.firstName} Liked Your Post`,
        post: post?._id,
        user: post?.user?._id,
        otherUser: user?._id,
        type: "post",
      });
      await userNotification.save();
      res.json({ post, status: 200, msg: "Post Liked" });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

//save post
router.put("/save/:id", auth, async (req, res) => {
  const postId = req.params.id;
  const loggedInUserId = req.user?.id;
  try {
    const post = await Post.findById(postId);
    const user = await User.findById(loggedInUserId).select("+savedPosts");
    console.log(user, "user");
    if (!post) {
      return res.status(404).json({ msg: "Post not found", success: false });
    }

    const isSaved = user.savedPosts.includes(post._id);

    if (isSaved) {
      // Unsave the post
      user.savedPosts.pull(post._id);
    } else {
      // Save the post
      user.savedPosts.push(post._id);
    }

    await user.save();

    return res.status(201).json({
      msg: isSaved ? "Post unsaved" : "Post saved",
      status: 200,
      success: true,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
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
      sendFirebaseNotifications(
        `${user.firstName} Commented On Your Post`,
        post.user.fcmToken,
        post?._id.toString(),
        "post"
      );
      var userNotification = new Notification({
        message: `${user.firstName} Commented On Your Post`,
        post: post?._id,
        user: post?.user?._id,
        otherUser: user?._id,
        type: "post",
      });
      await userNotification.save();
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
    const post = await Post.findById(req.params.id)
      .populate({
        path: "comments.user",
        model: "user",
      })
      .populate({
        path: "comments.replies.user",
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

// Add Comment Reply
router.post(
  "/comment/reply/:id",
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
      const newReply = {
        text: req.body.text,
        user: req.user.id,
      };
      post.comments.map((val, index) => {
        if (val._id == req.body.commentId) {
          val.replies.unshift(newReply);
          val.isReplied = true;
        }
      });

      await post.save();
      return res.json({ post, status: 200 });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
