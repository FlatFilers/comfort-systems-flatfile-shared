/**
* Types and error classes for SmartyStreets API integration
*/

/**
* SmartyStreets HTTP request lookup structure
*/
export interface SmartyHttpRequestLookup {
  street?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  secondary?: string;
  candidates?: number;
  match?: 'strict' | 'enhanced' | 'invalid';
}

/**
* Address components from SmartyStreets API response
*/
export interface SmartyResponseComponents {
  primary_number?: string;
  street_name?: string;
  street_predirection?: string;
  street_postdirection?: string;
  street_suffix?: string;
  secondary_number?: string;
  secondary_designator?: string;
  extra_secondary_number?: string;
  extra_secondary_designator?: string;
  pmb_designator?: string;
  pmb_number?: string;
  city_name?: string;
  default_city_name?: string;
  state_abbreviation?: string;
  zipcode?: string;
  plus4_code?: string;
  delivery_point?: string;
  delivery_point_check_digit?: string;
}

/**
* Metadata from SmartyStreets API response
*/
export interface SmartyResponseMetadata {
  record_type?: string;
  zip_type?: string;
  county_fips?: string;
  county_name?: string;
  carrier_route?: string;
  congressional_district?: string;
  building_default_indicator?: string;
  rdi?: 'Residential' | 'Commercial' | 'Unknown';
  elot_sequence?: string;
  elot_sort?: string;
  latitude?: number;
  longitude?: number;
  precision?: string;
  time_zone?: string;
  utc_offset?: number;
  dst?: boolean;
}

/**
* Analysis data from SmartyStreets API response
*/
export interface SmartyResponseAnalysis {
  dpv_match_code?: string;
  dpv_footnotes?: string;
  dpv_cmra?: string;
  dpv_vacant?: string;
  active?: string;
  footnotes?: string;
  enhanced_match?: string;
  lacslink_code?: string;
  lacslink_indicator?: string;
  suitelink_match?: boolean;
}

/**
* Complete SmartyStreets API response item
*/
export interface SmartyHttpResponseItem {
  input_index: number;
  input_id?: string;
  candidate_index?: number;
  delivery_line_1?: string;
  last_line?: string;
  components?: SmartyResponseComponents;
  metadata?: SmartyResponseMetadata;
  analysis?: SmartyResponseAnalysis;
  status?: string;
  reason?: string;
}

/**
* Base error class for SmartyStreets API errors
*/
export class SmartyHttpError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'SmartyHttpError';
  }
}

/**
* Authentication error from SmartyStreets API
*/
export class SmartyAuthenticationError extends SmartyHttpError { 
  constructor(message: string, data?: any) { 
    super(message, 401, data); 
    this.name = 'SmartyAuthenticationError'; 
  } 
}

/**
* Payment error from SmartyStreets API
*/
export class SmartyPaymentError extends SmartyHttpError { 
  constructor(message: string, data?: any) { 
    super(message, 402, data); 
    this.name = 'SmartyPaymentError'; 
  } 
}

/**
* Rate limit error from SmartyStreets API
*/
export class SmartyRateLimitError extends SmartyHttpError { 
  constructor(message: string, public resetSeconds?: string, data?: any) { 
    super(message, 429, data); 
    this.name = 'SmartyRateLimitError'; 
  } 
}

/**
* Server error from SmartyStreets API
*/
export class SmartyServerError extends SmartyHttpError { 
  constructor(message: string, status: number, data?: any) { 
    super(message, status, data); 
    this.name = 'SmartyServerError'; 
  } 
}