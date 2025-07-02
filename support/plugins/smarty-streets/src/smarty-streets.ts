import FlatfileListener from "@flatfile/listener";
import { FlatfileRecord, bulkRecordHook } from "@flatfile/plugin-record-hook";
import { AddressValidationService } from "./services/address-validation.service";
import { Logger } from "./utils/plugin.logger";
import { LogLevel } from "./types/plugin";
import { SmartyStreetsOptions, DEFAULT_SMARTY_STREETS_OPTIONS, SmartyStreetsPluginConfig } from './types/config';
import { prepareValidationBatch, applyValidationResults } from './utils/helpers.batch';

/**
* SmartyStreets Flatfile Plugin
*
* Provides US address validation and optional transformation for Flatfile records using SmartyStreets API.
* Supports both field-based and full-address field configurations. Handles local and remote (SmartyStreets) validation.
*
* Exports the main plugin factory, types, and a standalone address validation function.
*/

/**
* Main SmartyStreets Flatfile plugin factory.
* @param _config - Plugin configuration (fields or full address).
* @returns A function to register the plugin with a FlatfileListener.
*/
export const smartyStreets = (_config: SmartyStreetsPluginConfig) => {
  if (!_config.sheetSlug || typeof _config.sheetSlug !== 'string' || _config.sheetSlug.trim() === '') {
    throw new Error("SmartyStreets plugin configuration error: 'sheetSlug' is required and must be a non-empty string.");
  }
  
  const hasFieldsConfig = 'fields' in _config && _config.fields;
  const hasFullAddressConfig = 'fullAddressField' in _config && _config.fullAddressField;
  
  if (!hasFieldsConfig && !hasFullAddressConfig) {
    throw new Error("SmartyStreets plugin configuration error: Must provide either 'fields' or 'fullAddressField'.");
  }
  
  if (hasFieldsConfig && hasFullAddressConfig) {
    // Note: TypeScript types with 'never' should prevent this, but a runtime check adds robustness.
    throw new Error("SmartyStreets plugin configuration error: Cannot provide both 'fields' and 'fullAddressField'. Choose one configuration type.");
  }
  
  // Ensure transform and preprocess have sensible defaults
  const config = {
    ..._config,
    options: {
      ...DEFAULT_SMARTY_STREETS_OPTIONS, // Apply defaults first
      ..._config.options, // User options override defaults
    }
  };
  
  // Check authentication credentials
  const authId = config.options.authId || process.env.SMARTY_AUTH_ID;
  const authToken = config.options.authToken || process.env.SMARTY_AUTH_TOKEN;
  
  if (!authId || !authToken) {
    throw new Error(
      "SmartyStreets authentication credentials missing. Provide authId and authToken via plugin options or environment variables (SMARTY_AUTH_ID, SMARTY_AUTH_TOKEN)."
    );
  }
  
  // Pass the resolved credentials (potentially from env vars) to the service
  const resolvedOptions: SmartyStreetsOptions = {
    ...config.options,
    authId, // Pass resolved authId
    authToken // Pass resolved authToken
  };
  
  // Create logger for plugin
  const logger = new Logger('SmartyPlugin', config.options.logLevel as LogLevel);
  logger.debug(`Initialized with config: ${JSON.stringify({...config, options: {...config.options, authId: '[REDACTED]', authToken: '[REDACTED]'}})}`);
  
  // Instantiate the address validation service with resolved options and logger
  logger.debug('Creating AddressValidationService instance');
  const validationService = new AddressValidationService(resolvedOptions, logger);
  
  // Return a function to register the plugin with a FlatfileListener
  return function(listener: FlatfileListener) {
    logger.debug(`Registering plugin with Flatfile listener for sheet: ${config.sheetSlug}`);
    
    // Register a bulk record hook for the configured sheet
    listener.use(bulkRecordHook(
      config.sheetSlug,
      async (records: FlatfileRecord[]) => {
        logger.debug(`Processing batch of ${records.length} records`);
        
        // Step 1: Prepare records for validation using the extracted helper function
        const { validationInputs, recordFieldValues, recordsToValidate } = 
        await prepareValidationBatch(records, config, logger);
        
        // Step 2: Call Validation Service (Bulk)
        logger.debug(`Step 2: Validating ${validationInputs.length} records`);
        if (validationInputs.length > 0) {
          const startTime = Date.now();
          const validationResults = await validationService.validateRecords(validationInputs);
          const duration = Date.now() - startTime;
          logger.debug(`Validation completed in ${duration}ms for ${validationInputs.length} records`);
          
          // Step 3: Apply validation results using the extracted helper function
          await applyValidationResults(
            recordsToValidate,
            validationResults,
            recordFieldValues,
            config,
            logger
          );
        } else {
          logger.debug('No records needed validation in this batch');
        }
        
        logger.debug(`Batch processing complete for ${records.length} records`);
      }
    ));
    
    logger.debug('Plugin registration complete');
  };
};
