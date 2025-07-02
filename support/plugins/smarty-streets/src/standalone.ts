import parseAddress from "parse-address";
import { AddressInput } from './types/address';
import { performDetailedLocalValidation } from './utils/validators.local';
import { AddressValidationService } from './services/address-validation.service';
import { SmartyStreetsOptions, DEFAULT_SMARTY_STREETS_OPTIONS } from './types/config';
import { Logger, LogLevel } from './utils/plugin.logger';
import { RecordValidationInput, VALIDATION_STATES, RecordValidationResult } from './types/validation';
import { ValidateAddressResult } from './types/plugin';
import { getFormattedAddressComponents } from './utils/helpers.formatter';
import { SECONDARY_FIELD_SYMBOL } from './utils/smarty.codes';

const STANDALONE_RECORD_ID = "standalone";

/**
* Standalone address validation utility using SmartyStreets API for US addresses.
* 
* @param address - Address as string or AddressInput object.
* @param options - SmartyStreets options.
* @returns Validation result: valid, valid with transformation, or invalid with message.
*/
export async function validateAddress(
  address: string | AddressInput,
  options?: SmartyStreetsOptions
): Promise<ValidateAddressResult> {
  // 1. Resolve Options and Create Logger
  const resolvedOptions = {
    ...DEFAULT_SMARTY_STREETS_OPTIONS,
    ...options,
    logLevel: options?.logLevel || 'error' // Use error-only logging for standalone validation
  };
  
  const logger = new Logger('SmartyStandalone', resolvedOptions.logLevel as LogLevel);
  logger.debug('Starting standalone address validation');
  
  // 2. Check Auth
  const authId = resolvedOptions.authId || process.env.SMARTY_AUTH_ID;
  const authToken = resolvedOptions.authToken || process.env.SMARTY_AUTH_TOKEN;
  if (!authId || !authToken) {
    logger.error("Standalone validation failed: Missing credentials.");
    return { valid: false, message: "Authentication credentials missing." };
  }
  
  resolvedOptions.authId = authId;
  resolvedOptions.authToken = authToken;
  
  // --- Minimal, clear address object handling ---
  // Store the normalized/parsed object for reporting/comparison
  let workingAddress: AddressInput;
  let originalAddress: AddressInput;
  if (typeof address === "string") {
    const addressString = address;
    if (addressString.trim().length < 5) {
      return {
        valid: false,
        message: "Address string is too short for validation",
        suggestedFixes: {
          format: "Provide a complete address (e.g., '123 Main St, Anytown, CA 12345')"
        }
      };
    }
    const parsed = parseAddress.parseLocation(addressString) || {};
    if (!parsed.street && !parsed.city && !parsed.state && !parsed.zip) {
      let suggestion = '';
      if (!addressString.includes(',')) {
        suggestion = "Use commas to separate address components (e.g., '123 Main St, Anytown, CA 12345')";
      } else if (!addressString.match(/\d+/)) {
        suggestion = "Address should typically start with a street number";
      } else {
        suggestion = "Use a standard format like: 'Street Address, City, State ZIP'";
      }
      return {
        valid: false,
        message: "Could not parse address components from the provided string",
        suggestedFixes: {
          format: suggestion
        }
      };
    }
    workingAddress = {
      street: [parsed.number, parsed.prefix, parsed.street, parsed.type, parsed.suffix].filter(Boolean).join(" ") || undefined,
      secondary: [parsed.sec_unit_type, parsed.sec_unit_num].filter(Boolean).join(" ") || undefined,
      city: parsed.city || undefined,
      state: parsed.state || undefined,
      zip: parsed.zip || undefined,
    };
    originalAddress = { ...workingAddress }; // shallow copy for reporting/comparison
  } else {
    // Shallow copies for processing, never mutate the original
    workingAddress = { ...address };
    originalAddress = { ...address }; 
  }
  
  // Local pre-validation (if enabled) using the refined local-validator
  if (resolvedOptions.preprocess) {
    logger.debug('Performing local pre-validation (standalone)');
    const localResult = performDetailedLocalValidation(workingAddress);
    if (!localResult.valid) {
      logger.debug(`Local validation failed: ${localResult.message}`);
      const suggestedFixes = generateSuggestionsForLocalFailure(localResult.invalidFields, localResult.fieldMessages);
      return {
        valid: false,
        invalidFields: localResult.invalidFields,
        message: localResult.message || "Local address validation failed",
        suggestedFixes: suggestedFixes
      };
    }
    logger.debug('Local pre-validation passed');
  }
  
  // Instantiate Service
  logger.debug('Proceeding to SmartyStreets validation (standalone)');
  const service = new AddressValidationService(resolvedOptions, logger);
  
  // Prepare Input for the service
  const validationInput: RecordValidationInput = {
    recordId: STANDALONE_RECORD_ID,
    address: workingAddress,
    realFields: (Object.keys(workingAddress) as Array<keyof AddressInput>)
      .filter(key => workingAddress[key] != null && workingAddress[key] !== ''),
  };
  
  // Validate Address via Service
  const results = await service.validateRecords([validationInput]);
  const result: RecordValidationResult | undefined = results.get(STANDALONE_RECORD_ID); // Get the structured result
  
  if (!result) {
    logger.error("Validation failed: No result returned from AddressValidationService for ID 'standalone'");
    return { valid: false, message: "Unknown error during validation service call" };
  }
  
  // Start processing the RecordValidationResult 'result'
  if (result.validationSource === VALIDATION_STATES.SMARTY_FAILURE) {
    logger.debug(`SmartyStreets validation failed (standalone): ${result.error}`);
    const suggestedFixes = generateSuggestionsForSmartyFailure(result.error, result.invalidFields);
    return {
      valid: false,
      message: result.error || "SmartyStreets validation failed",
      suggestedFixes
    };
  }
  
  // Process the Smarty-success result
  if (result.validationSource === VALIDATION_STATES.SMARTY_SUCCESS) {
    const va = result.validatedAddress;
    if (!va || !va.components) {
      logger.error("Validation inconsistency: Smarty-success reported but no validated address/components found");
      return { valid: false, message: "Validation successful but no address data returned by SmartyStreets." };
    }
    const formatted = getFormattedAddressComponents(va, resolvedOptions);
    const transformation: Partial<AddressInput> = {};
    if (formatted.primary_street && formatted.primary_street !== workingAddress.street) {
      transformation.street = formatted.primary_street;
    }
    if (formatted.street_secondary !== workingAddress.secondary && (formatted.street_secondary !== undefined || workingAddress.secondary !== undefined)) {
      transformation.secondary = formatted.street_secondary;
    }
    if (formatted.city && formatted.city !== workingAddress.city) {
      transformation.city = formatted.city;
    }
    if (formatted.state && formatted.state !== workingAddress.state) {
      transformation.state = formatted.state;
    }
    if (formatted.zip && formatted.zip !== workingAddress.zip) {
      transformation.zip = formatted.zip;
    }
    if (Object.keys(transformation).length === 0) {
      return { valid: true, original: originalAddress };
    }
    if (typeof address === "string" && formatted.full) {
      if (address !== formatted.full) {
        return { valid: true, transformation: formatted.full, original: originalAddress };
      } else {
        return { valid: true, original: originalAddress };
      }
    } else {
      return { valid: true, transformation, original: originalAddress };
    }
  }
  
  // Fallback for unexpected validationSource from the service result (e.g., if local failure wasn't caught above)
  logger.warn(`Unexpected validationSource in standalone result processing: ${result.validationSource}`);
  return { valid: false, message: `Internal error: Unexpected validation state (${result.validationSource})` };
}

