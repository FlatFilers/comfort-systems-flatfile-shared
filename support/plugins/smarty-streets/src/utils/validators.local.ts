import { SmartyHttpRequestLookup } from '../types/smarty';
import { getAddressClass, Enums } from 'libaddress-validator';
import { standardizeState } from './validators.state';
import { LocalValidationResult } from '../types/validation';
import { AddressInput } from '../types/address';

/**
* Error structure from libaddress-validator
* This interface captures the specific error format returned by the validation library
*/
interface LibAddressValidatorErrorItem {
  message: string;
  path: string[]; // Typically contains the field name like ['pincode']
}

interface LibAddressValidatorError extends Error { // Extend Error for better compatibility
  errors: LibAddressValidatorErrorItem[];
  // Potentially add other properties if the error object has them
}

/** 
* Type guard to check if an error object matches the expected structure 
* This helps with proper error handling and extraction of field-specific messages
*/
function isLibAddressValidatorError(error: unknown): error is LibAddressValidatorError {
  return (
    error instanceof Error && // Check if it's an Error object
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as any).errors) &&
    (error as any).errors.every(
      (item: any) => typeof item === 'object' && item !== null && 'message' in item && 'path' in item && Array.isArray(item.path)
    )
  );
}

/**
* Function type for address validators.
*/
export type AddressValidator = (address: AddressInput) => LocalValidationResult;

