import { FlatfileRecord } from "@flatfile/plugin-record-hook";
import { INFORMATIONAL_FOOTNOTES, SECONDARY_FIELD_SYMBOL } from './smarty.codes';
import { ValidationSource, VALIDATION_STATES, RecordValidationResult } from '../types/validation';
import type { AddressInput, ExtractedAddress } from "../types/address";
import type { SmartyStreetsPluginConfig, FieldsConfig } from "../types/config";
import type { SmartyHttpResponseItem } from "../types/smarty";
import type { Logger } from "./plugin.logger";
import { getFormattedAddressComponents } from './helpers.formatter';
import parseAddress from "parse-address";

/**
* Checks if a field key is a static value (e.g., <<USA>>).
* @param fieldKey - The field key to check.
* @returns True if the field is static, false otherwise.
*/
export function isStaticField(fieldKey?: string): boolean {
  // Static fields are wrapped in <<...>> and are not dynamic record fields
  return !!fieldKey && /^<<.+?>>$/.test(fieldKey);
}

/**
* Helper to extract a value from a record or as a static value.
* @param record - The Flatfile record.
* @param fieldKey - The field key or static value.
* @returns The value as a string, or undefined.
*/
export function getFieldValue(record: FlatfileRecord, fieldKey?: string): string | undefined {
  if (!fieldKey) return undefined;
  // If the fieldKey is a static value (e.g., <<USA>>), extract the value
  const staticMatch = fieldKey.match(/^<<(.+?)>>$/);
  if (staticMatch) {
    return staticMatch[1];
  }
  // Otherwise, get the value from the record
  return record.get(fieldKey)?.toString().trim();
}

/**
* Extracts address data and the real field keys from a Flatfile record based on plugin config.
* 
* @param record - The Flatfile record.
* @param config - The plugin configuration.
* @returns The extracted address and real field keys.
*/
export function extractAddressAndFields(record: FlatfileRecord, config: SmartyStreetsPluginConfig): ExtractedAddress {
  // If using a single full address field, parse it into components
  if ('fullAddressField' in config && config.fullAddressField) {
    const full = record.get(config.fullAddressField)?.toString() || "";
    
    // Initial check for very short or empty inputs
    if (full.trim().length < 5) {
      return {
        address: {},
        realFields: [config.fullAddressField],
      };
    }
    
    const parsed = parseAddress.parseLocation(full) || {};
    
    // Directly extract components from parsed result
    const street = [
      parsed.number,
      parsed.prefix,
      parsed.street,
      parsed.type,
      parsed.suffix
    ].filter(Boolean).join(" ") || undefined; // Use undefined if no street parts
    
    const secondary = [
      parsed.sec_unit_type,
      parsed.sec_unit_num
    ].filter(Boolean).join(" ") || undefined; // Use undefined if no secondary parts
    
    // Determine parsing status
    const parsingIssues: string[] = [];
    if (!street) parsingIssues.push('street');
    if (!parsed.city) parsingIssues.push('city');
    if (!parsed.state) parsingIssues.push('state');
    if (!parsed.zip) parsingIssues.push('zip');
    
    const parsingIncomplete = parsingIssues.length > 0;
    // Consider parsing "failed" if ALL components are missing, or if street AND another critical component are missing
    const parsingFailed = parsingIssues.length === 4 || 
    (parsingIssues.includes('street') && parsingIssues.length > 1);
    
    return {
      address: {
        street: street, // Primary street parts only
        city: parsed.city || undefined,
        state: parsed.state || undefined,
        zip: parsed.zip || undefined,
        secondary: secondary, // Secondary parts only
      },
      realFields: [config.fullAddressField],
      parsed, // Keep raw parsed data
      parsingFailed,
      parsingIncomplete: parsingIncomplete && !parsingFailed, // Only mark incomplete if not already failed
      parsingIssues: parsingIssues.length > 0 ? parsingIssues : undefined
    };
  } else if ('fields' in config && config.fields) {
    // If using separate address fields, extract each one
    const streetValue    = getFieldValue(record, config.fields.street);
    const cityValue      = getFieldValue(record, config.fields.city);
    const stateValue     = getFieldValue(record, config.fields.state);
    const zipValue       = getFieldValue(record, config.fields.zip);
    const secondaryValue = getFieldValue(record, config.fields.street_secondary);
    
    // Prepare the address components
    const address: AddressInput = {
      street: streetValue,
      city:   cityValue,
      state:  stateValue  || undefined, // State will be validated and formatted
      zip:    zipValue    || undefined, // ZIP will be validated and formatted
      secondary: secondaryValue || undefined, // Secondary address unit
    };
    
    // Only include real (non-static) fields for validation and error reporting
    const realFields = [config.fields.street, config.fields.city, config.fields.state, config.fields.zip, config.fields.street_secondary]
    .filter((f): f is string => Boolean(f) && !isStaticField(f));
    
    return { address, realFields };
  }
  
  // Return default empty values if we somehow got here (should be prevented by earlier configuration validation)
  return { address: {}, realFields: [] };
}

