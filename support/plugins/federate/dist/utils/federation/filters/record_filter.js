"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterRecords = filterRecords;
exports.shouldIncludeRecord = shouldIncludeRecord;
/**
 * Gets the actual value from a record field, handling both direct values and objects with value property
 * @param value - The field value to extract from
 * @returns The actual value
 */
function getFieldValue(value) {
    if (value === undefined) {
        return undefined;
    }
    return typeof value === 'object' && 'value' in value ? value.value : value;
}
/**
 * Filters an array of records based on the provided filter configuration
 * @param records - Records to filter
 * @param filters - Filter configuration
 * @returns Filtered records array
 *
 * @example
 * // Filter records where the 'status' field must be 'active' or 'pending'
 * const records = [
 *   { id: { value: "1" }, status: { value: "active" } },
 *   { id: { value: "2" }, status: { value: "inactive" } },
 *   { id: { value: "3" }, status: { value: "pending" } }
 * ];
 * const filters = {
 *   field_values_required: {
 *     status: ["active", "pending"]
 *   }
 * };
 * const filtered = filterRecords(records, filters);
 * // Result: [records[0], records[2]]
 *
 * @example
 * // Filter records that must have both 'name' and 'email' fields
 * const records = [
 *   { id: { value: "1" }, name: { value: "Alice" }, email: { value: "alice@example.com" } },
 *   { id: { value: "2" }, name: { value: "Bob" } },
 *   { id: { value: "3" }, email: { value: "charlie@example.com" } }
 * ];
 * const filters = {
 *   all_fields_required: ["name", "email"]
 * };
 * const filtered = filterRecords(records, filters);
 * // Result: [records[0]]
 */
function filterRecords(records, filters) {
    // If no filters defined, return all records
    if (!filters || Object.keys(filters).length === 0) {
        return records;
    }
    return records.filter(record => shouldIncludeRecord(record, filters));
}
/**
 * Checks if a record should be included based on the filtering rules
 * @param recordValues - The record values to check
 * @param filters - The filtering rules to apply
 * @returns boolean indicating if the record should be included
 */
function shouldIncludeRecord(recordValues, filters) {
    var _a, _b, _c;
    // Fast-path - if no filters, include record
    if (!filters || Object.keys(filters).length === 0) {
        return true;
    }
    // Check if all required fields are present
    if ((_a = filters.all_fields_required) === null || _a === void 0 ? void 0 : _a.length) {
        for (const field of filters.all_fields_required) {
            const value = getFieldValue(recordValues[field]);
            if (value === undefined || value === null) {
                return false;
            }
        }
    }
    // Check if at least one of the required fields is present
    if ((_b = filters.any_fields_required) === null || _b === void 0 ? void 0 : _b.length) {
        const hasAnyRequired = filters.any_fields_required.some(field => {
            const value = getFieldValue(recordValues[field]);
            return value !== undefined && value !== null;
        });
        if (!hasAnyRequired) {
            return false;
        }
    }
    // Check if none of the excluded fields are present
    if ((_c = filters.any_fields_excluded) === null || _c === void 0 ? void 0 : _c.length) {
        for (const field of filters.any_fields_excluded) {
            const value = getFieldValue(recordValues[field]);
            if (value !== undefined && value !== null) {
                return false;
            }
        }
    }
    // Check if field values match required values
    if (filters.field_values_required) {
        for (const [field, requiredValues] of Object.entries(filters.field_values_required)) {
            const value = getFieldValue(recordValues[field]);
            if (value === undefined || value === null) {
                return false;
            }
            if (!requiredValues.includes(value === null || value === void 0 ? void 0 : value.toString())) {
                return false;
            }
        }
    }
    // Check if field values don't match excluded values
    if (filters.field_values_excluded) {
        for (const [field, excludedValues] of Object.entries(filters.field_values_excluded)) {
            const value = getFieldValue(recordValues[field]);
            if (value === undefined || value === null) {
                continue;
            }
            if (excludedValues.includes(value === null || value === void 0 ? void 0 : value.toString())) {
                return false;
            }
        }
    }
    return true;
}
//# sourceMappingURL=record_filter.js.map