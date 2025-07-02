"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
const field_validator_1 = require("./field_validator");
const merge_validator_1 = require("./merge_validator");
const unpivot_validator_1 = require("./unpivot_validator");
const filter_validator_1 = require("./filter_validator");
const util_common_1 = require("@flatfile/util-common");
/**
* Validates the federation configuration and returns a set of all source sheet slugs.
* This function performs a comprehensive validation of the federation configuration:
*
* 1. Verifies that the workbook contains at least one sheet
* 2. Ensures all sheet slugs are unique within the configuration
* 3. Validates that each sheet has at least one field
* 4. Validates field configurations using the field validator
* 5. Validates merge configurations using the merge validator
* 6. Validates unpivot groups using the unpivot validator (only for unpivot sheets)
* 7. Validates filter configurations using the filter validator
*
* @param config - The federation configuration to validate
* @returns Set of all source sheet slugs used in the federation
* @throws Error if any validation rules are violated, with detailed error messages
*/
function validateConfig(config) {
    // workbook must contain at least one sheet
    if (config.federated_workbook.sheets.length === 0) {
        throw new Error("[ConfigValidator] Invalid federation configuration: federated_workbook must contain at least one sheet");
    }
    // Track sheets by slug to ensure uniqueness and for later lookups
    const sheetSlugs = new Set();
    // Validate sheets and collect source sheets
    const sourceSheets = new Set();
    const mergeFields = new Map(); // Track merge fields by sheet slug
    config.federated_workbook.sheets.forEach((sheet, index) => {
        // slug must be unique
        if (sheetSlugs.has(sheet.slug)) {
            throw new Error(`[ConfigValidator] Duplicate sheet slug found: "${sheet.slug}". Sheet slugs must be unique.`);
        }
        sheetSlugs.add(sheet.slug);
        // sheet must have at least one field
        if (sheet.fields.length === 0) {
            throw new Error(`[ConfigValidator] Sheet "${sheet.slug}" must have at least one field`);
        }
        // Validate fields and collect source sheets
        /* istanbul ignore next */
        if (config.debug)
            (0, util_common_1.logInfo)("📦  ↳ Config Validator", `Validating fields for sheet "${sheet.slug}"`);
        const fieldKeys = (0, field_validator_1.validateFields)(sheet.fields, sheet.virtualFields, sheet.slug, sourceSheets, config);
        // Validate merge configuration
        /* istanbul ignore next */
        if (config.debug)
            (0, util_common_1.logInfo)("📦  ↳ Config Validator", `Validating merge configuration for sheet "${sheet.slug}"`);
        (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, config);
        // Validate unpivot configuration (will be skipped for non-unpivot sheets)
        /* istanbul ignore next */
        if (config.debug)
            (0, util_common_1.logInfo)("📦  ↳ Config Validator", `Validating unpivot configuration for sheet "${sheet.slug}"`);
        (0, unpivot_validator_1.validateUnpivotConfig)(sheet, config);
        // Validate filters
        /* istanbul ignore next */
        if (config.debug)
            (0, util_common_1.logInfo)("📦  ↳ Config Validator", `Validating filters for sheet "${sheet.slug}"`);
        (0, filter_validator_1.validateFilters)(sheet, fieldKeys, config);
    });
    return sourceSheets;
}
//# sourceMappingURL=config_validator.js.map