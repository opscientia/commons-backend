const { mongoClient, msgCache } = require("../init");
const mongoDbName = "admin";
const UserCollectionName = "users";

/**
 * @param user The user Object to be stored in the database
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the insertion request was acknowledged, false otherwise
 */
const createUser = async (user) => {
  let acknowledged = false;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(UserCollectionName);
    const result = await collection.insertOne(user);
    if (result.acknowledged) acknowledged = true;
  } catch (err) {
    console.log(err);
  }
  return acknowledged;
};

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to retrieve items from
 */
const getUser = async (query) => {
  let users;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(UserCollectionName);
    users = await collection.find(query).toArray();
  } catch (err) {
    console.log(err);
  }
  return users;
};

module.exports = {
  getUser,
  createUser,
};
