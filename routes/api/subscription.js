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
const { default: Stripe } = require("stripe");
const stripe = require("stripe")('sk_test_51MzKFkE8KjraTwLyKXD3BJdGwfDA2Kn958hH926oE0a9hzyInlFA4O2AUWDLKepf6HG3R8zqXN0FljAeOD5QRJML0070crkY8N', {
  apiVersion: "2022-08-01",
});


router.post('/create-payment', async (req, res) => {
  try {
    const { price } = req.body
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "USD",
      amount: price * 100,
      automatic_payment_methods: { enabled: true },
    });
    res.send({
      clientSecret: paymentIntent?.client_secret,
      url: paymentIntent?.url
    });
  } catch (err) {
    console.log(err)
    res.status(500).send("Server error");
  }
})


router.post('/subscribe', auth, async (req, res) => {
  try {
    const { package } = req.body
    const user = await User.findById(req.user.id).select("-password");
    if (package == 'GOLD') {
      user.subscriptionType.subType = 'GOLD'
      user.subscriptionType.reelCoin = 20
      await user.save()
      res.json({ user, msg: "User Subscription Added", status: 200 });
    } else if (package == 'BUY') {
      user.subscriptionType.subType = 'BUY'
      user.subscriptionType.reelCoin = 20
      await user.save()
      res.json({ user, msg: "User Subscription Added", status: 200 });
    }
  } catch (err) {
    console.log(err)
    res.status(500).send("Server error");
  }
})


router.post('/coins', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25
    await user.save()
    res.json({ user, msg: "Coins Used", status: 200 });
  } catch (err) {
    console.log(err)
    res.status(500).send("Server error");
  }
})




module.exports = router