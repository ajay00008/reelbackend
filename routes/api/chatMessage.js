const { Router } = require("express");
const chatMessage = require("../../models/chatMessage");
const User = require("../../models/User");

const router = Router();

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(422).json({ message: "id is required" });
  }
  try {
    const messages = await chatMessage.aggregate([
      { $match: { roomId: id } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          roomId: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            fcmToken: "$user.fcmToken",
            avatar: "$user.media", // Rename "media" to "avatar"
            // subscription:"$user.subscription",
            subscriptionType:"$user.subscriptionType"           
          },
          createdAt:"$date" ,
          text:1,
          type:1,
          image:1,
          video:1,
          reel:1,
          isReelCompleted:1,
          reelVideo:1,
          reelWatch:1
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ messages, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/",  async (req, res) => {
    const loggedInUserId = req.user?.id
    const { roomId, user, text, reel, image, video, isReelCompleted } = req.body;
    if(!roomId){
        return res.status(422).json({message:"roomId is required"})
    }
    try {
      const newMessage = new chatMessage({
        roomId: roomId,
        sender: user,
        image: image ? image : null,
        video: video ? video : null,
        text: text ? text: null,
        reel: reel ? reel : false,
        isReelCompleted: isReelCompleted ? isReelCompleted : false,
      });
      await newMessage.save();
      if(reel) {
        let user = await User.findById(loggedInUserId).select("-password");
        user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25
        await user.save()
      }
      return res.status(201).json({ newMessage, status: 200 });
    } catch (err) {
      console.log(err.message);
      res.status(500).json({message : "Server Error"});
    }
  });
  
  router.post("/watchVideo/:messageId", async (req, res) => {
    const { messageId }= req.params
    const {userId} = req.body
    const loggedInUserId = req.user.id
    if(!userId){
      return res.status(422).json({message:'validation error' , errors :"userId is required", success : false})
    }
    try {
      const user = await User.findById(userId).select("-password");
      if(user?.subscriptionType?.reelCoin < 0.25){
        return res.status(403).json({message:`${user.username || user.firstName || 'unknown'} have not enough reel coins to watch this video` , errors: "NotEnoughCoinsError", success:false})
      }    
      const reelVideoEntry = await chatMessage.findOneAndUpdate(
        {
          _id:messageId,
          "reelWatch.user": { $ne: loggedInUserId }, // Check if user is not in the reelWatch array
        },
        {        
          $push: {
            reelWatch: {
              user:loggedInUserId,
            },
          },
        }, 
        {
          new: true
        }
      );  
      if(!reelVideoEntry){
        return res.status(200).json({message: "The user already seen the video" ,  success:true})
      }    
      user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25;
      await user.save();
      res.status(201).json({reelVideo:reelVideoEntry ,  msg: "Coins Used", status: 200 , success:true , user});
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error");
    }
  });



module.exports = router;
