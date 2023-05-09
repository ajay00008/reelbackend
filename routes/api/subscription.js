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
    } else if (package == 'COINS') {
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

router.post('/payment-sheet', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create();
  const ephemeralKey = await stripe.ephemeralKeys.create(
    {customer: customer.id},
    {apiVersion: '2022-11-15'}
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'eur',
    customer: customer.id,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: 'pk_test_qblFNYngBkEdjEZ16jxxoWSM'
  });
});




module.exports = router