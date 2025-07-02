"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFederateJobListener = createFederateJobListener;
const api_1 = __importDefault(require("@flatfile/api"));
const federated_sheet_manager_1 = require("../utils/federation/federated_sheet_manager");
const util_common_1 = require("@flatfile/util-common");
/**
 * Creates a job listener for handling workbook federation operations
 * This listener processes the federation of data from source sheets to a new federated workbook
 *
 * @param config - Configuration object containing federation settings and workbook structure
 * @param operation - The specific operation to handle (e.g., 'federate')
 * @returns A function that sets up the job listener with the provided configuration
 */
function createFederateJobListener(config, operation) {
    // Initialize sheet manager for handling federation logic
    // This is done outside the listener to catch parsing errors early
    const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
    if (config.debug) {
        (0, util_common_1.logInfo)("📦 Federate Plugin", `FederateJobListener initialized with operation: ${operation}`);
        (0, util_common_1.logInfo)("📦 Federate Plugin", `Federated workbook name: ${config.federated_workbook.name}`);
    }
    return function (listener) {
        if (config.debug)
            (0, util_common_1.logInfo)("📦 Federate Plugin", `Setting up federation job listener for operation: workbook:${operation}`);
        // Listen for job ready events specific to the workbook operation
        listener.on("job:ready", { job: `workbook:${operation}` }, async (event) => {
            var _a, _b, _c;
            const { context: { jobId, workbookId, spaceId } } = event;
            if (config.debug)
                (0, util_common_1.logInfo)("📦 Federate Plugin", `Federation job started: ${jobId} for workbook: ${workbookId} in space: ${spaceId}`);
            await api_1.default.jobs.ack(jobId, { progress: 0, info: 'Starting federation' });
            let progress = 0;
            /**
             * Helper function to update job progress and status
             * @param info - Status message to display
             * @param target - Target progress percentage to add
             */
            const updateProgress = async (info, target) => {
                progress = Math.min(progress + target, 100);
                if (config.debug)
                    (0, util_common_1.logInfo)("📦 Federate Plugin", `Progress update: ${info} - ${progress}%`);
                await api_1.default.jobs.ack(jobId, { progress, info });
            };
            try {
                // Initialize federation process
                await updateProgress('Retrieving source data', 5);
                // Retrieve source workbook and filter relevant sheets
                const { data: sourceWorkbook } = await api_1.default.workbooks.get(workbookId);
                const sourceSheets = ((_a = sourceWorkbook.sheets) === null || _a === void 0 ? void 0 : _a.filter(sheet => manager.hasSourceSheet(sheet.slug))) || [];
                if (config.debug) {
                    (0, util_common_1.logInfo)("📦 Federate Plugin", `Found ${sourceSheets.length} source sheets in workbook ${workbookId}`);
                    sourceSheets.forEach(sheet => (0, util_common_1.logInfo)("📦 Federate Plugin", `Source sheet: ${sheet.name} (${sheet.slug}) - ID: ${sheet.id}`));
                }
                // Validate source sheets exist. This is a sanity check to ensure the source workbook is valid.
                if (sourceSheets.length === 0) {
                    if (config.debug)
                        (0, util_common_1.logWarn)("📦 Federate Plugin", `No source sheets found in workbook ${workbookId}`);
                    await api_1.default.jobs.fail(jobId, {
                        info: "No source sheets found",
                        outcome: { acknowledge: true, message: "No source sheets found" }
                    });
                    return;
                }
                await updateProgress('Deleting existing federated workbooks', 10);
                // Remove any existing federated workbooks to prevent duplicates
                const oldWorkbooks = await api_1.default.workbooks.list({ spaceId, name: config.federated_workbook.name });
                if (config.debug)
                    (0, util_common_1.logInfo)("📦 Federate Plugin", `Found ${oldWorkbooks.data.length} existing workbooks with name "${config.federated_workbook.name}" to delete`);
                await Promise.all(oldWorkbooks.data.map(wb => {
                    if (config.debug)
                        (0, util_common_1.logInfo)("📦 Federate Plugin", `Deleting workbook: ${wb.id}`);
                    return api_1.default.workbooks.delete(wb.id);
                }));
                await updateProgress('Creating new federated workbook', 10);
                // Create new federated workbook with provided configuration
                const { data: newWorkbook } = await api_1.default.workbooks.create({
                    ...config.federated_workbook,
                    spaceId
                });
                if (config.debug) {
                    (0, util_common_1.logInfo)("📦 Federate Plugin", `Created new federated workbook: ${newWorkbook.id} with ${((_b = newWorkbook.sheets) === null || _b === void 0 ? void 0 : _b.length) || 0} sheets`);
                    (_c = newWorkbook.sheets) === null || _c === void 0 ? void 0 : _c.forEach(sheet => (0, util_common_1.logInfo)("📦 Federate Plugin", `Target sheet: ${sheet.name} (${sheet.slug}) - ID: ${sheet.id}`));
                }
                await updateProgress('Setting up field mappings', 10);
                // Clear any existing mappings to ensure we start fresh
                manager.clearMappings();
                if (config.debug)
                    (0, util_common_1.logInfo)("📦 Federate Plugin", 'Cleared existing field mappings');
                // Set up field mappings between source and target sheets
                config.federated_workbook.sheets.forEach(blueprint => {
                    var _a;
                    const sheet = (_a = newWorkbook.sheets) === null || _a === void 0 ? void 0 : _a.find(s => s.slug === blueprint.slug);
                    if (config.debug)
                        (0, util_common_1.logInfo)("📦 Federate Plugin", `Creating mapping for sheet: ${blueprint.slug}`);
                    manager.createMappings(blueprint, sheet);
                });
                await updateProgress('Processing and inserting records', 15);
                // Process each source sheet and its records in batches
                for (const sheet of sourceSheets) {
                    if (config.debug)
                        (0, util_common_1.logInfo)("📦 Federate Plugin", `Processing records from source sheet: ${sheet.slug}`);
                    let pageNumber = 1;
                    let totalRecordsProcessed = 0;
                    // Process records in batches of 10,000
                    while (true) {
                        const { data: { records } } = await api_1.default.records.get(sheet.id, { pageNumber });
                        const recordCount = (records === null || records === void 0 ? void 0 : records.length) || 0;
                        if (config.debug)
                            (0, util_common_1.logInfo)("📦 Federate Plugin", `Retrieved ${recordCount} records from sheet ${sheet.slug} (page ${pageNumber})`);
                        if (records && records.length > 0) {
                            // Process batch through manager and get transformed records
                            manager.addRecords(sheet.slug, records);
                            const batchRecords = manager.getRecords();
                            if (config.debug)
                                (0, util_common_1.logInfo)("📦 Federate Plugin", `Processing batch ${pageNumber} with ${records.length} records from sheet ${sheet.slug}`);
                            // Insert batch records into their respective target sheets sequentially
                            for (const [sheetId, sheetRecords] of batchRecords.entries()) {
                                if (sheetRecords.length > 0) {
                                    if (config.debug)
                                        (0, util_common_1.logInfo)("📦 Federate Plugin", `Inserting ${sheetRecords.length} records into sheet ${sheetId} (batch ${pageNumber})`);
                                    await api_1.default.records.insert(sheetId, sheetRecords);
                                    console.log("inserted sheetRecords.length", sheetRecords.length);
                                }
                            }
                            // Clear the batch from manager to free up memory
                            manager.clearRecords();
                            totalRecordsProcessed += records.length;
                            if (config.debug)
                                (0, util_common_1.logInfo)("📦 Federate Plugin", `Completed batch ${pageNumber} - inserted ${records.length} records from sheet ${sheet.slug}`);
                        }
                        // If we got fewer than 10,000 records, we've reached the end
                        if (recordCount < 10000) {
                            break;
                        }
                        pageNumber++;
                    }
                    if (config.debug) {
                        if (totalRecordsProcessed > 0) {
                            (0, util_common_1.logInfo)("📦 Federate Plugin", `Completed processing ${totalRecordsProcessed} total records from sheet ${sheet.slug}`);
                        }
                        else {
                            (0, util_common_1.logWarn)("📦 Federate Plugin", `No records found in source sheet: ${sheet.slug}`);
                        }
                    }
                }
                await updateProgress('Finalizing federation', 29);
                // Complete the job successfully
                if (config.debug)
                    (0, util_common_1.logInfo)("📦 Federate Plugin", `Successfully completed federation job: ${jobId}`);
                await api_1.default.jobs.complete(jobId, { outcome: { message: 'Federation complete' } });
            }
            catch (error) {
                // Handle any errors during the federation process
                if (config.debug) {
                    (0, util_common_1.logError)("📦 Federate Plugin", `Federation job ${jobId} failed with error: ${error.message}`);
                    (0, util_common_1.logError)("📦 Federate Plugin", `Error stack: ${error.stack}`);
                }
                await api_1.default.jobs.fail(jobId, {
                    info: String(error.message),
                    outcome: { acknowledge: true, message: String(error.message) }
                });
            }
        });
    };
}
//# sourceMappingURL=federate-job.js.map