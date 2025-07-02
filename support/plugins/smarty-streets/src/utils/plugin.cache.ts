import { FlatfileRecord } from "@flatfile/plugin-record-hook";

/**
* Type for the cache data structure to store validated field values
*/
export type SmartyCacheData = Record<string, Record<string, string | undefined>>;

/** Key used to store cache data in record metadata */
export const SMARTY_METADATA_KEY = "__smartyStreetsValidatedFields";

/** 
* Generates a consistent subkey for the cache based on field names.
* @param realFields - The real field keys used for address.
* @returns A consistent string key based on sorted field names.
*/
export function getSmartyCacheSubkey(realFields: string[]): string {
  // Sort fields to ensure consistency regardless of order in config
  return realFields.slice().sort().join('|');
}

/** 
* Retrieves cached validated field values for a specific subkey.
* @param record - The Flatfile record.
* @param subkey - The cache subkey.
* @returns The cached values, or undefined if not found.
*/
export function getValidatedFieldsFromCache(record: FlatfileRecord, subkey: string): Record<string, string | undefined> | undefined {
  const meta = record.getMetadata();
  if (!meta || typeof meta !== 'object' || !(SMARTY_METADATA_KEY in meta)) {
    return undefined;
  }
  const allValidated = meta[SMARTY_METADATA_KEY] as SmartyCacheData | undefined;
  return allValidated?.[subkey];
}

/** 
* Sets validated field values in the cache for a specific subkey.
* @param record - The Flatfile record.
* @param subkey - The cache subkey.
* @param values - The field values to cache.
*/
export function setValidatedFieldsInCache(record: FlatfileRecord, subkey: string, values: Record<string, string | undefined>): void {
  const meta = record.getMetadata() ?? {};
  let allValidated = (meta[SMARTY_METADATA_KEY] as SmartyCacheData | undefined) ?? {};
  allValidated[subkey] = { ...values }; // Store a copy
  meta[SMARTY_METADATA_KEY] = allValidated;
  // Use optional chaining for setMetadata if it might not exist on all record types/mocks
  record.setMetadata?.(meta);
}