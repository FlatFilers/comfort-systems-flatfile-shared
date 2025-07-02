// src/utils/federation/federated_sheet_manager.ts
import { Flatfile } from "@flatfile/api";
import {
  FederateConfig,
  DedupeConfig,
  FederatedSheetConfig,
  FederatedUnpivotSheetConfig,
  FederatedProperty,
  UnpivotGroupConfig,
  SourceMapping,
  FieldMapping,
  UnpivotMapping
} from "../../types";
import { validateConfig } from "./validators/config_validator";
import { mergeRecords } from "./processors/merge_processor";
import { filterRecords, FilterConfig, shouldIncludeRecord } from "./filters/record_filter";
import { processRecord } from "./processors/record_processor";
import { logError, logInfo, logWarn } from "@flatfile/util-common";

// Helper to check if a sheet config is for unpivot
function isUnpivotSheet(sheet: FederatedSheetConfig | FederatedUnpivotSheetConfig): sheet is FederatedUnpivotSheetConfig {
  return 'unpivot_groups' in sheet && !!sheet.unpivot_groups && Object.keys(sheet.unpivot_groups).length > 0;
}

// Helper to get source slug from group config
function getSourceSlugFromGroup(group: UnpivotGroupConfig): string | undefined {
  if (group.source_sheet_slug) return group.source_sheet_slug;
  if (group.source_sheet?.slug) return group.source_sheet.slug;
  return undefined;
}

// Helper to get source slug from field config
function getSourceSlugFromField(field: FederatedProperty): string | undefined {
  if (!field.federate_config) return undefined;
  if (field.federate_config.source_sheet_slug) return field.federate_config.source_sheet_slug;
  if (field.federate_config.source_sheet?.slug) return field.federate_config.source_sheet.slug;
  return undefined;
}


export class FederatedSheetManager {
  // Private instance fields
  private recordsBySheetId = new Map<string, Flatfile.RecordData[]>();
  private sourceMappings = new Map<string, SourceMapping[]>();
  private dedupeConfigs = new Map<string, DedupeConfig>();
  private sheetFilters = new Map<string, FilterConfig>(); // Target Filters
  private virtualFieldKeys = new Map<string, Set<string>>(); // Tracks virtual keys per target sheet ID
  private config: FederateConfig;
  
  constructor(config: FederateConfig) {
    const sourceSheets = validateConfig(config); // Validates config, including virtual fields
    this.config = config;
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `initializing with ${sourceSheets.size} source sheets`);
    sourceSheets.forEach(slug => {
      this.sourceMappings.set(slug, []);
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Registered source sheet: ${slug}`);
    });
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", "initialization complete");
  }
  
  clearMappings() {
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", "Clearing all federated sheet mappings and data");
    this.recordsBySheetId.clear();
    this.dedupeConfigs.clear();
    this.sheetFilters.clear();
    this.virtualFieldKeys.clear();
    this.sourceMappings.forEach((_, slug) => this.sourceMappings.set(slug, []));
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", "All mappings and data cleared successfully");
  }
  
  hasSourceSheet(slug: string): boolean {
    const result = this.sourceMappings.has(slug);
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Checking if ${slug} is a source sheet: ${result ? 'yes' : 'no'}`);
    return result;
  }
  
