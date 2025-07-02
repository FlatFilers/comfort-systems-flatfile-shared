import { Flatfile } from "@flatfile/api";

/**
* Signature for the user-provided function to process source sheets and generate result records.
* @param sourceSheets - An array of sheets from the source workbook.
* @param config - The TabulateConfig object (provides access to flags like `debug`).
* @returns A promise resolving to an array of records to be inserted into the target sheet.
*/
export type SheetsProcessorFunction = (
  sourceSheets: Flatfile.Sheet[],
  config: TabulateConfig // Pass config for potential use (e.g., debug flag)
) => Promise<Flatfile.RecordData[]>;

// Define the base configuration applicable to all modes
interface TabulateBaseConfig {
  /* Required name of the source workbook to analyze */
  sourceWorkbookName: string;
  /* Optional flag to enable verbose debugging output */
  debug?: boolean;
  /* Optional flag to control whether the 'next' block is included in the job completion outcome. Defaults to true. */
  showCalculationsOnComplete?: boolean;
  /* Optional flag to control whether the source workbook is watched for changes. Defaults to false. */
  watch?: boolean;
  /* Optional configuration for the action button appearance and behavior */
  action?: {
    confirm?: boolean;
    mode?: "foreground" | "background";
    label?: string;
    description?: string;
    primary?: boolean;
  };
}

// Define the configuration specific to using the default processor
interface TabulateDefaultConfig extends TabulateBaseConfig {
  /* When using default logic, these fields must be absent */
  targetSheetBlueprint?: never;
  sheetsProcessor?: never;
}

// Define the configuration specific to using a custom processor
interface TabulateCustomConfig extends TabulateBaseConfig {
  /** Required when providing custom logic: The blueprint for the target sheet. */
  targetSheetBlueprint: Flatfile.SheetConfig;
  /** Required when providing custom logic: The function to process sheets. */
  sheetsProcessor: SheetsProcessorFunction;
}

/**
* Configuration for the tabulate plugin.
* Defines all options that can be passed when initializing the plugin.
* Requires `targetSheetBlueprint` and `sheetsProcessor` to be provided together if customizing.
*/
export type TabulateConfig = TabulateDefaultConfig | TabulateCustomConfig;

/**
* Generic interface representing a single field value in a Flatfile record.
* Matches the Flatfile API's expected structure for record values.
*
* @template T - The primitive type of the value (string, number, boolean, etc.)
*/
export interface RecordFieldValue<T> {
  value: T;
  messages?: Array<{ message: string; source?: string; type?: string }>;
  valid?: boolean;
  info?: boolean;
  warning?: boolean;
  error?: boolean;
}

/**
* Defines the expected structure of the metadata object for tabulate jobs.
*/
export interface TabulateJobMetadata {
  targetSheetId?: string; // ID of the sheet where scores should be written (used by watch trigger)
}

/**
* Defines the structure of quality score records created by this plugin.
* Each field uses the generic RecordFieldValue type to maintain type safety.
* The index signature `Record<string, RecordFieldValue<any>>` is required for compatibility
* with Flatfile's `RecordData` type, which expects an indexable structure with potentially
* diverse value types under `RecordFieldValue`.
*/
export interface QualityScoreRecord extends Record<string, RecordFieldValue<any>> {
  sheet_name: RecordFieldValue<string>;
  valid_rows_count: RecordFieldValue<number>;
  valid_rows_percentage: RecordFieldValue<string>;
  invalid_rows_count: RecordFieldValue<number>;
  invalid_rows_percentage: RecordFieldValue<string>;
  timestamp: RecordFieldValue<string>;
}

/**
* Composite type that ensures QualityScoreRecord is compatible with Flatfile's RecordData.
* Used for type assertions when interfacing with the Flatfile API.
*/
export type ScoreRecordData = QualityScoreRecord & Flatfile.RecordData;

/**
* Context object provided with job events.
* Contains IDs needed to reference the relevant resources.
*/
export interface JobEventContext {
  jobId: string;
  workbookId?: string;
  spaceId: string;
  environmentId?: string;
}

/**
* Context object provided with workbook events.
* Contains IDs needed to reference the relevant resources.
*/
export interface WorkbookEventContext {
  workbookId: string;
  spaceId: string;
  environmentId?: string;
}

/**
* Shared constants used throughout the plugin.
* Centralizes naming conventions for sheets and resources.
*/
export const CONSTANTS = {
  BASE_SHEET_SLUG: "dataQualityScoresSheet",
};