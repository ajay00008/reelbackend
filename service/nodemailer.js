const nodemailer = require("nodemailer");
const Otp = require("../models/otp");
// const {useremail , password } = process.env

const config = require("config");
const User = require("../models/User");
const useremail = config.get("user");
const password = config.get("pass");
// console.log(useremail, password, "nodemailer service");

const transporter = nodemailer.createTransport({
  host: "smtp.privateemail.com",
  port: 587,
  auth: {
    user: useremail || "info@reeltok.net",
    pass: password || "info@@@563N",
  },
});

// for local testing ( gmail )
// const transporter = nodemailer.createTransport({
//     service:'gmail',
//     auth: {
//       user: 'abhisheknugen@gmail.com' ,
//       pass : 'xuubdazrhprwcfwq',
//     },
//   });

const mailConnected = async () => {
  try {
    const mailstatus = await transporter.verify();
    console.log("mailService: login successfully", mailstatus);
    return { transporter, mailstatus };
  } catch (error) {
    console.log(error, "mailService: login unsuccessfull");
  }
};




module.exports = {
  transporter,
  mailConnected,
};
