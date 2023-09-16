const { Types } = require('mongoose');

// Function to find a user by ID or username
async function findUserByIdentifier(identifier) {
  try {
    const isObjectId = Types.ObjectId.isValid(identifier);
    return await User.findOne({
      $or: [
        { _id: isObjectId ? identifier : null },
        { username: isObjectId ? null : identifier } // If it's not an ObjectId, search by username
      ]
    }).select("-password").populate('followers').populate('following');
  } catch (err) {
    console.error(err.message);
    throw new Error("Server Error");
  }
}


module.exports = {
   findUserByIdentifier
}