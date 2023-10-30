const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const Post = require("../../models/Posts");
const { check, validationResult } = require("express-validator");
// const sendNotifications = require("../../middleware/notifications");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require("fs");
// const sendFirebaseNotifications = require("../../middleware/notifications");
const {
  sendMultipleNotifications,
  sendFirebaseNotifications,
  sendNotifications,
} = require("../../middleware/notifications");
const Notification = require("../../models/Notification");
const Message = require("../../models/Message");
const {
  storyreplyValidator,
} = require("../../utils/validators/messageValidator");
const { Types } = require("mongoose");
const { findUserByIdentifier } = require("../../utils/helpers");
const { rateLimit } = require("express-rate-limit");
const ip = require("express-ip");
const { sendVideoWatchedMail } = require("../../utils/mailer");

// Create Post
router.post("/", auth, async (req, res) => {
  const { text, postType, location, media, mimeType , isReelMail } = req.body;
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
      isReelMail: isReelMail,
    });
    const post = await newPost.save();

    // deduct 0.25 RGC for post Creation
    if (isReelMail && user?.subscriptionType?.reelCoin > 0.25) {
      user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25;
      await user.save();
    }

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

router.get("/watchVideo/:postId", auth, async (req, res) => {
  const { postId } = req.params;
  const loggedInUserId = req.user?.id;

  try {
    const post = await Post.findById(postId)
      .populate({
        path: "user",
        select: "username email subscriptionType firstName fcmToken",
      })
      .exec();
    if (!post || !post.user?._id) {
      return res.status(404).json({
        message: !post ? "unknown Post" : "unknown User",
        success: false,
      });
    }
    if (!post.isReelMail) {
      return res.status(422).json({
        error: "unknown post",
        message: "only reelMail video can watch",
        success: false,
      });
    }
    const user = post?.user;
    const loggedInUserInfo = await User.findById(loggedInUserId).select(
      "-password"
    );

    if (user?.subscriptionType?.reelCoin < 1) {
      return res.status(403).json({
        message: `${
          user.username || user.firstName || "unknown"
        } have not enough reel coins to watch this video`,
        errors: "NotEnoughCoinsError",
        success: false,
      });
    }

    if (loggedInUserInfo?._id.toString() === user?._id?.toString()) {
      return res.status(200).json({
        success: true,
        message: "user will not earn coin by watching his own reelMail posts",
      });
    }

    const postReelEntry = await Post.findOneAndUpdate(
      {
        _id: postId,
        "reelWatch.user": { $ne: loggedInUserId }, // Check if user is not in this array of users who watched this post
      },
      {
        $push: {
          reelWatch: {
            user: loggedInUserId,
          },
        },
      },
      {
        new: true,
      }
    );
    if (!postReelEntry) {
      return res.status(200).json({
        message: "The user already seen the video",
        success: true,
      });
    }

    //reel watcher will earn 1RGC and the owner of post will deduct coins per watch
    user.subscriptionType.reelCoin = user?.subscriptionType?.reelCoin - 1;
    loggedInUserInfo.subscriptionType.reelCoin =
      loggedInUserInfo?.subscriptionType?.reelCoin + 1;

    await Promise.all([user.save(), loggedInUserInfo.save()]);

    await sendVideoWatchedMail({email:user.email , username:loggedInUserInfo?.username ?? loggedInUserInfo?.firstName})
    console.log(user.fcmToken ,"FCCmm")
    await sendFirebaseNotifications(
      `${loggedInUserInfo?.username || loggedInUserInfo?.firstName} watched your reel From feed`,
       user.fcmToken,
       JSON.stringify(postReelEntry),
       'post'
        )
    var userNotification = new Notification({
      message: `${loggedInUserInfo?.username || loggedInUserInfo?.firstName} watched your reel from feed`,
      post: postId,
      user: user._id,
      type: "post",
      otherUser:loggedInUserId
    })
    await userNotification.save()
    res.status(201)
      .json({ message: "1RGC coin Earned", status: 200, success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ errors: "Server error", success: false });
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
  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;
  try {
    const user = await User.findById(req.user.id).select(
      "-password +savedPosts"
    );
    if (!user) {
      return res.status(404).json({
        msg: "user not found",
        errors: "unknown user",
        success: false,
      });
    }
    const savedPosts = user.savedPosts;
    const blockedUserIds = user.blockedUsers;
    const blockedBy = user?.blockedBy;
    // console.log(savedPosts ,"savv", user)
    // user: { $in: user.following },

    const query = {
      postType: "Post",
      _id: { $nin: user.hiddenPost },
      user: { $nin: [...blockedUserIds, ...blockedBy] },
    };

    const totalPosts = await Post.countDocuments(query);

    const totalPages = Math.ceil(totalPosts / limit); // Corrected calculation

    const post = await Post.find(query)
      .sort({ date: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        model: "user",
      })
      .skip(skip)
      .limit(limit);

    const postsWithSavedStatus = post.map((post) => ({
      ...post.toObject(),
      isSaved: savedPosts.includes(post._id.toString()),
    }));
    return res.json({
      post: postsWithSavedStatus,
      status: 200,
      totalPosts,
      totalPages,
      currentPage: page,
    });
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

router.get("/user/:id", auth, async (req, res) => {
  try {
    const user = await findUserByIdentifier(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: "unknown user",
        message: "User not found",
        success: false,
      });
    }

    const post = await Post.find({ user: user._id }).populate("user").populate({
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
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const blockedUserIds = user?.blockedUsers;
    const blockedBy = user?.blockedBy;
    // console.log(userId)
    const allStories = await Post.find({
      postType: "Story",
      user: { $nin: [...blockedUserIds, ...blockedBy] },
      date: { $gte: twentyFourHoursAgo },
    })
      // .sort({ date: -1 })
      .populate("user")
      .populate({
        path: "views.user", // Populate the "views.user" field
        select: "_id media username", // Include only the user's ID
      });

    // console.log(allStories, "all");
    const otherUserStories = allStories.filter((story) => {
      if (story.user === null) {
        return;
      }
      return story.user?._id.toString() !== userId;
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
        var views = otherUserStories[i].views;
        var date = otherUserStories[i].date;
        let isViewed = false;
        if (views?.length) {
          const viewedByUser = otherUserStories[i]?.views.find(
            (view) => view.user?._id.toString() == userId.toString()
          );
          if (viewedByUser) {
            isViewed = true;
          }
        }
        var newStory = {
          story_id,
          story_image,
          views,
          isViewed,
          date,
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
        var views = otherUserStories[i].views;
        var date = otherUserStories[i].date;

        let isViewed = false;
        if (views?.length) {
          const viewedByUser = otherUserStories[i]?.views.find(
            (view) => view.user?._id.toString() == userId.toString()
          );
          if (viewedByUser) {
            isViewed = true;
          }
        }
        var newStory = {
          story_id,
          story_image,
          views,
          isViewed,
          date,
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
      {
        $match: {
          user: new Types.ObjectId(userId),
          postType: "Story",
          date: { $gte: twentyFourHoursAgo },
        },
      },
      // { $sort: { date: -1 } },
      {
        $addFields: {
          story_id: "$_id",
          story_image: "$media",
        },
      },
      {
        $project: {
          _id: 0,
          story_id: 1,
          story_image: 1,
          views: 1,
          date: 1,
        },
      },
    ]);
    await Post.populate(userStories, {
      path: "views.user",
      model: "user",
      select: "_id media username", // Include only the user's ID
    });
    // Add a flag isViewed to each story in the userStories array
    userStories.forEach((story) => {
      story.isViewed = !!story.views.find(
        (view) => view.user?._id.toString() === userId.toString()
      );
    });

    // Check if all stories are viewed
    const isAllViewed = userStories.every((story) => story.isViewed);

    const userData = {
      user_id: user._id,
      user_name: user.username,
      user_image: user.media
        ? `${user.media}`
        : "https://t4.ftcdn.net/jpg/03/59/58/91/360_F_359589186_JDLl8dIWoBNf1iqEkHxhUeeOulx0wOC5.jpg",
      stories: userStories,
      isAllViewed,
    };

    // Add a flag isAllViewed to each user's stories to check if all their stories are viewed
    for (let i = 0; i < totalRecords.length; i++) {
      let isAllViewed = totalRecords[i].stories.every(
        (story) => story.isViewed
      );
      totalRecords[i].isAllViewed = isAllViewed;
    }

    // Sort the totalRecords array so that users with all stories viewed come last
    totalRecords.sort((a, b) => {
      if (a.isAllViewed && !b.isAllViewed) return 1; // Move users with all stories viewed to the end
      if (!a.isAllViewed && b.isAllViewed) return -1; // Move users with unviewed stories to the front
      return 0;
    });

    return res.json({ user_data: userData, otherStories: totalRecords });
    // return res.json({ allStories , otherUserStories });
  } catch (err) {
    console.log(err.message, "fetching stories");
    res.status(500).send({ message: "Server Error", success: false });
  }
});

const storyViewLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 1, // Limit to 1 request
  keyGenerator: (req) => {
    // Use the user's ID for rate limiting (assuming you have access to req.user)
    if (req.user && req.user.id) {
      return `${req.user.id}-${req.params.postId}`;
    } else {
      // If the user is not authenticated or doesn't have an ID, rate limit based on IP
      return `${req.ip}-${req.params.postId}`;
    }
  },
  message: { message: "Story viewed Successfully", success: true },
  statusCode: 200,
});

router.use(ip().getIpInfoMiddleware);
// Route to mark a story as viewed
router.get(
  "/stories/:postId/view",
  auth,
  storyViewLimiter,
  async (req, res) => {
    const loggedInUserId = req.user.id;
    const postId = req.params.postId;
    try {
      // Check if the user has already viewed the story within the last X minutes (adjust the time frame as needed)
      const post = await Post.findOne({
        _id: postId,
        views: {
          $elemMatch: {
            user: loggedInUserId,
          },
        },
      });

      if (post) {
        return res
          .status(200)
          .json({ message: "Story already viewed by this user" });
      }

      // Add the user to the views array
      await Post.findByIdAndUpdate(
        postId,
        { $push: { views: { user: loggedInUserId } } },
        { new: true }
      );

      res
        .status(201)
        .json({ message: "Story viewed successfully", success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/userStory/:id", auth, async (req, res) => {
  const userId = req.params.id || "";
  try {
    const user = await findUserByIdentifier(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userStories = await Post.aggregate([
      { $match: { user: new Types.ObjectId(user._id), postType: "Story" } },
      { $sort: { date: -1 } },
      {
        $addFields: {
          story_id: "$_id",
          story_image: "$media",
        },
      },
      {
        $project: {
          _id: 0,
          story_id: 1,
          story_image: 1,
          views: 1,
        },
      },
    ]);

    const userData = {
      user_id: user._id,
      user_name: user.username,
      user_image: user.media
        ? `${user.media}`
        : "https://t4.ftcdn.net/jpg/03/59/58/91/360_F_359589186_JDLl8dIWoBNf1iqEkHxhUeeOulx0wOC5.jpg",
      stories: userStories,
    };
    return res.json({ userStories: userData, success: true });
  } catch (error) {
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
  const loggedInUserId = req.user?.id;
  try {
    const post = await Post.findById(req.params.id).populate("user").populate({
      path: "comments.user",
      model: "user",
    });
    const user = await User.findById(req.user.id).select("-password");
    const postUserId = post?.user?._id?.toString();

    if (!post || !user) {
      return res.status(404).json({
        error: "unknown user or post",
        msg: `${!post ? "user" : "post"} not found`,
      });
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
        type: "post",
      });
      if (oldNotification) {
        await Notification.findByIdAndDelete(oldNotification?._id);
      }
      return res.json({ msg: "Post Unliked", status: 200 });
    } else {
      post.likes.unshift({ user: req.user.id });
      await post.save();
      if (loggedInUserId !== postUserId) {
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
      }
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
    const loggedInUserId = req.user?.id;
    var notificationUsers = [];
    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id).populate("user");
      const newComment = {
        text: req.body.text,
        user: req.user.id,
      };
      const postUserId = post?.user?._id?.toString();
      post.comments.unshift(newComment);
      await post.save();

      if (loggedInUserId !== postUserId) {
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
      }
      return res.json({ post, msg: "Comment Added", status: 200 });
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
