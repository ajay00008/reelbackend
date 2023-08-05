const express = require("express");
const router = express.Router();
const chatroom = require("../../models/chatroom");
const upload = require("../../upload/upload");
const fs = require("fs");
const {uploadImage} = require('../../upload/uploadImage')
const { groupValidator } = require("../../utils/validators/groupValidator");
const { validationResult } = require("express-validator");

router.get("/", async (req, res) => {
  try {
    const totalGroups = await chatroom.countDocuments()
    const groups = await chatroom.find({}).populate("members", "username media _id fcmToken")
    .populate("admin", "username media _id fcmToken");
    return res.status(200).json({ groups, totalGroups ,succes:true });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  if (!id) {
    return res.status(422).json({ message: "id is required" });
  }
  try {
    const group = await chatroom.find({ _id: id })
      .populate("members", "username media _id fcmToken")
      .populate("admin", "username media _id fcmToken");
    return res.json({ group, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", groupValidator, async (req, res) => {
  const image = req.files?.image;
  const loggedInUserId = req.user.id;
  const { groupName, members, admin } = req.body;

  console.log(groupName, members, admin, req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.errors[0].msg, success: false });
  }
  try {
    let groupImage =
      "https://www.airscan.org/wp-content/uploads/2023/02/Iconen-website-47-1024x1024.png";
    if (image) {
      const data = await uploadImage(image);
      groupImage = data.Location || "";
    }
    // const data = await resizeAndUploadImage(image);
    const group = new chatroom({
      groupName,
      admin: loggedInUserId,
      members,
      image: groupImage,
      isGroup: true,
    });

    const data = await group.save();

    res.status(201).json({ group: data, success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, success: false });
  }
});

router.put("/", async (req, res) => {
  const image = req.files?.image;
  const { groupId, groupName, members } = req.body;
  const loggedInUserId = req.user.id.toString();
  if(!groupId){
    return res.status(200).json({message:"groupId is required"})
  }
  
  try {
    const group = await chatroom.findById({ _id: groupId });
    if (!group) {
      return res.status(404)
        .json({ message: "no group found", success: false });
    }
    const { admin } = group;

    if (loggedInUserId !== admin) {
      return res.status(404).json({
          message: "only admin have access to update group",
          success: false,
        });
    }

    group.groupName = groupName ? groupName : group.groupName;
    group.members = members ? members : group.members;
    let groupImage = group.image;
    if (image) {
      const data = await uploadImage(image);
      groupImage = data.Location || groupImage;
    }
    group.image = groupImage
    const updateRecords = await group.save();
    res.status(200).json({group: updateRecords, message: "update successfully", success: true});
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, success: false });
  }
});

module.exports = router;
