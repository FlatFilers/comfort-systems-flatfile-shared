import { FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { logInfo, logError } from "@flatfile/util-common";
import { Flatfile } from "@flatfile/api";
import { TabulateConfig, JobEventContext, QualityScoreRecord, ScoreRecordData, CONSTANTS, TabulateJobMetadata } from "../lib/types";
import { getOrCreateTargetWorkbookAndSheet, updateJobProgress, formatResourceName, clearSheetRecords, processSheets } from "../lib/utils"; // Add processSheets
import { acquireSheetMetadataLock, releaseSheetMetadataLock, isSheetLocked } from "../lib/metadata-lock-utils"; // Updated import
import { scoresWorkbook } from "../blueprints/scores.workbook"; // To find the scores workbook name

interface JobReadyPayload {
  job?: Flatfile.Job;
}

interface CommitCreatedEventContext extends JobEventContext {
  commitId: string;
}

/**
* Creates a job listener for handling the tabulate operation.
* This function sets up an event listener that will be triggered when the job is ready.
* 
* @param config - Configuration options for the tabulate plugin
* @param operation - The operation identifier string for this job
* @returns A function that registers the job listener with the Flatfile listener
*/
export function createTabulateJobListener(
  config: TabulateConfig, 
  operation: string
): (listener: FlatfileListener) => void {
  return function(listener: FlatfileListener): void {

    if (config.debug) {
      logInfo("Tabulate Plugin", `Job Listener initialized with operation: ${operation}`);
      logInfo("Tabulate Plugin", `Source workbook name: ${config.sourceWorkbookName}`);
    }
    
    // Add commit listener if watch mode is enabled
    if (config.watch) {
      if (config.debug) logInfo("Tabulate Plugin", "Watch mode enabled. Listening for commit-created events.");
      listener.on("commit:created", async (event: { context: CommitCreatedEventContext }) => {
        const { context: { commitId, workbookId, spaceId } } = event;
        const sourceWorkbookName = config.sourceWorkbookName; // For clarity
        
        if (config.debug) logInfo("[Watch Trigger]", `Commit ${commitId} detected for workbook ${workbookId}`);
        
        if (!workbookId) {
          logError("[Watch Trigger]", `Commit ${commitId} missing workbookId. Skipping.`);
          return;
        }
        
        try {
          // 1. Check if the commit is for the configured source workbook
          const { data: sourceWorkbook } = await api.workbooks.get(workbookId);
          if (sourceWorkbook.name !== sourceWorkbookName) {
            if (config.debug) logInfo("[Watch Trigger]", `Commit workbook "${sourceWorkbook.name}" does not match target "${sourceWorkbookName}". Skipping.`);
            return;
          }
          if (config.debug) logInfo("[Watch Trigger]", `Commit workbook "${sourceWorkbook.name}" matches target. Proceeding.`);
          
          // 2. Find the target "Tabulations" sheet for this source workbook
          const targetWorkbookName = scoresWorkbook.name;
          let targetSheetId: string | undefined;
          
          const { data: targetWorkbooks } = await api.workbooks.list({ spaceId, name: targetWorkbookName, includeSheets: true });
          
          if (targetWorkbooks.length === 0) {
            logError("[Watch Trigger]", `Target workbook "${targetWorkbookName}" not found in space ${spaceId}. Cannot acquire lock or trigger job.`);
            return;
          }
          const targetWorkbook = targetWorkbooks[0]; // There should only ever be one workbook with this name. If there's ever a conflict, we'll need to add logic to handle it.
          
          let targetSheet: Flatfile.Sheet | undefined;
          let targetSheetSlug: string | undefined;
          if (config.targetSheetBlueprint) {
            targetSheetSlug = config.targetSheetBlueprint.slug;
            targetSheet = targetWorkbook.sheets?.find(s => s.config.slug === config.targetSheetBlueprint.slug);
          } else {
            targetSheetSlug = `${CONSTANTS.BASE_SHEET_SLUG}-${formatResourceName(sourceWorkbookName)}`;
            targetSheet = targetWorkbook.sheets?.find(s => s.config.slug === targetSheetSlug);
          }
          if (!targetSheet) {
            logError("[Watch Trigger]", `Target sheet with slug "${targetSheetSlug}" not found in workbook "${targetWorkbookName}" (${targetWorkbook.id}). Cannot acquire lock or trigger job.`);
            return;
          }
          
          targetSheetId = targetSheet.id;
          
          if (config.debug) logInfo("[Watch Trigger]", `Found target sheet ${targetSheetId} for source workbook ${workbookId}.`);
          
          // Check if sheet is already locked before creating a job
          if (config.debug) logInfo("[Watch Trigger]", `Checking if sheet ${targetSheetId} is already locked before creating job...`);
          const isLocked = await isSheetLocked(targetSheetId, config.debug);
          
          if (isLocked) {
            if (config.debug) logInfo("[Watch Trigger]", `Sheet ${targetSheetId} is currently locked. Skipping job creation for commit ${commitId}.`);
            return; // Don't create the job if already locked
          }
          
          if (config.debug) logInfo("[Watch Trigger]", `Sheet ${targetSheetId} appears unlocked. Proceeding with job creation.`);
          
          // Create the job
          await api.jobs.create({
            type: "workbook",
            operation: operation,
            source: workbookId,
            trigger: "immediate",
            info: `Recalculating scores for "${sourceWorkbookName}" due to commit ${commitId.substring(0,8)}...`,
            metadata: {
              targetSheetId: targetSheetId,
            },
          });
          
          if (config.debug) logInfo("[Watch Trigger]", `Job created for operation ${operation} for targetSheet ${targetSheetId}.`);
          
        } catch (error: unknown) {
          logError("[Watch Trigger]", `Error processing commit ${commitId} for workbook ${workbookId}: ${error instanceof Error ? error.message : String(error)}`);
          if (config.debug) console.error(error);
          // Do not attempt lock release here, as it might not have been acquired
        }
      });
    } // end if (config.watch)
    
    /**
    * Sets up the job listener for the tabulate operation. May be triggered manually by an Action button or by a watch trigger.
    * This is the main entry point for running the tabulate logic as a Flatfile job.
    */
    listener.on("job:ready", { job: `workbook:${operation}` }, async (event: { context: JobEventContext, payload: JobReadyPayload }) => { 
      logInfo(`[Job Ready ${event.context.jobId}]`, "Handler execution starting...");
      const { context: { jobId, spaceId, environmentId }, payload } = event; 
      
      // Declare variables at the top level so they're accessible in the finally block
      let job;
      let targetSheetIdFromMetadata: string | undefined;
      let targetSheet: Flatfile.Sheet | undefined; // To hold the target sheet object
      let targetSheetIdForLocking: string | undefined; // Use this consistently for the sheet ID
      let lockIdForThisJob: string | undefined;       // Use this for the lock ID generated by the job
      let lockAcquired = false;                       // Flag to track lock status for finally block
      
      if (config.debug) {
        logInfo(`[Job Ready ${jobId}]`, `Received job for operation: ${operation}`);
      }
      
      try {
        await api.jobs.ack(jobId, {
          info: "Starting data quality analysis",
          progress: 10
        });
        
        if (config.debug) logInfo(`[Job ${jobId}]`, "Job acknowledged.");
        if (config.debug) logInfo(`[Job ${jobId}]`, "Fetching job details to retrieve metadata...");
        
        try {
          const { data: fetchedJob } = await api.jobs.get(jobId);
          job = fetchedJob;
          if (job.metadata && typeof job.metadata === 'object') {
            // Extract values safely
            targetSheetIdFromMetadata = (job.metadata as TabulateJobMetadata)?.targetSheetId;
            if (config.debug) logInfo(`[Job ${jobId}]`, `Retrieved metadata: targetSheetId=${targetSheetIdFromMetadata}`);
          } else {
            if (config.debug) logInfo(`[Job ${jobId}]`, "No metadata found on job.");
          }
        } catch (getJobError: unknown) {
          logError(`[Job ${jobId}]`, `Failed to fetch job details: ${getJobError instanceof Error ? getJobError.message : String(getJobError)}`);
        }
        
        // Determine processing workbook ID (still needed for source data)
        const processingWorkbookId = job?.sourceId || event.context.workbookId;
        
        if (config.debug) {
          logInfo(`[Job Ready ${jobId}]`, `Effective Processing Workbook ID: ${processingWorkbookId}`);
          if (targetSheetIdFromMetadata) {
            logInfo(`[Job Ready ${jobId}]`, `Triggered by watch (metadata found). Target Sheet ID: ${targetSheetIdFromMetadata}`);
          } else {
            logInfo(`[Job Ready ${jobId}]`, `Triggered manually or via action (no metadata found).`);
          }
        }
        
        // Validate essential processingWorkbookId
        if (!processingWorkbookId) {
          logError(`Job Ready ${jobId}`, "Processing Workbook ID is missing.");
          await api.jobs.fail(jobId, { outcome: { message: "Processing Workbook ID is required, cannot determine source." } });
          return;
        }
        
        // Get the target sheet object based on trigger type
        if (targetSheetIdFromMetadata) {
          if (config.debug) logInfo(`[Job ${jobId}]`, `Fetching target sheet using metadata ID: ${targetSheetIdFromMetadata}`);
          // WATCH TRIGGER: Use targetSheetId from job metadata
          try {
            
            const { data } = await api.sheets.get(targetSheetIdFromMetadata);
            targetSheet = data;
            
            if (config.debug) logInfo(`[Job ${jobId}]`, `Successfully fetched target sheet "${targetSheet.metadata?.name || targetSheet.name}" (${targetSheet.id})`);
            
          } catch (sheetGetError: unknown) {
            
            logError(`[Job ${jobId}]`, `Failed to fetch target sheet with ID ${targetSheetIdFromMetadata} from metadata: ${sheetGetError instanceof Error ? sheetGetError.message : String(sheetGetError)}`);
            
            // Fail the job if we expected a target sheet via metadata but couldn't get it
            await api.jobs.fail(jobId, { outcome: { message: `Watch Trigger Error: Could not fetch the target sheet specified in job metadata (${targetSheetIdFromMetadata}).` } });
            return; // Stop execution
            
          }
        } else {
          // MANUAL TRIGGER: Find or create the workbook/sheet structure
          if (config.debug) logInfo(`[Job ${jobId}]`, "Manual trigger: Finding or creating target workbook/sheet.");
          
          try {
            
            const { targetSheet: foundSheet } = await getOrCreateTargetWorkbookAndSheet(config, spaceId);
            targetSheet = foundSheet; // This function already returns the sheet object
            
            if (config.debug) logInfo(`[Job ${jobId}]`, `Using target sheet "${targetSheet.metadata?.name || targetSheet.name}" (${targetSheet.id})`);
            
          } catch (findCreateError: unknown) {
            
            logError(`[Job ${jobId}]`, `Failed to find or create target sheet for manual trigger: ${findCreateError instanceof Error ? findCreateError.message : String(findCreateError)}`);
            await api.jobs.fail(jobId, { outcome: { message: `Manual Trigger Error: Could not find or create the target sheet.` } });
            return; // Stop execution
            
          }
        }
        
        // We must have a target sheet by now if logic proceeded correctly
        if (!targetSheet) {
          
          logError(`[Job ${jobId}]`, "Critical Error: Failed to obtain target sheet object.");
          
          // Attempt to fail job, though this state should ideally be unreachable
          await api.jobs.fail(jobId, { outcome: { message: "Internal Error: Could not determine target sheet." } });
          return; // Stop execution
          
        }
        
        // Set targetSheetIdForLocking now that we have a definitive targetSheet
        targetSheetIdForLocking = targetSheet.id;
        if (config.debug) logInfo(`[Job ${jobId}]`, `Target sheet ID for locking/processing: ${targetSheetIdForLocking}`);
        
        // Step 2.5: Acquire lock before proceeding
        if (!targetSheetIdForLocking) {
          // This check might be redundant if previous logic is correct, but acts as a safeguard
          logError(`[Job ${jobId}]`, "Cannot attempt lock acquisition: Target sheet ID is undefined.");
          await api.jobs.fail(jobId, { outcome: { message: "Internal Error: Missing target sheet ID for locking." } });
          return;
        }
        
        lockIdForThisJob = `job-${jobId}-sheet-${targetSheetIdForLocking}`;
        if (config.debug) logInfo(`[Job ${jobId}]`, `Attempting to acquire lock ${lockIdForThisJob} on sheet ${targetSheetIdForLocking}...`);
        
        const acquired = await acquireSheetMetadataLock(targetSheetIdForLocking, lockIdForThisJob, config.debug);
        
        if (!acquired) {
          logInfo(`[Job ${jobId}]`, `Could not acquire lock ${lockIdForThisJob} on sheet ${targetSheetIdForLocking}. Another job running. Canceling job.`); // Changed to logInfo
          await api.jobs.cancel(jobId, { info: "Target sheet is locked by another process. Canceling calculation." });
          return; // Stop execution
        }
        
        // If we reach here, the lock was acquired
        lockAcquired = true; // Set flag for finally block
        if (config.debug) logInfo(`[Job ${jobId}]`, `Successfully acquired lock ${lockIdForThisJob} for sheet ${targetSheetIdForLocking}.`);
        
        // Step 2.7: Clear previous records (after lock acquisition)
        if (targetSheetIdForLocking) { // Ensure we have the ID before calling
          
          if (config.debug) logInfo(`[Job ${jobId}]`, `Clearing previous records from target sheet ${targetSheetIdForLocking}...`);
          try {
            
            await clearSheetRecords(targetSheetIdForLocking, config.debug);
            if (config.debug) logInfo(`[Job ${jobId}]`, `Record clearing complete for sheet ${targetSheetIdForLocking}.`);
            
          } catch (clearError: unknown) {
            
            // Log the error and fail the job
            logError(`[Job ${jobId}]`, `Error during record clearing for sheet ${targetSheetIdForLocking}: ${clearError instanceof Error ? clearError.message : String(clearError)}`);
            if (config.debug) console.error(clearError);
            
            const errorMsg = clearError instanceof Error ? clearError.message : String(clearError);
            await api.jobs.fail(jobId, { outcome: { message: `Failed to clear previous results before calculation: ${errorMsg}` } });
            return; // Stop further execution in the main try block
            
          }
          
        } else {
          logError(`[Job ${jobId}]`, `Cannot clear records: targetSheetIdForLocking is undefined.`);
        }
        
        // Update progress and process sheets
        await updateJobProgress(jobId, "Analyzing sheets...", 30);
        if (config.debug) logInfo(`[Job ${jobId}]`, `Starting sheet processing for workbook ${processingWorkbookId}.`);
        
        // Pass the determined processingWorkbookId and the actual targetSheet object
        // This is the main function that will process the sheets and insert the results into the target sheet
        // if targetSheetIdFromMetadata is true, that means the job was triggered by a watch trigger, so we're using that to determine the `silent` parameter
        await processSheets(jobId, processingWorkbookId, targetSheet, config, !!targetSheetIdFromMetadata);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`[Job ${jobId}]`, `Job failed: ${errorMessage}`);
        if (config.debug) console.error(error); // Log stack trace if available
        
        // Ensure the job is failed before the finally block runs for lock release
        // But handle potential errors during fail itself if needed, though unlikely
        try {
          
          await api.jobs.fail(jobId, {
            outcome: {
              message: `Error calculating data quality scores: ${errorMessage}`
            }
          });
          
        } catch (failError: unknown) {
          logError(`[Job ${jobId}]`, `CRITICAL: Failed to update job status to failed: ${failError instanceof Error ? failError.message : String(failError)}`);
        }
        
      } finally {
        if (config.debug) logInfo(`[Job ${jobId}]`, "Entering finally block for lock release check.");
        if (config.debug) logInfo(`[Job ${jobId}]`, `finally check state: lockAcquired=${lockAcquired}, lockIdForThisJob=${lockIdForThisJob}, targetSheetIdForLocking=${targetSheetIdForLocking}`);
        
        // **** IMPORTANT: Release lock if acquired ****
        if (lockAcquired && lockIdForThisJob && targetSheetIdForLocking) {
          
          if (config.debug) logInfo(`[Job ${jobId}]`, `Entering finally block. Attempting release for lock acquired by this job: lockId=${lockIdForThisJob} on sheet=${targetSheetIdForLocking}`);
          if (config.debug) logInfo(`[Job ${jobId}]`, `Attempting to release metadata lock ${lockIdForThisJob} on sheet ${targetSheetIdForLocking} in finally block.`);
          
          try {
            
            const released = await releaseSheetMetadataLock(targetSheetIdForLocking, lockIdForThisJob, config.debug);
            if (config.debug) logInfo(`[Job ${jobId}]`, `Result of releaseSheetMetadataLock call for lock ${lockIdForThisJob}: ${released}`);
            if (released && config.debug) {
              logInfo(`[Job ${jobId}]`, `Metadata lock ${lockIdForThisJob} released successfully or was not held.`);
            } else if (!released && config.debug) {
              logInfo(`[Job ${jobId}]`, `Failed to release metadata lock ${lockIdForThisJob} (API error during release).`);
            }
            
          } catch (releaseError: unknown) {
            // Log error during release but do not re-throw
            logError(`[Job ${jobId}]`, `Error during metadata lock release for lock ${lockIdForThisJob} on sheet ${targetSheetIdForLocking}: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`);
          }
        } else {
          if (config.debug) logInfo(`[Job ${jobId}]`, "Lock not acquired by this job run or IDs unavailable, skipping lock release.");
        }
        
      }
    });
  };
}

