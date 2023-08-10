const { check  , body} = require("express-validator");
const groupValidator = [
    check("groupName").exists().withMessage("groupName is required"),
    // body('members').isArray().withMessage('Members should be an array of user IDs'),
    // body('members.*').isMongoId().withMessage('Each member should be a valid user ID'),
  ];
  const leaveValidator = [
    check("groupId").exists().withMessage("groupId is required"),
    // body('members').isArray().withMessage('Members should be an array of user IDs'),
    // body('members.*').isMongoId().withMessage('Each member should be a valid user ID'),
  ];


module.exports = {
    groupValidator,
    leaveValidator
}  