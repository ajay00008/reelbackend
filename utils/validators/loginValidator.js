const { body, check, validationResult } = require("express-validator");

const personalSchema = [
    body('username').notEmpty().withMessage('username is required'),
    body('firstName').notEmpty().withMessage('firstName is required'),
    body('lastName').notEmpty().withMessage('lastName is required'),
    check("email").exists().withMessage("Email is required"),
    check("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
    check("password", "Password is required").notEmpty(),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
    check("confirmpassword", "Confirm Password is required").notEmpty(),
    check("password").custom((value, { req }) => {
      if (value !== req.body.confirmpassword) {
        throw new Error("password and confirm password should be same");
      }
      return true;
    }),
  ];
  
  const businessSchema = [
    body('category').notEmpty().withMessage('category is required').isMongoId().withMessage('category should be a valid category ID'),
    body('phone').notEmpty().withMessage('phone is required').isNumeric().withMessage('Phone must contain only digits'),
    body('countryCode').notEmpty().withMessage('countryCode is required'),
    body('firstName').notEmpty().withMessage('firstName is required'),
    body('username').notEmpty().withMessage('firstName is required'),
    check("password", "Password is required").notEmpty(),
    check("password", "Password must be at least 6 characters long").isLength({ min: 6 }),
    check("email").exists().withMessage("Email is required"),
    check("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
    // check("password", "Password must contain at least one digit").matches(/\d/),
    // check("password", "Password must contain at least one capital letter").matches(/[A-Z]/),
    // check("password", "Password must contain at least one special character").matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/),
    check("confirmpassword", "Confirm Password is required").notEmpty(),
    check("password").custom((value, { req }) => {
      if (value !== req.body.confirmpassword) {
        throw new Error("password and confirm password should be same");
      }
      return true;
    }),
  ];
  
  const validate = (schema) => async (req, res, next) => {
    await Promise.all(schema.map((field) => field.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    return res.status(400).json({ errors: errors.errors[0]?.msg || errors }); // Return only the first error object
  };
  
  
  const signupValidator = [
    check("profileType").exists().withMessage("profileType is required"),
    body('profileType').isIn(['personal', 'business']).withMessage('Invalid profileType'),
    (req, res, next) => {
      if (req.body.profileType === 'personal') {
        return validate(personalSchema)(req, res, next);
      } else if (req.body.profileType === 'business') {
        return validate(businessSchema)(req, res, next);
      } else {
        return res.status(400).json({ errors: [{ msg: 'Invalid profileType profileType can only be personal or business' }] });
      }
    },
  ];

  const loginValidator = [
    check("email").exists().isEmail().withMessage("profileType is required"),
    check("password").exists().withMessage("profileType is required"),

  ];
  

  module.exports ={
   signupValidator,
   loginValidator
}  