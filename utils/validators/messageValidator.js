const { check } = require("express-validator");


const storyreplyValidator = [
    check("roomId").exists().withMessage("roomId is required"),
    check("postId").exists().withMessage("postId is required"),
    check("reciver").exists().withMessage("reciver is required"),
  ];

  module.exports ={
    storyreplyValidator
 }    