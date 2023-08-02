const {Types} = require('mongoose');
const {Router} = require('express');
const auth = require('../../middleware/auth');

const router = Router();

router.get("/",  auth , async (req, res) => {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    console.log(limit, page, skip , req.user);
    try {
    const loggedInUserId = req.user.id;
     if(!loggedInUserId){
        return res.status(422).json({message:"please login first"})
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
          '$addFields': {
            'senderinfo': {
              '$map': {
                'input': '$senderinfo', 
                'as': 'sender', 
                'in': {
                  '_id': '$$sender._id', 
                  'username': '$$sender.username'
                }
              }
            }, 
            'receiverinfo': {
              '$map': {
                'input': '$receiverinfo', 
                'as': 'receiver', 
                'in': {
                  '_id': '$$receiver._id', 
                  'username': '$$receiver.username'
                }
              }
            }
          }
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
                  $arrayElemAt: ["$recieverinfo._id", 0],
                },
                "$sender",
              ],
            },
            userName: {
              $cond: [
                {
                  $eq: ["$sender", new Types.ObjectId(loggedInUserId)],
                },
                {
                  $arrayElemAt: ["$recieverinfo.username", 0],
                },
                "$senderinfo.username",
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
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$totalCount",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];
      const [{ chats, totalCount }] = await Message.aggregate(aggregate);
      res.status(200).json({ chats, totalCount: totalCount?.count || 0 });
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server Error");
    }
  });
  

  module.exports = router;