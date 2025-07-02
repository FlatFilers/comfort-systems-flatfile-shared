import { Logger } from '../utils/plugin.logger';
import { performDetailedLocalValidation } from '../utils/validators.local';
import { INFORMATIONAL_FOOTNOTES, SECONDARY_FIELD_SYMBOL, CRITICAL_FAILURE_FOOTNOTES } from '../utils/smarty.codes';
import type { SmartyStreetsOptions } from '../types/config';
import { VALIDATION_STATES, RecordValidationResult, RecordValidationInput } from '../types/validation';
import { SmartyHttpClient } from '../utils/smarty.client';
/**
* Service for validating addresses using SmartyStreets US Street API.
* Handles both local and remote validation, and returns detailed results.
*/
export class AddressValidationService {
  private smartyClient: SmartyHttpClient;
  private logger: Logger;
  private options: SmartyStreetsOptions;
  
  constructor(options: SmartyStreetsOptions, logger: Logger) {
    this.options = options;
    this.logger = logger;
    this.smartyClient = new SmartyHttpClient({
      authId: options.authId || "",
      authToken: options.authToken || "",
      validateDeliveryPoint: options.validateDeliveryPoint,
      logger,
      batchSize: options.batchSize,
    });
  }
  
  /**
  * Validates a collection of addresses asynchronously.
  * Performs local validation first, then calls SmartyStreets API for addresses that pass local validation.
  * 
  * @param records - Array of record inputs to validate.
  * @returns Map of record IDs to validation results.
  */
  public async validateRecords(
    records: RecordValidationInput[]
  ): Promise<Map<string, RecordValidationResult>> {
    const results = new Map<string, RecordValidationResult>();
    
    if (records.length === 0) {
      return results;
    }
    
    this.logger.debug(`Beginning validation for ${records.length} records.`);
    
    // Step 1: Perform local validation for all records
    const validRecords: RecordValidationInput[] = [];
    
    for (const record of records) {
      const { address, recordId, realFields } = record;
      
      // Check for completely empty address data first (always skip these)
      if (
        !address.street &&
        !address.city &&
        !address.state &&
        !address.zip
      ) {
        this.logger.debug(`Record ${recordId || ""}: No address data provided.`);
        results.set(recordId, {
          validatedAddress: null,
          realFields,
          validationSource: VALIDATION_STATES.LOCAL_FAILURE, // Still consider this a 'local' failure type
          error: "No address data provided.",
          invalidFields: ['street', 'city', 'state', 'zip'],
        });
        continue; // Skip to next record
      }
      
      if (this.options.preprocess) { // Check if preprocess is enabled (default is true)
        // Local validation (Only if preprocess is true)
        this.logger.debug(`Record ${recordId || ""}: Performing local pre-validation (preprocess=true).`);
        const localValidation = performDetailedLocalValidation(address);
        
        if (!localValidation.valid) {
          this.logger.debug(`Record ${recordId || ""}: Failed local validation.`);
          results.set(recordId, {
            validatedAddress: null,
            realFields,
            validationSource: VALIDATION_STATES.LOCAL_FAILURE,
            error: localValidation.message || "Address validation failed. Please check the address fields.", // Use message from localValidation
            invalidFields: localValidation.invalidFields,
            // Note: fieldMessages from localValidation are not passed to the final result map currently
          });
          continue; // Skip to next record
        }
        // If local validation is OK, add to the list for remote validation
        validRecords.push(record);
        this.logger.debug(`Record ${recordId || ""}: Passed local validation.`);
        
      } else {
        // Preprocess is false, skip local validation
        this.logger.debug(`Record ${recordId || ""}: Skipping local pre-validation (preprocess=false).`);
        // Add record directly to the list for remote validation
        validRecords.push(record);
      }
    }
    
    // Step 2: Submit addresses that passed local validation to SmartyStreets
    if (validRecords.length > 0) {
      this.logger.debug(`${validRecords.length} records passed local validation, proceeding to SmartyStreets validation.`);
      const recordsMap = new Map(validRecords.map(r => [r.recordId, r]));
      
      try {
        // Submit addresses to SmartyStreets in one batch
        const addresses = validRecords.map(({ recordId, address }) => ({
          inputId: recordId,
          street: address.street || "",
          street2: address.secondary || "",
          city: address.city || "",
          state: address.state || "",
          zipcode: address.zip || "",
          match: 'enhanced', // Enhanced matching mode
        }));
        
        const smartyResponse = await this.smartyClient.submitAddresses(addresses);
        
        // Process SmartyStreets responses
        for (const item of smartyResponse) {
          if (!item.input_id) {
            throw new Error("SmartyStreets response missing input_id for a record. This should never happen.");
          }
          const recordId = item.input_id;
          const record = recordsMap.get(recordId)!;

          // ** SmartyStreets Result Interpretation Logic **
          // We perform a multi-stage check to determine the validation outcome:
          // 1. Enhanced Match: Check for specific secondary address issues ('missing-secondary', 'unknown-secondary').
          //    These indicate a problem with the secondary part, but the primary address might still be valid.
          // 2. Status: Check the overall 'status' field from SmartyStreets. 'invalid' indicates a definitive failure.
          // 3. Critical Footnotes: Check if any 'footnotes' indicate a critical failure (e.g., 'D#', 'F#'),
          //    even if status wasn't 'invalid'. These often signify issues like non-deliverable addresses.

          const enhancedMatch = item.analysis?.enhanced_match || '';
          const footnotes = item.analysis?.footnotes || '';
          let isMissingSecondary = enhancedMatch.includes('missing-secondary');
          let isUnknownSecondary = enhancedMatch.includes('unknown-secondary');
          let hasSecondaryIssue = false; 
          let secondaryIssueReason = '';
          let secondaryIssueFields: string[] = [];
          let validationFailed = false; 
          let failureReason = '';
          let failureFields: string[] = [];

          // Check 1: Enhanced Match for Secondary Failures
          if (isMissingSecondary) {
              hasSecondaryIssue = true;
              secondaryIssueReason = "Missing required secondary address information (e.g., Apt, Unit).";
              secondaryIssueFields = [SECONDARY_FIELD_SYMBOL];
              this.logger.debug(`Record ${recordId}: Detected secondary issue 'missing-secondary'`);
          } else if (isUnknownSecondary) {
              hasSecondaryIssue = true;
              secondaryIssueReason = "Invalid or unknown secondary address information provided.";
              secondaryIssueFields = [SECONDARY_FIELD_SYMBOL];
              this.logger.debug(`Record ${recordId}: Detected secondary issue 'unknown-secondary'`);
          }

          // Check 2: Item Status (only if not already failed by a critical issue)
           if (!validationFailed && item.status === 'invalid') {
               validationFailed = true;
               failureReason = item.reason ? `SmartyStreets validation failed: ${item.reason}` : "Address validation failed.";
               if (!hasSecondaryIssue) { 
                  const reasonLower = item.reason?.toLowerCase() || '';
                  if (reasonLower.includes("secondary") || reasonLower.includes("suite") || reasonLower.includes("apartment") || reasonLower.includes("unit") || reasonLower.includes("apt")) {
                      failureFields = [SECONDARY_FIELD_SYMBOL]; 
                  }
               }
           }

          // Check 3: Critical Footnotes (only if not already failed)
          if (!validationFailed && footnotes) {
              const footnoteList = footnotes.split(',');
              for (const fn of footnoteList) {
                  const trimmedFn = fn.trim();
                  if (CRITICAL_FAILURE_FOOTNOTES.has(trimmedFn)) {
                      validationFailed = true;
                      failureReason = CRITICAL_FAILURE_FOOTNOTES.get(trimmedFn) || `Validation failed due to critical footnote: ${trimmedFn}`;
                      failureFields = []; 
                      this.logger.debug(`Record ${recordId}: Failed due to critical footnote '${trimmedFn}'`);
                      break; 
                  }
              }
          }

          // Determine Final Result 
          // If validationFailed is true, the address failed critical checks (status='invalid' or critical footnote).
          // If validationFailed is false, the address is considered valid by SmartyStreets,
          // potentially *with* a non-critical secondary issue (hasSecondaryIssue=true).

          if (validationFailed) {
            results.set(recordId, {
                validatedAddress: null,
                realFields: record.realFields,
                validationSource: VALIDATION_STATES.SMARTY_FAILURE,
                error: failureReason,
                invalidFields: failureFields.length > 0 ? failureFields : undefined,
            });

          } else {
             const informationalFootnotes = new Set<string>();
             if (footnotes) {
               for (const footnote of footnotes.split(',')) {
                 const trimmedFootnote = footnote.trim();
                 if (INFORMATIONAL_FOOTNOTES.has(trimmedFootnote)) {
                   informationalFootnotes.add(trimmedFootnote);
                 }
               }
             }
          
             const finalValidationSource = VALIDATION_STATES.SMARTY_SUCCESS; 
             const finalError = hasSecondaryIssue ? secondaryIssueReason : null; 
             const finalInvalidFields = hasSecondaryIssue ? secondaryIssueFields : undefined; 
          
             if (hasSecondaryIssue) {
               this.logger.debug(`Record ${recordId}: SmartyStreets validation succeeded with secondary issue: ${secondaryIssueReason}`);
             } else {
               this.logger.debug(`Record ${recordId}: SmartyStreets validation succeeded cleanly.`);
             }
          
             results.set(recordId, {
                validatedAddress: item, 
                realFields: record.realFields,
                validationSource: finalValidationSource,
                error: finalError, 
                invalidFields: finalInvalidFields, 
                informationalFootnotes: informationalFootnotes.size > 0 ? informationalFootnotes : undefined,
             });
          }
          }
          
          // Handle records that didn't get a response from SmartyStreets
          for (const [recordId, record] of recordsMap.entries()) {
            if (!results.has(recordId)) {
              this.logger.warn(`Record ${recordId || ""}: No response received from SmartyStreets API.`);
              results.set(recordId, {
                validatedAddress: null,
                realFields: record.realFields,
                validationSource: VALIDATION_STATES.SMARTY_FAILURE,
                error: "No response received from address validation service.",
              });
            }
          }
        } catch (err) {
          this.logger.error(`SmartyStreets API error: ${err}`);
          
          // If the API request fails, mark all records as failed
          for (const { recordId, realFields } of validRecords) {
            if (!results.has(recordId)) {
              results.set(recordId, {
                validatedAddress: null,
                realFields,
                validationSource: VALIDATION_STATES.SMARTY_FAILURE,
                error: `Address validation service error: ${err}`,
              });
            }
          }
        }
      }
      
      this.logger.debug(`Validation completed for ${records.length} records.`);
      return results;
    }
  }