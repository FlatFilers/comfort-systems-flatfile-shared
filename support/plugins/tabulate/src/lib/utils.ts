import api from "@flatfile/api";
import { Flatfile } from "@flatfile/api";
import { asyncBatch, logInfo, logError } from "@flatfile/util-common";
import { TabulateConfig, CONSTANTS, QualityScoreRecord, ScoreRecordData } from "./types";
import { dataQualityScoresSheet } from "../blueprints/data-quality-scores.sheet";
import { scoresWorkbook } from "../blueprints/scores.workbook";

/**
* Formats resource names consistently for use in API routes and slugs.
* Handles spaces and ensures lowercase formatting for consistent reference.
* 
* @param name - The original resource name to format
* @returns A standardized string safe for use in slugs and identifiers
*/
export function formatResourceName(name: string): string {
  return name.trim().toLowerCase().replace(/ /g, "-");
}

/**
* Updates a job's progress information in the Flatfile platform.
* Provides user feedback about the ongoing operation status.
* 
* @param jobId - The ID of the job to update
* @param info - Human-readable description of the current step
* @param progress - Numeric progress value between 0-100
*/
export async function updateJobProgress(jobId: string, info: string, progress: number): Promise<void> {
  try {
    await api.jobs.update(jobId, {
      info,
      progress
    });
  } catch (error: unknown) {
    logError("[Utils]", `Failed to update job progress: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
* Validates if a workbook name is non-empty.
* All symbols are allowed; only empty or whitespace-only names are rejected.
*
* @param name - The workbook name to validate
* @throws Error if the name is empty or contains only whitespace
*/
export function validateWorkbookName(name: string): void {
  if (!name || name.trim() === '') {
    throw new Error("Source workbook name is required");
  }
}

/**
* Clears all existing records from a given sheet.
* Handles potential errors during fetching or deletion gracefully.
*
* @param sheetId - The ID of the sheet to clear records from.
* @param debug - Optional flag for verbose logging.
*/
export async function clearSheetRecords(sheetId: string, debug?: boolean): Promise<void> {
  const logPrefix = `[Utils:clearSheetRecords sheet=${sheetId}]`;
  try {
    if (debug) logInfo(logPrefix, `Checking for existing records...`);
    // Fetch existing records
    const { data: recordsResponse } = await api.records.get(sheetId);
    const existingRecords = recordsResponse.records;
    
    if (existingRecords && existingRecords.length > 0) {
      const recordIds = existingRecords.map((record) => record.id);
      if (debug) logInfo(logPrefix, `Found ${recordIds.length} existing records. Deleting...`);
      
      // Delete records in batches for better performance
      const options = { chunkSize: 100, parallel: 5 }; // Consistent options
      await asyncBatch(
        recordIds,
        async (chunk) => {
          await api.records.delete(sheetId, { ids: chunk });
        },
        options
      );
      
      if (debug) logInfo(logPrefix, `Deletion of ${recordIds.length} existing records complete.`);
    } else {
      if (debug) logInfo(logPrefix, `No existing records found. Nothing to delete.`);
    }
  } catch (error: unknown) {
    // Log errors then re-throw to be caught by the caller
    logError(logPrefix, `Error clearing records: ${error instanceof Error ? error.message : String(error)}`);
    if (debug) {
      console.error("Error details during record deletion:", error);
    }
    throw error; // Re-throw the error to be caught by the caller
  }
}

/**
* Creates or finds the target workbook and sheet for storing data quality scores.
* This function follows a "get or create" pattern to ensure the target exists.
* 
* The execution flow is:
* 1. Prepare the sheet configuration with unique naming based on source workbook
* 2. Check if the scores workbook already exists in the space
* 3. If not found: create a new workbook with the sheet
* 4. If found but missing sheet: add the sheet to the existing workbook
* 5. If found with sheet: return the existing sheet
* 
* @param config - The plugin configuration containing workbook naming information
* @param spaceId - The space ID where the workbook should be located
* @returns Object containing both the workbook and sheet references
*/
export async function getOrCreateTargetWorkbookAndSheet(
  config: TabulateConfig, 
  spaceId: string
): Promise<{ targetWorkbook: Flatfile.Workbook, targetSheet: Flatfile.Sheet }> {
  // Determine which sheet blueprint to use - custom or default
  let sheetBlueprint: Flatfile.SheetConfig;
  
  if (hasCustomProcessor(config)) {
    // Use custom blueprint provided by the user
    sheetBlueprint = JSON.parse(JSON.stringify(config.targetSheetBlueprint));
    if (config.debug) logInfo("[Tabulate Plugin]", "Using custom sheet blueprint");
  } else {
    // Use the default data quality scores blueprint
    sheetBlueprint = JSON.parse(JSON.stringify(dataQualityScoresSheet));
    // Customize the sheet with source-workbook-specific naming
    sheetBlueprint.slug = `${CONSTANTS.BASE_SHEET_SLUG}-${formatResourceName(config.sourceWorkbookName)}`;
    sheetBlueprint.name = `${config.sourceWorkbookName}`;
    
    if (config.debug) logInfo("[Tabulate Plugin]", "Using default sheet blueprint");
  }
  
  
  // Check if the scores workbook already exists in this space
  const { data: workbooks } = await api.workbooks.list({ 
    spaceId, 
    name: scoresWorkbook.name, 
    includeSheets: true 
  });
  
  // Case 1: No workbook exists yet - create a new one with our sheet
  if (workbooks.length === 0) {
    if (config.debug) logInfo("[Tabulate Plugin]", `Creating target workbook and sheet for ${config.sourceWorkbookName}`);
    
    // Clone the workbook blueprint and add our sheet
    const _scoresWorkbook = JSON.parse(JSON.stringify(scoresWorkbook));
    _scoresWorkbook.sheets ||= [];
    _scoresWorkbook.sheets.push(sheetBlueprint);
    
    // Create the workbook in the platform
    const { data: targetWorkbook } = await api.workbooks.create({
      ..._scoresWorkbook, 
      spaceId
    });
    
    // Ensure sheets array exists before searching
    const targetSheet = targetWorkbook.sheets?.find(
      sheet => sheet.slug === sheetBlueprint.slug
    );
    if (!targetSheet) {
      // This should ideally not happen if creation was successful and included the sheet
      logError("[Tabulate Plugin]", `CRITICAL: Sheet slug ${sheetBlueprint.slug} not found in newly created workbook ${targetWorkbook.id}`);
      throw new Error(`Failed to find target sheet ${sheetBlueprint.slug} after workbook creation.`);
    }
    
    return { targetWorkbook, targetSheet };
  } 
  // Case 2: Workbook exists - check if it has our sheet
  else {
    if (config.debug) logInfo("[Tabulate Plugin]", `Target workbook already exists for ${config.sourceWorkbookName}`);
    const targetWorkbook = workbooks[0];
    const targetSheet = targetWorkbook.sheets?.find(
      sheet => sheet.slug === sheetBlueprint.slug
    );
    
    // Case 2a: Workbook exists but sheet doesn't - add the sheet
    if (!targetSheet) {
      if (config.debug) logInfo("[Tabulate Plugin]", `Target sheet not found for ${config.sourceWorkbookName}, creating it`);
      
      // Update the workbook to include our new sheet
      const { data: updatedTargetWorkbook } = await api.workbooks.update(targetWorkbook.id, {
        ...targetWorkbook,
        sheets: [...targetWorkbook.sheets || [], sheetBlueprint]
      });
      
      // Ensure sheets array exists before searching in the updated workbook response
      const targetSheet = updatedTargetWorkbook.sheets?.find(
        sheet => sheet.slug === sheetBlueprint.slug
      );
      if (!targetSheet) {
        // This should ideally not happen if update was successful and included the sheet
        logError("[Tabulate Plugin]", `CRITICAL: Sheet slug ${sheetBlueprint.slug} not found in updated workbook ${updatedTargetWorkbook.id}`);
        throw new Error(`Failed to find target sheet ${sheetBlueprint.slug} after workbook update.`);
      }
      
      return { targetWorkbook: updatedTargetWorkbook, targetSheet };
    } 
    // Case 2b: Both workbook and sheet exist
    else {
      if (config.debug) logInfo("[Tabulate Plugin]", `Target sheet found for ${config.sourceWorkbookName}, ${JSON.stringify(targetSheet)}`);
      
      return { targetWorkbook, targetSheet };
    }
  }
}/**
* Default processor for calculating quality scores on sheets.
* Extracts valid/invalid record counts and percentages for each source sheet.
* 
* @param sourceSheets - Array of sheets from the source workbook to analyze
* @param config - Configuration options for the processor
* @returns Promise resolving to an array of quality score records
*/
async function defaultSheetsProcessor(
  sourceSheets: Flatfile.Sheet[],
  config: TabulateConfig
): Promise<QualityScoreRecord[]> {
  const analysisResults: QualityScoreRecord[] = [];
  // Create a timestamp to identify this specific calculation run
  const now = new Date().toISOString();
  
  // Process each sheet individually
  for (const sheet of sourceSheets) {
    // Skip any sheets that are already score sheets (to prevent recursive analysis)
    if (sheet.slug && sheet.slug.startsWith(CONSTANTS.BASE_SHEET_SLUG)) {
      if (config.debug) logInfo("[Tabulate Plugin]", `Skipping quality scores sheet: ${sheet.name}`);
      continue;
    }
    
    // Fetch record counts for quality analysis
    let counts;
    try {
      const response = await api.sheets.getRecordCounts(sheet.id);
      counts = response.data;
    } catch (error: unknown) {
      // If fetching counts for this sheet fails, log the error but continue with other sheets
      if (config.debug) logError("[Tabulate Plugin]", `Error getting counts for sheet ${sheet.name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    
    // Extract the relevant count values
    const totalRecords = counts.counts.total;
    const validRecords = counts.counts.valid;
    const errorRecords = counts.counts.error;
    
    // Calculate percentage metrics with proper handling for edge cases
    let validPercentage = 0;
    let errorPercentage = 0;
    
    if (totalRecords > 0) {
      validPercentage = Math.round((validRecords / totalRecords) * 100);
      errorPercentage = Math.round((errorRecords / totalRecords) * 100);
    }
    
    // Format percentages as strings with percent symbol for display
    const formattedValidPercentage = `${validPercentage}%`;
    const formattedErrorPercentage = `${errorPercentage}%`;
    
    // Add this sheet's metrics to the results collection
    analysisResults.push({
      sheet_name: { value: sheet.name },
      valid_rows_count: { value: validRecords },
      valid_rows_percentage: { value: formattedValidPercentage },
      invalid_rows_count: { value: errorRecords },
      invalid_rows_percentage: { value: formattedErrorPercentage },
      timestamp: { value: now }
    });
  }
  
  return analysisResults;
}

/**
* Determines if the config is using a custom processor configuration.
* Used as a type guard to narrow the config type when accessing custom fields.
* 
* @param config - The configuration to check
* @returns True if the config has custom processor settings
*/
function hasCustomProcessor(config: TabulateConfig): config is TabulateConfig & { 
  sheetsProcessor: NonNullable<TabulateConfig['sheetsProcessor']>;
  targetSheetBlueprint: NonNullable<TabulateConfig['targetSheetBlueprint']>;
} {
  return 'sheetsProcessor' in config && 
  'targetSheetBlueprint' in config && 
  config.sheetsProcessor !== undefined && 
  config.targetSheetBlueprint !== undefined;
}

/**
* Processes all sheets in the workbook to calculate and record their quality scores.
* This function handles the core calculation and data storage logic.
* 
* The process flow is:
* 1. List all sheets in the workbook
* 2. For each applicable sheet, process with either default or custom processor
* 3. Insert the results into the target sheet
* 4. Complete the job with a success message
* 
* @param jobId - The ID of the current job for progress updates
* @param workbookId - The ID of the workbook containing sheets to analyze
* @param targetSheet - The sheet where quality scores will be stored
* @param config - Configuration options for the plugin
* @param silent - Optional flag to suppress the completion message
*/
export async function processSheets(
  jobId: string, 
  workbookId: string, 
  targetSheet: Flatfile.Sheet, 
  config: TabulateConfig,
  silent?: boolean
): Promise<void> {
  // Step 1: Retrieve all sheets from the workbook
  const {data: sheets} = await api.sheets.list({workbookId});
  
  // Step 2: Handle the edge case of an empty workbook
  if (sheets.length === 0) {
    if (config.debug) logInfo("[Tabulate Plugin]", "No sheets found in workbook");
    await api.jobs.complete(jobId, {
      outcome: {
        message: "Data quality analysis complete. No sheets found in workbook.",
        acknowledge: true
      }
    });
    return;
  }
  
  // Step 3: Use either the custom processor or the default processor
  let analysisResults: Flatfile.RecordData[];
  try {
    if (hasCustomProcessor(config)) {
      if (config.debug) logInfo("[Tabulate Plugin]", "Using custom sheet processor");
      // Use the user-provided processor function
      analysisResults = await config.sheetsProcessor(sheets, config);
    } else {
      if (config.debug) logInfo("[Tabulate Plugin]", "Using default sheet processor");
      // Use the built-in processor logic
      analysisResults = await defaultSheetsProcessor(sheets, config) as ScoreRecordData[];
    }
  } catch (error: unknown) {
    logError("[Tabulate Plugin]", `Error processing sheets: ${error instanceof Error ? error.message : String(error)}`);
    await api.jobs.fail(jobId, {
      outcome: {
        message: `Failed to process sheets: ${error instanceof Error ? error.message : "Unknown error"}`,
        acknowledge: true
      }
    });
    return;
  }
  
  // Step 4: Update progress as we prepare to save results
  await updateJobProgress(jobId, "Recording quality scores...", 75);
  
  // Step 5: Store the analysis results in the target sheet
  if (analysisResults.length > 0) {
    await api.records.insert(targetSheet.id, analysisResults);
  }
  
  // Step 6: Complete the job with a success message
  const outcome: Flatfile.JobOutcome | undefined = (silent || config.showCalculationsOnComplete === false) ? undefined : {
    message: `Data quality analysis complete. Added ${analysisResults.length} sheet results to quality history.`,
    acknowledge: config.action?.mode === "foreground" ? true : false,
    next: { 
      type: "id", 
      id: targetSheet.id
    }
  };
  await api.jobs.complete(jobId, { outcome });
}