"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSourceSheetSlug = hasSourceSheetSlug;
exports.hasSourceSheet = hasSourceSheet;
exports.validateSourceFields = validateSourceFields;
exports.validateUnpivotConfig = validateUnpivotConfig;
exports.validateUnpivotFields = validateUnpivotFields;
const util_common_1 = require("@flatfile/util-common");
// Helper type guards
function hasSourceSheetSlug(group) {
    return typeof group.source_sheet_slug === 'string';
}
function hasSourceSheet(group) {
    return typeof group.source_sheet === 'object' && group.source_sheet !== null;
}
/**
* Validates that source fields exist in the source sheet
* @param group - The unpivot group configuration
* @param groupKey - The key of the unpivot group
* @param federateConfig - Federation configuration with debug settings
* @throws Error if any source field doesn't exist in the source sheet
*/
function validateSourceFields(group, groupKey, federateConfig) {
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating source fields for unpivot group "${groupKey}"`);
    if (!group.field_mappings || group.field_mappings.length === 0) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `No field mappings found for group "${groupKey}", skipping source field validation`);
        return;
    }
    // Get source sheet fields
    let sourceFields = [];
    if (hasSourceSheet(group) && group.source_sheet) {
        sourceFields = group.source_sheet.fields || [];
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Found ${sourceFields.length} fields in source sheet for group "${groupKey}"`);
    }
    else if (hasSourceSheetSlug(group)) {
        // If we only have a slug, we can't validate source fields here
        // This would require fetching the sheet configuration from the API
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Using source sheet slug for group "${groupKey}", cannot validate source fields at this stage`);
        return;
    }
    // Create a set of source field keys for efficient lookup
    const sourceFieldKeys = new Set(sourceFields.map(field => field.key));
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Available source field keys: ${Array.from(sourceFieldKeys).join(', ')}`);
    // Check each field mapping
    group.field_mappings.forEach((mapping, index) => {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating field mapping #${index} for group "${groupKey}"`);
        Object.entries(mapping).forEach(([targetField, sourceField]) => {
            // Skip validation for static values enclosed in << and >>
            if (sourceField.startsWith('<<') && sourceField.endsWith('>>')) {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Skipping validation for static value "${sourceField}" -> "${targetField}"`);
                return;
            }
            if (!sourceFieldKeys.has(sourceField)) {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Validation failed: source field "${sourceField}" not found for target field "${targetField}"`);
                throw new Error(`[UnpivotValidator] Invalid unpivot configuration for group "${groupKey}": ` +
                    `field mapping at index ${index} references source field "${sourceField}", ` +
                    `but this field does not exist in the source sheet`);
            }
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Valid mapping: "${sourceField}" -> "${targetField}"`);
        });
    });
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `All source fields validated successfully for group "${groupKey}"`);
}
/**
* Validates an unpivot configuration
* @param sheet - The sheet configuration to validate
* @param federateConfig - Federation configuration with debug settings
* @throws Error if the configuration is invalid
*/
function validateUnpivotConfig(sheet, federateConfig) {
    const sheetName = sheet.name || sheet.slug || 'unknown';
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating unpivot configuration for sheet "${sheetName}"`);
    // Check if this is an unpivot sheet
    if (!('unpivot_groups' in sheet)) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Sheet "${sheetName}" is not an unpivot sheet, skipping validation`);
        return; // Not an unpivot sheet, nothing to validate
    }
    // Cast to the correct type now that we know it's an unpivot sheet
    const unpivotSheet = sheet;
    if (!unpivotSheet.unpivot_groups || Object.keys(unpivotSheet.unpivot_groups).length === 0) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Sheet "${sheetName}" has empty unpivot_groups configuration`);
        throw new Error("[UnpivotValidator] Unpivot configuration must have at least one unpivot group");
    }
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Found ${Object.keys(unpivotSheet.unpivot_groups).length} unpivot groups in sheet "${sheetName}"`);
    for (const [groupKey, group] of Object.entries(unpivotSheet.unpivot_groups)) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating unpivot group "${groupKey}"`);
        if (!group.field_mappings || group.field_mappings.length === 0) {
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Group "${groupKey}" has no field mappings`);
            throw new Error(`[UnpivotValidator] Unpivot group "${groupKey}" must have at least one field mapping`);
        }
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Group "${groupKey}" has ${group.field_mappings.length} field mappings`);
        for (const mapping of group.field_mappings) {
            if (!mapping || Object.keys(mapping).length === 0) {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Empty field mapping found in group "${groupKey}"`);
                throw new Error(`[UnpivotValidator] Unpivot group "${groupKey}" has an empty field mapping for key: field1`);
            }
        }
        if (!hasSourceSheet(group) && !hasSourceSheetSlug(group)) {
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Group "${groupKey}" is missing both source_sheet and source_sheet_slug`);
            throw new Error(`[UnpivotValidator] Unpivot group "${groupKey}" must have either source_sheet or source_sheet_slug`);
        }
        /* istanbul ignore next */
        if (federateConfig.debug) {
            if (hasSourceSheet(group)) {
                (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Group "${groupKey}" uses source_sheet configuration`);
            }
            else if (hasSourceSheetSlug(group)) {
                (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Group "${groupKey}" uses source_sheet_slug: "${group.source_sheet_slug}"`);
            }
        }
        if (hasSourceSheet(group) && group.source_sheet) {
            if (!group.source_sheet.slug || group.source_sheet.slug.trim() === '') {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Group "${groupKey}" has source_sheet without a valid slug`);
                throw new Error(`[UnpivotValidator] Unpivot group "${groupKey}" with source_sheet must have a valid slug`);
            }
            // Only validate source fields if allow_undeclared_source_fields is false
            if (!federateConfig.allow_undeclared_source_fields) {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating source fields for group "${groupKey}" (allow_undeclared_source_fields=false)`);
                validateSourceFields(group, groupKey, federateConfig);
                /* istanbul ignore next */ }
            else if (federateConfig.debug) {
                (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Skipping source field validation for group "${groupKey}" (allow_undeclared_source_fields=true)`);
            }
        }
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Unpivot group "${groupKey}" validated successfully`);
    }
    // Also validate that all target fields exist in the sheet
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating unpivot target fields for sheet "${sheetName}"`);
    validateUnpivotFields(unpivotSheet, federateConfig);
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Unpivot configuration for sheet "${sheetName}" validated successfully`);
}
/**
* Validates that all fields in a FederatedUnpivotSheetConfig are properly configured
* @param sheet - The sheet configuration to validate
* @param federateConfig - Federation configuration with debug settings
*/
function validateUnpivotFields(sheet, federateConfig) {
    const sheetSlug = sheet.slug || 'unknown';
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating unpivot field references for sheet "${sheetSlug}"`);
    // Skip validation if the sheet doesn't have fields or unpivot_groups
    if (!Array.isArray(sheet.fields) || !sheet.unpivot_groups) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Sheet "${sheetSlug}" has no fields or unpivot_groups, skipping validation`);
        return;
    }
    // Skip validation if unpivot_groups is empty
    if (Object.keys(sheet.unpivot_groups).length === 0) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Sheet "${sheetSlug}" has empty unpivot_groups, skipping validation`);
        return;
    }
    // Get all field keys from the sheet
    const fieldKeys = new Set(sheet.fields.map(field => field.key));
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Sheet "${sheetSlug}" has ${fieldKeys.size} fields: ${Array.from(fieldKeys).join(', ')}`);
    // Check each unpivot group's field mappings
    Object.entries(sheet.unpivot_groups).forEach(([groupKey, group]) => {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Validating field references for group "${groupKey}"`);
        if (group && Array.isArray(group.field_mappings)) {
            group.field_mappings.forEach((mapping, index) => {
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Checking mapping #${index} in group "${groupKey}"`);
                Object.entries(mapping).forEach(([targetField, sourceField]) => {
                    if (!fieldKeys.has(targetField)) {
                        /* istanbul ignore next */
                        if (federateConfig.debug)
                            (0, util_common_1.logError)("📦   ↳ Unpivot Validator", `Target field "${targetField}" not found in sheet "${sheetSlug}"`);
                        throw new Error(`[UnpivotValidator] Invalid unpivot configuration for sheet "${sheetSlug}": ` +
                            `unpivot group "${groupKey}" references field "${targetField}", ` +
                            `but this field does not exist in the sheet's fields`);
                    }
                    /* istanbul ignore next */
                    if (federateConfig.debug)
                        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `Valid target field reference: "${targetField}" <- "${sourceField}"`);
                });
            });
        }
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `All field references validated for group "${groupKey}"`);
    });
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Unpivot Validator", `All unpivot field references validated successfully for sheet "${sheetSlug}"`);
}
//# sourceMappingURL=unpivot_validator.js.map