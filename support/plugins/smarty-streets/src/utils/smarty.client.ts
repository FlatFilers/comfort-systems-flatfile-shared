import axios, { AxiosError } from 'axios';
import { Logger } from './plugin.logger';
import { 
  SmartyHttpRequestLookup, 
  SmartyHttpResponseItem,
  SmartyHttpError,
  SmartyAuthenticationError,
  SmartyPaymentError,
  SmartyRateLimitError,
  SmartyServerError 
} from '../types/smarty';

/**
* SmartyStreets HTTP Utilities
*
* Provides types and functions for making HTTP requests to the SmartyStreets US Street Address API and handling responses.
* 
* This module interacts only with the US Street Address API endpoint.
* 
* Smarty's JS SDK design leaves much to be desired and has some really weird bugs when using it in a
* Flatfile context, so we're just going to use axios directly. 
*/
export class SmartyHttpClient {
  private authId: string;
  private authToken: string;
  private batchSize: number;
  private validateDeliveryPoint: boolean;
  private logger: Logger;
  
  constructor(config: {
    authId: string;
    authToken: string;
    validateDeliveryPoint?: boolean;
    logger: Logger;
    batchSize?: number;
  }) {
    this.authId = config.authId;
    this.authToken = config.authToken;
    this.validateDeliveryPoint = !!config.validateDeliveryPoint;
    this.batchSize = config.batchSize || 100;
    this.logger = config.logger;
  }
  
  async submitAddresses(addresses: Array<{
    inputId: string;
    street?: string;
    street2?: string;
    secondary?: string; // Add support for secondary directly
    city?: string;
    state?: string;
    zipcode?: string;
    match?: string;
  }>): Promise<SmartyHttpResponseItem[]> {
    // Convert addresses to SmartyHttpRequestLookup format
    const lookups: SmartyHttpRequestLookup[] = addresses.map((address, index) => ({
      street: address.street,
      secondary: address.secondary || address.street2, // Prefer secondary, fall back to street2
      city: address.city,
      state: address.state,
      zipcode: address.zipcode,
      match: 'enhanced' as 'enhanced',
      candidates: this.validateDeliveryPoint ? 1 : 5,
    }));
    
    // Send request to SmartyStreets
    const results = await this._sendBatchHttpRequest(lookups, this.authId, this.authToken, this.logger);
    
    // Map inputId to results
    return results.map((result, index) => ({
      ...result,
      input_id: addresses[index].inputId
    }));
  }
  
