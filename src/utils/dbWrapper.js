const { mongoClient } = require("../init");
const { validateDataset, validateChunk, validateCommonsFile } = require("./metadataValidator");

const mongoDbName = "admin";
const dsCollectionName = "datasets";
const chunkCollectionName = "chunks";
const fileCollectionName = "commonsFiles";
const authorCollectionName = "authors";

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to retrieve items from
 */
const getItems = async (query, collectionName) => {
  let items;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    items = await collection.find(query).toArray();
  } catch (err) {
    console.log(err);
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
 * Get author objects.
 * @param query The query document to use for the MongoDB query
 */
module.exports.getAuthors = async (query) => {
  return await getItems(query, authorCollectionName);
};

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the insertion request was acknowledged, false otherwise
 */
const insertItem = async (item, collectionName) => {
  let acknowledged = false;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(item);
    if (result.acknowledged) acknowledged = true;
  } catch (err) {
    console.log(err);
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
 * @param author An author object. Must include a `name` attribute
 * @returns True if the insertion request was acknowledged, false otherwise
 */
module.exports.insertAuthor = async (author) => {
  if (!author.name) return false;
  return await insertItem(author, authorCollectionName);
};

/**
 * Update the first item that matches the filter query.
 * @param query The filter to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the update was successful, false otherwise
 */
const updateItem = async (query, updateDocument, collectionName) => {
  let success = false;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const options = { upsert: false };
    const result = await collection.updateOne(query, updateDocument, options);
    if (result.modifiedCount > 0) success = true;
  } catch (err) {
    console.log(err);
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
 * Update author object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
module.exports.updateAuthor = async (query, updateDocument) => {
  return await updateItem(query, updateDocument, authorCollectionName);
};

/**
 * Delete the first item that matches the query.
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 */
const deleteOneItem = async (query, collectionName) => {
  let success = false;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const result = await collection.deleteOne(query);
    if (result.deletedCount > 0) success = true;
  } catch (err) {
    console.log(err);
  }
  return success;
};

/**
 * Delete the first dataset metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteDataset = async (query) => {
  return await deleteOneItem(query, dsCollectionName);
};

/**
 * Delete the first chunk metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteChunk = async (query) => {
  return await deleteOneItem(query, chunkCollectionName);
};

/**
 * Delete the first file metadata (commonsFile) object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteCommonsFile = async (query) => {
  return await deleteOneItem(query, fileCollectionName);
};

/**
 * Delete the first author object matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteAuthor = async (query) => {
  return await deleteOneItem(query, authorCollectionName);
};

/**
 * Delete the first item that matches the query.
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 */
const deleteManyItems = async (query, collectionName) => {
  let success = false;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    const result = await collection.deleteMany(query);
    if (result.deletedCount > 0) success = true;
  } catch (err) {
    console.log(err);
  }
  return success;
};

/**
 * Delete dataset metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteDatasets = async (query) => {
  return await deleteManyItems(query, dsCollectionName);
};

/**
 * Delete chunk metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteChunks = async (query) => {
  return await deleteManyItems(query, chunkCollectionName);
};

/**
 * Delete file metadata (commonsFile) objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteCommonsFiles = async (query) => {
  return await deleteManyItems(query, fileCollectionName);
};

/**
 * Delete author objects matching query.
 * @param query The query document to use for the MongoDB query
 */
module.exports.deleteAuthors = async (query) => {
  return await deleteManyItems(query, authorCollectionName);
};
