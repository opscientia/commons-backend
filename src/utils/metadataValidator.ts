import yup from 'yup';
import mongodb from 'mongodb';
import { Chunk, CommonsFile, Dataset } from '../@types/metadata';
interface BidsValidation {
  validated: boolean;
  version: string;
  deidentified: boolean;

}

// The values here include return values from the BIDS Validator
const bidsValidationSchema = yup?.object().shape({
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
  chunkIds: yup.array().of(yup.mixed().__inputType((input: any) => input instanceof mongodb.ObjectId)), // chunkIds
});

const chunkSchema = yup.object().shape({
  datasetId: yup.mixed().__inputType((input: any) => input instanceof mongodb.ObjectId).required(),
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
    .of(yup.mixed().__inputType((input: any) => input instanceof mongodb.ObjectId))
    .required(),
  size: yup.number().positive(),
});

const commonsFileSchema = yup.object().shape({
  chunkId: yup.mixed().__inputType((input: any) => input instanceof mongodb.ObjectId).required(),
  name: yup.string(),
  path: yup.string(),
  size: yup.number(),
  documentation: yup.string(),
});

export async function validateDataset(dataset: Dataset):Promise<boolean> {
  return await datasetSchema.isValid(dataset);
};

export async function validateChunk(chunk: Chunk): Promise<boolean> {
  return await chunkSchema.isValid(chunk);
};

export async function validateCommonsFile(commonsFile: CommonsFile): Promise<boolean>{
  return await commonsFileSchema.isValid(commonsFile);
};

//ToDo: Add Author Metadata validator once email, orcid and blockchainAddress fields are implemented
export default { validateChunk, validateCommonsFile, validateDataset};