const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult, body } = require("express-validator");
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
  emailVerify,
} = require("../../utils/mailer");
const {
  otpValidator,
  passwordMatcherValidator,
} = require("../../utils/validators/forgotValidators");
const Message = require("../../models/Message");
const {
  signupValidator,
  loginValidator,
} = require("../../utils/validators/loginValidator");
const Categories = require("../../models/Categories");
const multerMemoryStorage = multer.memoryStorage();
const multerUploadInMemory = multer({
  storage: multerMemoryStorage,
});

aws.config.update({
  useAccelerateEndpoint: true,
  credentials: {
    accessKeyId: "AKIAXKJA67ZDLQXTQDET",
    secretAccessKey: "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",
    region: "us-east-2",
  },
});

let S3 = new aws.S3();
const { PhoneNumberUtil } = require("google-libphonenumber");
const phoneUtil = PhoneNumberUtil.getInstance();

// const S3 = new aws.S3({});

// categ
function isValidPhoneNumberForCountry(phoneNumber, expectedCountry) {
  try {
    const parsedNumber = phoneUtil.parseAndKeepRawInput(
      phoneNumber,
      expectedCountry
    );
    return phoneUtil.isValidNumberForRegion(parsedNumber, expectedCountry);
  } catch (error) {
    return false;
  }
}

router.post(
  "/image",
  // multerUploadInMemory.single("image"),
  async (req, res) => {
    try {
      const uploadResult = await S3.upload({
        Bucket: "reelmails",
        Key: req.file.image,
        Body: req.file.buffer,
        ACL: "public-read",
        ContentType: req.file.mimetype,
      });
      res.status(200).json({ uploadResult });
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server Errro");
    }
  }
);

router.get("/categories", async (req, res) => {
  try {
    const categories = await Categories.find({});
    res.status(200).json({ categories });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Errro");
  }
});

// GET USER
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password +savedPosts")
      .populate("savedPosts")
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

// router.get("/chats", async (req, res) => {
//   try {
//     // const loggedInUserId = '64c56f0ee396e3a8bc81d29d';
//     const loggedInUserId = "64c6699fe396e3a8bc81da4c";

//     const messages = await Message.find({
//       $or: [{ sender: loggedInUserId }, { reciever: loggedInUserId }],
//     })
//       .sort({ date: -1 })
//       .populate("sender reciever", "_id username")
//       .select("-reel -isReelCompleted"); // Populate 'sender' and 'reciever' with '_id' and 'name'

//     const groupedChats = messages.reduce((grouped, message) => {
//       const roomId = message.roomId;
//       if (!grouped[roomId]) {
//         grouped[roomId] = [];
//       }
//       grouped[roomId].push(message);
//       return grouped;
//     }, {});

//     const chatGroups = Object.entries(groupedChats).map(
//       ([roomId, messages]) => {
//         const otherUser =
//           messages[0]?.sender?._id.toString() === loggedInUserId
//             ? messages[0].reciever
//             : messages[0].sender;
//         const otherUserName = otherUser?.username || "unknown User";
//         const otherUserId = otherUser?._id || "unknown";

//         return {
//           room_id: roomId,
//           userId: otherUserId,
//           userName: otherUserName,
//           lastmessageDetails: messages[0],
//         };
//       }
//     );

//     res.status(200).json({ chats: chatGroups, lenght: chatGroups.length });
//   } catch (err) {
//     console.log(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (!user) {
      return res
        .status(400)
        .json({ errors: { msg: "Invalid email or username", success: false } });
    }

    if(user.isVerified===false){
      return res.status(422).json({msg:'please verified your email address', success:false })
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
        res.json({ token, status: 200, user, success: true });
      }
    );
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Server error", success: false });
  }
});

