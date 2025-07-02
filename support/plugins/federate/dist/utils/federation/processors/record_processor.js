"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStandardRecord = createStandardRecord;
exports.processRecord = processRecord;
const unpivot_processor_1 = require("./unpivot_processor");
const util_common_1 = require("@flatfile/util-common"); // Optional logging
/**
* Creates a standard record by mapping source fields to target fields (including virtual)
* @param recordValues - The source record values { fieldKey: { value: any } }
* @param fields - Map of source field keys to target/virtual field keys
* @returns The mapped record or null if no valid mappings or if all values are empty
*/
function createStandardRecord(recordValues, fields) {
    var _a;
    const result = {};
    let hasValues = false; // Track if any non-null/empty value was mapped
    for (const [sourceKey, targetKey] of fields) {
        const sourceFieldValue = recordValues[sourceKey]; // This might be { value: ... } or direct value
        // Add the field if the source key exists, even if its value is null/undefined
        if (sourceFieldValue !== undefined) {
            result[targetKey] = sourceFieldValue; // Copy the whole value object { value: ...} or direct value
            // Check if the mapped value is considered non-empty for hasValues flag
            const actualValue = (_a = sourceFieldValue === null || sourceFieldValue === void 0 ? void 0 : sourceFieldValue.value) !== null && _a !== void 0 ? _a : sourceFieldValue; // Get primitive value if exists
            if (actualValue !== undefined && actualValue !== null && actualValue !== '') {
                hasValues = true;
            }
        }
    }
    // Return the record if it has any keys mapped, otherwise null
    return Object.keys(result).length > 0 ? result : null;
}
/**
* Processes a record based on the mapping configuration.
* - For 'field' type: Maps source fields to target/virtual fields.
* - For 'unpivot' type: Creates unpivoted records and attaches virtual fields to each.
* @param recordValues - The source record values { fieldKey: { value: any } }
* @param sourceSheetSlug - The source sheet slug (for logging/debugging)
* @param mapping - The source mapping configuration (FieldMapping or UnpivotMapping)
* @returns Array of processed records
*/
function processRecord(recordValues, sourceSheetSlug, mapping) {
    const result = [];
    try {
        if (mapping.type === 'unpivot') {
            const unpivotedRecords = (0, unpivot_processor_1.createUnpivotedRecords)(recordValues, sourceSheetSlug, mapping.unpivotGroups, mapping.virtualFieldsMap);
            if (unpivotedRecords && unpivotedRecords.length > 0) {
                result.push(...unpivotedRecords);
            }
        }
        else {
            const standardRecord = createStandardRecord(recordValues, mapping.fields);
            if (standardRecord) {
                result.push(standardRecord);
            }
        }
    }
    catch (error) {
        (0, util_common_1.logError)("📦 Record Processor", `Error processing record for mapping type ${mapping.type}, target sheet ${mapping.sheetSlug}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return result;
}
//# sourceMappingURL=record_processor.js.map