/**
* Gets the current address field values from a record as an object.
* @param record - The Flatfile record.
* @param realFields - The real field keys.
* @returns Object mapping field keys to their values.
*/
export function getAddressFieldValues(record: FlatfileRecord, realFields: string[]): Record<string, string | undefined> {
  // Build an object of field values for the given realFields
  const values: Record<string, string | undefined> = {};
  for (const field of realFields) {
    values[field] = record.get(field)?.toString().trim();
  }
  return values;
}

/**
* Determines the primary field to attach messages/errors to based on config and real fields.
* @param config - The plugin configuration.
* @param realFields - The actual fields from the record used for the address.
* @returns The key of the primary field, or undefined if none found.
*/
export function determinePrimaryField(config: SmartyStreetsPluginConfig, realFields: string[]): string | undefined {
  if ('fullAddressField' in config && config.fullAddressField && realFields.includes(config.fullAddressField)) {
    return config.fullAddressField;
  } else if ('fields' in config && config.fields) {
    // Select the first real field defined in the config among street, city, state, zip
    const potentialFields = [config.fields.street, config.fields.city, config.fields.state, config.fields.zip];
    return potentialFields.find(f => f && realFields.includes(f));
  }
  return undefined;
}

/**
* Applies the validated address data to the record when transform is enabled.
* @param record - The Flatfile record.
* @param validatedAddress - The validated address data from SmartyStreets.
* @param config - The plugin configuration.
* @param realFields - The actual fields from the record used for the address.
*/
export function applyTransformation(
  record: FlatfileRecord,
  validatedAddress: SmartyHttpResponseItem,
  config: SmartyStreetsPluginConfig,
  realFields: string[]
): void {
  const formatted = getFormattedAddressComponents(validatedAddress, config.options);
  
  if ('fields' in config && config.fields) {
    if (config.fields.street && realFields.includes(config.fields.street) && formatted.primary_street) {
      record.set(config.fields.street, formatted.primary_street);
    }
    if (config.fields.city && realFields.includes(config.fields.city) && formatted.city) {
      record.set(config.fields.city, formatted.city);
    }
    if (config.fields.state && realFields.includes(config.fields.state) && formatted.state) {
      record.set(config.fields.state, formatted.state);
    }
    if (config.fields.zip && realFields.includes(config.fields.zip) && formatted.zip) {
      record.set(config.fields.zip, formatted.zip);
    }
    if (config.fields.street_secondary && realFields.includes(config.fields.street_secondary)) {
      if (formatted.street_secondary) {
        record.set(config.fields.street_secondary, formatted.street_secondary);
      } else if (validatedAddress.components?.secondary_number) {
        // If SmartyStreets returned a secondary_number directly, use it
        // This handles cases where the formatter might not have processed it correctly
        const secondary = validatedAddress.components.secondary_designator 
        ? `${validatedAddress.components.secondary_designator} ${validatedAddress.components.secondary_number}`
        : validatedAddress.components.secondary_number;
        record.set(config.fields.street_secondary, secondary);
      }
    }
    
    if (config.fields.state && realFields.includes(config.fields.state) && config.options!.includeRDI && formatted.rdi) {
      record.addInfo(config.fields.state, `RDI: ${formatted.rdi}`);
    }
  } else if ('fullAddressField' in config && config.fullAddressField && realFields.includes(config.fullAddressField)) {
    // Use the pre-formatted 'full' string if available
    if (formatted.full) {
      const currentValue = record.get(config.fullAddressField)?.toString() || "";
      if (currentValue !== formatted.full) {
        record.set(config.fullAddressField, formatted.full);
      }
    }
  }
}

