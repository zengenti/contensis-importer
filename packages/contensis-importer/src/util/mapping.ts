import aguid from 'aguid';
import { Entry } from 'contensis-management-api/lib/models';
import deepCleaner from 'deep-cleaner';
import { jpath } from 'jsonpath-mapper';
import { Mappers } from '../models/ImportBase.types';

export const addMinutes = (date: Date, minutes = 0) => {
  return new Date(date.setTime(minutes * 60 * 1000 + date.getTime()));
};

export const getEntriesByContentTypes = (
  entries: Entry[],
  ...contentTypeId: string[]
) => entries.filter(e => contentTypeId.includes(e.sys.contentTypeId as string));

export const replaceContentTypeId = (
  entry: Entry,
  newContentTypeId: string
) => {
  const cleanedEntry = deepCleaner(entry, ['contentTypeId']);
  cleanedEntry.sys.contentTypeId = newContentTypeId;
  delete cleanedEntry.sys.slug;
  return cleanedEntry;
};

export const generateNewAsset = (
  asset: Entry,
  path?: string,
  transformGuid = true
) => {
  const newId = aguid(`image-${asset.sys.id}`);
  const newAsset = {
    ...asset,
    // re-seed sys.id and sys.properties.fileId
    // as it is possibly in use in another project already
    sys: {
      ...asset.sys,
      id: transformGuid ? newId : asset.sys.id,
      properties: {
        ...(asset.sys as any).properties,
        fileId: transformGuid ? newId : (asset.sys as any).properties.fileId,
        filePath: (asset.sys as any).properties.filePath
          ? path || (asset.sys as any).properties.filePath
          : undefined,
      },
      uri: (asset.sys as any).properties.filePath
        ? `${(asset.sys as any).properties.filePath}${
            (asset.sys as any).properties.filename
          }`
        : undefined,
    },
  };

  return newAsset;
};

export const chooseMapperByFieldValue = <
  S,
  T extends Mappers<S, any> = Mappers<S, Entry>,
>(
  entry: S,
  mappers: T,
  field = 'sys.contentTypeId'
) => {
  const fieldValue = jpath(field, entry || {}) as string;
  return (mappers[fieldValue] || mappers.default) as T[keyof T];
};

export const dedupeInner = (array: any[]) => {
  const stringArray = array.map(itm => JSON.stringify(itm));
  const uniqueStringArray = new Set(stringArray);
  const uniqueArray = Array.from(uniqueStringArray).map(itm => JSON.parse(itm));
  return uniqueArray;
};
