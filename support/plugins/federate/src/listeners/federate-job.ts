import { FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { FederateConfig } from "../types";
import { FederatedSheetManager } from "../utils/federation/federated_sheet_manager";
import { FederatedSheetConfig, FederatedUnpivotSheetConfig } from "../types";
import { logError, logInfo, logWarn } from "@flatfile/util-common";

/**
 * Creates a job listener for handling workbook federation operations
 * This listener processes the federation of data from source sheets to a new federated workbook
 * 
 * @param config - Configuration object containing federation settings and workbook structure
 * @param operation - The specific operation to handle (e.g., 'federate')
 * @returns A function that sets up the job listener with the provided configuration
 */
export function createFederateJobListener(config: FederateConfig, operation: string) {
  // Initialize sheet manager for handling federation logic
  // This is done outside the listener to catch parsing errors early
  const manager = new FederatedSheetManager(config);
  
  if (config.debug) {
    logInfo("📦 Federate Plugin", `FederateJobListener initialized with operation: ${operation}`);
    logInfo("📦 Federate Plugin", `Federated workbook name: ${config.federated_workbook.name}`);
  }

  return function(listener: FlatfileListener) {
    if (config.debug) logInfo("📦 Federate Plugin", `Setting up federation job listener for operation: workbook:${operation}`);
    
    // Listen for job ready events specific to the workbook operation
    listener.on("job:ready", { job: `workbook:${operation}` }, async (event) => {
      const { context: { jobId, workbookId, spaceId } } = event;

      if (config.debug) logInfo("📦 Federate Plugin", `Federation job started: ${jobId} for workbook: ${workbookId} in space: ${spaceId}`);

      await api.jobs.ack(jobId, { progress: 0, info: 'Starting federation' });

      let progress = 0;

      /**
       * Helper function to update job progress and status
       * @param info - Status message to display
       * @param target - Target progress percentage to add
       */
      const updateProgress = async (info: string, target: number) => {
        progress = Math.min(progress + target, 100);
        if (config.debug) logInfo("📦 Federate Plugin", `Progress update: ${info} - ${progress}%`);
        await api.jobs.ack(jobId, { progress, info });
      };

      try {
        // Initialize federation process
        await updateProgress('Retrieving source data', 5);

        // Retrieve source workbook and filter relevant sheets
        const { data: sourceWorkbook } = await api.workbooks.get(workbookId);
        const sourceSheets = sourceWorkbook.sheets?.filter(sheet => manager.hasSourceSheet(sheet.slug)) || [];

        if (config.debug) {
          logInfo("📦 Federate Plugin", `Found ${sourceSheets.length} source sheets in workbook ${workbookId}`);
          sourceSheets.forEach(sheet => logInfo("📦 Federate Plugin", `Source sheet: ${sheet.name} (${sheet.slug}) - ID: ${sheet.id}`));
        }

        // Validate source sheets exist. This is a sanity check to ensure the source workbook is valid.
        if (sourceSheets.length === 0) {
          if (config.debug) logWarn("📦 Federate Plugin", `No source sheets found in workbook ${workbookId}`);
          await api.jobs.fail(jobId, {
            info: "No source sheets found",
            outcome: { acknowledge: true, message: "No source sheets found" }
          });
          return;
        }

        await updateProgress('Deleting existing federated workbooks', 10);

        // Remove any existing federated workbooks to prevent duplicates
        const oldWorkbooks = await api.workbooks.list({ spaceId, name: config.federated_workbook.name });
        if (config.debug) logInfo("📦 Federate Plugin", `Found ${oldWorkbooks.data.length} existing workbooks with name "${config.federated_workbook.name}" to delete`);
        
        await Promise.all(oldWorkbooks.data.map(wb => {
          if (config.debug) logInfo("📦 Federate Plugin", `Deleting workbook: ${wb.id}`);
          return api.workbooks.delete(wb.id);
        }));
        
        await updateProgress('Creating new federated workbook', 10);

        // Create new federated workbook with provided configuration
        const { data: newWorkbook } = await api.workbooks.create({
          ...config.federated_workbook,
          spaceId
        });
        
        if (config.debug) {
          logInfo("📦 Federate Plugin", `Created new federated workbook: ${newWorkbook.id} with ${newWorkbook.sheets?.length || 0} sheets`);
          newWorkbook.sheets?.forEach(sheet => logInfo("📦 Federate Plugin", `Target sheet: ${sheet.name} (${sheet.slug}) - ID: ${sheet.id}`));
        }
        
        await updateProgress('Setting up field mappings', 10);
        
        // Clear any existing mappings to ensure we start fresh
        manager.clearMappings();
        if (config.debug) logInfo("📦 Federate Plugin", 'Cleared existing field mappings');
        
        // Set up field mappings between source and target sheets
        config.federated_workbook.sheets.forEach(blueprint => {
          const sheet = newWorkbook.sheets?.find(s => s.slug === blueprint.slug)!;
          if (config.debug) logInfo("📦 Federate Plugin", `Creating mapping for sheet: ${blueprint.slug}`);
          manager.createMappings(blueprint as FederatedSheetConfig | FederatedUnpivotSheetConfig, sheet);
        });
        
        await updateProgress('Processing source records', 15);

        // Process each source sheet and its records
        for (const sheet of sourceSheets) {
          if (config.debug) logInfo("📦 Federate Plugin", `Processing records from source sheet: ${sheet.slug}`);
          
          const { data: { records } } = await api.records.get(sheet.id);
          if (config.debug) logInfo("📦 Federate Plugin", `Retrieved ${records?.length || 0} records from sheet ${sheet.slug}`);
          
          if (records && records.length > 0) {
            manager.addRecords(sheet.slug, records);
            if (config.debug) logInfo("📦 Federate Plugin", `Added ${records.length} records from sheet ${sheet.slug} to manager`);
          } else if (config.debug) logWarn("📦 Federate Plugin", `No records found in source sheet: ${sheet.slug}`);
        }
        
        await updateProgress('Inserting records into target sheets', 20);

        // Get processed records and insert them into target sheets
        const records = manager.getRecords();
        
        if (config.debug) {
          logInfo("📦 Federate Plugin", `Preparing to insert records into ${records.size} target sheets`);
          records.forEach((sheetRecords, sheetId) => {
            logInfo("📦 Federate Plugin", `Sheet ${sheetId}: ${sheetRecords.length} records to insert`);
          });
        }
        
        // Insert records into their respective target sheets
        await Promise.all(
          Array.from(records.entries()).map(([sheetId, sheetRecords]) => {
            if (sheetRecords.length > 0) {
              if (config.debug) logInfo("📦 Federate Plugin", `Inserting ${sheetRecords.length} records into sheet ${sheetId}`);
              return api.records.insert(sheetId, sheetRecords);
            } else {
              if (config.debug) logWarn("📦 Federate Plugin", `No records to insert for sheet ${sheetId}`);
              return Promise.resolve();
            }
          })
        );
        
        await updateProgress('Finalizing federation', 29);

        // Complete the job successfully
        if (config.debug) logInfo("📦 Federate Plugin", `Successfully completed federation job: ${jobId}`);
        
        await api.jobs.complete(jobId, { outcome: { message: 'Federation complete' } });
      } catch (error) {
        // Handle any errors during the federation process
        if (config.debug) {
          logError("📦 Federate Plugin", `Federation job ${jobId} failed with error: ${(error as Error).message}`);
          logError("📦 Federate Plugin", `Error stack: ${(error as Error).stack}`);
        }
        
        await api.jobs.fail(jobId, {
          info: String((error as Error).message),
          outcome: { acknowledge: true, message: String((error as Error).message) }
        });
      }
    });
  };
} 