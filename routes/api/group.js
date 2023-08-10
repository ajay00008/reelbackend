const express = require("express");
const router = express.Router();
const chatroom = require("../../models/chatroom");
const upload = require("../../upload/upload");
const fs = require("fs");
const { uploadImage } = require("../../upload/uploadImage");
const { groupValidator, leaveValidator } = require("../../utils/validators/groupValidator");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const ObjectId = mongoose.Types.ObjectId;

router.get("/", async (req, res) => {
  const userId = req.user.id;
  try {
    const totalGroups = await chatroom.countDocuments({
      $or: [
        { admin: userId }, // User is the admin
        { members: { $in: [userId] } }, // User is in the members array
      ],
    });
    const groups = await chatroom
      .find({
        $or: [
          { admin: userId }, // User is the admin
          { members: { $in: [userId] } }, // User is in the members array
        ],
      })
      .populate("members", "username media _id fcmToken")
      .populate("admin", "username media _id fcmToken")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ groups, totalGroups, succes: true });
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
    const group = await chatroom
      .find({ _id: id })
      .populate("members", "username media _id fcmToken")
      .populate("admin", "username media _id fcmToken");
    return res.json({ group, status: 200 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

router.post("/", groupValidator, async (req, res) => {
  const loggedInUserId = req.user.id;
  const { groupName, members, admin, image } = req.body;

  // console.log(groupName, members, admin, req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.errors[0].msg, success: false });
  }
  try {
    const userInfo = await User.findById({ _id: loggedInUserId });
    if (!userInfo) {
      return res.status(404).json({ success: false, msg: "user not found" });
    }
    const profileType = userInfo.profileType;
    // console.log(profileType,"pro")
    if (profileType === "business") {
      if (members.length > 20) {
        return res
          .status(200)
          .json({
            success: false,
            errors: "business users can't  add more than 20 members",
            message: "members limit reached",
          });
      }
    } else {
      if (members.length > 5) {
        return res
          .status(200)
          .json({
            success: false,
            errors: "personal users can't  add more than 5 members",
            message: "members limit reached",
          });
      }
    }

    let groupImage =
      "https://www.airscan.org/wp-content/uploads/2023/02/Iconen-website-47-1024x1024.png";
    // const data = await resizeAndUploadImage(image);
    const group = new chatroom({
      groupName,
      admin: loggedInUserId,
      members,
      image: image || groupImage,
      isGroup: true,
    });
    const data = await group.save();
    res.status(201).json({ group: data, success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, success: false });
  }
});

// router.put("/", async (req, res) => {
//   const { groupId, groupName, members, image } = req.body;
//   console.log(image, groupId);
//   const loggedInUserId = req.user.id.toString();
//   if (!groupId) {
//     return res.status(200).json({ message: "groupId is required" });
//   }

//   try {
//     const group = await chatroom.findById({ _id: groupId });
//     if (!group) {
//       return res.status(404)
//         .json({ message: "no group found", success: false });
//     }
//     const { admin } = group;

//     if (loggedInUserId !== admin) {
//       return res.status(404).json({
//         message: "only admin have access to update group",
//         success: false,
//       });
//     }

//     group.groupName = groupName ? groupName : group.groupName;
//     group.image = image ? image : group.image;

//     const existingMembers = [];
//     const newMembers = [];

//     for (const memberId of members) {
//       const memberExists = group.members.includes(memberId);
//       if (memberExists) {
//         existingMembers.push(memberId);
//       } else {
//         newMembers.push(memberId);
//         group.members.push(memberId);
//       }
//     }

//     const updateRecords = await group.save();
//     res.status(200).json({
//       group: updateRecords,
//       existingMembers : existingMembers.length,
//       newMembers : newMembers.length,
//       message: "update successfully",
//       success: true,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ message: error.message, success: false });
//   }
// });

router.put("/", async (req, res) => {
  const { groupId, groupName, members, image } = req.body;
  console.log(image, groupId);
  const loggedInUserId = req.user.id.toString();
  if (!groupId) {
    return res.status(200).json({ message: "groupId is required" });
  }

  try {
    const userInfo = await User.findById({ _id: loggedInUserId });
    if (!userInfo) {
      return res.status(404).json({ success: false, msg: "user not found" });
    }
    const profileType = userInfo.profileType;
    if (profileType === "business") {
      if (members.length > 20) {
        return res
          .status(200)
          .json({
            success: false,
            errors: "business users can't  add more than 20 members",
            message: "members limit reached",
          });
      }
    } else {
      if (members.length > 5) {
        return res
          .status(200)
          .json({
            success: false,
            errors: "personal users can't  add more than 5 members",
            message: "members limit reached",
          });
      }
    }

    const group = await chatroom.findById({ _id: groupId });
    if (!group) {
      return res
        .status(404)
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
    group.image = image ? image : group.image;
    group.members = members ? members : group.members;

    const updateRecords = await group.save();
    res.status(200).json({
      group: updateRecords,
      message: "update successfully",
      success: true,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, success: false });
  }
});

router.post("/leave/:id", auth , leaveValidator  ,  async (req, res) => {
  const { id: memberId } = req.params;
  const {groupId} = req.body
  // console.log(memberId, groupId ,"yeshh");
  const loggedInUserId = req.user.id.toString();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.errors[0].msg, success: false });
  }
  try {
    const userInfo = await User.findById({ _id: loggedInUserId });
    if (!userInfo) {
      return res.status(404).json({ success: false, msg: "user not found" });
    }
  //  console.log(userInfo)
    const group = await chatroom.findById({ _id: groupId });
    if (!group) {
      return res.status(404).json({ message: "no group found", success: false });
    }

    const { members , admin , groupName} = group;
     
    if (!members.includes(memberId) && memberId !==admin) {
      return res.status(400).json({
        message: "You are not a member of this group.",
        success: false,
      });
    }

    if (loggedInUserId !== memberId && admin) {
      return res.status(403).json({
        message: "You can't remove others from the group",
        success: false,
      });
    }

    let updateRecords;
    if(memberId===admin){
      group.admin = group.members[0] || null
      updateRecords = await group.save()
    }  else{
      updateRecords = await chatroom.findOneAndUpdate(
        { _id: groupId },
        { $pull: { members: memberId } },
        { new: true }
      );      
    }

    res.status(200).json({
      group: updateRecords,
      message: `successfully left the ${groupName} group `,
      success: true,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, success: false });
  }
});

module.exports = router;
