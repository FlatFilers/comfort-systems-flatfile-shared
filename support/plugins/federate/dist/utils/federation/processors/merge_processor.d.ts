import { Flatfile } from "@flatfile/api";
import { DedupeConfig } from "../../../types";
/**
* Merges records based on the merge configuration, handling both delete and merge types
* @param records - Array of records to merge
* @param dedupeConfig - Merge configuration specifying how to handle duplicates
* @returns Array of merged records
*
* @example
* // Delete type merge with single field (keep first)
* const records = [
*   { id: { value: "001" }, name: { value: "First" } },
*   { id: { value: "001" }, name: { value: "Duplicate" } }
* ];
* const config = { type: "delete", on: "id", keep: "first" };
* // Result: [{ id: { value: "001" }, name: { value: "First" } }]
*
* @example
* // Merge type with single field (keep last as base, fill in missing values)
* const records = [
*   { id: { value: "001" }, name: { value: "First" }, email: { value: "email@example.com" } },
*   { id: { value: "001" }, name: { value: "Last" } }
* ];
* const config = { type: "merge", on: "id", keep: "last" };
* // Result: [{ id: { value: "001" }, name: { value: "Last" }, email: { value: "email@example.com" } }]
*
* @example
* // Delete type merge with composite key (array of fields)
* const records = [
*   { firstName: { value: "John" }, lastName: { value: "Doe" }, email: { value: "john@example.com" } },
*   { firstName: { value: "John" }, lastName: { value: "Doe" }, phone: { value: "555-1234" } }
* ];
* const config = { type: "delete", on: ["firstName", "lastName"], keep: "first" };
* // Result: [{ firstName: { value: "John" }, lastName: { value: "Doe" }, email: { value: "john@example.com" } }]
*
* @example
* // Merge type with composite key (array of fields)
* const records = [
*   { firstName: { value: "John" }, lastName: { value: "Doe" }, email: { value: "john@example.com" } },
*   { firstName: { value: "John" }, lastName: { value: "Doe" }, phone: { value: "555-1234" } }
* ];
* const config = { type: "merge", on: ["firstName", "lastName"], keep: "first" };
* // Result: [{ firstName: { value: "John" }, lastName: { value: "Doe" }, email: { value: "john@example.com" }, phone: { value: "555-1234" } }]
*/
export declare function mergeRecords(records: Flatfile.RecordData[], dedupeConfig?: DedupeConfig): Flatfile.RecordData[];
