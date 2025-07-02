"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFields = validateFields;
exports.validateField = validateField;
const util_common_1 = require("@flatfile/util-common");
/**
* Validates fields (both real and virtual) in a sheet configuration,
* checks for key collisions, collects source sheet slugs, and returns all unique keys.
* @param realFields - Array of real field configurations defined in `fields`.
* @param virtualFields - Array of virtual field configurations defined in `virtualFields`.
* @param sheetSlug - Slug of the sheet being validated.
* @param sourceSheets - Set to collect source sheet slugs referenced by any field.
* @param federateConfig - Federation configuration object.
* @returns Set of ALL unique field keys (real + virtual) in the sheet.
*/
function validateFields(// Renamed back from validateAllFields
realFields, virtualFields, sheetSlug, sourceSheets, federateConfig) {
    const allFieldKeys = new Set();
    const realFieldKeys = new Set(); // Keep track for logging if needed
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Validating ${realFields.length} real fields and ${(virtualFields === null || virtualFields === void 0 ? void 0 : virtualFields.length) || 0} virtual fields in sheet "${sheetSlug}"`);
    // Helper function to process a list of fields (real or virtual)
    const processFieldList = (fieldsToProcess, isVirtual) => {
        fieldsToProcess.forEach((field) => {
            validateField(field, federateConfig); // Use the single field validator
            // Check for duplicate keys across *all* fields (real and virtual)
            if (allFieldKeys.has(field.key)) {
                const collisionType = realFieldKeys.has(field.key) ? (isVirtual ? "collision with real field" : "duplicate real field") : "duplicate virtual field";
                /* istanbul ignore next */
                if (federateConfig.debug)
                    (0, util_common_1.logError)("📦   ↳ Field Validator", `Field key "${field.key}" (${collisionType}) found in sheet "${sheetSlug}"`);
                throw new Error(`[FieldValidator] Duplicate field key "${field.key}" (${collisionType}) found in sheet "${sheetSlug}". Keys must be unique across real and virtual fields.`);
            }
            allFieldKeys.add(field.key);
            if (!isVirtual) {
                realFieldKeys.add(field.key);
            }
            addSourceSheet(field, sourceSheets, federateConfig); // Collect source sheets
        });
    };
    // Validate real fields
    processFieldList(realFields, false);
    // Validate virtual fields if they exist
    if (virtualFields) {
        processFieldList(virtualFields, true);
    }
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Validated fields in sheet "${sheetSlug}". Total unique keys: ${allFieldKeys.size}`);
    return allFieldKeys; // Return combined set for other validators
}
function addSourceSheet(field, sourceSheets, federateConfig) {
    var _a;
    if (field.federate_config) {
        const sourceSheet = (_a = field.federate_config.source_sheet) === null || _a === void 0 ? void 0 : _a.slug;
        const sourceSheetSlug = field.federate_config.source_sheet_slug;
        if (sourceSheet) {
            sourceSheets.add(sourceSheet);
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Field "${field.key}" references source sheet "${sourceSheet}"`);
        }
        if (sourceSheetSlug) {
            sourceSheets.add(sourceSheetSlug);
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Field "${field.key}" references source sheet slug "${sourceSheetSlug}"`);
        }
    }
}
function validateField(field, federateConfig) {
    // Skip validation if no federate_config
    if (!field.federate_config) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Field "${field.key}" has no federate_config, skipping validation`);
        return;
    }
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Validating field "${field.key}"`);
    // Check if the field has a source sheet or source sheet slug
    const hasSourceSheet = field.federate_config.source_sheet !== undefined;
    const hasSourceSheetSlug = field.federate_config.source_sheet_slug !== undefined;
    const hasSourceFieldKey = field.federate_config.source_field_key !== undefined;
    // Validate source field key relationship
    if (hasSourceFieldKey && !hasSourceSheet && !hasSourceSheetSlug) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logError)("📦   ↳ Field Validator", `Field "${field.key}" has source_field_key but missing source_sheet_slug`);
        throw new Error("[FieldValidator] Field with source_field_key must have a source_sheet_slug");
    }
    // Validate source sheet slug relationship
    if (hasSourceSheetSlug && !hasSourceFieldKey) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logError)("📦   ↳ Field Validator", `Field "${field.key}" has source_sheet_slug but missing source_field_key`);
        throw new Error("[FieldValidator] Field with source_sheet_slug must have a source_field_key");
    }
    // Validate that either source_sheet or source_sheet_slug is present IF a source_field_key is present
    if (hasSourceFieldKey && !hasSourceSheet && !hasSourceSheetSlug) {
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logError)("📦   ↳ Field Validator", `Field "${field.key}" has source_field_key but is missing both source_sheet and source_sheet_slug`);
        throw new Error("[FieldValidator] Field with source_field_key must have either source_sheet or source_sheet_slug");
    }
    // Validate that source_field_key exists in source_sheet if provided
    if (hasSourceSheet && hasSourceFieldKey && !federateConfig.allow_undeclared_source_fields) {
        const sourceSheet = field.federate_config.source_sheet;
        const sourceFieldKey = field.federate_config.source_field_key;
        // Add type guard to ensure source_sheet is defined
        if (!sourceSheet) {
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logError)("📦   ↳ Field Validator", `Field "${field.key}" has undefined source_sheet`);
            throw new Error("[FieldValidator] Source sheet is undefined");
        }
        // Check if the field exists in the source sheet
        const fieldExists = sourceSheet.fields.some(f => f.key === sourceFieldKey);
        if (!fieldExists) {
            /* istanbul ignore next */
            if (federateConfig.debug)
                (0, util_common_1.logError)("📦   ↳ Field Validator", `Field "${sourceFieldKey}" not found in source sheet "${sourceSheet.slug}"`);
            throw new Error(`[FieldValidator] Field "${sourceFieldKey}" not found in source sheet "${sourceSheet.slug}"`);
        }
        /* istanbul ignore next */
        if (federateConfig.debug)
            (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Field "${field.key}" validated successfully, source field "${sourceFieldKey}" exists in source sheet "${sourceSheet.slug}"`);
    }
    /* istanbul ignore next */
    if (federateConfig.debug)
        (0, util_common_1.logInfo)("📦   ↳ Field Validator", `Field "${field.key}" validated successfully`);
}
//# sourceMappingURL=field_validator.js.map