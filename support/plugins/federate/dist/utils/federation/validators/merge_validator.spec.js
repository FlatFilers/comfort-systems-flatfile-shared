"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merge_validator_1 = require("./merge_validator");
describe("validateDedupeConfig", () => {
    // Create a minimal federateConfig for testing
    const federateConfig = {
        source_workbook_name: "Test Source Workbook",
        federated_workbook: { name: "Test Federated Workbook", sheets: [] },
        debug: false
    };
    it("should not throw for valid merge configuration", () => {
        var _a;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).not.toThrow();
        expect(mergeFields.has("test-sheet")).toBe(true);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.has("field1")).toBe(true);
    });
    it("should not throw for valid merge configuration with 'delete' type", () => {
        var _a;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "delete",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).not.toThrow();
        expect(mergeFields.has("test-sheet")).toBe(true);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.has("field1")).toBe(true);
    });
    it("should not throw for valid merge configuration with 'last' keep value", () => {
        var _a;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "last"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).not.toThrow();
        expect(mergeFields.has("test-sheet")).toBe(true);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.has("field1")).toBe(true);
    });
    it("should not throw for valid merge configuration with array 'on' property", () => {
        var _a, _b;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: ["field1", "field2"],
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2", "field3"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).not.toThrow();
        expect(mergeFields.has("test-sheet")).toBe(true);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.has("field1")).toBe(true);
        expect((_b = mergeFields.get("test-sheet")) === null || _b === void 0 ? void 0 : _b.has("field2")).toBe(true);
    });
    it("should throw error for non-existent merge field", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "non_existent_field",
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field "non_existent_field" does not exist in the sheet');
    });
    it("should throw error for non-existent merge field in array", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: ["field1", "non_existent_field"],
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field "non_existent_field" does not exist in the sheet');
    });
    it("should throw error for empty array of merge fields", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: [],
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field array cannot be empty');
    });
    it("should throw error for invalid merge type", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "invalid_type",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": type must be "delete" or "merge"');
    });
    it("should throw error for invalid keep value", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "invalid_keep"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": keep must be "first" or "last"');
    });
    it("should throw error for missing sheet slug", () => {
        const sheet = {
            name: "Test Sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).toThrow('[MergeValidator] Sheet slug is required for merge configuration');
    });
    it("should not throw if no dedupe_config is provided", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: []
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        expect(() => {
            (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        }).not.toThrow();
        expect(mergeFields.has("test-sheet")).toBe(false);
    });
    it("should add to existing merge fields if sheet already exists", () => {
        var _a, _b, _c;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        // Add existing field for the sheet
        mergeFields.set("test-sheet", new Set(["existing_field"]));
        (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.size).toBe(2);
        expect((_b = mergeFields.get("test-sheet")) === null || _b === void 0 ? void 0 : _b.has("existing_field")).toBe(true);
        expect((_c = mergeFields.get("test-sheet")) === null || _c === void 0 ? void 0 : _c.has("field1")).toBe(true);
    });
    it("should add multiple merge fields from array to tracking set", () => {
        var _a, _b, _c, _d;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: ["field1", "field2", "field3"],
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2", "field3"]);
        const mergeFields = new Map();
        (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        expect((_a = mergeFields.get("test-sheet")) === null || _a === void 0 ? void 0 : _a.size).toBe(3);
        expect((_b = mergeFields.get("test-sheet")) === null || _b === void 0 ? void 0 : _b.has("field1")).toBe(true);
        expect((_c = mergeFields.get("test-sheet")) === null || _c === void 0 ? void 0 : _c.has("field2")).toBe(true);
        expect((_d = mergeFields.get("test-sheet")) === null || _d === void 0 ? void 0 : _d.has("field3")).toBe(true);
    });
    it("should not modify other sheets in the mergeFields map", () => {
        var _a, _b, _c, _d;
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            dedupe_config: {
                on: "field1",
                type: "merge",
                keep: "first"
            }
        };
        const fieldKeys = new Set(["field1", "field2"]);
        const mergeFields = new Map();
        // Add another sheet to the map
        mergeFields.set("other-sheet", new Set(["other_field"]));
        (0, merge_validator_1.validateDedupeConfig)(sheet, fieldKeys, mergeFields, federateConfig);
        // Verify the other sheet wasn't modified
        expect((_a = mergeFields.get("other-sheet")) === null || _a === void 0 ? void 0 : _a.size).toBe(1);
        expect((_b = mergeFields.get("other-sheet")) === null || _b === void 0 ? void 0 : _b.has("other_field")).toBe(true);
        // Verify the test sheet was properly updated
        expect((_c = mergeFields.get("test-sheet")) === null || _c === void 0 ? void 0 : _c.size).toBe(1);
        expect((_d = mergeFields.get("test-sheet")) === null || _d === void 0 ? void 0 : _d.has("field1")).toBe(true);
    });
});
//# sourceMappingURL=merge_validator.spec.js.map