const { check } = require("express-validator");

const otpValidator = [
    check("email").exists().withMessage("Email is required"),
    check("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
    check("otp").exists().withMessage("OTP is required").isLength({ min: 4, max: 4 }).withMessage("OTP must be exactly 4 characters"),
  ];

  const passwordMatcherValidator = [
    check("token", "token is required").notEmpty(),
    check("password", "Password is required").notEmpty(),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
    check("password", "Password must contain at least one digit").matches(/\d/),
    check("password", "Password must contain at least one capital letter").matches(/[A-Z]/),
    check("password", "Password must contain at least one special character").matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/),
    check("confirmpassword", "Confirm Password is required").notEmpty(),
    check("password").custom((value, { req }) => {
      if (value !== req.body.confirmpassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  
  ];
  
  
module.exports ={
    otpValidator,
    passwordMatcherValidator
}  