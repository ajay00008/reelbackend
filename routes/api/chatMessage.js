const { Router } = require("express");
const chatMessage = require("../../models/chatMessage");
const User = require("../../models/User");

const router = Router();

router.get("/:id", async (req, res) => {
  const { id } = req.params;
//   console.log(id);
  if (!id) {
    return res.status(422).json({ message: "id is required" });
  }
  try {
    const messages = await chatMessage.find({ roomId: id }).populate("sender", "username media _id fcmToken")
      .sort({ date: -1 });
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
  



module.exports = router;