/**
* Checks for differences between input and validated address and adds a message if transform is disabled.
* @param record - The Flatfile record.
* @param validatedAddress - The validated address data from SmartyStreets.
* @param config - The plugin configuration.
* @param realFields - The actual fields from the record used for the address.
*/
export function applyValidationMessage(
  record: FlatfileRecord,
  validatedAddress: SmartyHttpResponseItem,
  config: SmartyStreetsPluginConfig,
  realFields: string[],
  logger: Logger
): void {
  const formatted = getFormattedAddressComponents(validatedAddress, config.options);
  const messageLevel = config.options!.messageLevel; // Defaults handled earlier
  let needsMessage = false;
  
  const validatedAddressString = formatted.full; // Use the pre-formatted string
  
  if (!validatedAddressString) {
    // Cannot compare if essential components were missing in the validated response
    logger.warn(`Record ${record.rowId}: Missing required components in validated address for comparison.`);
    return;
  }
  
  if ('fields' in config && config.fields) {
    // Construct current address components from record for comparison
    const currentStreet = getFieldValue(record, config.fields.street);
    const currentCity = getFieldValue(record, config.fields.city);
    const currentState = getFieldValue(record, config.fields.state);
    const currentZip = getFieldValue(record, config.fields.zip);
    
    // Compare each relevant field's current value against the formatted value from SmartyStreets.
    // A message is needed if any configured field exists, was used in validation (is in realFields),
    // has a validated value, and that value differs from the current value.
    const checkField = (fieldName: string | undefined, validatedValue: string | undefined, currentValue: string | undefined): boolean => {
      return !!fieldName && realFields.includes(fieldName) && typeof validatedValue !== 'undefined' && validatedValue !== currentValue;
    }
    
    const currentSecondary = getFieldValue(record, config.fields.street_secondary);
    
    if (checkField(config.fields.street, formatted.primary_street, currentStreet) ||
    checkField(config.fields.city, formatted.city, currentCity) ||
    checkField(config.fields.state, formatted.state, currentState) ||
    checkField(config.fields.zip, formatted.zip, currentZip) || 
    checkField(config.fields.street_secondary, formatted.street_secondary, currentSecondary)) {
      needsMessage = true;
    }
    
  } else if ('fullAddressField' in config && config.fullAddressField && realFields.includes(config.fullAddressField)) {
    // When using a single field, compare the current field value directly
    // with the fully formatted address string from SmartyStreets.
    const currentFull = record.get(config.fullAddressField)?.toString() || "";
    if (currentFull !== validatedAddressString) {
      needsMessage = true;
    }
  }
  
  if (needsMessage) {
    const msg = `Address differs from validated result: ${validatedAddressString}`;
    const primaryField = determinePrimaryField(config, realFields);
    
    if (primaryField) {
      switch (messageLevel) {
        case 'error': record.addError(primaryField, msg); break;
        case 'warn': record.addWarning(primaryField, msg); break;
        case 'info': record.addInfo(primaryField, msg); break;
      }
    } else {
      logger.warn(`Could not determine primary field for validation message on record ID ${record.rowId}. Real fields: ${realFields.join(', ')}`);
    }
  }
}

/**
* Applies error/warning/info messages to the record when validation fails.
* @param record - The Flatfile record.
* @param config - The plugin configuration.
* @param error - The error message.
* @param realFields - The actual fields from the record used for the address.
* @param validationSource - The source of the validation failure.
* @param invalidFields - Optional list of fields identified as invalid during local validation.
*/
export function handleFailedValidation(
  record: FlatfileRecord,
  config: SmartyStreetsPluginConfig,
  error: string | null,
  realFields: string[],
  validationSource: Extract<ValidationSource, typeof VALIDATION_STATES.LOCAL_FAILURE | typeof VALIDATION_STATES.SMARTY_FAILURE>,
  logger: Logger,
  invalidFields?: string[]
): void {
  const message = error || (validationSource === VALIDATION_STATES.LOCAL_FAILURE ? 'Local address validation failed' : 'SmartyStreets validation failed');
  const level = config.options!.messageLevel; // Defaults handled earlier 
  
  let fieldsToApply: string[];
  
  // Determine which fields should receive the validation message
  if ('fullAddressField' in config && config.fullAddressField && realFields.includes(config.fullAddressField)) {
    // Case 1: Using a single full address field - apply messages specifically to that field.
    fieldsToApply = [config.fullAddressField];
  } else if (Array.isArray(invalidFields) && invalidFields.length > 0) {
    // Case 2: Specific invalid fields identified (local or symbolic 'secondary')
    if (invalidFields.includes(SECONDARY_FIELD_SYMBOL)) {
      // Translate 'secondary' symbol to actual configured fields
      const targetFields: string[] = [];
      if ('fields' in config && config.fields && config.fields.street_secondary && realFields.includes(config.fields.street_secondary)) {
        targetFields.push(config.fields.street_secondary);
      }
      // Also potentially target primary street if secondary is missing/invalid but not separately mapped
      if ('fields' in config && config.fields && config.fields.street && realFields.includes(config.fields.street)) {
        // Avoid adding street if secondary was already added
        if (targetFields.length === 0) {
          targetFields.push(config.fields.street);
        }
      }
      fieldsToApply = targetFields;
      logger.debug(`Applying secondary error to fields: ${fieldsToApply.join(', ')}`);
    } else {
      // Assume specific field keys (e.g., from local validation)
      fieldsToApply = invalidFields.filter(f => realFields.includes(f));
    }
    
    // Fallback if translation/filtering resulted in no applicable fields
    if (fieldsToApply.length === 0) {
      logger.warn(`Record ID ${record.rowId}: Invalid fields [${invalidFields.join(', ')}] reported but none map to configured real fields [${realFields.join(', ')}]. Applying message to all real fields.`);
      fieldsToApply = realFields;
    }
  } else {
    // Case 3: Validation failed without specific field info.
    // Apply messages broadly to all fields involved in this address configuration.
    fieldsToApply = realFields;
  }
  
  // If fieldsToApply is somehow still empty, log a warning.
  if (fieldsToApply.length === 0) {
    // This condition should theoretically be unreachable due to the logic above.
    logger.warn(`Could not determine fields to apply validation failure message for record ID ${record.rowId}. Real fields: ${realFields.join(', ')}, Invalid fields: ${invalidFields?.join(', ')}`);
    return;
  }
  
  // Apply the message to the determined fields
  fieldsToApply.forEach(field => {
    switch (level) {
      case 'error': record.addError(field, message); break;
      case 'warn': record.addWarning(field, message); break;
      case 'info': record.addInfo(field, message); break;
    }
  });
}

