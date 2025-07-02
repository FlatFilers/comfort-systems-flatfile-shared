/**
* Validation types and constants for SmartyStreets plugin
*/
import { SmartyHttpResponseItem } from './smarty';
import { AddressInput } from './address';
import { SmartyHttpRequestLookup } from './smarty';

/**
* Validation states used to track the source and status of validation for an address.
*/
export const VALIDATION_STATES = {
  LOCAL_FAILURE: 'local-failure',
  SMARTY_FAILURE: 'smarty-failure',
  SMARTY_SUCCESS: 'smarty-success',
} as const;

export type ValidationSource = typeof VALIDATION_STATES[keyof typeof VALIDATION_STATES];

/**
* Detailed return type for a validated record
*/
export interface RecordValidationResult {
  /**
  * The validated address from SmartyStreets, if validation succeeded.
  */
  validatedAddress: SmartyHttpResponseItem | null;
  
  /**
  * The real field keys from the record that were used for validation.
  */
  realFields: string[];
  
  /**
  * The validation outcome source: local failure, SmartyStreets API failure, or SmartyStreets API success.
  */
  validationSource: ValidationSource;
  
  /**
  * Optional error message if validation failed.
  */
  error: string | null;
  
  /**
  * Optional list of fields that were identified as invalid during local validation.
  */
  invalidFields?: string[];
  
  /**
  * Optional set of footnote codes from SmartyStreets for informational display.
  */
  informationalFootnotes?: Set<string>;
}

/**
* Input data for validating a single record with AddressValidationService.
*/
export interface RecordValidationInput {
  /**
  * A unique identifier for the record.
  */
  recordId: string;
  
  /**
  * The address fields to validate.
  */
  address: AddressInput;
  
  /**
  * The real field keys from the record that were used to extract the address fields.
  */
  realFields: string[];
}

/**
* Result of local address validation.
*/
export interface LocalValidationResult {
  valid: boolean;
  lookup?: SmartyHttpRequestLookup;
  message?: string;
  invalidFields?: string[];
  fieldMessages?: Record<string, string[]>; 
}