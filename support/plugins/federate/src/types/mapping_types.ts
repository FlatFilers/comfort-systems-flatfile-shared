import { FilterConfig } from "../utils/federation/filters/record_filter";
import { UnpivotGroupConfig } from "./federated_unpivot_sheet_config";

/**
 * Field mapping type for standard mappings
 * Maps source fields to target fields with additional metadata
 * @internal
 */
export type FieldMapping = {
  type: 'field';
  sheetId: string;
  sheetSlug: string;
  fields: Map<string, string>;
  filters: FilterConfig;
};

/**
 * Unpivot mapping type for unpivot mappings
 * Contains configuration for transforming rows to columns
 * @internal
 */
export type UnpivotMapping = {
  type: 'unpivot';
  sheetId: string;
  sheetSlug: string;
  filters: FilterConfig;
  unpivotGroups: Array<[string, UnpivotGroupConfig]>;
  virtualFieldsMap?: Map<string, string>;
};

/**
 * Mapping type that can be either field mapping or unpivot mapping
 * Used in the federation process to determine how to process records
 * @internal
 */
export type SourceMapping = FieldMapping | UnpivotMapping; 