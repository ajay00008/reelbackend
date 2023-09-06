const { Types } = require("mongoose");
const { Router } = require("express");
const auth = require("../../middleware/auth");
const Message = require("../../models/Message");

const router = Router();
let dummy = `https://png.pngitem.com/pimgs/s/35-350426_profile-icon-png-default-profile-picture-png-transparent.png`
function processChatEntry(chat, loggedInUserId) {
  const { message } = chat;
  const room_id = message.roomId;
  const _id = message.sender._id.toString() === loggedInUserId ? message.reciever._id : message.sender._id;
  const username = message.sender._id.toString() === loggedInUserId ? message.receiverinfo[0]?.username : message.senderinfo[0]?.username;
  const media = message.sender._id.toString() === loggedInUserId ? message.receiverinfo[0]?.media || dummy : message.senderinfo[0]?.media || dummy;
  const fcmToken = message.sender._id.toString() === loggedInUserId ? message.receiverinfo[0]?.Token || null : message.senderinfo[0]?.fcmToken || null;

  const lastmessageDetails = {
    _id: message._id ,
    sender: {
      id : message.sender,
      username: message.senderinfo[0]?.username || ''
    },
    reciever: {
      id : message.reciever,
      username: message.receiverinfo[0]?.username || ''
    },
    roomId: message.roomId,
    message: message.message,
    typeText :message.message ? true :false,
    video : message.video || '',
    image:message.image || '',
    date: message.date,
    __v: message.__v,
  };
  return { room_id, _id, username, media , fcmToken , lastmessageDetails };
}


router.get("/", auth , async (req, res) => {
  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;
  console.log(limit, page, skip, req.user);
  try {
    const loggedInUserId = req.user.id;
    // const loggedInUserId = '64e0f623f6ebf3e1a1f2cd69';

    if (!loggedInUserId) {
      return res.status(422).json({ message: "please login first" });
    }
    const aggregate = [
      {
        $match: {
          $or: [
            {
              sender: new Types.ObjectId(loggedInUserId),
            },
            {
              reciever: new Types.ObjectId(loggedInUserId),
            },
          ],
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "reciever",
          foreignField: "_id",
          as: "receiverinfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderinfo",
        },
      },
      {
        $project: {
          room_id: "$roomId",
          userId: {
            $cond: [
              {
                $eq: ["$sender", new Types.ObjectId(loggedInUserId)],
              },
              {
                _id: { $arrayElemAt: ["$receiverinfo._id", 0] },
                username: { $arrayElemAt: ["$receiverinfo.username", 0] },
              },
              {
                _id: { $arrayElemAt: ["$senderinfo._id", 0] },
                username: { $arrayElemAt: ["$senderinfo.username", 0] },
              },
            ],
          },
          lastmessageDetails: "$$ROOT",
        },
      },
      {
        $group: {
          _id: "$room_id",
          message: {
            $first: "$lastmessageDetails",
          },
        },
      },
      {
        $facet: {
          chats: [
            {
              $skip: Number(skip),
            },
            {
              $limit: Number(limit),
            }, 
            {
              $sort: {
                "message.date": -1, // Sort by date in descending order
              },
            },        
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      }
    ];

    const [{chats , totalCount}]= await Message.aggregate(aggregate);
    const processedChats = chats.map((chat) =>
      processChatEntry(chat, loggedInUserId)
    );

   return res.status(200)
      .json({chats: processedChats, totalChats: totalCount[0]?.count || 0 });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
