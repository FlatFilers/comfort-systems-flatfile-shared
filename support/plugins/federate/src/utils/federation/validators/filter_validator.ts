import { FederatedSheetConfig, FederateConfig } from "../../../types";
import { logInfo, logError, logWarn } from "@flatfile/util-common";

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
export function validateFilters(
  sheet: FederatedSheetConfig, 
  fieldKeys: Set<string>,
  federateConfig: FederateConfig
): void {
  const sheetName = sheet.name || sheet.slug || 'unknown';
  const sheetSlug = sheet.slug || 'unknown';
  
  if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `Validating filter configuration for sheet "${sheetName}"`);
  
  // Check if the sheet has any filters defined
  const hasFilters = !!(
    sheet.field_values_required ||
    sheet.field_values_excluded ||
    sheet.all_fields_required ||
    sheet.any_fields_required ||
    sheet.any_fields_excluded
  );
  
  if (!hasFilters) {
    if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `No filters defined for sheet "${sheetName}", skipping validation`);
    return;
  }
  
  if (federateConfig.debug) {
    const fieldCount = fieldKeys.size;
    const fieldList = Array.from(fieldKeys).join(', ');
    logInfo("📦   ↳ Filter Validator", `Sheet "${sheetName}" has ${fieldCount} available fields: ${fieldList}`);
  }
  
  // Business rule: Check all referenced fields exist in the sheet
  
  // Validate field_values_required
  if (sheet.field_values_required) {
    if (federateConfig.debug) {
      const fieldCount = Object.keys(sheet.field_values_required).length;
      logInfo("📦   ↳ Filter Validator", `Validating ${fieldCount} fields in field_values_required filter`);
    }
    
    for (const field of Object.keys(sheet.field_values_required)) {
      if (!fieldKeys.has(field)) {
        if (federateConfig.debug) logError("📦   ↳ Filter Validator", `Field "${field}" in field_values_required does not exist in sheet "${sheetName}"`);
        throw new Error(`[FilterValidator] Invalid filter configuration for sheet "${sheetSlug}": field "${field}" in field_values_required does not exist in the sheet`);
      }
      
      if (federateConfig.debug) {
        const values = sheet.field_values_required[field];
        const valuesList = Array.isArray(values) ? values.join(', ') : values;
        logInfo("📦   ↳ Filter Validator", `Valid field_values_required: "${field}" with values: [${valuesList}]`);
      }
    }
  }
  
  // Validate field_values_excluded
  if (sheet.field_values_excluded) {
    if (federateConfig.debug) {
      const fieldCount = Object.keys(sheet.field_values_excluded).length;
      logInfo("📦   ↳ Filter Validator", `Validating ${fieldCount} fields in field_values_excluded filter`);
    }
    
    for (const field of Object.keys(sheet.field_values_excluded)) {
      if (!fieldKeys.has(field)) {
        if (federateConfig.debug) logError("📦   ↳ Filter Validator", `Field "${field}" in field_values_excluded does not exist in sheet "${sheetName}"`);
        throw new Error(`[FilterValidator] Invalid filter configuration for sheet "${sheetSlug}": field "${field}" in field_values_excluded does not exist in the sheet`);
      }
      
      if (federateConfig.debug) {
        const values = sheet.field_values_excluded[field];
        const valuesList = Array.isArray(values) ? values.join(', ') : values;
        logInfo("📦   ↳ Filter Validator", `Valid field_values_excluded: "${field}" with values: [${valuesList}]`);
      }
    }
  }
  
  // Validate all_fields_required
  if (sheet.all_fields_required) {
    if (federateConfig.debug) {
      const fieldCount = sheet.all_fields_required.length;
      logInfo("📦   ↳ Filter Validator", `Validating ${fieldCount} fields in all_fields_required filter`);
    }
    
    for (const field of sheet.all_fields_required) {
      if (!fieldKeys.has(field)) {
        if (federateConfig.debug) logError("📦   ↳ Filter Validator", `Field "${field}" in all_fields_required does not exist in sheet "${sheetName}"`);
        throw new Error(`[FilterValidator] Invalid filter configuration for sheet "${sheetSlug}": field "${field}" in all_fields_required does not exist in the sheet`);
      }
      
      if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `Valid all_fields_required reference: "${field}"`);
    }
  }
  
  // Validate any_fields_required
  if (sheet.any_fields_required) {
    if (federateConfig.debug) {
      const fieldCount = sheet.any_fields_required.length;
      logInfo("📦   ↳ Filter Validator", `Validating ${fieldCount} fields in any_fields_required filter`);
    }
    
    for (const field of sheet.any_fields_required) {
      if (!fieldKeys.has(field)) {
        if (federateConfig.debug) logError("📦   ↳ Filter Validator", `Field "${field}" in any_fields_required does not exist in sheet "${sheetName}"`);
        throw new Error(`[FilterValidator] Invalid filter configuration for sheet "${sheetSlug}": field "${field}" in any_fields_required does not exist in the sheet`);
      }
      
      if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `Valid any_fields_required reference: "${field}"`);
    }
  }
  
  // Validate any_fields_excluded
  if (sheet.any_fields_excluded) {
    if (federateConfig.debug) {
      const fieldCount = sheet.any_fields_excluded.length;
      logInfo("📦   ↳ Filter Validator", `Validating ${fieldCount} fields in any_fields_excluded filter`);
    }
    
    for (const field of sheet.any_fields_excluded) {
      if (!fieldKeys.has(field)) {
        if (federateConfig.debug) logError("📦   ↳ Filter Validator", `Field "${field}" in any_fields_excluded does not exist in sheet "${sheetName}"`);
        throw new Error(`[FilterValidator] Invalid filter configuration for sheet "${sheetSlug}": field "${field}" in any_fields_excluded does not exist in the sheet`);
      }
      
      if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `Valid any_fields_excluded reference: "${field}"`);
    }
  }
  
  if (federateConfig.debug) logInfo("📦   ↳ Filter Validator", `Filter configuration for sheet "${sheetName}" validated successfully`);
} 