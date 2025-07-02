import { Flatfile } from "@flatfile/api";
import { UnpivotGroupConfig } from "../../../types";
/**
* Creates unpivoted records from a source record according to unpivot configuration,
* AND attaches virtual fields to each created record.
* @param sourceRecord - Source record data { fieldKey: { value: any } }
* @param sourceSlug - Source sheet slug (for logging/debugging)
* @param unpivotGroups - Array of unpivot groups defining transformations
* @param virtualFieldsMap - Optional map of source_key -> virtual_key for virtual fields
* @returns Array of unpivoted records, each potentially including virtual fields
*/
export declare function createUnpivotedRecords(sourceRecord: Flatfile.RecordData, sourceSlug: string, unpivotGroups: Array<[string, UnpivotGroupConfig]>, virtualFieldsMap?: Map<string, string>): Flatfile.RecordData[];
