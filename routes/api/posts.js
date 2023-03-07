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

const multerMemoryStorage = multer.memoryStorage();
const multerUploadInMemory = multer({
  storage: multerMemoryStorage,
});

aws.config.update({
  credentials: {
    accessKeyId: "AKIAXKJA67ZDLQXTQDET",
    secretAccessKey: "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",
    region: "us-east-1",
  },
});

const S3 = new aws.S3({});


// Create Post
router.post("/",multerUploadInMemory.single("image"), auth, async (req, res) => {
  const { text, postType, location } = req.files;
  try {
    const user = await User.findById(req.user.id).select("-password");
    const image = await S3.upload({
      Bucket: "reelmails",
      Key: req.file.originalname,
      Body: req.file.buffer,
      ACL: "public-read",
      ContentType: req.file.mimetype,
    }).promise();
    if (image) {
      const newPost = new Post({
        text: text,
        user: req.user.id,
        media: image.Location,
        postType: postType,
        location:location
      });
      const post = await newPost.save();
      return res.json({ post, status: 200 });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get All Post
router.get("/", auth, async (req, res) => {
  try {
    const post = await Post.find().sort({ date: -1 });
    return res.json({ post, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Get Post By Id
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
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
    var notificationUsers = []
    const post = await Post.findById(req.params.id).populate('user');
    const user = await User.findById(req.user.id).select("-password")
    if (post.likes.filter((like) => like.user.toString() == req.user.id).length > 0) {
        var index = post.likes.indexOf(req.user.id)
        post.likes.splice(index,1)
        await post.save();
        return res.status(400).json({msg:'Post Unliked', status:200});
    } else {
        post.likes.unshift({ user: req.user.id });
        await post.save();
        notificationUsers.push(post.user.pushToken)
        sendNotifications(notificationUsers, 'Reelmail', `${user.firstName} Liked Your Post`)
        res.json({post, status:200, msg:'Post Liked'});
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// Add Comment
router.post("/comment/:id",[auth,[
    check('text','text is required').not().isEmpty()
]],async(req,res)=>{
    const errors = validationResult(req)
    if(!errors.isEmpty()){
       return res.status(400).json({errors:errors.array()})
    }
    var notificationUsers = []
    try{
    const user = await User.findById(req.user.id).select('-password')
    const post = await Post.findById(req.params.id).populate('user');
    const newComment = {
        text: req.body.text,
        user: req.user.id
    }

    post.comments.unshift(newComment)
    await post.save()
    notificationUsers.push(post.user.pushToken)
    sendNotifications(notificationUsers, 'Reelmail', `${user.firstName} Commented On Your Post`)

    res.json({post, msg:'Comment Added', status:200})

    }catch(err){
        console.log(err.message)
        res.status(500).send("Server Error")
    }
})


// Delete Comment
router.delete("/comment/:id/:comment_id",auth,async(req,res)=>{
    try{
    const post = await Post.findById(req.params.id)
    const comment = await post.comments.find(comment => comment.id === req.params.comment_id)
    if(!comment){
        return res.status(404).json({msg:'comment not found'})
    }
    if(comment.user.toString() !== req.user.id){
        return res.status(401).json({msg:'user not authorized'})
    }
    const removeIndex = post.comments.map(comment=>comment.user.toString()).indexOf(req.user.id)
    post.comments.splice(removeIndex,1)
    await post.save()
    res.json({post, msg:'Comment Deleted', status:200})
    } catch(err){
        console.log(err.message)
        res.status(500).send("Server Error")
    }
    
})

module.exports = router;
