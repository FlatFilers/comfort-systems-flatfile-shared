"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("@flatfile/api"));
const federate_job_1 = require("./federate-job");
const federated_sheet_manager_1 = require("../utils/federation/federated_sheet_manager");
// Mock dependencies
jest.mock("@flatfile/api", () => ({
    jobs: {
        ack: jest.fn().mockResolvedValue({}),
        complete: jest.fn().mockResolvedValue({}),
        fail: jest.fn().mockResolvedValue({})
    },
    workbooks: {
        get: jest.fn(),
        list: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        create: jest.fn()
    },
    records: {
        get: jest.fn(),
        insert: jest.fn().mockResolvedValue({})
    }
}));
// Mock logging functions
jest.mock("@flatfile/util-common", () => ({
    logError: jest.fn(),
    logInfo: jest.fn(),
    logWarn: jest.fn()
}));
// Mock FederatedSheetManager
jest.mock("../utils/federation/federated_sheet_manager");
// Helper function to create test records
const createTestRecord = (id, values) => ({
    id,
    values: Object.entries(values).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: { value }
    }), {})
});
describe("createFederateJobListener", () => {
    let mockListener;
    let mockEvent;
    let mockConfig;
    // Mock implementations for FederatedSheetManager methods
    let mockHasSourceSheet;
    let mockClearMappings;
    let mockCreateMappings;
    let mockAddRecords;
    let mockGetRecords;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock implementations for FederatedSheetManager methods
        mockHasSourceSheet = jest.fn().mockReturnValue(true);
        mockClearMappings = jest.fn();
        mockCreateMappings = jest.fn();
        mockAddRecords = jest.fn();
        mockGetRecords = jest.fn().mockReturnValue(new Map([["sheet-id-1", [createTestRecord("1", { foo: "bar" })]]]));
        // Setup FederatedSheetManager mock
        federated_sheet_manager_1.FederatedSheetManager.mockImplementation(() => {
            return {
                hasSourceSheet: mockHasSourceSheet,
                clearMappings: mockClearMappings,
                createMappings: mockCreateMappings,
                addRecords: mockAddRecords,
                getRecords: mockGetRecords,
            };
        });
        // Setup basic mocks
        mockListener = {
            on: jest.fn().mockImplementation((event, filter, callback) => {
                if (event === "job:ready") {
                    mockListener.callback = callback;
                }
                return mockListener;
            })
        };
        mockEvent = {
            context: {
                jobId: "job123",
                workbookId: "workbook123",
                spaceId: "space123"
            }
        };
        // Setup basic config
        mockConfig = {
            source_workbook_name: "Source Workbook",
            federated_workbook: {
                name: "Federated Workbook",
                sheets: [
                    {
                        name: "Sheet 1",
                        slug: "sheet1",
                        fields: []
                    }
                ]
            }
        };
    });
    it("should register a job:ready listener with the correct filter", () => {
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        expect(mockListener.on).toHaveBeenCalledWith("job:ready", { job: "workbook:federate" }, expect.any(Function));
    });
    it("should acknowledge the job and set initial progress", async () => {
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", { progress: 0, info: "Starting federation" });
    });
    it("should handle successful federation process", async () => {
        // Set up workbook response
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        const mockRecords = {
            data: {
                records: [{ id: "record1", values: { field1: "value1" } }]
            }
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue(mockRecords);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify the workflow
        expect(api_1.default.workbooks.get).toHaveBeenCalledWith("workbook123");
        expect(mockHasSourceSheet).toHaveBeenCalledWith("source1");
        expect(api_1.default.workbooks.list).toHaveBeenCalledWith({
            spaceId: "space123",
            name: "Federated Workbook"
        });
        expect(api_1.default.workbooks.create).toHaveBeenCalledWith({
            ...mockConfig.federated_workbook,
            spaceId: "space123"
        });
        expect(mockClearMappings).toHaveBeenCalled();
        expect(mockCreateMappings).toHaveBeenCalledWith(mockConfig.federated_workbook.sheets[0], mockNewWorkbook.sheets[0]);
        expect(api_1.default.records.get).toHaveBeenCalledWith("source-sheet-1");
        expect(mockAddRecords).toHaveBeenCalledWith("source1", mockRecords.data.records);
        expect(mockGetRecords).toHaveBeenCalled();
        expect(api_1.default.records.insert).toHaveBeenCalledWith("sheet-id-1", [{
                id: "1",
                values: {
                    foo: { value: "bar" }
                }
            }]);
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should remove existing federated workbooks if found", async () => {
        // Mock existing workbooks with same name
        const existingWorkbooks = [
            { id: "existing-wb-1" },
            { id: "existing-wb-2" }
        ];
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: existingWorkbooks });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify existing workbooks were deleted
        expect(api_1.default.workbooks.delete).toHaveBeenCalledTimes(2);
        expect(api_1.default.workbooks.delete).toHaveBeenCalledWith("existing-wb-1");
        expect(api_1.default.workbooks.delete).toHaveBeenCalledWith("existing-wb-2");
    });
    it("should fail the job when no source sheets are found", async () => {
        // Mock an empty workbook response
        api_1.default.workbooks.get.mockResolvedValue({
            data: { sheets: [] }
        });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with appropriate message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "No source sheets found",
            outcome: { acknowledge: true, message: "No source sheets found" }
        });
    });
    it("should mark any sheet as not a source sheet", async () => {
        // Mock hasSourceSheet to return false
        mockHasSourceSheet.mockReturnValue(false);
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with appropriate message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "No source sheets found",
            outcome: { acknowledge: true, message: "No source sheets found" }
        });
    });
    it("should handle errors during federation process", async () => {
        // Force an error
        const testError = new Error("Test federation error");
        api_1.default.workbooks.get.mockRejectedValue(testError);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with error message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "Test federation error",
            outcome: { acknowledge: true, message: "Test federation error" }
        });
    });
    it("should skip record insertion for empty record sets", async () => {
        // Set up workbook response with empty records
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        // Mock empty records
        mockGetRecords.mockReturnValue(new Map([["sheet-id-1", []]]));
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should not call insert for empty record sets
        expect(api_1.default.records.insert).not.toHaveBeenCalled();
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should update progress at each step of the federation process", async () => {
        // Set up for a successful flow
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        // Reset API mocks to ensure clean call count
        jest.clearAllMocks();
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // There's an initial ack + 7 progress updates
        expect(api_1.default.jobs.ack).toHaveBeenCalledTimes(8);
        // Initial ack
        expect(api_1.default.jobs.ack).toHaveBeenNthCalledWith(1, "job123", { progress: 0, info: "Starting federation" });
        // Verify the series of progress updates were called
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Retrieving source data" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Deleting existing federated workbooks" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Creating new federated workbook" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Setting up field mappings" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Processing source records" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Inserting records into target sheets" }));
        expect(api_1.default.jobs.ack).toHaveBeenCalledWith("job123", expect.objectContaining({ info: "Finalizing federation" }));
        // Final progress should approach 100%
        const lastCall = api_1.default.jobs.ack.mock.calls.slice(-1)[0];
        expect(lastCall[1].progress).toBeGreaterThanOrEqual(95);
        // Should complete the job
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should pass correct parameters to createMappings", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify exact parameters passed to createMappings
        expect(mockCreateMappings).toHaveBeenCalledWith(mockConfig.federated_workbook.sheets[0], mockNewWorkbook.sheets[0]);
    });
    it("should handle workbook creation failure", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const creationError = new Error("Failed to create workbook");
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockRejectedValue(creationError);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with error message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "Failed to create workbook",
            outcome: { acknowledge: true, message: "Failed to create workbook" }
        });
    });
    it("should handle record insertion failure", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        const mockRecords = {
            data: {
                records: [{ id: "record1", values: { field1: "value1" } }]
            }
        };
        const insertionError = new Error("Failed to insert records");
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue(mockRecords);
        api_1.default.records.insert.mockRejectedValue(insertionError);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with error message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "Failed to insert records",
            outcome: { acknowledge: true, message: "Failed to insert records" }
        });
    });
    it("should execute operations in the correct order", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        const mockRecords = {
            data: {
                records: [{ id: "record1", values: { field1: "value1" } }]
            }
        };
        // Create a sequence tracker
        const sequence = [];
        // Mock API calls to track sequence
        api_1.default.workbooks.get.mockImplementation(() => {
            sequence.push("getWorkbook");
            return Promise.resolve({ data: mockSourceWorkbook });
        });
        api_1.default.workbooks.list.mockImplementation(() => {
            sequence.push("listWorkbooks");
            return Promise.resolve({ data: [] });
        });
        api_1.default.workbooks.create.mockImplementation(() => {
            sequence.push("createWorkbook");
            return Promise.resolve({ data: mockNewWorkbook });
        });
        api_1.default.records.get.mockImplementation(() => {
            sequence.push("getRecords");
            return Promise.resolve(mockRecords);
        });
        api_1.default.records.insert.mockImplementation(() => {
            sequence.push("insertRecords");
            return Promise.resolve({});
        });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify the sequence of operations
        expect(sequence).toEqual([
            "getWorkbook",
            "listWorkbooks",
            "createWorkbook",
            "getRecords",
            "insertRecords"
        ]);
    });
    it("should handle malformed workbook data", async () => {
        // Mock a malformed workbook response (missing sheets property)
        const malformedWorkbook = {
        // Missing sheets property
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: malformedWorkbook });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Should fail with appropriate message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "No source sheets found",
            outcome: { acknowledge: true, message: "No source sheets found" }
        });
    });
    it("should update progress sequentially", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Get all progress updates
        const progressUpdates = api_1.default.jobs.ack.mock.calls
            .filter(call => call[0] === "job123")
            .map(call => call[1].progress);
        // Verify progress increases sequentially
        for (let i = 1; i < progressUpdates.length; i++) {
            expect(progressUpdates[i]).toBeGreaterThan(progressUpdates[i - 1]);
        }
        // Verify final progress is close to 100%
        expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThanOrEqual(95);
    });
    // NEW TESTS TO IMPROVE COVERAGE
    it("should process source records with empty records array", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        // Mock source records response with empty records array
        const emptyRecords = {
            data: {
                records: []
            }
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue(emptyRecords);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify addRecords was not called with empty records array
        expect(mockAddRecords).not.toHaveBeenCalled();
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should process source records with undefined records property", async () => {
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        // Mock source records response with undefined records property
        const undefinedRecords = {
            data: {}
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue(undefinedRecords);
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify addRecords was not called with undefined records property
        expect(mockAddRecords).not.toHaveBeenCalled();
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should handle initialization with debug mode enabled", async () => {
        // Create a config with debug enabled
        const debugConfig = {
            ...mockConfig,
            debug: true
        };
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        api_1.default.records.get.mockResolvedValue({ data: { records: [] } });
        // Create the listener with debug mode
        (0, federate_job_1.createFederateJobListener)(debugConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify debug logs were called
        const { logInfo } = require("@flatfile/util-common");
        expect(logInfo).toHaveBeenCalled();
        // Verify the job was still completed successfully
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
    it("should handle debug mode when handling errors", async () => {
        // Create a config with debug enabled
        const debugConfig = {
            ...mockConfig,
            debug: true
        };
        // Force an error
        const testError = new Error("Test federation error");
        api_1.default.workbooks.get.mockRejectedValue(testError);
        (0, federate_job_1.createFederateJobListener)(debugConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify error logs were called
        const { logError } = require("@flatfile/util-common");
        expect(logError).toHaveBeenCalled();
        // Should still fail with error message
        expect(api_1.default.jobs.fail).toHaveBeenCalledWith("job123", {
            info: "Test federation error",
            outcome: { acknowledge: true, message: "Test federation error" }
        });
    });
    it("should process multiple source sheets", async () => {
        // Set up workbook with multiple source sheets
        const mockSourceWorkbook = {
            sheets: [
                { id: "source-sheet-1", slug: "source1" },
                { id: "source-sheet-2", slug: "source2" }
            ]
        };
        const mockNewWorkbook = {
            id: "new-workbook-1",
            sheets: [
                { id: "target-sheet-1", slug: "sheet1" }
            ]
        };
        const mockRecords1 = {
            data: {
                records: [{ id: "record1", values: { field1: "value1" } }]
            }
        };
        const mockRecords2 = {
            data: {
                records: [{ id: "record2", values: { field2: "value2" } }]
            }
        };
        api_1.default.workbooks.get.mockResolvedValue({ data: mockSourceWorkbook });
        api_1.default.workbooks.list.mockResolvedValue({ data: [] });
        api_1.default.workbooks.create.mockResolvedValue({ data: mockNewWorkbook });
        // Mock records.get to return different responses for different sheet IDs
        api_1.default.records.get.mockImplementation((sheetId) => {
            if (sheetId === "source-sheet-1") {
                return Promise.resolve(mockRecords1);
            }
            else {
                return Promise.resolve(mockRecords2);
            }
        });
        (0, federate_job_1.createFederateJobListener)(mockConfig, "federate")(mockListener);
        await mockListener.callback(mockEvent);
        // Verify records were fetched for both sheets
        expect(api_1.default.records.get).toHaveBeenCalledWith("source-sheet-1");
        expect(api_1.default.records.get).toHaveBeenCalledWith("source-sheet-2");
        // Verify records were added from both sheets
        expect(mockAddRecords).toHaveBeenCalledWith("source1", mockRecords1.data.records);
        expect(mockAddRecords).toHaveBeenCalledWith("source2", mockRecords2.data.records);
        // Verify job completed successfully
        expect(api_1.default.jobs.complete).toHaveBeenCalledWith("job123", { outcome: { message: "Federation complete" } });
    });
});
//# sourceMappingURL=federate-job.spec.js.map