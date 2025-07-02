import { FederatedSheetConfig, FederateConfig } from "../../../types";
/**
* Validates filter configurations for a sheet.
* This function verifies that all fields referenced in filter configurations
* actually exist in the sheet's field definitions. It checks:
*
* - field_values_required: All field keys must exist in the sheet
* - field_values_excluded: All field keys must exist in the sheet
* - all_fields_required: All fields must exist in the sheet
* - any_fields_required: All fields must exist in the sheet
* - any_fields_excluded: All fields must exist in the sheet
*
* @param sheet - The sheet configuration
* @param fieldKeys - Set of field keys in the sheet
* @param federateConfig - Federation configuration with debug settings
* @throws Error if any field referenced in filters doesn't exist in the sheet
*
* @see shouldIncludeRecord in record_filter.ts - Function that uses these validated filters
*/
export declare function validateFilters(sheet: FederatedSheetConfig, fieldKeys: Set<string>, federateConfig: FederateConfig): void;
