"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const federated_sheet_manager_1 = require("./federated_sheet_manager");
const config_validator_1 = require("./validators/config_validator");
const merge_processor_1 = require("./processors/merge_processor");
const record_filter_1 = require("./filters/record_filter");
const record_processor_1 = require("./processors/record_processor");
// Mock dependencies
jest.mock("./validators/config_validator", () => ({
    validateConfig: jest.fn().mockReturnValue(new Set(["source1", "source2"]))
}));
jest.mock("./processors/merge_processor", () => ({
    mergeRecords: jest.fn((records, dedupeConfig) => {
        if (!dedupeConfig)
            return records;
        // Simulate basic merge behavior
        if (dedupeConfig.type === "merge" && dedupeConfig.keep === "first") {
            // Keep first occurrence of each record based on the merge key
            const seen = new Set();
            return records.filter(record => {
                const key = record[dedupeConfig.on];
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
        }
        return records;
    })
}));
jest.mock("./filters/record_filter", () => ({
    filterRecords: jest.fn((records, filters) => {
        if (!filters)
            return records;
        // Simulate basic filtering behavior
        return records.filter(record => {
            // Check all_fields_required
            if (filters.all_fields_required && filters.all_fields_required.length > 0) {
                for (const field of filters.all_fields_required) {
                    if (!record[field] || record[field] === "")
                        return false;
                }
            }
            // Check field_values_required
            if (filters.field_values_required) {
                for (const [field, values] of Object.entries(filters.field_values_required)) {
                    if (!values.includes(record[field]))
                        return false;
                }
            }
            return true;
        });
    })
}));
jest.mock("./processors/record_processor", () => ({
    processRecord: jest.fn((recordValues, sourceSlug, mapping) => {
        // Basic record processing
        const processedRecord = {};
        if (mapping.type === 'field') {
            // Map fields according to the field mappings
            for (const [sourceKey, targetKey] of mapping.fields.entries()) {
                if (recordValues[sourceKey]) {
                    processedRecord[targetKey] = recordValues[sourceKey].value;
                }
            }
            return [processedRecord];
        }
        else { // mapping.type === 'unpivot'
            const results = [];
            // Process each field mapping in the unpivot groups
            for (const [_, group] of mapping.unpivotGroups) {
                // Process each field mapping in the group
                for (const mapping of group.field_mappings) {
                    const unpivotRecord = { ...processedRecord };
                    // Apply the mapping
                    for (const [targetKey, sourceKey] of Object.entries(mapping)) {
                        if (recordValues[sourceKey]) {
                            unpivotRecord[targetKey] = recordValues[sourceKey].value;
                        }
                    }
                    results.push(unpivotRecord);
                }
            }
            return results.length > 0 ? results : [processedRecord];
        }
    })
}));
// Add/update this mock after the existing jest.mock calls
jest.mock("@flatfile/util-common", () => ({
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn()
}));
// Helper function to create a valid Sheet object for testing
function createMockSheet(id, name, slug) {
    return {
        id,
        name,
        slug,
        workbookId: "mock-workbook-id",
        config: {
            name: name || "",
            fields: []
        },
        updatedAt: new Date(),
        createdAt: new Date()
    };
}
// Class that extends FederatedSheetManager for testing
class MockFederatedSheetManager extends federated_sheet_manager_1.FederatedSheetManager {
    constructor(config) {
        super(config);
    }
}
describe("FederatedSheetManager", () => {
    // Sample config for testing
    const mockConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
            name: "Federated Workbook",
            sheets: [
                {
                    name: "Target Sheet",
                    slug: "target",
                    fields: [
                        {
                            key: "field1",
                            type: "string",
                            label: "Field 1",
                            federate_config: {
                                source_sheet_slug: "source1",
                                source_field_key: "sourceField1"
                            }
                        },
                        {
                            key: "field2",
                            type: "string",
                            label: "Field 2",
                            federate_config: {
                                source_sheet_slug: "source1",
                                source_field_key: "sourceField2"
                            }
                        },
                        {
                            key: "field3",
                            type: "string",
                            label: "Field 3",
                            federate_config: {
                                source_sheet_slug: "source2",
                                source_field_key: "sourceField3"
                            }
                        },
                        {
                            key: "unpivotField",
                            type: "string",
                            label: "Unpivot Field",
                            federate_config: {
                                unpivot_group: "group1"
                            }
                        }
                    ]
                }
            ]
        }
    };
    // Sample sheet with merge config
    const mockSheetWithMerge = {
        name: "Sheet With Merge",
        slug: "merge-sheet",
        fields: [
            {
                key: "field1",
                type: "string",
                label: "Field 1",
                federate_config: {
                    source_sheet_slug: "source1",
                    source_field_key: "sourceField1"
                }
            }
        ],
        dedupe_config: {
            on: "field1",
            type: "merge",
            keep: "first"
        }
    };
    // Sample sheet with filters
    const mockSheetWithFilters = {
        name: "Sheet With Filters",
        slug: "filter-sheet",
        fields: [
            {
                key: "field1",
                type: "string",
                label: "Field 1",
                federate_config: {
                    source_sheet_slug: "source1",
                    source_field_key: "sourceField1"
                }
            }
        ],
        all_fields_required: ["field1"],
        field_values_required: {
            "field1": ["value1", "value2"]
        }
    };
    // Sample sheet with unpivot config
    const mockSheetWithUnpivot = {
        name: "Sheet With Unpivot",
        slug: "unpivot-sheet",
        fields: [
            {
                key: "abc",
                type: "string",
                label: "ABC"
            },
            {
                key: "def",
                type: "string",
                label: "DEF"
            }
        ],
        unpivot_groups: {
            group1: {
                source_sheet_slug: "source1",
                field_mappings: [
                    {
                        "abc": "sourceField1",
                        "def": "sourceField2"
                    },
                    {
                        "abc": "sourceField3",
                        "def": "sourceField4"
                    }
                ]
            }
        }
    };
    // Sample sheet with unpivot config using source_sheet property
    const mockSheetWithUnpivotSourceSheet = {
        name: "Sheet With Unpivot Source Sheet",
        slug: "unpivot-source-sheet",
        fields: [
            {
                key: "abc",
                type: "string",
                label: "ABC"
            },
            {
                key: "def",
                type: "string",
                label: "DEF"
            }
        ],
        unpivot_groups: {
            group1: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source1",
                    fields: []
                },
                field_mappings: [
                    {
                        "abc": "sourceField1",
                        "def": "sourceField2"
                    },
                    {
                        "abc": "sourceField3",
                        "def": "sourceField4"
                    }
                ]
            }
        }
    };
    // Sample sheet with unpivot group missing source_sheet_slug
    const mockSheetWithInvalidUnpivot = {
        name: "Sheet With Invalid Unpivot",
        slug: "invalid-unpivot-sheet",
        fields: [
            {
                key: "abc",
                type: "string",
                label: "ABC"
            }
        ],
        unpivot_groups: {
            group1: {
                // Type casting to allow us to create an intentionally invalid config for testing
                field_mappings: [
                    {
                        "abc": "sourceField1"
                    }
                ]
            } // Force TypeScript to accept this incomplete config
        }
    };
    // Sample sheet with field missing source_field_key
    const mockSheetWithInvalidField = {
        name: "Sheet With Invalid Field",
        slug: "invalid-field-sheet",
        fields: [
            {
                key: "field1",
                type: "string",
                label: "Field 1",
                federate_config: {
                    source_sheet_slug: "source1"
                    // missing source_field_key
                } // Force TypeScript to accept this incomplete config
            },
            {
                key: "field2",
                type: "string",
                label: "Field 2",
                federate_config: {
                // Missing source_sheet_slug and source_sheet
                } // Force TypeScript to accept this incomplete config
            }
        ]
    };
    // Sample records for testing
    const mockRecords = [
        {
            id: "record-1",
            values: {
                sourceField1: { value: "value1" },
                sourceField2: { value: "value2" }
            }
        },
        {
            id: "record-2",
            values: {
                sourceField1: { value: "value3" },
                sourceField2: { value: "value4" }
            }
        }
    ];
    let manager;
    beforeEach(() => {
        jest.clearAllMocks();
        manager = new MockFederatedSheetManager(mockConfig);
    });
    describe("constructor", () => {
        it("should initialize with source sheets from validateConfig", () => {
            // The constructor is already called in beforeEach
            expect(config_validator_1.validateConfig).toHaveBeenCalledWith(mockConfig);
            expect(manager.hasSourceSheet("source1")).toBe(true);
            expect(manager.hasSourceSheet("source2")).toBe(true);
            expect(manager.hasSourceSheet("nonexistent")).toBe(false);
        });
        it("should throw if validateConfig throws", () => {
            config_validator_1.validateConfig.mockImplementationOnce(() => {
                throw new Error("Validation error");
            });
            expect(() => new MockFederatedSheetManager(mockConfig)).toThrow("Validation error");
        });
        it("should handle empty source sheets set", () => {
            config_validator_1.validateConfig.mockReturnValueOnce(new Set());
            const emptyManager = new MockFederatedSheetManager(mockConfig);
            expect(emptyManager.hasSourceSheet("source1")).toBe(false);
            expect(emptyManager.hasSourceSheet("source2")).toBe(false);
        });
    });
    describe("clearMappings", () => {
        it("should clear all mappings and configurations", () => {
            // Setup some data first
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            manager.addRecords("source1", mockRecords);
            // Now clear mappings
            manager.clearMappings();
            // Source sheets should still be available
            expect(manager.hasSourceSheet("source1")).toBe(true);
            expect(manager.hasSourceSheet("source2")).toBe(true);
            // But there should be no records
            const records = manager.getRecords();
            expect(records.size).toBe(0);
        });
        it("should preserve source sheet structure", () => {
            // Setup some data first
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            manager.addRecords("source1", mockRecords);
            // Now clear mappings
            manager.clearMappings();
            // Source sheets should still be available
            expect(manager.hasSourceSheet("source1")).toBe(true);
            expect(manager.hasSourceSheet("source2")).toBe(true);
            // But mappings should be empty
            const records = manager.getRecords();
            expect(records.size).toBe(0);
            // Adding records after clear should work
            manager.addRecords("source1", mockRecords);
            const newRecords = manager.getRecords();
            expect(newRecords.size).toBe(0); // No mappings, so no records
        });
    });
    describe("hasSourceSheet", () => {
        it("should return true for existing source sheets", () => {
            expect(manager.hasSourceSheet("source1")).toBe(true);
            expect(manager.hasSourceSheet("source2")).toBe(true);
        });
        it("should return false for non-existent source sheets", () => {
            expect(manager.hasSourceSheet("nonexistent")).toBe(false);
        });
        it("should handle empty string input", () => {
            expect(manager.hasSourceSheet("")).toBe(false);
        });
    });
    describe("createMappings", () => {
        it("should create basic field mappings correctly", () => {
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            // Add a record to test if mapping is created correctly
            manager.addRecords("source1", mockRecords);
            manager.addRecords("source2", mockRecords);
            const records = manager.getRecords();
            expect(records.size).toBe(1);
            expect(records.has("sheet-123")).toBe(true);
            // Each source record produces one processed record
            const sheetRecords = records.get("sheet-123");
            expect(sheetRecords).toBeTruthy();
            expect(sheetRecords === null || sheetRecords === void 0 ? void 0 : sheetRecords.length).toBe(4); // 2 from source1 and 2 from source2
            // Verify the field mappings were created correctly
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Don't check exact parameters as they may vary
        });
        it("should handle sheets where all fields are unpivot fields", () => {
            // Create a sheet with only unpivot fields, no direct field mappings
            const onlyUnpivotSheet = {
                name: "Only Unpivot Sheet",
                slug: "only-unpivot",
                fields: [
                    {
                        key: "name",
                        type: "string",
                        label: "Name"
                    },
                    {
                        key: "value",
                        type: "string",
                        label: "Value"
                    }
                ],
                unpivot_groups: {
                    group1: {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                "key": "field1",
                                "value": "sourceField1"
                            },
                            {
                                "key": "field2",
                                "value": "sourceField2"
                            }
                        ]
                    }
                }
            };
            const mockOnlyUnpivotSheet = createMockSheet("only-unpivot-123", "Only Unpivot Sheet", "only-unpivot");
            manager.createMappings(onlyUnpivotSheet, mockOnlyUnpivotSheet);
            // Add records to source sheet
            manager.addRecords("source1", mockRecords);
            // Verify records were processed
            const records = manager.getRecords();
            expect(records.has("only-unpivot-123")).toBe(true);
            const sheetRecords = records.get("only-unpivot-123");
            expect(sheetRecords).toBeTruthy();
            // Our mock processRecord returns 2 records per source record due to field_mappings
            expect(sheetRecords === null || sheetRecords === void 0 ? void 0 : sheetRecords.length).toBe(4); // 2 source records * 2 field mappings
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Verify unpivot configuration was created correctly
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Don't check exact parameters as they may vary
        });
        it("should store merge configuration", () => {
            const mockSheetEntity = createMockSheet("merge-sheet-123", "Sheet With Merge", "merge-sheet");
            manager.createMappings(mockSheetWithMerge, mockSheetEntity);
            // Add records to test merge
            manager.addRecords("source1", mockRecords);
            const records = manager.getRecords();
            expect(merge_processor_1.mergeRecords).toHaveBeenCalled();
            expect(records.has("merge-sheet-123")).toBe(true);
            // Verify merge configuration was stored correctly
            expect(merge_processor_1.mergeRecords).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
                on: "field1",
                type: "merge",
                keep: "first"
            }));
        });
        it("should store filter configuration", () => {
            const mockSheetEntity = createMockSheet("filter-sheet-123", "Sheet With Filters", "filter-sheet");
            manager.createMappings(mockSheetWithFilters, mockSheetEntity);
            // Add records to test filtering
            manager.addRecords("source1", mockRecords);
            const records = manager.getRecords();
            expect(record_filter_1.filterRecords).toHaveBeenCalled();
            expect(records.has("filter-sheet-123")).toBe(true);
            // Verify filter configuration was stored correctly
            expect(record_filter_1.filterRecords).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
                all_fields_required: ["field1"],
                field_values_required: {
                    "field1": ["value1", "value2"]
                }
            }));
        });
        it("should process unpivot configurations", () => {
            const mockSheetEntity = createMockSheet("unpivot-sheet-123", "Sheet With Unpivot", "unpivot-sheet");
            manager.createMappings(mockSheetWithUnpivot, mockSheetEntity);
            // Add records to test unpivot
            manager.addRecords("source1", mockRecords);
            // processRecord is mocked to return one record per call
            const records = manager.getRecords();
            expect(records.has("unpivot-sheet-123")).toBe(true);
            const sheetRecords = records.get("unpivot-sheet-123");
            // Our mock processRecord returns 2 records per source record due to field_mappings
            expect(sheetRecords === null || sheetRecords === void 0 ? void 0 : sheetRecords.length).toBe(4); // 2 source records * 2 field mappings
            // Verify unpivot configuration was processed correctly
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Don't check exact parameters as they may vary
        });
        it("should process unpivot configurations with source_sheet property", () => {
            const mockSheetEntity = createMockSheet("unpivot-source-sheet-123", "Sheet With Unpivot Source Sheet", "unpivot-source-sheet");
            manager.createMappings(mockSheetWithUnpivotSourceSheet, mockSheetEntity);
            // Add records to test unpivot
            manager.addRecords("source1", mockRecords);
            // processRecord is mocked to return one record per call
            const records = manager.getRecords();
            expect(records.has("unpivot-source-sheet-123")).toBe(true);
            const sheetRecords = records.get("unpivot-source-sheet-123");
            // Our mock processRecord returns 2 records per source record due to field_mappings
            expect(sheetRecords === null || sheetRecords === void 0 ? void 0 : sheetRecords.length).toBe(4); // 2 source records * 2 field mappings
            // Verify unpivot configuration was processed correctly
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Don't check exact parameters as they may vary
        });
        it("should handle sheets with no fields", () => {
            const emptySheet = {
                name: "Empty Sheet",
                slug: "empty-sheet",
                fields: []
            };
            const mockEmptySheet = createMockSheet("empty-sheet-123", "Empty Sheet", "empty-sheet");
            // Should not throw
            expect(() => manager.createMappings(emptySheet, mockEmptySheet)).not.toThrow();
            // Verify the sheet was initialized
            const records = manager.getRecords();
            expect(records.has("empty-sheet-123")).toBe(true);
            expect(records.get("empty-sheet-123")).toEqual([]);
        });
        it("should handle sheets with fields that have no federate_config", () => {
            const noFederateConfigSheet = {
                name: "No Federate Config Sheet",
                slug: "no-federate-config-sheet",
                fields: [
                    {
                        key: "field1",
                        type: "string",
                        label: "Field 1"
                        // No federate_config
                    }
                ]
            };
            const mockNoFederateConfigSheet = createMockSheet("no-federate-config-123", "No Federate Config Sheet", "no-federate-config-sheet");
            // Should not throw
            expect(() => manager.createMappings(noFederateConfigSheet, mockNoFederateConfigSheet)).not.toThrow();
            // Verify the sheet was initialized
            const records = manager.getRecords();
            expect(records.has("no-federate-config-123")).toBe(true);
            expect(records.get("no-federate-config-123")).toEqual([]);
        });
        it("should handle sheets with fields that have invalid federate_config", () => {
            const invalidFederateConfigSheet = {
                name: "Invalid Federate Config Sheet",
                slug: "invalid-federate-config-sheet",
                fields: [
                    {
                        key: "field1",
                        type: "string",
                        label: "Field 1",
                        federate_config: {
                        // Missing required properties
                        }
                    }
                ]
            };
            const mockInvalidFederateConfigSheet = createMockSheet("invalid-federate-config-123", "Invalid Federate Config Sheet", "invalid-federate-config-sheet");
            // Should not throw
            expect(() => manager.createMappings(invalidFederateConfigSheet, mockInvalidFederateConfigSheet)).not.toThrow();
            // Verify the sheet was initialized
            const records = manager.getRecords();
            expect(records.has("invalid-federate-config-123")).toBe(true);
            expect(records.get("invalid-federate-config-123")).toEqual([]);
        });
        it("should handle unpivot groups with missing source sheet slugs", async () => {
            // Create a mock source sheet with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Invalid Unpivot Sheet", "invalid-unpivot");
            // Test method
            await manager.createMappings(mockSheetWithInvalidUnpivot, mockSheet);
            // Verify warning logs for missing source_sheet_slug
            const { logWarn } = require("@flatfile/util-common");
            expect(logWarn).toHaveBeenCalledWith("📦 Federate Plugin Manager", expect.stringContaining("No valid source sheet slug found for unpivot group"));
        });
        it("should handle fields with missing source field key", async () => {
            // Create a mock source sheet with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Invalid Field Sheet", "invalid-field");
            // Test method
            await manager.createMappings(mockSheetWithInvalidField, mockSheet);
            // Verify warning logs for missing source_field_key
            const { logWarn } = require("@flatfile/util-common");
            // Use a more robust check for the specific warning call
            const calls = logWarn.mock.calls;
            const expectedCallFound = calls.some(call => call[0] === "📦 Federate Plugin Manager" &&
                typeof call[1] === 'string' &&
                call[1].includes("missing required federate_config parts"));
            expect(expectedCallFound).toBe(true);
            // // Verify warning logs for missing source_sheet_slug - Keep this commented or remove if not needed
            // expect(logWarn).toHaveBeenCalledWith(
            //   "📦 Federate Plugin Manager", 
            //   expect.stringContaining("missing required federate_config parts")
            // );
        });
        // --- Tests for Virtual Fields in createMappings ---
        it("should store virtual field keys and mappings for standard sheets", () => {
            const sheetWithVirtual = {
                name: "Sheet With Virtual",
                slug: "virtual-sheet",
                fields: [
                    {
                        key: "realField", type: "string", label: "Real",
                        federate_config: { source_sheet_slug: "source1", source_field_key: "sourceReal" }
                    }
                ],
                virtualFields: [
                    {
                        key: "virtualKey1", type: "string",
                        federate_config: { source_sheet_slug: "source1", source_field_key: "sourceVirtual1" }
                    },
                    {
                        key: "virtualKey2", type: "string",
                        federate_config: { source_sheet_slug: "source2", source_field_key: "sourceVirtual2" }
                    }
                ]
            };
            const mockSheetEntity = createMockSheet("virtual-sheet-123", "Sheet With Virtual", "virtual-sheet");
            manager.createMappings(sheetWithVirtual, mockSheetEntity);
            // Check virtualFieldKeys storage
            const storedVirtualKeys = manager['virtualFieldKeys'].get("virtual-sheet-123");
            expect(storedVirtualKeys).toBeDefined();
            expect(storedVirtualKeys === null || storedVirtualKeys === void 0 ? void 0 : storedVirtualKeys.size).toBe(2);
            expect(storedVirtualKeys === null || storedVirtualKeys === void 0 ? void 0 : storedVirtualKeys.has("virtualKey1")).toBe(true);
            expect(storedVirtualKeys === null || storedVirtualKeys === void 0 ? void 0 : storedVirtualKeys.has("virtualKey2")).toBe(true);
            // Check FieldMapping for source1
            const source1Mappings = manager['sourceMappings'].get("source1");
            expect(source1Mappings).toBeDefined();
            expect(source1Mappings === null || source1Mappings === void 0 ? void 0 : source1Mappings.length).toBeGreaterThan(0);
            const mapping1 = source1Mappings === null || source1Mappings === void 0 ? void 0 : source1Mappings.find(m => m.sheetId === "virtual-sheet-123");
            expect(mapping1).toBeDefined();
            expect(mapping1.type).toBe('field');
            expect(mapping1.fields.has("sourceReal")).toBe(true); // Real field included
            expect(mapping1.fields.get("sourceReal")).toBe("realField");
            expect(mapping1.fields.has("sourceVirtual1")).toBe(true); // Virtual field included
            expect(mapping1.fields.get("sourceVirtual1")).toBe("virtualKey1");
            // Check FieldMapping for source2
            const source2Mappings = manager['sourceMappings'].get("source2");
            expect(source2Mappings).toBeDefined();
            expect(source2Mappings === null || source2Mappings === void 0 ? void 0 : source2Mappings.length).toBeGreaterThan(0);
            const mapping2 = source2Mappings === null || source2Mappings === void 0 ? void 0 : source2Mappings.find(m => m.sheetId === "virtual-sheet-123");
            expect(mapping2).toBeDefined();
            expect(mapping2.type).toBe('field');
            expect(mapping2.fields.has("sourceVirtual2")).toBe(true); // Virtual field included
            expect(mapping2.fields.get("sourceVirtual2")).toBe("virtualKey2");
        });
    });
    describe("addRecords", () => {
        beforeEach(() => {
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
        });
        it("should do nothing for empty or undefined records", () => {
            var _a;
            manager.addRecords("source1", []);
            manager.addRecords("source1", undefined);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(0);
        });
        it("should do nothing for non-existent source sheet", () => {
            var _a;
            manager.addRecords("nonexistent", mockRecords);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(0);
        });
        it("should process records from source sheet", () => {
            var _a;
            manager.addRecords("source1", mockRecords);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(2);
            expect(record_processor_1.processRecord).toHaveBeenCalledTimes(2);
            // Verify the processed records have the expected structure
            const processedRecords = records.get("sheet-123");
            expect(processedRecords).toBeTruthy();
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(2);
            // Verify processRecord was called
            expect(record_processor_1.processRecord).toHaveBeenCalled();
            // Don't check exact parameters as they may vary
        });
        it("should handle missing values in records", () => {
            var _a;
            const recordsWithMissingValues = [
                {
                    id: "record-missing",
                    values: {}
                }
            ];
            manager.addRecords("source1", recordsWithMissingValues);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(1);
            expect(record_processor_1.processRecord).toHaveBeenCalledTimes(1);
            // Verify the processed record is empty
            const processedRecords = records.get("sheet-123");
            expect(processedRecords).toBeTruthy();
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(1);
            expect(Object.keys(processedRecords[0])).toHaveLength(0);
        });
        it("should handle null or undefined records in array", () => {
            var _a;
            const recordsWithNull = [
                null,
                undefined,
                {
                    id: "record-valid",
                    values: {
                        sourceField1: { value: "value" }
                    }
                }
            ];
            manager.addRecords("source1", recordsWithNull);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(1); // Only the valid record
            expect(record_processor_1.processRecord).toHaveBeenCalledTimes(1); // Only called for the valid record
            // Verify the processed record has the expected structure
            const processedRecords = records.get("sheet-123");
            expect(processedRecords).toBeTruthy();
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(1);
        });
        it("should handle malformed record values", () => {
            var _a;
            const malformedRecords = [
                {
                    id: "record-malformed",
                    values: {
                        sourceField1: "not-an-object" // Should be { value: "something" }
                    }
                }
            ];
            manager.addRecords("source1", malformedRecords);
            const records = manager.getRecords();
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(1);
            expect(record_processor_1.processRecord).toHaveBeenCalledTimes(1);
            // Verify the processed record is empty or has default values
            const processedRecords = records.get("sheet-123");
            expect(processedRecords).toBeTruthy();
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(1);
        });
        it("should handle empty processed records with debug mode", async () => {
            // Create a mock manager with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Target Sheet", "target");
            // Setup initial state
            await manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            // Mock processRecord to return empty array
            record_processor_1.processRecord.mockReturnValueOnce([]);
            // Process a record
            const mockRecord = {
                id: "record1",
                values: {
                    sourceField1: { value: "value1" }
                }
            };
            await manager.addRecords("source1", [mockRecord]);
            // Verify warning logs for empty processed records
            const { logWarn } = require("@flatfile/util-common");
            expect(logWarn).toHaveBeenCalledWith("📦 Federate Plugin Manager", expect.stringContaining("No records resulted from processing for target sheet:"));
        });
        it("should handle processed records with zero length in debug mode", async () => {
            // Mock dependencies
            jest.clearAllMocks();
            // Create a mock manager with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Target Sheet", "target");
            // Setup initial state
            await manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            // Mock processRecord to return an empty array
            record_processor_1.processRecord.mockReturnValueOnce([]);
            // Process a record
            const mockRecord = {
                id: "record1",
                values: {
                    sourceField1: { value: "value1" }
                }
            };
            // Clear previous calls to logWarn
            const { logWarn } = require("@flatfile/util-common");
            logWarn.mockClear();
            await manager.addRecords("source1", [mockRecord]);
            // Verify warning logs for empty processed records
            expect(logWarn).toHaveBeenCalledWith("📦 Federate Plugin Manager", expect.stringContaining("No records resulted from processing for target sheet:"));
        });
    });
    describe("getRecords", () => {
        it("should return empty map when no records exist", () => {
            const records = manager.getRecords();
            expect(records.size).toBe(0);
        });
        it("should return empty records array for sheet with no records", () => {
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            const records = manager.getRecords();
            expect(records.size).toBe(1);
            expect(records.get("sheet-123")).toEqual([]);
        });
        it("should apply merge and filter on records", () => {
            // Set up a sheet with merge and filter config
            const mockSheetEntity = createMockSheet("complex-sheet-123", "Complex Sheet", "complex-sheet");
            const mockComplexSheet = {
                ...mockSheetWithMerge,
                ...mockSheetWithFilters,
                name: "Complex Sheet",
                slug: "complex-sheet"
            };
            manager.createMappings(mockComplexSheet, mockSheetEntity);
            // Add records that would be filtered out
            const recordsToFilter = [
                {
                    id: "record-filtered",
                    values: {
                        sourceField1: { value: "value3" } // Not in required values
                    }
                }
            ];
            // Add records that would pass filtering
            const recordsToKeep = [
                {
                    id: "record-keep1",
                    values: {
                        sourceField1: { value: "value1" } // In required values
                    }
                },
                {
                    id: "record-keep2",
                    values: {
                        sourceField1: { value: "value1" } // Duplicate value for merge test
                    }
                }
            ];
            manager.addRecords("source1", [...recordsToFilter, ...recordsToKeep]);
            const records = manager.getRecords();
            // Verify merge and filter were called
            expect(merge_processor_1.mergeRecords).toHaveBeenCalled();
            expect(record_filter_1.filterRecords).toHaveBeenCalled();
            // Verify the result has the expected records
            const processedRecords = records.get("complex-sheet-123");
            expect(processedRecords).toBeTruthy();
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(1); // One record after filtering and merging
        });
        it("should handle multiple sheets correctly", () => {
            var _a, _b;
            // First sheet
            const mockSheet = createMockSheet("sheet-123", "Target Sheet", "target");
            manager.createMappings(mockConfig.federated_workbook.sheets[0], mockSheet);
            // Second sheet
            const mockSheet2 = createMockSheet("sheet-456", "Target Sheet 2", "target2");
            const mockBlueprint2 = {
                name: "Target Sheet 2",
                slug: "target2",
                fields: [
                    {
                        key: "field4",
                        type: "string",
                        label: "Field 4",
                        federate_config: {
                            source_sheet_slug: "source2",
                            source_field_key: "sourceField4"
                        }
                    }
                ]
            };
            manager.createMappings(mockBlueprint2, mockSheet2);
            // Add records to both source sheets
            manager.addRecords("source1", mockRecords);
            manager.addRecords("source2", mockRecords);
            const records = manager.getRecords();
            expect(records.size).toBe(2);
            expect(records.has("sheet-123")).toBe(true);
            expect(records.has("sheet-456")).toBe(true);
            // Verify each sheet has the expected records
            // Our mock processRecord returns 2 records per source record
            expect((_a = records.get("sheet-123")) === null || _a === void 0 ? void 0 : _a.length).toBe(4); // 2 source records * 2 field mappings
            expect((_b = records.get("sheet-456")) === null || _b === void 0 ? void 0 : _b.length).toBe(2); // 2 source records * 1 field mapping
        });
        it("should handle sheets with unpivot configurations", () => {
            // Set up a sheet with unpivot config
            const mockSheetEntity = createMockSheet("unpivot-sheet-123", "Sheet With Unpivot", "unpivot-sheet");
            manager.createMappings(mockSheetWithUnpivot, mockSheetEntity);
            // Add records with values that should be unpivoted
            const recordsWithUnpivot = [
                {
                    id: "record-unpivot",
                    values: {
                        sourceField1: { value: "value1" },
                        sourceField2: { value: "value2" },
                        sourceField3: { value: "value3" },
                        sourceField4: { value: "value4" }
                    }
                }
            ];
            manager.addRecords("source1", recordsWithUnpivot);
            const records = manager.getRecords();
            // Verify the result has the expected unpivoted records
            const processedRecords = records.get("unpivot-sheet-123");
            expect(processedRecords).toBeTruthy();
            // Our mock processRecord should create 2 records for each source record
            // due to the field_mappings in mockSheetWithUnpivot
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords.length).toBe(2);
            // Verify the unpivoted records have the expected structure
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords[0]).toHaveProperty("abc");
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords[0]).toHaveProperty("def");
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords[1]).toHaveProperty("abc");
            expect(processedRecords === null || processedRecords === void 0 ? void 0 : processedRecords[1]).toHaveProperty("def");
        });
        it("should log filtered records in debug mode", async () => {
            // Create a mock manager with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Filter Sheet", "filter-sheet");
            // Setup initial state with filters
            await manager.createMappings(mockSheetWithFilters, mockSheet);
            // Add a record
            const mockRecordData = {
                id: "record1",
                values: {
                    sourceField1: { value: "value1" }
                }
            };
            await manager.addRecords("source1", [mockRecordData]);
            // Get records, which should apply filters
            manager.getRecords();
            // Verify log for applying filters
            const { logInfo } = require("@flatfile/util-common");
            expect(logInfo).toHaveBeenCalledWith("📦 Federate Plugin Manager", expect.stringContaining("Applied TARGET filters to sheet"));
        });
        it("should log merge configuration application in debug mode", async () => {
            // Create a mock manager with debug enabled
            const config = {
                ...mockConfig,
                debug: true
            };
            const manager = new federated_sheet_manager_1.FederatedSheetManager(config);
            const mockSheet = createMockSheet("sheet-id", "Merge Sheet", "merge-sheet");
            // Setup initial state with merge config
            await manager.createMappings(mockSheetWithMerge, mockSheet);
            // Add a record
            const mockRecordData = {
                id: "record1",
                values: {
                    sourceField1: { value: "value1" }
                }
            };
            await manager.addRecords("source1", [mockRecordData]);
            // Get records, which should apply merge config
            manager.getRecords();
            // Verify log for applying merge configuration
            const { logInfo } = require("@flatfile/util-common");
            expect(logInfo).toHaveBeenCalledWith("📦 Federate Plugin Manager", expect.stringContaining("Applied dedupe configuration to sheet"));
        });
    });
    describe("findBlueprint", () => {
        it("should return the correct blueprint for a given sheetId", async () => {
            // Setup: create mappings for two sheets
            const standardSheet = createMockSheet("standard-123", "Standard Sheet", "standard-sheet");
            const unpivotSheet = createMockSheet("unpivot-123", "Unpivot Sheet", "unpivot-sheet");
            const standardBlueprint = {
                name: "Standard Sheet",
                slug: "standard-sheet",
                fields: [
                    { key: "fieldA", type: "string", label: "A", federate_config: { source_sheet_slug: "source1", source_field_key: "sourceA" } }
                ]
            };
            const unpivotBlueprint = {
                name: "Unpivot Sheet",
                slug: "unpivot-sheet",
                fields: [
                    { key: "fieldB", type: "string", label: "B" }
                ],
                unpivot_groups: {
                    group1: {
                        source_sheet_slug: "source1",
                        field_mappings: [{ fieldB: "sourceB" }]
                    }
                }
            };
            // Add to config
            manager.config.federated_workbook.sheets.push(standardBlueprint, unpivotBlueprint);
            await manager.createMappings(standardBlueprint, standardSheet);
            await manager.createMappings(unpivotBlueprint, unpivotSheet);
            // Access private method via any
            const foundStandard = manager.findBlueprint("standard-123");
            const foundUnpivot = manager.findBlueprint("unpivot-123");
            const foundUnknown = manager.findBlueprint("does-not-exist");
            expect(foundStandard).toBe(standardBlueprint);
            expect(foundUnpivot).toBe(unpivotBlueprint);
            expect(foundUnknown).toBeUndefined();
        });
    });
});
//# sourceMappingURL=federated_sheet_manager.spec.js.map