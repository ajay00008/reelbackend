const { check } = require("express-validator");

const blogValidator = [
  check("title").exists().withMessage("title is required"),
  check("description").exists().withMessage("description is required"),
];

module.exports = {
  blogValidator,
};
