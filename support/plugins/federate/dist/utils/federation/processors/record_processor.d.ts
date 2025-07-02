import { Flatfile } from "@flatfile/api";
import { SourceMapping } from "../../../types";
/**
* Creates a standard record by mapping source fields to target fields (including virtual)
* @param recordValues - The source record values { fieldKey: { value: any } }
* @param fields - Map of source field keys to target/virtual field keys
* @returns The mapped record or null if no valid mappings or if all values are empty
*/
export declare function createStandardRecord(recordValues: Record<string, any>, fields: Map<string, string>): Flatfile.RecordData | null;
/**
* Processes a record based on the mapping configuration.
* - For 'field' type: Maps source fields to target/virtual fields.
* - For 'unpivot' type: Creates unpivoted records and attaches virtual fields to each.
* @param recordValues - The source record values { fieldKey: { value: any } }
* @param sourceSheetSlug - The source sheet slug (for logging/debugging)
* @param mapping - The source mapping configuration (FieldMapping or UnpivotMapping)
* @returns Array of processed records
*/
export declare function processRecord(recordValues: Record<string, any>, sourceSheetSlug: string, mapping: SourceMapping): Flatfile.RecordData[];
