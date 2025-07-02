import { Flatfile } from "@flatfile/api";
/**
 * Filter configuration for determining which records should be included
 */
export interface FilterConfig {
    all_fields_required?: string[];
    any_fields_required?: string[];
    any_fields_excluded?: string[];
    field_values_required?: {
        [key: string]: string[];
    };
    field_values_excluded?: {
        [key: string]: string[];
    };
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
export declare function filterRecords(records: Flatfile.RecordData[], filters?: FilterConfig): Flatfile.RecordData[];
/**
 * Checks if a record should be included based on the filtering rules
 * @param recordValues - The record values to check
 * @param filters - The filtering rules to apply
 * @returns boolean indicating if the record should be included
 */
export declare function shouldIncludeRecord(recordValues: {
    [key: string]: {
        value: any;
    } | any;
}, filters: FilterConfig): boolean;
