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
const stripe = require("stripe")(
  process.env.STRIPE_KEY,
  {
    apiVersion: "2022-08-01",
  }
);

router.post("/create-payment", async (req, res) => {
  try {
    const { price } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "USD",
      amount: price * 100,
      automatic_payment_methods: { enabled: true },
    });
    res.send({
      clientSecret: paymentIntent?.client_secret,
      url: paymentIntent?.url,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});


router.post('/subscribe', auth, async (req, res) => {
  try {
    const { package } = req.body;
    const user = await User.findById(req.user.id).select("-password");
    switch (package) {
      case "GOLD":
      case "COINS":
        user.subscription = true
        user.subscriptionType.reelCoin += 20; // Add 20 coins to the existing balance
        user.subscriptionType.subType = package; 
        console.log(user, "last");
        await user.save();
        res.json({ user, msg: `${package} Subscription Added`, status: 200 });
        break;
      case "BUSINESS": // Add the case for BUSINESS package
        user.subscription = true
        user.subscriptionType.reelCoin += 50; // Add 50 coins to the existing balance
        user.subscriptionType.subType = package; 
        await user.save();
        res.json({ user, msg:`${package} Subscription Added`, status: 200 });
        break;

      default:
        res.status(400)
          .json({
            error:'unknown subscription',
            msg: "Invalid subscription package",
            status: 400,
            validPackages: ['GOLD','COINS','BUSINESS'],
          });
        break;
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({errors:"Server error"});
  }
});

router.post("/coins", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    user.subscriptionType.reelCoin = user.subscriptionType.reelCoin - 0.25;
    await user.save();
    res.json({ user, msg: "Coins Used", status: 200 });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

router.post("/payment-sheet", async (req, res) => {
  const { price } = req.body;
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create();
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: "2022-11-15" }
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: price * 100,
    currency: "USD",
    customer: customer.id,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: process.env.PUBLISHABLE_KEY,
  });
});

module.exports = router;
