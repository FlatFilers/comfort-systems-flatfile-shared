// src/utils/federation/processors/unpivot_processor.ts
import { Flatfile } from "@flatfile/api";
import { UnpivotGroupConfig } from "../../../types";
import { logInfo, logWarn, logError } from "@flatfile/util-common";

/**
* Creates unpivoted records from a source record according to unpivot configuration,
* AND attaches virtual fields to each created record.
* @param sourceRecord - Source record data { fieldKey: { value: any } }
* @param sourceSlug - Source sheet slug (for logging/debugging)
* @param unpivotGroups - Array of unpivot groups defining transformations
* @param virtualFieldsMap - Optional map of source_key -> virtual_key for virtual fields
* @returns Array of unpivoted records, each potentially including virtual fields
*/
export function createUnpivotedRecords(
  sourceRecord: Flatfile.RecordData,
  sourceSlug: string,
  unpivotGroups: Array<[string, UnpivotGroupConfig]>,
  virtualFieldsMap?: Map<string, string> 
): Flatfile.RecordData[] {
  
  // Defend against null/undefined input
  if (!sourceRecord) {
    return [];
  }
  
  const finalUnpivotedRecords: Flatfile.RecordData[] = [];
  
  // Prepare virtual field data
  const virtualFieldData: Flatfile.RecordData = {};
  let hasVirtualData = false;
  if (virtualFieldsMap && virtualFieldsMap.size > 0) {
    for (const [sourceKey, virtualKey] of virtualFieldsMap) {
      if (sourceRecord[sourceKey] !== undefined && sourceRecord[sourceKey] !== null) {
        virtualFieldData[virtualKey] = sourceRecord[sourceKey]; // Copy the value object { value: ... }
        hasVirtualData = true;
      }
    }
  }
  
  // Process unpivot groups
  for (const [groupKey, group] of unpivotGroups) {
    if (!group.field_mappings || group.field_mappings.length === 0) {
      continue;
    }
    
    // Process each transformation mapping within the group
    for (const mapping of group.field_mappings) {
      const baseUnpivotRecord: Flatfile.RecordData = {};
      let hasValidUnpivotValues = false;
      
      // Create the base unpivoted structure
      for (const [targetKey, sourceOrStaticValue] of Object.entries(mapping)) {
        if (typeof sourceOrStaticValue !== 'string') {
          continue;
        }
        
        if (sourceOrStaticValue.startsWith('<<') && sourceOrStaticValue.endsWith('>>')) {
          const staticValue = sourceOrStaticValue.substring(2, sourceOrStaticValue.length - 2);
          baseUnpivotRecord[targetKey] = { value: staticValue };
          hasValidUnpivotValues = true;
        } else if (sourceRecord[sourceOrStaticValue] !== undefined && sourceRecord[sourceOrStaticValue] !== null) {
          baseUnpivotRecord[targetKey] = sourceRecord[sourceOrStaticValue];
          hasValidUnpivotValues = true;
        }
      }
      
      // Only add if the unpivot mapping yielded results
      if (hasValidUnpivotValues) {
        // Combine base unpivoted record with virtual field data
        const finalRecord = hasVirtualData
        ? { ...baseUnpivotRecord, ...virtualFieldData }
        : baseUnpivotRecord;
        
        finalUnpivotedRecords.push(finalRecord);
      } else {
      }
    } 
  } 
  
  return finalUnpivotedRecords;
}