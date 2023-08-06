const { Router } = require("express");
const chatMessage = require("../../models/chatMessage");

const router = Router();

router.get("/:id", async (req, res) => {
  const { id } = req.params;
//   console.log(id);
  if (!id) {
    return res.status(422).json({ message: "id is required" });
  }
  try {
    const messages = await chatMessage.find({ roomId: id })
      .populate("sender", "username media _id fcmToken")
      .sort({ date: -1 });
    return res.status(200).json({ messages, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});



module.exports = router;
