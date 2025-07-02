"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const record_filter_1 = require("./record_filter");
describe("record_filter", () => {
    // Sample records for testing
    const records = [
        {
            id: { value: "1" },
            name: { value: "John" },
            email: { value: "john@example.com" },
            status: { value: "active" }
        },
        {
            id: { value: "2" },
            name: { value: "Jane" },
            email: { value: undefined },
            status: { value: "inactive" }
        },
        {
            id: { value: "3" },
            name: { value: "Bob" },
            // email field is completely missing
            status: { value: "active" }
        },
        {
            id: { value: "4" },
            name: { value: undefined },
            email: { value: undefined },
            status: { value: "pending" }
        }
    ];
    describe("shouldIncludeRecord", () => {
        it("should return true when no filters are provided", () => {
            const result = (0, record_filter_1.shouldIncludeRecord)(records[0], {});
            expect(result).toBe(true);
        });
        it("should check if all required fields are present", () => {
            // All fields present
            const filter1 = {
                all_fields_required: ["id", "name"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter1)).toBe(true);
            // One field is undefined
            const filter2 = {
                all_fields_required: ["id", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter2)).toBe(false);
            // One field is missing
            const filter3 = {
                all_fields_required: ["id", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[2], filter3)).toBe(false);
        });
        it("should check if any required fields are present", () => {
            // Both fields present
            const filter1 = {
                any_fields_required: ["id", "name"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter1)).toBe(true);
            // One field present, one undefined
            const filter2 = {
                any_fields_required: ["name", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter2)).toBe(true);
            // One field present, one missing
            const filter3 = {
                any_fields_required: ["email", "status"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[2], filter3)).toBe(true);
            // Both fields undefined
            const filter4 = {
                any_fields_required: ["name", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[3], filter4)).toBe(false);
        });
        it("should check if excluded fields are not present", () => {
            // Both fields have values
            const filter1 = {
                any_fields_excluded: ["name", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter1)).toBe(false);
            // One field has value, one is undefined
            const filter2 = {
                any_fields_excluded: ["name", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter2)).toBe(false);
            // One field has value, one is missing
            const filter3 = {
                any_fields_excluded: ["name", "email"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[2], filter3)).toBe(false);
            // Both fields are undefined/missing
            const filter4 = {
                any_fields_excluded: ["email", "non_existent_field"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[3], filter4)).toBe(true);
        });
        it("should check if field values match required values", () => {
            // Value matches
            const filter1 = {
                field_values_required: {
                    "status": ["active"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter1)).toBe(true);
            // Value doesn't match
            const filter2 = {
                field_values_required: {
                    "status": ["active"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter2)).toBe(false);
            // Multiple possible values, one matches
            const filter3 = {
                field_values_required: {
                    "status": ["active", "pending"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter3)).toBe(true);
            // Multiple fields, all must match
            const filter4 = {
                field_values_required: {
                    "id": ["1"],
                    "status": ["active"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter4)).toBe(true);
            // Multiple fields, one doesn't match
            const filter5 = {
                field_values_required: {
                    "id": ["1"],
                    "status": ["pending"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter5)).toBe(false);
            // Field is undefined
            const filter6 = {
                field_values_required: {
                    "email": ["any_value"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter6)).toBe(false);
        });
        it("should check if field values don't match excluded values", () => {
            // Value is excluded
            const filter1 = {
                field_values_excluded: {
                    "status": ["active"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter1)).toBe(false);
            // Value is not excluded
            const filter2 = {
                field_values_excluded: {
                    "status": ["pending", "inactive"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter2)).toBe(true);
            // Multiple fields, none should be excluded
            const filter3 = {
                field_values_excluded: {
                    "id": ["2", "3"],
                    "status": ["inactive", "pending"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter3)).toBe(true);
            // Multiple fields, one is excluded
            const filter4 = {
                field_values_excluded: {
                    "id": ["2", "3"],
                    "status": ["active", "pending"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], filter4)).toBe(false);
            // Field is undefined (should skip this check)
            const filter5 = {
                field_values_excluded: {
                    "email": ["any_value"]
                }
            };
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], filter5)).toBe(true);
        });
        it("should handle direct values without .value property", () => {
            const recordWithDirectValues = {
                id: "1",
                name: "John"
            };
            const filter = {
                all_fields_required: ["id", "name"]
            };
            expect((0, record_filter_1.shouldIncludeRecord)(recordWithDirectValues, filter)).toBe(true);
        });
        it("should handle combination of different filter types", () => {
            // Complex filter with multiple conditions
            const complexFilter = {
                all_fields_required: ["id", "name"],
                any_fields_excluded: ["non_existent_field"],
                field_values_required: {
                    "status": ["active"]
                },
                field_values_excluded: {
                    "id": ["2", "3", "4"]
                }
            };
            // Should match record 0
            expect((0, record_filter_1.shouldIncludeRecord)(records[0], complexFilter)).toBe(true);
            // Should not match record 1 (status is inactive)
            expect((0, record_filter_1.shouldIncludeRecord)(records[1], complexFilter)).toBe(false);
            // Should not match record 2 (id is 3, which is excluded)
            expect((0, record_filter_1.shouldIncludeRecord)(records[2], complexFilter)).toBe(false);
        });
    });
    describe("filterRecords", () => {
        it("should return all records when no filters are provided", () => {
            const result = (0, record_filter_1.filterRecords)(records);
            expect(result).toEqual(records);
            const resultWithEmptyFilter = (0, record_filter_1.filterRecords)(records, {});
            expect(resultWithEmptyFilter).toEqual(records);
        });
        it("should filter records based on all_fields_required", () => {
            const filter = {
                all_fields_required: ["id", "name", "status"]
            };
            const result = (0, record_filter_1.filterRecords)(records, filter);
            // Should include records 0, 1, 2 (all have id, name, and status)
            expect(result.length).toBe(3);
            expect(result).toContainEqual(records[0]);
            expect(result).toContainEqual(records[1]);
            expect(result).toContainEqual(records[2]);
            expect(result).not.toContainEqual(records[3]); // name is undefined
        });
        it("should filter records based on any_fields_required", () => {
            const filter = {
                any_fields_required: ["email"]
            };
            const result = (0, record_filter_1.filterRecords)(records, filter);
            // Should include only record 0 (only one with defined email)
            expect(result.length).toBe(1);
            expect(result).toContainEqual(records[0]);
        });
        it("should filter records based on any_fields_excluded", () => {
            const filter = {
                any_fields_excluded: ["email"]
            };
            const result = (0, record_filter_1.filterRecords)(records, filter);
            // Should exclude record 0 (has email defined)
            expect(result.length).toBe(3);
            expect(result).not.toContainEqual(records[0]);
            expect(result).toContainEqual(records[1]);
            expect(result).toContainEqual(records[2]);
            expect(result).toContainEqual(records[3]);
        });
        it("should filter records based on field_values_required", () => {
            const filter = {
                field_values_required: {
                    "status": ["active"]
                }
            };
            const result = (0, record_filter_1.filterRecords)(records, filter);
            // Should include records 0 and 2 (active status)
            expect(result.length).toBe(2);
            expect(result).toContainEqual(records[0]);
            expect(result).toContainEqual(records[2]);
        });
        it("should filter records based on field_values_excluded", () => {
            const filter = {
                field_values_excluded: {
                    "status": ["inactive", "pending"]
                }
            };
            const result = (0, record_filter_1.filterRecords)(records, filter);
            // Should include records 0 and 2 (active status)
            expect(result.length).toBe(2);
            expect(result).toContainEqual(records[0]);
            expect(result).toContainEqual(records[2]);
        });
        it("should filter records based on complex criteria", () => {
            const complexFilter = {
                all_fields_required: ["id", "name"],
                field_values_required: {
                    "status": ["active"]
                },
                field_values_excluded: {
                    "id": ["3", "4"]
                }
            };
            const result = (0, record_filter_1.filterRecords)(records, complexFilter);
            // Should only include record 0
            expect(result.length).toBe(1);
            expect(result).toContainEqual(records[0]);
        });
        it("should handle empty record array", () => {
            const result = (0, record_filter_1.filterRecords)([], { all_fields_required: ["id"] });
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=record_filter.spec.js.map