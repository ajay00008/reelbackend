const { findUserByIdentifier } = require("./helpers");

async function getUsersToken(users) {
  try {
    const response = await Promise.all(users.map(async (id) => {
      const data = await findUserByIdentifier(id);
      console.log(data, "data");
      return { id, token: data?.fcmToken };
    }));

    // Filter out objects with undefined fcmToken
    return response.filter(user => user.token !== undefined);
  } catch (err) {
    console.error(err.message);
    throw new Error("Server Error");
  }
}

  

  
module.exports = {
   getUsersToken
}  