const { mongoClient } = require("../init");
const {
  validateDataset,
  validateChunk,
  validateCommonsFile,
} = require("./metadataValidator");

const mongoDbName = "admin";
const dsCollectionName = "datasets";
const chunkCollectionName = "chunks";
const fileCollectionName = "commonsFiles";
const authorCollectionName = "authors";

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to retrieve items from
 */
async function getItems(query: any, collectionName: string): Promise<any> {
  let items;
  try {
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    items = await collection.find(query).toArray();
  } catch (err) {
    console.log(err);
  }
  return items;
}

/**
 * Get dataset metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function getDatasets(query: any): Promise<any> {
  return await getItems(query, dsCollectionName);
}

/**
 * Get chunk metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function getChunks(query: any): Promise<any> {
  return await getItems(query, chunkCollectionName);
}

/**
 * Get file metadata (commonsFile) objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function getCommonsFiles(query: any): Promise<any> {
  return await getItems(query, fileCollectionName);
}

/**
 * Get author objects.
 * @param query The query document to use for the MongoDB query
 */
export async function getAuthors(query: any): Promise<any> {
  return await getItems(query, authorCollectionName);
}

/**
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the insertion request was acknowledged, false otherwise
 */
export async function insertItem(
  item: any,
  collectionName: string
): Promise<boolean> {
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
}

/**
 * @param dataset Must accord with the dataset metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
export async function insertDataset(dataset: any): Promise<boolean> {
  const isValid = await validateDataset(dataset);
  if (!isValid) {
    return false;
  }
  return await insertItem(dataset, dsCollectionName);
}

/**
 * @param chunk Must accord with the chunk metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
async function insertChunk(chunk: any): Promise<boolean> {
  const isValid = await validateChunk(chunk);
  if (!isValid) {
    return false;
  }
  return await insertItem(chunk, chunkCollectionName);
}

/**
 * @param commonsFile Must accord with the commonsFile metadata schema
 * @returns True if the insertion request was acknowledged, false otherwise
 */
export async function insertCommonsFile(commonsFile: any): Promise<boolean> {
  const isValid = await validateCommonsFile(commonsFile);
  if (!isValid) {
    return false;
  }
  return await insertItem(commonsFile, fileCollectionName);
}

/**
 * @param author An author object. Must include a `name` attribute
 * @returns True if the insertion request was acknowledged, false otherwise
 */
export async function insertAuthor(author: any): Promise<boolean> {
  if (!author.name) return false;
  return await insertItem(author, authorCollectionName);
}

/**
 * Update the first item that matches the filter query.
 * @param query The filter to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if the update was successful, false otherwise
 */
export async function updateItem(
  query: any,
  updateDocument: any,
  collectionName: string
): Promise<boolean> {
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
}

/**
 * Update the first dataset metadata object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
export async function updateDataset(
  query: any,
  updateDocument: any
): Promise<boolean> {
  return await updateItem(query, updateDocument, dsCollectionName);
}

/**
 * Update the first chunk metadata object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
export async function updateChunk(
  query: any,
  updateDocument: any
): Promise<boolean> {
  return await updateItem(query, updateDocument, chunkCollectionName);
}

/**
 * Update file metadata the first (commonsFile) object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
export async function updateCommonsFile(
  query: any,
  updateDocument: any
): Promise<boolean> {
  return await updateItem(query, updateDocument, fileCollectionName);
}

/**
 * Update author object matching query.
 * @param query The query document to use for the MongoDB query
 * @param updateDocument The updateDocument used to update the entry
 * @returns True if the update was successful, false otherwise
 */
export async function updateAuthor(
  query: any,
  updateDocument: any
): Promise<boolean> {
  return await updateItem(query, updateDocument, authorCollectionName);
}

/**
 * Delete the first item that matches the query.
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 * @returns True if succesfully deleted one item, false otherwise
 */
async function deleteOneItem(
  query: any,
  collectionName: string
): Promise<boolean> {
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
}

/**
 * Delete the first dataset metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteDataset(query: any): Promise<boolean> {
  return await deleteOneItem(query, dsCollectionName);
}

/**
 * Delete the first chunk metadata object matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteChunk(query: any): Promise<boolean> {
  return await deleteOneItem(query, chunkCollectionName);
}

/**
 * Delete the first file metadata (commonsFile) object matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteCommonsFile(query: any): Promise<boolean> {
  return await deleteOneItem(query, fileCollectionName);
}

/**
 * Delete the first author object matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteAuthor(query: any): Promise<boolean> {
  return await deleteOneItem(query, authorCollectionName);
}

/**
 * Delete the first item that matches the query.
 * @param query The query document to use for the MongoDB query
 * @param collectionName The name of the MongoDB collection to insert the item into
 */
async function deleteManyItems(
  query: any,
  collectionName: string
): Promise<boolean> {
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
}

/**
 * Delete dataset metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteDatasets0(query: any): Promise<boolean> {
  return await deleteManyItems(query, dsCollectionName);
}

/**
 * Delete chunk metadata objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteChunks(query: any): Promise<boolean> {
  return await deleteManyItems(query, chunkCollectionName);
}

/**
 * Delete file metadata (commonsFile) objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteCommonsFiles(query: any): Promise<boolean> {
  return await deleteManyItems(query, fileCollectionName);
}

/**
 * Delete author objects matching query.
 * @param query The query document to use for the MongoDB query
 */
export async function deleteAuthors(query: any): Promise<boolean> {
  return await deleteManyItems(query, authorCollectionName);
}

export default {
  getAuthors,
  getDatasets,
  getChunks,
  getCommonsFiles,
  insertAuthor,
  insertChunk,
  insertCommonsFile,
  insertDataset,
  updateDataset,
  updateCommonsFile,
  updateChunk,
  updateAuthor,
  deleteAuthors,
  deleteChunks,
  deleteChunk,
  deleteCommonsFiles,
  deleteDataset,
  deleteDatasets0,
  deleteManyItems,
};
