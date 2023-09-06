const { check } = require("express-validator");

const blogValidator = [
  check("title").exists().withMessage("title is required").notEmpty().withMessage("title cannot be empty"),
  check("description").exists().withMessage("description is required").notEmpty().withMessage("description cannot be empty"),
];

module.exports = {
  blogValidator,
};
