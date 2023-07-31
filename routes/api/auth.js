const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const aws = require("aws-sdk");
const multer = require("multer");
const Otp = require("../../models/otp");
const { Types } = require("mongoose");
const {
  generateAndHashOTP,
  verifyOTP,
  createJwtToken,
  verifyToken,
  sendMail,
} = require("../../utils/mailer");
const {
  otpValidator,
  passwordMatcherValidator,
} = require("../../utils/validators/forgotValidators");
const Message = require("../../models/Message");
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

// GET USER
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers")
      .populate("following");
    res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Errro");
  }
});

// GET USERS
router.get("/users", async (req, res) => {
  try {
    const user = await User.find().select("-password");
    res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Errro");
  }
});

router.get("/chats", async (req, res) => {
  try {
    // const loggedInUserId = '64c56f0ee396e3a8bc81d29d';
    const loggedInUserId = "64c6699fe396e3a8bc81da4c";

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

router.get("/userchats", async (req, res) => {
  const { limit = 10, page = 1 } = req.query;
 const skip = (page - 1) * limit 
 console.log(limit , page , skip)
  try {
    const loggedInUserId = "64c6699fe396e3a8bc81da4c";
    // const loggedInUserId = '64c56f0ee396e3a8bc81d29d';

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
          as: "recieverinfo",
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
          roomId: {
            $first: "$room_id",
          },
          userId: {
            $first: "$userId",
          },
          userName: {
            $first: "$userName",
          },
          messages: {
            $push: "$lastmessageDetails",
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
      {
        $limit: 10,
      },
      {
        $skip: 0,
      },
    ];
    const [{ chats, totalCount }] = await Message.aggregate(aggregate);
    res.status(200).json({ chats ,  totalCount : totalCount?.count || 0   });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid email or password" }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid email or password" }] });
    }
    const payLoad = {
      user: {
        id: user.id,
      },
    };
    jwt.sign(
      payLoad,
      "mysecrettoken",
      { expiresIn: 36000000 },
      (err, token) => {
        if (err) {
          throw err;
        }
        res.json({ token, status: 200, user });
      }
    );
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

//REGISTER
router.post(
  "/register",
  multerUploadInMemory.single("image"),
  async (req, res) => {
    const { email, password, firstName, lastName, gender, username } = req.body;
    try {
      var userCount = await User.find().count();
      let user = await User.findOne({ email });
      let checkUsername = await User.findOne({ username });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exist" }] });
      } else if (checkUsername) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Username already exist" }] });
      } else {
        // const uploadResult = await S3.upload({
        //   Bucket: "reelmails",
        //   Key: req.file.originalname,
        //   Body: req.file.buffer,
        //   ACL: "public-read",
        //   ContentType: req.file.mimetype,
        // }).promise();

        // if(uploadResult) {
        user = new User({
          email,
          password,
          firstName,
          lastName,
          username,
          profile_no: userCount + 1,
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        const payLoad = {
          user: {
            id: user.id,
          },
        };
        jwt.sign(
          payLoad,
          "mysecrettoken",
          { expiresIn: 36000000 },
          (err, token) => {
            if (err) {
              throw err;
            }
            res.json({ token, status: 200, msg: "User Registered", user });
          }
        );
        // } else {
        //   res.status(500).send("Server error");
        // }
      }
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server error");
    }
  }
);

//Update Device Token
router.post("/update-token", auth, async (req, res) => {
  var { fcmToken } = req.body;
  try {
    var user = await User.findById(req.user.id);
    if (user) {
      user.fcmToken = fcmToken;
    }
    await user.save();
    return res.json({ msg: "Expo Token Updated" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// LOGIN
router.post("/social", async (req, res) => {
  const { email, firstName, lastName } = req.body;
  try {
    var userCount = await User.find().count();
    let user = await User.findOne({ email });
    if (user) {
      const payLoad = {
        user: {
          id: user.id,
        },
      };
      jwt.sign(
        payLoad,
        "mysecrettoken",
        { expiresIn: 36000000 },
        (err, token) => {
          if (err) {
            throw err;
          }
          res.json({ token, status: 200, user });
        }
      );
    } else {
      var randomstring = Math.random().toString(36).slice(-8);
      user = new User({
        email,
        password: randomstring,
        firstName,
        lastName,
        username: firstName + "" + lastName,
        profile_no: userCount + 1,
      });
      await user.save();
      const payLoad = {
        user: {
          id: user.id,
        },
      };
      jwt.sign(
        payLoad,
        "mysecrettoken",
        { expiresIn: 36000000 },
        (err, token) => {
          if (err) {
            throw err;
          }
          res.json({ token, status: 200, msg: "Social User Registered", user });
        }
      );
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

const emailValidator = [
  check("email").exists().withMessage("Email is required"),
  check("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
];

router.post("/forgot", emailValidator, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.errors[0].msg });
  }
  const { email } = req.body;

  try {
    const user = await User.findOne({
      email: { $regex: new RegExp(email, "i") },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "no account register with this email address" });
    }

    const { otp, hashedOTP, expirationTime } = await generateAndHashOTP();

    const mailData = {
      to: email,
      subject: "OTP verification",
      html: `<div style="text-align: center;">
              <p style="color:black">To reset your  password, please use the following One-Time Password (OTP):</p>
              <h3 style="color: red;">${otp}</h1>
            </div>`,
    };
    const newMail = await sendMail(mailData);
    if (!newMail) {
      return res
        .status(200)
        .json({ success: false, message: "email not sent" });
    }

    const result = await Otp.updateOne(
      { email },
      { $set: { otp: hashedOTP, expiresAt: expirationTime } },
      { upsert: true }
    );
    console.log(result, "result");
    return res.status(200).json({
      success: true,
      message: `Otp sent to your email address ${email} please check your inbox`,
    });
  } catch (error) {
    return res.status(422).json({ message: error, success: false });
  }
});

router.post("/verifyotp", otpValidator, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.errors[0].msg });
  }
  const { otp, email } = req.body;
  try {
    const otpData = await Otp.findOne({ email });
    console.log(otpData, "jjj");
    const currentTime = new Date();
    if (!otpData || currentTime > otpData.expiresAt) {
      return res
        .status(401)
        .json({ message: "OTP has expired please request new otp" });
    }

    const otpMatch = await verifyOTP(otp, otpData.otp);
    if (!otpMatch) {
      return res.status(401).json({ message: "Invalid OTP" });
    }
    const payload = {
      user: {
        email,
      },
    };
    const token = await createJwtToken(payload);
    return res
      .status(200)
      .json({ message: "OTP verification successful", forgotToken: token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
});

router.post("/reset", passwordMatcherValidator, async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors?.errors[0].msg });
  }

  try {
    const { user } = await verifyToken(token);
    console.log(user?.email, "emaill");
    const isOtp = await Otp.findOne({ email: user?.email });
    const userInfo = await User.findOne({
      email: { $regex: new RegExp(user?.email, "i") },
    });

    if (!(isOtp && userInfo)) {
      return res.status(404).json({
        message: `${
          !isOtp
            ? "otp not found or expire"
            : "no account linked to given email"
        }`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    userInfo.password = hashedPassword;

    await userInfo.save();
    await Otp.deleteOne({ email: user?.email });
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    if (error.message === "Token has expired") {
      return res.status(401).json({ message: "Token has expired" });
    } else {
      return res.status(403).json({ error: error?.message });
    }
  }
});

module.exports = router;