/**
* Performs detailed local validation on an address using libaddress-validator.
* @param address - The address to validate
* @returns A LocalValidationResult with validation details
*/
export function performDetailedLocalValidation(address: AddressInput): LocalValidationResult {
  // Step 1: Check for missing required fields
  const missingFields: string[] = [];
  const invalidFields: string[] = [];
  
  // Check for required fields
  if (!address.street) missingFields.push('street');
  if (!address.city) missingFields.push('city');
  if (!address.state) missingFields.push('state');
  if (!address.zip) missingFields.push('zip');
  
  if (missingFields.length > 0) {
    // If any required fields are missing, fail early
    return {
      valid: false,
      message: `Local validation error: Address is missing required fields (${missingFields.join(', ')})`,
      invalidFields: missingFields,
    };
  }
  
  // Step 2: Get the correct AddressClass for US
  const AddressClass = getAddressClass("UnitedStates") as { new(data: Record<string, unknown>): unknown };
  
  // Use the standardizeState function from validators.state
  const stateResult = standardizeState(address.state);
  
  if (!stateResult.valid) {
    return {
      valid: false,
      message: stateResult.message,
      invalidFields: ['state'],
    };
  }
  
  // Build address data for validation with the standardized state name
  const addressData = {
    fullName: "Test User",      // required by libaddress-validator
    mobileNumber: "0000000000", // required by libaddress-validator
    isDefault: false,           // required by libaddress-validator
    address: String(address.street),
    city: String(address.city),
    state: stateResult.standardizedName,
    pincode: String(address.zip),
  };
  
  try {
    // Step 3: Attempt to construct the address class (throws if invalid)
    new AddressClass(addressData);
  } catch (err) {
    let invalidFields: string[] | undefined = undefined;
    let message: string | undefined = undefined;
    const fieldMessages: Record<string, string[]> = {};
    
    // Use the type guard to check the error structure
    if (isLibAddressValidatorError(err)) {
      const pathMap: Record<string, keyof AddressInput> = {
        pincode: 'zip',
        address: 'street',
        city: 'city',
        state: 'state',
      };
      
      // Map error paths to AddressInput keys and filter to include only valid address field names
      const mappedFields = err.errors
      .map(e => {
        const path = e.path && e.path[0];
        return pathMap[path] || path;
      })
      .filter((f): f is keyof AddressInput => !!f && ['street', 'city', 'state', 'zip'].includes(f));
      
      // Only set invalidFields if we have valid mapped fields
      if (mappedFields.length > 0) {
        invalidFields = mappedFields;
      }
      
      // Group messages by field for clearer feedback
      err.errors.forEach(e => {
        const path = e.path && e.path[0];
        const field = pathMap[path] || path || 'general';
        const cleanMessage = e.message || 'invalid';
        if (!fieldMessages[field]) {
          fieldMessages[field] = [];
        }
        fieldMessages[field].push(cleanMessage);
      });
      
      // Format a cleaner, field-grouped message
      message = Object.entries(fieldMessages)
      .map(([field, msgs]) => {
        // Join multiple messages for the same field with commas
        const joinedMsgs = msgs.join(', ');
        return `${field}: ${joinedMsgs}`;
      })
      .join('; ');
      
      // Use the general error message if specific parsing fails somehow
      if (!message) {
        message = err.message || 'Local validation failed due to invalid fields.';
      }
      
      // Add common helpful tips based on which fields failed
      if (invalidFields) {
        const tipsByField: Record<keyof AddressInput, string> = {
          street: 'Ensure the street address includes a number and street name',
          city: 'Check that the city name is spelled correctly',
          state: 'Use a valid two-letter state code (e.g., CA for California)',
          zip: 'ZIP code should be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)',
          secondary: 'Add a valid apartment, suite, or unit number if required'
        };
        
        const relevantTips = invalidFields
        .map(field => tipsByField[field])
        .filter(Boolean);
        
        if (relevantTips.length > 0) {
          message += `. Tips: ${relevantTips.join('. ')}`;
        }
      }
    } else if (err instanceof Error) {
      // Handle standard Errors
      message = `Local validation error: ${err.message}`;
      
      // Try to guess which fields might be problematic based on the error message
      const errorMsg = err.message.toLowerCase();
      const possibleFields: (keyof AddressInput)[] = [];
      
      if (errorMsg.includes('street') || errorMsg.includes('address')) possibleFields.push('street');
      if (errorMsg.includes('city')) possibleFields.push('city');
      if (errorMsg.includes('state')) possibleFields.push('state');
      if (errorMsg.includes('zip') || errorMsg.includes('postal') || errorMsg.includes('pincode')) possibleFields.push('zip');
      
      if (possibleFields.length > 0) {
        invalidFields = possibleFields;
      }
    } else {
      // Handle other unknown throwables
      message = `Local validation error: ${String(err)}`;
    }
    
    return {
      valid: false,
      message,
      invalidFields: invalidFields && invalidFields.length > 0 ? invalidFields : undefined, // Only return if non-empty
      fieldMessages: Object.keys(fieldMessages).length > 0 ? fieldMessages : undefined 
    };
  }
  
  // If all checks pass, return success
  const lookup: SmartyHttpRequestLookup = {};
  if (address.street) lookup.street = address.street;
  if (address.city) lookup.city = address.city;
  if (address.state) lookup.state = address.state;
  if (address.zip) lookup.zipcode = address.zip;
  if (address.secondary) lookup.secondary = address.secondary;
  lookup.match = 'enhanced';
  // Default to multiple candidates, delivery point validation should be handled by the SmartyHttpClient
  lookup.candidates = 5;
  return { valid: true, lookup };
}

/**
* Create a SmartyHttpRequestLookup from AddressInput, without validation.
* Returns null if required fields are missing.
* @param address - The address input.
* @param options - Optional lookup options.
* @returns SmartyHttpRequestLookup or null if required fields are missing.
*/
export function createSmartyLookup(
  address: AddressInput,
  options?: { match?: 'strict' | 'enhanced' | 'invalid'; candidates?: number }
): SmartyHttpRequestLookup | null {
  const lookup: SmartyHttpRequestLookup = {
    street: address.street,
    city: address.city,
    state: address.state,
    zipcode: address.zip,
    secondary: address.secondary,
    match: options?.match || 'enhanced',
    candidates: options?.candidates ?? 5,
  };
  return lookup;
}