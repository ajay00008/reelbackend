const { findUserByIdentifier } = require("./helpers");

async function getUsersToken(users) {
    try {
      // Use Promise.all to await all the promises from findUserByIdentifier
      const response = await Promise.all(users.map(async (id) => {
        const data = await findUserByIdentifier(id);
        console.log(data, "data");
        return data?.fcmToken;
      }));

      return response.filter(token => token !== undefined);
    } catch (err) {
      console.error(err.message);
      throw new Error("Server Error");
    }
  }
  

  
module.exports = {
   getUsersToken
}  