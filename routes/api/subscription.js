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
        const {price} = req.body
        const paymentIntent = await stripe.paymentIntents.create({
            currency: "USD",
            amount: price * 100,
            automatic_payment_methods: { enabled: true },
          });
          res.send({
            clientSecret: paymentIntent?.client_secret,
            url:paymentIntent?.url
          });
    } catch (err) {
        console.log(err)
        res.status(500).send("Server error");
    }
})




module.exports = router