/**
* Maps local validation failures to suggested fixes for the user
* @param invalidFields Array of field names that failed validation
* @param fieldMessages Detailed messages per field from validation
* @returns Record mapping field names to fix suggestions
*/
function generateSuggestionsForLocalFailure(
  invalidFields?: string[],
  fieldMessages?: Record<string, string[]> 
): Record<string, string> {
  const suggestedFixes: Record<string, string> = {};
  
  if (fieldMessages && Object.keys(fieldMessages).length > 0) {
    // Use detailed messages first
    for (const [field, messages] of Object.entries(fieldMessages)) {
      // Map libaddress-validator internal names ('pincode', 'address') back to user-facing names ('zip', 'street') if needed
      const userField = field === 'pincode' ? 'zip' : field === 'address' ? 'street' : field;
      if (['street', 'city', 'state', 'zip'].includes(userField)) { // Only include relevant address fields
        // Combine messages and provide a slightly more descriptive suggestion
        suggestedFixes[userField] = `Check ${userField}: ${messages.join(', ')}`;
      } else if (userField === 'general' && messages.length > 0) {
        suggestedFixes.general = messages.join('; ');
      }
    }
  }
  
  // Fallback or supplement with invalidFields if fieldMessages was missing or incomplete
  if (invalidFields && invalidFields.length > 0) {
    invalidFields.forEach(field => {
      // Only add suggestions for fields *not* already covered by fieldMessages and handle symbolic secondary later
      if (!suggestedFixes[field] && field !== SECONDARY_FIELD_SYMBOL) {
        switch (field) {
          case 'street': suggestedFixes.street = suggestedFixes.street || "Check street address format/validity."; break;
          case 'city': suggestedFixes.city = suggestedFixes.city || "Check city name validity."; break;
          case 'state': suggestedFixes.state = suggestedFixes.state || "Use a valid two-letter state code or full state name."; break;
          case 'zip': suggestedFixes.zip = suggestedFixes.zip || "Use a valid 5-digit ZIP code."; break;
          default: suggestedFixes.general = (suggestedFixes.general ? suggestedFixes.general + '; ' : '') + `Check field: ${field}`; break;
        }
      }
    });
  }
  
  // Generic fallback if absolutely nothing was generated
  if (Object.keys(suggestedFixes).length === 0) {
    suggestedFixes.general = "Check all address components for completeness and accuracy based on the validation message.";
  }
  
  return suggestedFixes;
}

