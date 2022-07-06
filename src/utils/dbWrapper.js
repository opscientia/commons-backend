const { mongoClient } = require("../init");
const { validateDataset, validateChunk, validateCommonsFile } = require("./metadataValidator");

const mongoDbName = "test";
const dsCollectionName = "datasets";
const chunkCollectionName = "chunks";
const fileCollectionName = "commonsFiles";

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to retrieve items from
 */
const getItems = async (query, collectionName) => {
  let items;
  try {
    await mongoClient.connect();
    // console.log("Connected correctly to server");
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    items = (await collection.find(query)).toArray();
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
  return items;
};

/**
 * Get dataset metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.getDatasets = async (query) => {
  return await getItems(query, dsCollectionName);
};

/**
 * Get chunk metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.getChunks = async (query) => {
  return await getItems(query, chunkCollectionName);
};

/**
 * Get file metadata (commonsFile) objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.getCommonsFiles = async (query) => {
  return await getItems(query, fileCollectionName);
};

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the insertion request was acknowledged, false otherwise
 */
const insertItem = async (item, collectionName) => {
  let acknowledged;
  try {
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(item);
    if (result.acknowledged) acknowledged = true;
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
  return acknowledged;
};

/**
 * @param dataset Must accord with the dataset metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
module.exports.insertDataset = async (dataset) => {
  const isValid = await validateDataset(dataset);
  if (!isValid) {
    return false;
  }
  return await insertItem(dataset, dsCollectionName);
};

/**
 * @param chunk Must accord with the chunk metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
module.exports.insertChunk = async (chunk) => {
  const isValid = await validateChunk(chunk);
  if (!isValid) {
    return false;
  }
  return await insertItem(chunk, chunkCollectionName);
};

/**
 * @param commonsFile Must accord with the commonsFile metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
module.exports.insertCommonsFile = async (commonsFile) => {
  const isValid = await validateCommonsFile(commonsFile);
  if (!isValid) {
    return false;
  }
  return await insertItem(commonsFile, fileCollectionName);
};

/**
 * Update the first item that matches the filter query.
 * @param query The filter to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the update was successful, false otherwise
 */
const updateItem = async (query, updateDocument, collectionName) => {
  let success;
  try {
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const options = { upsert: false };
    const result = await collection.updateOne(query, updateDocument, options);
    if (result.modifiedCount > 0) success = true;
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
  return success;
};

/**
 * Update the first dataset metadata object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
module.exports.updateDataset = async (query, updateDocument) => {
  return await updateItem(query, updateDocument, dsCollectionName);
};

/**
 * Update the first chunk metadata object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
module.exports.updateChunk = async (query, updateDocument) => {
  return await updateItem(query, updateDocument, chunkCollectionName);
};

/**
 * Update file metadata the first (commonsFile) object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
module.exports.updateCommonsFile = async (query, updateDocument) => {
  return await updateItem(query, updateDocument, fileCollectionName);
};

/**
 * Delete the first item that matches the query.
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 */
const deleteItem = async (query, collectionName) => {
  let success;
  try {
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const result = await collection.deleteOne(query);
    if (result.deletedCount > 0) success = true;
  } catch (err) {
    console.log(err);
  } finally {
    await mongoClient.close();
  }
  return success;
};

/**
 * Delete the first dataset metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteDataset = async (query) => {
  return await deleteItem(query, dsCollectionName);
};

/**
 * Delete the first chunk metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteChunk = async (query) => {
  return await deleteItem(query, chunkCollectionName);
};

/**
 * Delete file metadata the first (commonsFile) object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteCommonsFile = async (query) => {
  return await deleteItem(query, fileCollectionName);
};