/**
* Applies the validation result to the Flatfile record, adding errors, warnings, or info as needed.
* Optionally transforms the record if configured and validation succeeded.
* @param record - The Flatfile record.
* @param validatedAddress - The validated address from SmartyStreets, or null.
* @param config - The plugin configuration.
* @param error - Error message, if any.
* @param realFields - The real field keys used for address.
* @param validationSource - The source of validation result.
* @param invalidFields - Optional list of invalid fields.
*/
export function applyValidationResult(
  record: FlatfileRecord,
  validatedAddress: SmartyHttpResponseItem | null,
  config: SmartyStreetsPluginConfig, // Ensure config includes resolved options
  error: string | null,
  realFields: string[],
  validationSource: ValidationSource,
  logger: Logger,
  invalidFields?: string[],
  informationalFootnotes?: Set<string>
) {
  const transformEnabled = config.options!.transform; // Defaults handled earlier
  const addFootnoteMessages = config.options!.addFootnoteMessages; // Default is true
  
  // Apply any informational footnotes if requested
  if (validationSource === VALIDATION_STATES.SMARTY_SUCCESS && validatedAddress && informationalFootnotes && addFootnoteMessages) {
    // Apply informational footnote messages to appropriate fields
    informationalFootnotes.forEach(footnoteCode => {
      const infoDetails = INFORMATIONAL_FOOTNOTES.get(footnoteCode);
      if (infoDetails) {
        const { msg, fieldHint } = infoDetails;
        let targetField: string | undefined;
        
        // Try to determine the most relevant field for this footnote
        if (
          fieldHint &&
          'fields' in config &&
          config.fields &&
          config.fields[fieldHint] && 
          realFields.includes(config.fields[fieldHint])
        ) {
          // Use the hinted field if it exists in the config and real fields
          targetField = config.fields[fieldHint];
        } else {
          // Fall back to primary field
          targetField = determinePrimaryField(config, realFields);
        }
        
        if (targetField) {
          record.addInfo(targetField, msg);
        }
      }
    });
  }
  
  if (validationSource === VALIDATION_STATES.SMARTY_SUCCESS && validatedAddress) {
    if (transformEnabled) {
      applyTransformation(record, validatedAddress, config, realFields);
    } else {
      applyValidationMessage(record, validatedAddress, config, realFields, logger);
    }
    
    if (invalidFields?.includes(SECONDARY_FIELD_SYMBOL)) {
      logger.debug(`Record ${record.rowId}: Applying specific message for secondary address issue.`);
      // Call handleFailedValidation specifically for the secondary issue
      handleFailedValidation(
        record,
        config,
        error, // Pass the specific secondary error message stored in the result's error property
        realFields,
        VALIDATION_STATES.SMARTY_FAILURE, // Use SMARTY_FAILURE context to trigger messageLevel application
        logger,
        [SECONDARY_FIELD_SYMBOL] // Pass *only* the secondary symbol to target the correct field(s)
      );
    }
  } else if (validationSource === VALIDATION_STATES.LOCAL_FAILURE || validationSource === VALIDATION_STATES.SMARTY_FAILURE) {
    handleFailedValidation(record, config, error, realFields, validationSource, logger, invalidFields);
  } else {
    // Should not happen - validationSource is unexpected
    logger.warn(`Unexpected validationSource "${validationSource}" for record ID ${record.rowId}`);
  }
}