/**
* Generate fix suggestions based on SmartyStreets API error
* @param error Error message from SmartyStreets
* @param invalidFields Optional array of invalid field names
* @returns Record mapping field names to fix suggestions
*/
function generateSuggestionsForSmartyFailure(error: string | null, invalidFields?: string[]): Record<string, string> {
  const suggestedFixes: Record<string, string> = {};
  const errorMessage = error || '';
  const errorLower = errorMessage.toLowerCase(); 

  // Prioritize symbolic field for secondary issues if provided
  if (invalidFields?.includes(SECONDARY_FIELD_SYMBOL)) {
      if (errorLower.includes("missing secondary")) {
          suggestedFixes.secondary = "This address requires an apartment, suite, or unit number.";
      } else if (errorLower.includes("unknown secondary")) {
          suggestedFixes.secondary = "The apartment, suite, or unit number provided is not recognized for this address.";
      } else {
          suggestedFixes.secondary = "Add or correct the apartment, suite, or unit number.";
      }
  } 
  // Check common error patterns if no specific invalidFields or if secondary wasn't the primary issue reported
  else if (errorLower.includes("missing secondary")) {
      suggestedFixes.secondary = "This address requires an apartment, suite, or unit number.";
  } else if (errorLower.includes("unknown secondary")) {
      suggestedFixes.secondary = "The apartment, suite, or unit number provided is not recognized for this address.";
  } else if (errorLower.includes("secondary") || errorLower.includes("apt") || errorLower.includes("suite")) {
      suggestedFixes.secondary = "Check the secondary address information (apartment, suite, etc.).";
  } else if (errorLower.includes("ambiguous address")) {
      suggestedFixes.general = "Address could match multiple locations. Add more details like ZIP code or apartment/suite number.";
  } else if (errorLower.includes("invalid city/state/zip")) {
      suggestedFixes.general = "The city, state, and ZIP code combination is invalid. Check these components for accuracy.";
      suggestedFixes.zip = suggestedFixes.zip || "Ensure ZIP code matches the city and state provided."; 
  } else if (errorLower.includes("zip code does not match city/state")) {
      suggestedFixes.zip = "ZIP code does not match the city and state. Check for typos or use the correct ZIP code.";
  } else if (errorLower.includes("invalid state")) {
      suggestedFixes.state = "Use a valid two-letter state code (e.g., CA for California).";
  } else if (errorLower.includes("invalid zip code")) {
      suggestedFixes.zip = "Use a valid 5-digit ZIP code.";
  } else if (errorLower.includes("address not found")) {
      suggestedFixes.general = "Address could not be found. Check for typos and ensure all components are accurate.";
  } else {
      if (errorMessage) {
          suggestedFixes.general = "Validation failed. Check address components for accuracy.";
      }
  }

  if (Object.keys(suggestedFixes).length === 0 && errorMessage) {
    suggestedFixes.general = "Check address validity and components based on the API response.";
  }

  if (error) {
      const hasOnlyGeneral = Object.keys(suggestedFixes).length === 1 && suggestedFixes.general;
      const suggestionText = Object.values(suggestedFixes).join(' ');
      if (hasOnlyGeneral || !suggestionText.includes(error)) {
          suggestedFixes.details = `SmartyStreets reason: ${error}`;
      }
  }

  return suggestedFixes;
}
