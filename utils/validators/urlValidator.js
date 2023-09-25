const { check } = require("express-validator");


const urlValidator = [
    check("url").exists().withMessage("url is required"),
    check("username").exists().withMessage("username is required"),
  ];

  module.exports ={
    urlValidator
 }   