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
    const user = await User.findById(req.user.id).select("-password").populate('followers').populate('following');
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
      'mysecrettoken',
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
      let user = await User.findOne({ email });
      let checkUsername = await User.findOne({username})
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exist" }] });
      } else if(checkUsername) {
        return res.status(400).json({errors:[{msg: "Username already exist"}]})
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
          username
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
          'mysecrettoken',
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
router.post('/update-token', auth, async (req, res) => {
    var { fcmToken } = req.body
    try {
        var user = await User.findById(req.user.id)
        if (user) {
            user.fcmToken = fcmToken
        }
        await user.save()
        return res.json({ msg: 'Expo Token Updated' })
    } catch (err) {
        console.log(err.message)
        res.status(500).send("Server error")
    } 
})


// LOGIN
router.post("/social", async (req, res) => {
  const { email, firstName, lastName } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
        const payLoad = {
          user: {
            id: user.id,
          },
        };
        jwt.sign(payLoad,'mysecrettoken',{ expiresIn: 36000000 },(err, token) => {
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
        password:randomstring,
        firstName,
        lastName,
        username:firstName+''+lastName
      });
      await user.save();
        const payLoad = {
          user: {
            id: user.id,
          },
        };
        jwt.sign(
          payLoad,
          'mysecrettoken',
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



module.exports = router;
