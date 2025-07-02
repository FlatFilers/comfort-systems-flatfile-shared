"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filter_validator_1 = require("./filter_validator");
const util_common_1 = require("@flatfile/util-common");
// Mock logging functions
jest.mock("@flatfile/util-common", () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn()
}));
describe("validateFilters", () => {
    const fieldKeys = new Set(["field1", "field2", "field3"]);
    const federateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
            name: "Federated Workbook",
            sheets: []
        },
        debug: false
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should not throw for valid filter configurations", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "field1": ["value1", "value2"]
            },
            field_values_excluded: {
                "field2": ["value3"]
            },
            all_fields_required: ["field1", "field3"],
            any_fields_required: ["field2"],
            any_fields_excluded: ["field3"]
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).not.toThrow();
    });
    it("should throw error for invalid field in field_values_required", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "non_existent_field": ["value1"]
            }
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in field_values_required does not exist in the sheet');
    });
    it("should throw error for invalid field in field_values_excluded", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_excluded: {
                "non_existent_field": ["value1"]
            }
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in field_values_excluded does not exist in the sheet');
    });
    it("should throw error for invalid field in all_fields_required", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            all_fields_required: ["non_existent_field"]
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in all_fields_required does not exist in the sheet');
    });
    it("should throw error for invalid field in any_fields_required", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            any_fields_required: ["non_existent_field"]
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in any_fields_required does not exist in the sheet');
    });
    it("should throw error for invalid field in any_fields_excluded", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            any_fields_excluded: ["non_existent_field"]
        };
        expect(() => {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, federateConfig);
        }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in any_fields_excluded does not exist in the sheet');
    });
    it("should handle sheet without slug", () => {
        const sheet = {
            name: "Test Sheet",
            fields: [],
            any_fields_excluded: ["non_existent_field"]
        };
        expect(() => (0, filter_validator_1.validateFilters)(sheet, new Set(), federateConfig)).toThrow('[FilterValidator] Invalid filter configuration for sheet "unknown": field "non_existent_field" in any_fields_excluded does not exist in the sheet');
    });
    // Tests for debug mode
    it("should log debug information when debug is enabled", () => {
        const debugConfig = {
            ...federateConfig,
            debug: true
        };
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "field1": ["value1", "value2"]
            }
        };
        (0, filter_validator_1.validateFilters)(sheet, fieldKeys, debugConfig);
        expect(util_common_1.logInfo).toHaveBeenCalled();
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating filter configuration"));
    });
    it("should skip validation and log when no filters are defined", () => {
        const debugConfig = {
            ...federateConfig,
            debug: true
        };
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: []
        };
        (0, filter_validator_1.validateFilters)(sheet, fieldKeys, debugConfig);
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("No filters defined"));
    });
    it("should log field lists when debug is enabled", () => {
        const debugConfig = {
            ...federateConfig,
            debug: true
        };
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "field1": ["value1", "value2"]
            }
        };
        (0, filter_validator_1.validateFilters)(sheet, fieldKeys, debugConfig);
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("available fields"));
    });
    it("should log detailed validation information for each filter type", () => {
        const debugConfig = {
            ...federateConfig,
            debug: true
        };
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "field1": ["value1", "value2"]
            },
            field_values_excluded: {
                "field2": ["value3"]
            },
            all_fields_required: ["field1"],
            any_fields_required: ["field2"],
            any_fields_excluded: ["field3"]
        };
        (0, filter_validator_1.validateFilters)(sheet, fieldKeys, debugConfig);
        // Check logs for field_values_required
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating 1 fields in field_values_required filter"));
        // Check logs for field_values_excluded
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating 1 fields in field_values_excluded filter"));
        // Check logs for all_fields_required
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating 1 fields in all_fields_required filter"));
        // Check logs for any_fields_required
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating 1 fields in any_fields_required filter"));
        // Check logs for any_fields_excluded
        expect(util_common_1.logInfo).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining("Validating 1 fields in any_fields_excluded filter"));
    });
    it("should log error when field doesn't exist in debug mode", () => {
        const debugConfig = {
            ...federateConfig,
            debug: true
        };
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            field_values_required: {
                "non_existent_field": ["value1"]
            }
        };
        try {
            (0, filter_validator_1.validateFilters)(sheet, fieldKeys, debugConfig);
        }
        catch (error) {
            // Expected to throw, but we just want to check the logging
        }
        expect(util_common_1.logError).toHaveBeenCalledWith("📦   ↳ Filter Validator", expect.stringContaining('Field "non_existent_field" in field_values_required does not exist'));
    });
});
//# sourceMappingURL=filter_validator.spec.js.map