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
export function mergeRecords(
  records: Flatfile.RecordData[], 
  dedupeConfig?: DedupeConfig
): Flatfile.RecordData[] {
  if (!dedupeConfig || records.length === 0) {
    return records;
  }
  
  // Group records by the merge key
  const groupedRecords = new Map<string, Flatfile.RecordData[]>();
  for (const record of records) {
    // Generate a composite key if dedupeConfig.on is an array of strings
    let key: string | undefined;
    
    if (Array.isArray(dedupeConfig.on)) {
      
      // Create a composite key from all specified fields
      const keyParts: string[] = dedupeConfig.on.map(field => record[field]?.value?.toString() || "");
      
      if (keyParts.length === dedupeConfig.on.length) {
        key = keyParts.join('::');
      }
      
    } else {
      // Original single field key behavior
      const mergeValue = record[dedupeConfig.on];
      if (mergeValue && mergeValue.value) {
        key = mergeValue.value.toString();
      }
    }
    
    if (!key) {
      continue;
    }
    
    let group = groupedRecords.get(key);
    if (!group) {
      group = [];
      groupedRecords.set(key, group);
    }
    group.push(record);
  }
  
  // Process each group based on merge type
  const result: Flatfile.RecordData[] = [];
  const isKeepFirst = dedupeConfig.keep === 'first';
  
  for (const [_, group] of groupedRecords) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    
    if (dedupeConfig.type === 'delete') {
      // For delete type, keep only the first or last record
      const index = isKeepFirst ? 0 : group.length - 1;
      result.push(group[index]);
    } else if (dedupeConfig.type === 'merge') {
      // For merge type, start with first or last record and merge in others
      const baseIndex = isKeepFirst ? 0 : group.length - 1;
      const baseRecord = group[baseIndex];
      const mergedRecord = { ...baseRecord };
      
      // Merge in other records
      for (let i = 0; i < group.length; i++) {
        if (i === baseIndex) continue;
        
        const record = group[i];
        for (const [key, value] of Object.entries(record)) {
          if (!mergedRecord[key]?.value && value.value !== undefined) {
            mergedRecord[key] = value;
          }
        }
      }
      
      result.push(mergedRecord);
    } else {
      // If no valid merge type, include all records
      result.push(...group);
    }
  }
  
  return result;
} 