/**
* Address structure types for SmartyStreets plugin
*/

/**
* Address input fields for validation
*/
export interface AddressInput {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  secondary?: string;
}

/**
* Structure for extracted address and the real fields used.
*/
export interface ExtractedAddress {
  address: AddressInput;
  realFields: string[];
  parsed?: Record<string, any>; // Raw parsed address data (for diagnostics and advanced processing)
  parsingFailed?: boolean;      // Indicates complete failure
  parsingIncomplete?: boolean;  // Indicates partial failure (but proceed anyway)
  parsingIssues?: string[];     // List of components potentially missed
}