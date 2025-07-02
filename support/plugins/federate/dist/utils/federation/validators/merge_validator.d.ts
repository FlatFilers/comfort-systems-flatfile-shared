import { FederatedSheetConfig, FederateConfig } from "../../../types";
/**
* Validates merge configuration for a sheet
* @param sheet - The sheet configuration
* @param fieldKeys - Set of field keys in the sheet
* @param mergeFields - Map tracking merge fields by sheet slug
* @param config - Federation configuration with debug settings
*/
export declare function validateDedupeConfig(sheet: FederatedSheetConfig, fieldKeys: Set<string>, mergeFields: Map<string, Set<string>>, config: FederateConfig): void;
