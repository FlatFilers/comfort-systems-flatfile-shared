import { FlatfileRecord } from "@flatfile/plugin-record-hook";
import { Logger } from "./plugin.logger";
import { RecordValidationInput, RecordValidationResult } from "../types/validation";
import { extractAddressAndFields, getAddressFieldValues, applyValidationResult } from "./helpers.record";
import { getSmartyCacheSubkey, getValidatedFieldsFromCache, setValidatedFieldsInCache } from "./plugin.cache";
import type { SmartyStreetsPluginConfig } from "../types/config";

/**
* Compares two address value objects for equality.
* @param a - First address value object.
* @param b - Second address value object.
* @returns True if all values are equal, false otherwise.
*/
export function areAddressValuesEqual(a: Record<string, string | undefined>, b: Record<string, string | undefined>): boolean {
  // Compare keys and values for equality
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
* Prepares a batch of records for validation.
* @param records - Flatfile records to prepare for validation
* @param config - SmartyStreets plugin configuration
* @param logger - Logger instance
* @returns Object containing validation inputs, field values and records that need validation
*/
export async function prepareValidationBatch(
  records: FlatfileRecord[],
  config: SmartyStreetsPluginConfig,
  logger: Logger
): Promise<{
  validationInputs: RecordValidationInput[],
  recordFieldValues: Record<string, { values: Record<string, string | undefined>, realFields: string[] }>,
  recordsToValidate: FlatfileRecord[]
}> {
  // Prepare input for the service
  const validationInputs: RecordValidationInput[] = [];
  // Track field values and real fields for each record
  const recordFieldValues: Record<string, { values: Record<string, string | undefined>, realFields: string[] }> = {};
  // Track records that actually need validation
  const recordsToValidate: FlatfileRecord[] = [];
  
  logger.debug('Step 1: Extracting address data and determining validation needs');
  for (const record of records) {
    // Extract address data from the record with enhanced parsing flags
    const { address, realFields, parsingFailed, parsingIncomplete, parsingIssues } = extractAddressAndFields(record, config);
    
    // Handle parsing issues for full address configurations
    if ('fullAddressField' in config && config.fullAddressField) {
      const originalValue = record.get(config.fullAddressField)?.toString()?.trim();
      
      if (originalValue && originalValue.length >= 5) {
        if (parsingFailed) {
          // Completely failed to parse an address with reasonable input
          let suggestion = '';
          
          if (originalValue.length < 10) {
            suggestion = 'Address appears too short.';
          } else if (!originalValue.match(/\d+/)) {
            suggestion = 'Address should typically start with a number.';
          } else if (!originalValue.includes(',') && originalValue.length > 20) {
            suggestion = 'Full addresses typically use commas to separate components (e.g., "123 Main St, Anytown, CA 12345").';
          } else if (originalValue.split(',').length === 2) {
            suggestion = 'Address may be missing state or ZIP code.';
          }
          
          record.addWarning(config.fullAddressField, `Could not automatically parse the address: "${originalValue}". ${suggestion} Please check format or split into separate fields.`);
          logger.debug(`Added warning to record ${record.rowId}: Complete parsing failure`);
        } else if (parsingIncomplete && parsingIssues && parsingIssues.length > 0) {
          // Partially parsed address - proceed with validation but warn about missing components
          record.addWarning(config.fullAddressField, `Address parsing incomplete. Missing: ${parsingIssues.join(', ')}. Validation may be less accurate.`);
          logger.debug(`Added warning to record ${record.rowId}: Partial parsing failure. Missing: ${parsingIssues.join(', ')}`);
        }
      }
    }
    
    // Gather field values for caching and comparison
    const currentValues = getAddressFieldValues(record, realFields);
    const recordId = record.rowId.toString();
    recordFieldValues[recordId] = { values: currentValues, realFields };
    
    // Check cache to avoid unnecessary validation
    const subkey = getSmartyCacheSubkey(realFields);
    const lastValidated = getValidatedFieldsFromCache(record, subkey);
    
    // Skip validation if parsing failed or we have a cache hit
    if (parsingFailed || (lastValidated && areAddressValuesEqual(currentValues, lastValidated))) {
      if (parsingFailed) logger.debug(`Skipping record ${recordId} due to parsing failure.`);
      else logger.debug(`Skipping record ${recordId} due to cache hit.`);
      continue;
    }
    
    // Note: We intentionally don't skip when parsingIncomplete is true - proceed with validation
    // but the warning message was already added to inform the user
    
    // Add record to validation lists
    logger.debug(`Record ${recordId} needs validation.`);
    recordsToValidate.push(record);
    validationInputs.push({
      recordId,
      address,
      realFields,
    });
  }
  
  return { validationInputs, recordFieldValues, recordsToValidate };
}

/**
* Applies validation results to records.
* @param recordsToValidate - Records that were validated
* @param validationResults - Map of validation results
* @param recordFieldValues - Field values by record ID
* @param config - SmartyStreets plugin configuration
* @param logger - Logger instance
*/
export async function applyValidationResults(
  recordsToValidate: FlatfileRecord[],
  validationResults: Map<string, RecordValidationResult>,
  recordFieldValues: Record<string, { values: Record<string, string | undefined>, realFields: string[] }>,
  config: SmartyStreetsPluginConfig,
  logger: Logger
): Promise<void> {
  logger.debug('Step 3: Applying validation results');
  
  for (const record of recordsToValidate) {
    const key = record.rowId.toString();
    const result = validationResults.get(key);
    
    if (result) {
      // Apply the validation result to the record
      applyValidationResult(
        record,
        result.validatedAddress,
        config,
        result.error,
        result.realFields,
        result.validationSource,
        logger,
        result.invalidFields,
        result.informationalFootnotes
      );
      
      // Update cache for successful validations
      if (result.validationSource === 'smarty-success') {
        const { values } = recordFieldValues[key];
        setValidatedFieldsInCache(record, getSmartyCacheSubkey(result.realFields), values);
      }
    } else {
      logger.warn(`No validation result found for record ID: ${key}`);
    }
  }
}