  async createMappings(blueprint: FederatedSheetConfig | FederatedUnpivotSheetConfig, sheet: Flatfile.Sheet): Promise<void> {
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Creating mappings for target sheet: ${sheet.slug} (${sheet.id})`);
    
    this.recordsBySheetId.set(sheet.id, []); // Initialize records array
    
    // Store Dedupe Config
    if (blueprint.dedupe_config) {
      this.dedupeConfigs.set(sheet.id, blueprint.dedupe_config);
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Found dedupe configuration for sheet: ${sheet.slug}`);
    }
    
    // Store Target Filters
    const targetFilters: FilterConfig = {
      all_fields_required: blueprint.all_fields_required,
      any_fields_required: blueprint.any_fields_required,
      any_fields_excluded: blueprint.any_fields_excluded,
      field_values_required: blueprint.field_values_required,
      field_values_excluded: blueprint.field_values_excluded
    };
    if (Object.values(targetFilters).some(val => val !== undefined && (Array.isArray(val) ? val.length > 0 : (typeof val === 'object' && val !== null && Object.keys(val).length > 0) ))) {
      this.sheetFilters.set(sheet.id, targetFilters);
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Found target filter configuration for sheet: ${sheet.slug}`);
    }
    
    // Store Virtual Field Keys
    const currentVirtualKeys = new Set<string>();
    if (blueprint.virtualFields) {
      blueprint.virtualFields.forEach(vf => currentVirtualKeys.add(vf.key));
      if (currentVirtualKeys.size > 0) {
        this.virtualFieldKeys.set(sheet.id, currentVirtualKeys);
        /* istanbul ignore next */
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Stored ${currentVirtualKeys.size} virtual field keys for sheet ${sheet.slug}: [${Array.from(currentVirtualKeys).join(', ')}]`);
      }
    }
    
    // Collect Virtual Field Mappings (source_key -> virtual_key) per source
    const virtualFieldsBySource = new Map<string, Map<string, string>>();
    if (blueprint.virtualFields) {
      for (const vf of blueprint.virtualFields) {
        const sourceSlug = getSourceSlugFromField(vf);
        const sourceKey = vf.federate_config?.source_field_key;
        if (sourceSlug && sourceKey) {
          if (!virtualFieldsBySource.has(sourceSlug)) virtualFieldsBySource.set(sourceSlug, new Map());
          virtualFieldsBySource.get(sourceSlug)!.set(sourceKey, vf.key);
        } else {
          /* istanbul ignore next */
          if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Virtual field ${vf.key} in sheet ${sheet.slug} is missing required federate_config.`);
        }
      }
    }
    
    // --- Create Mappings based on Sheet Type ---
    if (isUnpivotSheet(blueprint)) {
      // --- Unpivot Sheet Mapping ---
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Processing unpivot groups for sheet: ${sheet.slug}`);
      
      const groupsBySource = new Map<string, Array<[string, UnpivotGroupConfig]>>();
      for (const [groupName, group] of Object.entries(blueprint.unpivot_groups)) {
        const sourceSlug = getSourceSlugFromGroup(group);
        if (!sourceSlug) {
          /* istanbul ignore next */
          if (this.config.debug) logWarn("📦 Federate Plugin Manager", `No valid source sheet slug found for unpivot group: ${groupName} in sheet ${sheet.slug}`);
          continue;
        }
        if (!groupsBySource.has(sourceSlug)) groupsBySource.set(sourceSlug, []);
        groupsBySource.get(sourceSlug)!.push([groupName, group]);
        if (!this.sourceMappings.has(sourceSlug)) this.sourceMappings.set(sourceSlug, []);
      }
      
      for (const [sourceSlug, unpivotGroupsForSource] of groupsBySource.entries()) {
        const sourceMappingsList = this.sourceMappings.get(sourceSlug)!;
        const mapping: UnpivotMapping = {
          type: 'unpivot',
          sheetId: sheet.id,
          sheetSlug: sheet.slug,
          filters: {}, // Filters applied in getRecords 
          unpivotGroups: unpivotGroupsForSource,
          virtualFieldsMap: virtualFieldsBySource.get(sourceSlug) // Attach relevant virtual field maps
        };
        sourceMappingsList.push(mapping);
        /* istanbul ignore next */
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Created unpivot mapping from source ${sourceSlug} to sheet ${sheet.slug} with ${unpivotGroupsForSource.length} groups and ${mapping.virtualFieldsMap?.size ?? 0} virtual field mappings.`);
      }
      
    } else { // Standard Federation Sheet
      // --- Standard Sheet Mapping ---
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Processing standard field mappings (real and virtual) for sheet: ${sheet.slug}`);
      
      const allFieldsForMapping: FederatedProperty[] = [
        ...blueprint.fields,
        ...(blueprint.virtualFields || [])
      ];
      
      if (allFieldsForMapping.length === 0) {
        /* istanbul ignore next */
        if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Sheet ${sheet.slug} has no real or virtual fields to map.`);
        return;
      }
      
      const fieldsBySourceSheet = new Map<string, Map<string, string>>();
      for (const field of allFieldsForMapping) {
        const sourceSlug = getSourceSlugFromField(field);
        const sourceKey = field.federate_config?.source_field_key;
        
        if (sourceSlug && sourceKey) {
          if (!fieldsBySourceSheet.has(sourceSlug)) fieldsBySourceSheet.set(sourceSlug, new Map());
          fieldsBySourceSheet.get(sourceSlug)!.set(sourceKey, field.key);
          if (!this.sourceMappings.has(sourceSlug)) this.sourceMappings.set(sourceSlug, []);
          
          /* istanbul ignore next */
          const fieldType = currentVirtualKeys.has(field.key) ? 'virtual' : 'real';
          if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Mapped ${fieldType} field ${sourceKey} from ${sourceSlug} to ${field.key} in ${sheet.slug}`);
        } else {
          /* istanbul ignore next */
          if (this.config.debug && field.federate_config) logWarn("📦 Federate Plugin Manager", `Field ${field.key} in sheet ${sheet.slug} is missing required federate_config parts.`);
        }
      }
      
      for (const [sourceSlug, fieldsMap] of fieldsBySourceSheet) {
        const sourceMappingsList = this.sourceMappings.get(sourceSlug)!;
        const mapping: FieldMapping = {
          type: 'field',
          sheetId: sheet.id,
          sheetSlug: sheet.slug,
          fields: fieldsMap, // Contains real + virtual target keys
          filters: {} // Filters applied in getRecords
        };
        sourceMappingsList.push(mapping);
        /* istanbul ignore next */
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Created standard field mapping from source ${sourceSlug} to sheet ${sheet.slug} with ${fieldsMap.size} fields (real + virtual)`);
      }
    }
    
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Completed mapping creation for sheet: ${sheet.slug}`);
  }
  
  
  async addRecords(sourceSlug: string, records: Flatfile.RecordWithLinks[]) {
    if (!sourceSlug || !records || records.length === 0) {
      /* istanbul ignore next */
      if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Invalid inputs for addRecords: sourceSlug=${sourceSlug}, records count=${records?.length || 0}`);
      return;
    }
    
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Adding ${records.length} records from source sheet: ${sourceSlug}`);
    
    const mappings = this.sourceMappings.get(sourceSlug);
    if (!mappings || mappings.length === 0) {
      /* istanbul ignore next */
      if (this.config.debug) logWarn("📦 Federate Plugin Manager", `No mappings found for source sheet: ${sourceSlug}, skipping record processing.`);
      return;
    }
    
    /* istanbul ignore next */
    if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Found ${mappings.length} target sheet mappings for source: ${sourceSlug}`);
    
    for (const mapping of mappings) {
      const { sheetId, sheetSlug } = mapping;
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Processing records for target sheet: ${sheetSlug} (${sheetId}) via source ${sourceSlug} using ${mapping.type} mapping`);
      
      let targetSheetRecords = this.recordsBySheetId.get(sheetId);
      if (!targetSheetRecords) {
        targetSheetRecords = [];
        this.recordsBySheetId.set(sheetId, targetSheetRecords);
      }
      
      const processedRecordsForSheet: Flatfile.RecordData[] = [];
      
      for (const record of records) {
        if (!record || !record.values) {
          /* istanbul ignore next */
          if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Skipping invalid record object from source ${sourceSlug}`);
          continue;
        }
        const sourceRecordValues = record.values as Record<string, any>;
        
        const processedRecords = processRecord(sourceRecordValues, sourceSlug, mapping);
        
        if (processedRecords.length > 0) {
          processedRecordsForSheet.push(...processedRecords);
        }
      } // End loop through source records
      
      // Add all processed records to the target sheet's temp collection
      if (processedRecordsForSheet.length > 0) {
        targetSheetRecords.push(...processedRecordsForSheet);
        /* istanbul ignore next */
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Added ${processedRecordsForSheet.length} processed records (incl. virtuals) to sheet ${sheetSlug}, total count now: ${targetSheetRecords.length}`);
        /* istanbul ignore next */} else
        if (this.config.debug) logWarn("📦 Federate Plugin Manager", `No records resulted from processing for target sheet: ${sheetSlug} from source ${sourceSlug}`);
        
      } // End loop through mappings
    }
    
    
    getRecords(): Map<string, Flatfile.RecordData[]> {
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", "Retrieving final federated records (applying post-processing and removing virtual fields)");
      
      const result = new Map<string, Flatfile.RecordData[]>();
      
      for (const [sheetId, records] of this.recordsBySheetId) {
        if (records.length === 0) {
          /* istanbul ignore next */
          if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Sheet ${sheetId} has no records after processing, skipping final steps.`);
          result.set(sheetId, []);
          continue;
        }
        
        // Records contain virtual fields at this stage
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Finalizing ${records.length} records (incl. virtuals) for sheet: ${sheetId}`);
        
        // 1. Apply Dedupe Config (operates on records containing virtual fields)
        const dedupeConfig = this.dedupeConfigs.get(sheetId);
        const mergedRecords = mergeRecords(records, dedupeConfig);
        /* istanbul ignore next */
        if (this.config.debug && dedupeConfig) logInfo("📦 Federate Plugin Manager", `Applied dedupe configuration to sheet ${sheetId}, result: ${mergedRecords.length} records (incl. virtuals)`);
        
        // 2. Apply Target Filters (operates on records containing virtual fields)
        let filteredRecords = mergedRecords;
        const targetFilters = this.sheetFilters.get(sheetId);
        if (targetFilters && Object.keys(targetFilters).length > 0) {
          filteredRecords = filterRecords(mergedRecords, targetFilters);
          /* istanbul ignore next */
          if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Applied TARGET filters to sheet ${sheetId}, result: ${filteredRecords.length} records (incl. virtuals)`);
        } else {
          /* istanbul ignore next */
          if (this.config.debug) logInfo("📦 Federate Plugin Manager", `No target filters to apply for sheet ${sheetId}.`);
        }
        
        // 3. Remove Virtual Fields (Applies to ALL sheets that had virtual keys stored)
        let finalRecords = filteredRecords;
        const sheetVirtualKeys = this.virtualFieldKeys.get(sheetId);
        
        if (sheetVirtualKeys && sheetVirtualKeys.size > 0) {
          /* istanbul ignore next */
          if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Removing ${sheetVirtualKeys.size} virtual keys from ${finalRecords.length} records for sheet ${sheetId}: [${Array.from(sheetVirtualKeys).join(', ')}]`);
          finalRecords = finalRecords.map(record => {
            const newRecord = { ...record };
            sheetVirtualKeys.forEach(key => {
              delete newRecord[key];
            });
            return newRecord;
          });
        } else {
          /* istanbul ignore next */
          if (this.config.debug) logInfo("📦 Federate Plugin Manager", `No virtual keys defined for sheet ${sheetId}, skipping removal.`);
        }
        
        result.set(sheetId, finalRecords);
        
        /* istanbul ignore next */
        if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Final record count for sheet ${sheetId} (after post-processing): ${finalRecords.length}`);
      }
      
      /* istanbul ignore next */
      if (this.config.debug) logInfo("📦 Federate Plugin Manager", `Returning final records for ${result.size} sheets`);
      return result;
    }
    
    // Helper to find blueprint
    private findBlueprint(sheetId: string): FederatedSheetConfig | FederatedUnpivotSheetConfig | undefined {
      const slug = [...this.sourceMappings.values()]
      .flat()
      .find(m => m.sheetId === sheetId)?.sheetSlug;
      
      if (!slug) {
        /* istanbul ignore next */
        if (this.config.debug) logWarn("📦 Federate Plugin Manager", `Could not find slug for sheetId ${sheetId} to determine blueprint type.`);
        return undefined;
      }
      return this.config.federated_workbook.sheets.find(s => s.slug === slug);
    }
  }