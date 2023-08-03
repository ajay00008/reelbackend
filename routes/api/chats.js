const {Types} = require('mongoose');
const {Router} = require('express');
const auth = require('../../middleware/auth');
const Message = require('../../models/Message');

const router = Router();

// router.get("/",  auth , async (req, res) => {
//     const { limit = 10, page = 1 } = req.query;
//     const skip = (page - 1) * limit;
//     console.log(limit, page, skip , req.user);
//     try {
//     const loggedInUserId = req.user.id;
//      if(!loggedInUserId){
//         return res.status(422).json({message:"please login first"})
//      }
//       const aggregate = [
//         {
//           $match: {
//             $or: [
//               {
//                 sender: new Types.ObjectId(loggedInUserId),
//               },
//               {
//                 reciever: new Types.ObjectId(loggedInUserId),
//               },
//             ],
//           },
//         },
//         {
//           $sort: {
//             date: -1,
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "reciever",
//             foreignField: "_id",
//             as: "receiverinfo",
//           },
//         },
//         {
//           $lookup: {
//             from: "users",
//             localField: "sender",
//             foreignField: "_id",
//             as: "senderinfo",
//           },
//         },
//         {
//           '$addFields': {
//             'senderinfo': {
//               '$map': {
//                 'input': '$senderinfo', 
//                 'as': 'sender', 
//                 'in': {
//                   '_id': '$$sender._id', 
//                   'username': '$$sender.username'
//                 }
//               }
//             }, 
//             'receiverinfo': {
//               '$map': {
//                 'input': '$receiverinfo', 
//                 'as': 'receiver', 
//                 'in': {
//                   '_id': '$$receiver._id', 
//                   'username': '$$receiver.username'
//                 }
//               }
//             }
//           }
//         },
//         {
//           $project: {
//             $project: {
//               room_id: "$roomId",
//               userId: {
//                 $cond: [
//                   {
//                     $eq: ["$sender", new Types.ObjectId(loggedInUserId)],
//                   },
//                   {
//                     _id: { $arrayElemAt: ["$receiverinfo._id", 0] },
//                     username: { $arrayElemAt: ["$receiverinfo.username", 0] },
//                   },
//                   {
//                     _id: { $arrayElemAt: ["$senderinfo._id", 0] },
//                     username: { $arrayElemAt: ["$senderinfo.username", 0] },
//                   },
//                 ],
//               },
//               lastmessageDetails: "$$ROOT",
//             },
//           },
//         },
//         {
//           $group: {
//             _id: "$room_id",
//             message: {
//               $first: "$lastmessageDetails",
//             },
//           },
//         },
//         {
//           $facet: {
//             chats: [
//               {
//                 $skip: Number(skip),
//               },
//               {
//                 $limit: Number(limit),
//               },
//             ],
//             totalCount: [
//               {
//                 $count: "count",
//               },
//             ],
//           },
//         },
//         {
//           $unwind: {
//             path: "$totalCount",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//       ];
//       const [{ chats, totalCount }] = await Message.aggregate(aggregate);
//       res.status(200).json({ chats, totalCount: totalCount?.count || 0 });
//     } catch (err) {
//       console.log(err.message);
//       res.status(500).send("Server Error");
//     }
//   });
  


  router.get("/", auth , async (req, res) => {
    try {
      // const loggedInUserId = '64c56f0ee396e3a8bc81d29d';
      // const loggedInUserId = "64c6699fe396e3a8bc81da4c";
      const loggedInUserId = req.user.id
  
      const messages = await Message.find({
        $or: [{ sender: loggedInUserId }, { reciever: loggedInUserId }],
      })
        .sort({ date: -1 })
        .populate("sender reciever", "_id username")
        .select("-reel -isReelCompleted"); // Populate 'sender' and 'reciever' with '_id' and 'name'
  
      const groupedChats = messages.reduce((grouped, message) => {
        const roomId = message.roomId;
        if (!grouped[roomId]) {
          grouped[roomId] = [];
        }
        grouped[roomId].push(message);
        return grouped;
      }, {});
  
      const chatGroups = Object.entries(groupedChats).map(
        ([roomId, messages]) => {
          const otherUser =
            messages[0]?.sender?._id.toString() === loggedInUserId
              ? messages[0].reciever
              : messages[0].sender;
          const otherUserName = otherUser?.username || "unknown User";
          const otherUserId = otherUser?._id || "unknown";
  
          return {
            room_id: roomId,
            userId: otherUserId,
            userName: otherUserName,
            lastmessageDetails: messages[0],
          };
        }
      );
  
      res.status(200).json({ chats: chatGroups, lenght: chatGroups.length });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  });
  

  module.exports = router;