import yup from 'yup';
import mongodb from 'mongodb';

// The values here include return values from the BIDS Validator
const bidsValidationSchema = yup.object().shape({
  validated: yup.boolean().required(),
  version: yup.string(),
  deidentified: yup.boolean(),
  modalities: yup.array().of(yup.string()),
  tasks: yup.array().of(yup.string()),
  warnings: yup.array().of(yup.string()),
  errors: yup.array().of(yup.string()),
});
const datasetSchema = yup.object().shape({
  title: yup.string(),
  description: yup.string(),
  authors: yup.array().of(yup.mixed()), // Array of ObjectIds, pointers to author objects
  uploader: yup.string(),
  license: yup.string(),
  doi: yup.string(),
  keywords: yup.array().of(yup.string()),
  published: yup.boolean(),
  size: yup.number().positive(),
  standard: yup.object().shape({
    bids: bidsValidationSchema,
    // Might add more standards here
  }),
  chunkIds: yup.array().of(yup.mixed((input: any) => input instanceof mongodb.ObjectId)), // chunkIds
});

const chunkSchema = yup.object().shape({
  datasetId: yup.mixed((input: any) => input instanceof mongodb.ObjectId).required(),
  path: yup.string(),
  doi: yup.string(),
  storageIds: yup
    .object()
    .shape({
      cid: yup.string().required(),
      estuaryId: yup.number(),
    })
    .required(),
  fileIds: yup
    .array()
    .of(yup.mixed((input: any) => input instanceof mongodb.ObjectId))
    .required(),
  size: yup.number().positive(),
});

const commonsFileSchema = yup.object().shape({
  chunkId: yup.mixed((input: any) => input instanceof mongodb.ObjectId).required(),
  name: yup.string(),
  path: yup.string(),
  size: yup.number(),
  documentation: yup.string(),
});

module.exports.validateDataset = async (dataset: any) => {
  return await datasetSchema.isValid(dataset);
};

module.exports.validateChunk = async (chunk: any) => {
  return await chunkSchema.isValid(chunk);
};

module.exports.validateCommonsFile = async (commonsFile: any) => {
  return await commonsFileSchema.isValid(commonsFile);
};
