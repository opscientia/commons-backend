const yup = require("yup");
const mongodb = require("mongodb");

const datasetSchema = yup.object().shape({
  title: yup.string(),
  description: yup.string(),
  authors: yup.array().of(yup.string()),
  uploader: yup.string(),
  license: yup.string(),
  doi: yup.string(),
  keywords: yup.array().of(yup.string()),
  published: yup.boolean(),
  size: yup.number().positive(),
  chunkIds: yup.array().of(yup.mixed((input) => input instanceof mongodb.ObjectId)), // chunkIds
});

// The values here include return values from the BIDS Validator
const bidsValidationSchema = yup.object().shape({
  validated: yup.boolean().required(),
  version: yup.string(),
  deidentified: yup.boolean(),
  modality: yup.array().of(yup.string()),
  tasks: yup.array().of(yup.string()),
  warnings: yup.string(),
  errors: yup.string(),
});
const chunkSchema = yup.object().shape({
  datasetId: yup.mixed((input) => input instanceof mongodb.ObjectId).required(),
  path: yup.string(),
  doi: yup.string(),
  storageIds: yup
    .object()
    .shape({
      cid: yup.string().required(),
      estuaryId: yup.string(),
    })
    .required(),
  fileIds: yup
    .array()
    .of(yup.mixed((input) => input instanceof mongodb.ObjectId))
    .required(), // fileIds
  size: yup.number().positive(),
  standard: yup.object().shape({
    bids: bidsValidationSchema,
    // Might add more standards here
  }),
});

const commonsFileSchema = yup.object().shape({
  chunkId: yup.mixed((input) => input instanceof mongodb.ObjectId).required(),
  name: yup.string(),
  path: yup.string(),
  size: yup.number(),
  documentation: yup.string(),
});

module.exports.validateDataset = async (dataset) => {
  return await datasetSchema.isValid(dataset);
};

module.exports.validateChunk = async (chunk) => {
  return await chunkSchema.isValid(chunk);
};

module.exports.validateCommonsFile = async (commonsFile) => {
  return await commonsFileSchema.isValid(commonsFile);
};