  /**
  * Sends a batch HTTP request to the SmartyStreets US Street Address API.
  * @param lookups - Array of address lookups.
  * @param authId - SmartyStreets API Auth ID.
  * @param authToken - SmartyStreets API Auth Token.
  * @param logger - Logger instance for logging operations.
  * @returns Promise resolving to an array of response items.
  * @throws Error if authentication is missing, batch size is exceeded, or API returns an error.
  */
  private async _sendBatchHttpRequest(
    lookups: SmartyHttpRequestLookup[],
    authId: string,
    authToken: string,
    logger: Logger
  ): Promise<SmartyHttpResponseItem[]> {
    logger.debug(`Starting batch HTTP request with ${lookups.length} lookups`);
    
    // Step 1: Validate authentication and batch size
    if (!authId || !authToken) {
      logger.error('Authentication credentials missing');
      throw new SmartyAuthenticationError("SmartyStreets authId and authToken are required.");
    }
    if (lookups.length === 0) {
      logger.debug('Empty batch, returning empty array');
      return [];
    }
    if (lookups.length > 100) {
      logger.error(`Batch size (${lookups.length}) exceeds limit of 100`);
      throw new Error(`Batch size (${lookups.length}) exceeds SmartyStreets limit of 100.`);
    }
    
    // Step 2: Build the request URL
    const url = `${SMARTY_US_STREET_ENDPOINT}?auth-id=${encodeURIComponent(authId)}&auth-token=${encodeURIComponent(authToken)}`;
    logger.debug(`Request URL: ${SMARTY_US_STREET_ENDPOINT} (auth credentials omitted)`);
    logger.debug(`Request payload: ${JSON.stringify(lookups)}`);
    
    try {
      // Step 3: Send the POST request to SmartyStreets with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let response;
      
      logger.debug(`Starting request with max ${maxRetries} retries`);
      
      while (retryCount < maxRetries) {
        try {
          logger.debug(`Sending HTTP request${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
          const startTime = Date.now();
          
          response = await axios.post<SmartyHttpResponseItem[]>(url, lookups, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: retryCount === 0 ? 30000 : 45000, // Increase timeout for retries
          });
          
          const duration = Date.now() - startTime;
          logger.debug(`Request completed in ${duration}ms with status ${response.status}`);
          
          // If we get here, the request succeeded
          break;
        } catch (retryError) {
          // Retry only on network errors or 5xx server errors
          const axiosError = retryError as AxiosError;
          const shouldRetry = !axiosError.response || // Network error
          (axiosError.response && axiosError.response.status >= 500); // Server error
          
          if (axiosError.response) {
            logger.error(`Request failed with status ${axiosError.response.status}`);
            logger.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
          } else if (axiosError.request) {
            logger.error('SmartyStreets API No Response: ' + JSON.stringify(axiosError.request));
            throw new Error('SmartyStreets API request failed: No response received.');
          } else {
            logger.error('SmartyStreets API Request Setup Error: ' + axiosError.message);
            throw new Error(`SmartyStreets API request setup failed: ${axiosError.message}`);
          }
          
          if (shouldRetry && retryCount < maxRetries - 1) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s...
            logger.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries-1})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          logger.error(`All retry attempts failed or retry not possible`);
          // If we shouldn't retry or have exhausted retries, throw the error
          throw retryError;
        }
      }
      
      // Step 4: Check response status and data
      if (response?.status === 200 && Array.isArray(response.data)) {
        logger.debug("response.data: " + JSON.stringify(response.data));
        if (response.data.length !== lookups.length) {
          // Warn if the response length does not match the request
          logger.warn(`SmartyStreets response length (${response.data.length}) does not match request length (${lookups.length}).`);
          
          // Handle missing responses by filling gaps with error objects
          if (response.data.length < lookups.length) {
            // We need to identify which lookups didn't get a response
            const inputIndexes = new Set(response.data.map(item => item.input_index));
            
            for (let i = 0; i < lookups.length; i++) {
              if (!inputIndexes.has(i)) {
                // This lookup didn't get a response, add an error object
                response.data.push({
                  input_index: i,
                  status: 'error',
                  reason: 'No response received from SmartyStreets API'
                });
              }
            }
            
            // Resort by input_index to maintain order
            response.data.sort((a, b) => a.input_index - b.input_index);
          }
        }
        
        return response.data;
      } else {
        throw new Error(`Unexpected response status: ${response?.status || 'unknown'}`);
      }
    } catch (error) {
      // Step 5: Handle errors from Axios/HTTP
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        // API returned an error response
        logger.error('SmartyStreets API Error Response: ' + JSON.stringify(axiosError.response.data));
        logger.error('SmartyStreets API Error Status: ' + axiosError.response.status);
        logger.error('SmartyStreets API Error Headers: ' + JSON.stringify(axiosError.response.headers));
        
        const status = axiosError.response.status;
        const errorData = axiosError.response.data as { errors?: { message?: string }[] };
        const detailMessage = errorData?.errors?.[0]?.message || axiosError.response.statusText || axiosError.message;
        
        // Get all error messages if available
        let allErrorMessages = "";
        if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 1) {
          allErrorMessages = "\nDetails: " + errorData.errors
          .filter(err => err.message)
          .map(err => err.message)
          .join("; ");
        }
        
        // Get any headers that might be useful for debugging
        const rateLimitReset = axiosError.response.headers['x-ratelimit-reset'];
        
        // Use custom error classes based on status
        if (status === 401) {
          throw new SmartyAuthenticationError(`Authentication failed: ${detailMessage}${allErrorMessages}`, errorData);
        } else if (status === 402) {
          throw new SmartyPaymentError(`Payment required: ${detailMessage}${allErrorMessages}`, errorData);
        } else if (status === 429) {
          const resetInfo = rateLimitReset ? `\nRate limit will reset in ${rateLimitReset} seconds` : "";
          throw new SmartyRateLimitError(
            `Rate limit exceeded: ${detailMessage}${allErrorMessages}${resetInfo}`, 
            rateLimitReset?.toString(), 
            errorData
          );
        } else if (status >= 500) {
          throw new SmartyServerError(`Server error: ${detailMessage}${allErrorMessages}`, status, errorData);
        } else {
          // Other status codes use generic SmartyHttpError
          throw new SmartyHttpError(`API request failed: ${detailMessage}${allErrorMessages}`, status, errorData);
        }
      } else if (axiosError.request) {
        // No response received from API
        logger.error('SmartyStreets API No Response: ' + JSON.stringify(axiosError.request));
        throw new Error('SmartyStreets API request failed: No response received.');
      } else {
        // Error setting up the request
        logger.error('SmartyStreets API Request Setup Error: ' + axiosError.message);
        throw new Error(`SmartyStreets API request setup failed: ${axiosError.message}`);
      }
    }
  }
}

/**
* SmartyStreets API Endpoints
*
* Provides constants for the SmartyStreets API endpoints. 
*/

const SMARTY_US_HOST = "https://us-street.api.smartystreets.com";
const SMARTY_US_STREET_ENDPOINT = `${SMARTY_US_HOST}/street-address`;