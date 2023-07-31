const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const config = require('config');
const { transporter } = require('../service/nodemailer');

const useremail = config.get('user');
const secretKey = config.get('forgotSecret');
// const { useremail , forgotSecret : secretKey } = process.env;

// console.log(useremail , "******" , secretKey)
const sendMail = async ({ to, subject, html }) => {
  console.log(to, subject, html);
  const mailOptions = {
    from: useremail,
    to,
    subject,
    html,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info);
    return true; // Indicate that the email was sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Indicate that there was an error sending the email
  }
};


const generateAndHashOTP = async () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString(); 
  const hashedOTP = await bcrypt.hash(otp, 10); 
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 1); // Adding 1 hour to the current time
  return { otp, hashedOTP , expirationTime };
};

const verifyOTP = async (userOTP, hashedOTP) => {
  return await bcrypt.compare(userOTP, hashedOTP); 
};

const createJwtToken = async (payload) => {
  try {
    const token = jwt.sign(payload, secretKey, { expiresIn :3600 });
    return token;
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
};

const verifyToken = (token)  => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          reject(new Error("Token has expired"));
        } else {
          reject(new Error("Invalid token"));
        }
      } else {
        resolve(decoded);
      }
    });
  });
}



module.exports = {
    sendMail,
    generateAndHashOTP,
    verifyOTP,
    createJwtToken,
    verifyToken
}