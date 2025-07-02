/**
* SmartyStreets plugin configuration types
*/

/**
* SmartyStreets plugin options
*/
export interface SmartyStreetsOptions {
  authId?: string;
  authToken?: string;
  validateDeliveryPoint?: boolean;
  transform?: boolean;
  includeZipPlus4?: boolean;
  includeRDI?: boolean;
  messageLevel?: 'error' | 'warn' | 'info';
  preprocess?: boolean;
  batchSize?: number;           // Maximum number of records to send in a single API request
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // Control logging verbosity
  addFootnoteMessages?: boolean; // Whether to add informational footnote messages
}

/**
* Default plugin options
*/
export const DEFAULT_SMARTY_STREETS_OPTIONS: Required<Omit<SmartyStreetsOptions, 'authId' | 'authToken'>> = {
  validateDeliveryPoint: false,
  transform: true,
  includeZipPlus4: false,
  includeRDI: false,
  messageLevel: 'error',
  preprocess: true,
  batchSize: 100,              // Default to SmartyStreets max batch size
  logLevel: 'warn',            // Only log warnings and errors by default
  addFootnoteMessages: true,   // Add informational footnote messages by default
};

/**
* Configuration for field-based address validation
*/
export interface FieldsConfig {
  sheetSlug: string;
  fields: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    street_secondary?: string;
  };
  fullAddressField?: never;
  options?: SmartyStreetsOptions;
}

/**
* Configuration for full-address field validation
*/
export interface FullAddressConfig {
  sheetSlug: string;
  fullAddressField: string;
  fields?: never;
  options?: SmartyStreetsOptions;
}

/**
* Combined plugin configuration type (either fields or full address)
*/
export type SmartyStreetsPluginConfig = FieldsConfig | FullAddressConfig;