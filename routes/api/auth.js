const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

// GET USER
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
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
      config.get("jwtSecret"),
      { expiresIn: 36000 },
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
  [
    check("firstName", "First Name is required").not().isEmpty(),
    check("lastName", "Last Name is required").not().isEmpty(),
    check("email", "Email is required").isEmail(),
    check("password", "Enter Password With 6 Or More Characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, firstName, lastName, media, gender } = req.files;
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exist" }] });
      }

      var image = await uploadImageTos3Bucket(req.files);
      if (image) {
        user = new User({
          email,
          password,
          firstName,
          lastName,
          media,
          gender,
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
          config.get("jwtSecret"),
          { expiresIn: 36000 },
          (err, token) => {
            if (err) {
              throw err;
            }
            res.json({ token, status: 200, msg: "User Registered", user });
          }
        );
      } else {
        res.status(500).send("Server error");
      }
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
