import { FederatedSheetConfig, FederateConfig } from "../../../types";
import { logError, logInfo, logWarn } from "@flatfile/util-common";

/**
* Validates merge configuration for a sheet
* @param sheet - The sheet configuration
* @param fieldKeys - Set of field keys in the sheet
* @param mergeFields - Map tracking merge fields by sheet slug
* @param config - Federation configuration with debug settings
*/
export function validateDedupeConfig(
  sheet: FederatedSheetConfig,
  fieldKeys: Set<string>,
  mergeFields: Map<string, Set<string>>,
  config: FederateConfig
): void {
  const sheetName = sheet.name || sheet.slug || 'unknown';
  /* istanbul ignore next */
  if (config.debug) logInfo("📦   ↳ Merge Validator", `Validating merge configuration for sheet "${sheetName}"`);
  
  if (!sheet.dedupe_config) {
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `No merge configuration found for sheet "${sheetName}", skipping validation`);
    return;
  }
  
  /* istanbul ignore next */
  if (config.debug) {
    const mergeType = sheet.dedupe_config.type;
    const keepValue = sheet.dedupe_config.keep;
    const mergeOn = Array.isArray(sheet.dedupe_config.on) 
    ? `[${sheet.dedupe_config.on.join(', ')}]` 
    : sheet.dedupe_config.on;
    
    logInfo("📦   ↳ Merge Validator", `Found merge configuration: type=${mergeType}, keep=${keepValue}, on=${mergeOn}`);
  }
  
  // Ensure the merge field(s) exists in the sheet
  if (Array.isArray(sheet.dedupe_config.on)) {
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `Validating array of merge fields with ${sheet.dedupe_config.on.length} items`);
    
    // Check that all fields in the array exist
    for (const field of sheet.dedupe_config.on) {
      if (!fieldKeys.has(field)) {
        /* istanbul ignore next */
        if (config.debug) logError("📦   ↳ Merge Validator", `Merge field "${field}" does not exist in sheet "${sheetName}"`);
        throw new Error(`[MergeValidator] Invalid merge configuration for sheet "${sheet.slug!}": merge field "${field}" does not exist in the sheet`);
      }
      
      /* istanbul ignore next */
      if (config.debug) logInfo("📦   ↳ Merge Validator", `Valid merge field reference: "${field}"`);
    }
    
    // Ensure the array is not empty
    if (sheet.dedupe_config.on.length === 0) {
      /* istanbul ignore next */
      if (config.debug) logError("📦   ↳ Merge Validator", `Empty array of merge fields in sheet "${sheetName}"`);
      throw new Error(`[MergeValidator] Invalid merge configuration for sheet "${sheet.slug!}": merge field array cannot be empty`);
    }
  } else {
    // Single field case
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `Validating single merge field: "${sheet.dedupe_config.on}"`);
    
    if (!fieldKeys.has(sheet.dedupe_config.on)) {
      /* istanbul ignore next */
      if (config.debug) logError("📦   ↳ Merge Validator", `Merge field "${sheet.dedupe_config.on}" does not exist in sheet "${sheetName}"`);
      throw new Error(`[MergeValidator] Invalid merge configuration for sheet "${sheet.slug!}": merge field "${sheet.dedupe_config.on}" does not exist in the sheet`);
    }
    
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `Valid merge field reference: "${sheet.dedupe_config.on}"`);
  }
  
  // Validate enum values - TypeScript can't validate these at runtime
  if (!['delete', 'merge'].includes(sheet.dedupe_config.type)) {
    /* istanbul ignore next */
    if (config.debug) logError("📦   ↳ Merge Validator", `Invalid merge type "${sheet.dedupe_config.type}" in sheet "${sheetName}"`);
    throw new Error(`[MergeValidator] Invalid merge configuration for sheet "${sheet.slug}": type must be "delete" or "merge"`);
  }
  
  if (!['first', 'last'].includes(sheet.dedupe_config.keep)) {
    /* istanbul ignore next */
    if (config.debug) logError("📦   ↳ Merge Validator", `Invalid keep value "${sheet.dedupe_config.keep}" in sheet "${sheetName}"`);
    throw new Error(`[MergeValidator] Invalid merge configuration for sheet "${sheet.slug}": keep must be "first" or "last"`);
  }
  
  // Track merge fields for validation of relationships
  if (!sheet.slug) {
    /* istanbul ignore next */
    if (config.debug) logError("📦   ↳ Merge Validator", `Missing sheet slug in sheet "${sheetName}"`);
    throw new Error("[MergeValidator] Sheet slug is required for merge configuration");
  }
  
  let mergeFieldsForSheet = mergeFields.get(sheet.slug);
  if (!mergeFieldsForSheet) {
    mergeFieldsForSheet = new Set<string>();
    mergeFields.set(sheet.slug, mergeFieldsForSheet);
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `Created new merge fields set for sheet "${sheet.slug}"`);
  } else {
    /* istanbul ignore next */
    if (config.debug)logInfo("📦   ↳ Merge Validator", `Adding to existing merge fields for sheet "${sheet.slug}"`);
  }
  
  // Add all merge fields to the set
  if (Array.isArray(sheet.dedupe_config.on)) {
    for (const field of sheet.dedupe_config.on) {
      mergeFieldsForSheet.add(field);
      /* istanbul ignore next */
      if (config.debug) logInfo("📦   ↳ Merge Validator", `Added merge field "${field}" to tracked fields for sheet "${sheet.slug}"`);
    }
  } else {
    mergeFieldsForSheet.add(sheet.dedupe_config.on);
    /* istanbul ignore next */
    if (config.debug) logInfo("📦   ↳ Merge Validator", `Added merge field "${sheet.dedupe_config.on}" to tracked fields for sheet "${sheet.slug}"`);
  }
  
  /* istanbul ignore next */
  if (config.debug) {
    const fieldCount = mergeFieldsForSheet.size;
    const fieldList = Array.from(mergeFieldsForSheet).join(', ');
    logInfo("📦   ↳ Merge Validator", `Merge configuration for sheet "${sheetName}" validated successfully`);
    logInfo("📦   ↳ Merge Validator", `Total tracked merge fields for sheet "${sheet.slug}": ${fieldCount} (${fieldList})`);
  }
} 