// signUp(ThreeStep)
// 1:
router.post("/signup", signupValidator, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.errors[0].msg, success: false });
  }
  const {
    email,
    password,
    firstName,
    lastName,
    username,
    profileType,
    phone,
    category,
    countryCode,
  } = req.body;

  try {
    const userCount = await User.find().count();
    let user = await User.findOne({ email });
    let checkUsername = await User.findOne({ username });
    // console.log(user, checkUsername);

    if (user) {
      return res
        .status(400)
        .json({ success: false, errors: "User email already exists" });
    } else if (checkUsername) {
      return res
        .status(400)
        .json({ errors: "username already exist", success: false });
    }

    let newUser;
    if (profileType === "personal") {
      newUser = new User({
        email,
        password,
        firstName,
        lastName,
        username,
        profileType,
        profile_no: userCount + 1,
        subscriptionType: {
          reelCoin: 20,
        },
      });
    } else {
      const isValidPhone = isValidPhoneNumberForCountry(phone, countryCode);
      if (!isValidPhone) {
        return res.status(422).json({
            msg: "invalid phone number",
            success: false,
            errors: "wrong phone number",
          });
        }
      newUser = new User({
        phone,
        profileType,
        category,
        firstName,
        username,
        email,
        profile_no: userCount + 1,
        subscriptionType: {
          reelCoin: 50,
        },
      });
    }
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);
    await newUser.save();
    const { success, message, otp, expiresAt } = await emailVerify(email);
    if (success !== true) {
      res.status(500).json({ message: "Server error", success: false });
    }
    await Otp.updateOne(
      { email },
      { $set: { otp, expiresAt } },
      { upsert: true }
    ).catch((err) => {
      console.log(err, "in adding otp in db");
    });

    // const payLoad = {
    //   user: {
    //     id: newUser.id,
    //   },
    // };
    // jwt.sign(
    //   payLoad,
    //   "mysecrettoken",
    //   { expiresIn: 36000000 },
    //   (err, token) => {
    //     if (err) {
    //       // throw err;
    //       return res
    //         .status(422)
    //         .json({ message: "jwt err", success: false, errors: "jwt error" });
    //     }
    //     return res
    //       .status(200)
    //       .json({
    //         token,
    //         status: 200,
    //         msg: "User Registered",
    //         newUser,
    //         success: true,
    //       });
    //   }
    // );
    // console.log(success, message);
    return res.status(!success ? 422 : 201)
      .json({
        msg: "user registered successfully",
        status:200,
        success: true,
        newUser,
        msg:message
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error", success: false });
  }
});

// 2:
router.post("/sendverifymail", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(422).json({ msg: "email is required" });
  }
  try {
    let user = await User.findOne({ email });
    if(!user){
      return res.status(200).json({msg:"no registered account found" , success:false})
    }
    const { success, message } = await emailVerify(email);
    return res.status(!success ? 422 : 201)
      .json({ msg: "user registered successfully", success, message });
  } catch (error) {
    res.status(500).json({ msg: "Server error", success: false });
  }
});

// 3 last:
router.post("/verifymail", otpValidator, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.errors[0].msg });
  }
  const { otp, email } = req.body;
  try {
    const otpData = await Otp.findOne({ email });
    const currentTime = new Date();
    if (!otpData || currentTime > otpData.expiresAt) {
      return res.status(401).json({
        errors:"Expire Otp",
        msg: "OTP has expired please request new otp",
        success: false,
      });
    }
    const otpMatch = await verifyOTP(otp, otpData.otp);
    if (!otpMatch) {
      return res.status(401).json({ msg: "Invalid OTP"  ,  errors:"invalid Otp", success:false});
    }
    const user = await User.findOne({
      email: { $regex: new RegExp(email, "i") },
    });
    user.isVerified = true;  
    await user.save();
    await Otp.deleteOne({ email });
    // console.log(user)
    const payLoad = {
      user: {
        id: user?._id,
      },
    };

    try {
      const token = await new Promise((resolve, reject) => {
        jwt.sign(
          payLoad,
          "mysecrettoken",
          { expiresIn: 36000000 },
          (err, token) => {
            if (err) {
              reject(err);
            } else {
              resolve(token);
            }
          }
        );
      });
      return res.status(200).json({
        token,
        status: 200,
        msg: "User email verified successfully",
        newUser: user,
        success: true,
      });
    } catch (err) {
      return res.status(422)
        .json({ msg: "jwt err", success: false, errors: "jwt error" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Server error", success: false });
  }
});

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
      return res.status(404).json({
        message: "no account register with this email address",
        status: 404,
        success: false,
      });
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

    try {
      const result = await Otp.updateOne(
        { email },
        { $set: { otp: hashedOTP, expiresAt: expirationTime } },
        { upsert: true }
      );
      console.log(result, "result");

      return res.status(200).json({
        success: true,
        message: `OTP sent to your email address ${email}. Please check your inbox.`,
      });
    } catch (error) {
      console.error(error); // Log the error for debugging purposes
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating OTP.",
      });
    }

    console.log(result, "result");
    return res.status(200).json({
      success: true,
      message: `Otp sent to your email address ${email} please check your inbox`,
    });
  } catch (error) {
    return res
      .status(422)
      .json({ message: error, success: false, status: 422 });
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

    const currentTime = new Date();
    if (!otpData || currentTime > otpData.expiresAt) {
      return res.status(401).json({
        message: "OTP has expired please request new otp",
        success: false,
      });
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
    return res.status(200).json({
      message: "OTP verification successful",
      forgotToken: token,
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error, success: false });
  }
});

router.post("/reset", passwordMatcherValidator, async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors?.errors[0].msg, success: false });
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
    return res
      .status(200)
      .json({ message: "Password updated successfully", success: true });
  } catch (error) {
    if (error.message === "Token has expired") {
      return res
        .status(401)
        .json({ message: "Token has expired", success: false });
    } else {
      return res.status(403).json({ error: error?.message, success: false });
    }
  }
});

module.exports = router;
