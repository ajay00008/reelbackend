const https = require("https");
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


const makeOpenAIRequest = (postData) => {
  return new Promise((resolve, reject) => {
    const postDataString = JSON.stringify(postData);

    const options = {
      hostname: "api.openai.com",
      path: "/v1/images/generations",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Make sure you use the correct environment variable here
        "Content-Length": postDataString.length,
      },
    };

    const request = https.request(options, (response) => {
      let responseData = "";

      response.on("data", (chunk) => {
        responseData += chunk;
      });

      response.on("end", () => {
        if (response.statusCode === 200) {
          const responseDataObj = JSON.parse(responseData);
          resolve(responseDataObj); // Resolve the promise with the response data
        } else {
          const error = new Error(`API request failed with status code: ${response.statusCode}`);
          reject(error); // Reject the promise with an error
        }
      });
    });

    request.on("error", (error) => {
      reject(error); // Reject the promise with an error
    });

    // Send the POST data
    request.write(postDataString);
    request.end();
  });
};


module.exports = {
   findUserByIdentifier,
   makeOpenAIRequest
}