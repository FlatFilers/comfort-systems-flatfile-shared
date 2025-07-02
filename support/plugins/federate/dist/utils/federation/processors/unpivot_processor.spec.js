"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const unpivot_processor_1 = require("./unpivot_processor");
(0, globals_1.describe)("unpivot_processor", () => {
    (0, globals_1.describe)("createUnpivotedRecords", () => {
        const sourceRecord = {
            field1: { value: "value1" },
            field2: { value: "value2" }
        };
        (0, globals_1.it)("should create unpivoted records based on field mappings", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1",
                                target_field2: "field2"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[0].target_field2.value).toBe("value2");
        });
        (0, globals_1.it)("should create unpivoted records based on field mappings with source_sheet property", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1",
                                target_field2: "field2",
                                sheet_name: "<<source_slug>>"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[0].target_field2.value).toBe("value2");
            (0, globals_1.expect)(result[0].sheet_name.value).toBe("source_slug");
        });
        (0, globals_1.it)("should handle multiple unpivot groups", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1"
                            }
                        ]
                    }],
                ["group2", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field2: "field2"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(2);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[1].target_field2.value).toBe("value2");
        });
        (0, globals_1.it)("should skip mappings with undefined source values", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field: "nonexistent_field"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should skip records with no valid values from mappings", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "nonexistent_field1",
                                target_field2: "nonexistent_field2"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should handle static values with << and >>", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1",
                                sheet_name: "<<source_slug>>"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[0].sheet_name.value).toBe("source_slug");
        });
        (0, globals_1.it)("should handle empty unpivot groups array", () => {
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", []);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should handle groups with empty field_mappings array", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: []
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should handle undefined field_mappings in a group", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: undefined
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should process multiple mappings in a single group", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1"
                            },
                            {
                                target_field2: "field2"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(2);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[1].target_field2.value).toBe("value2");
        });
        (0, globals_1.it)("should handle mixed static values and regular field mappings", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field: "field1",
                                sheet_name: "<<source_slug>>",
                                another_field: "field1"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field.value).toBe("value1");
            (0, globals_1.expect)(result[0].sheet_name.value).toBe("source_slug");
            (0, globals_1.expect)(result[0].another_field.value).toBe("value1");
        });
        (0, globals_1.it)("should handle null sourceRecord", () => {
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field: "field1"
                            }
                        ]
                    }]
            ];
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(null, "source_slug", unpivotGroups);
            (0, globals_1.expect)(result.length).toBe(0);
        });
        (0, globals_1.it)("should attach virtual fields to each unpivoted record", () => {
            const sourceRecord = {
                field1: { value: "value1" },
                field2: { value: "value2" },
                virtual_source: { value: "virtualValue" }
            };
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1",
                                target_field2: "field2"
                            }
                        ]
                    }]
            ];
            const virtualFieldsMap = new Map([["virtual_source", "virtual_field"]]);
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups, virtualFieldsMap);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[0].target_field2.value).toBe("value2");
            (0, globals_1.expect)(result[0].virtual_field.value).toBe("virtualValue");
        });
        (0, globals_1.it)("should not include virtual field if missing in source", () => {
            const sourceRecord = {
                field1: { value: "value1" }
            };
            const unpivotGroups = [
                ["group1", {
                        source_sheet_slug: "source1",
                        field_mappings: [
                            {
                                target_field1: "field1"
                            }
                        ]
                    }]
            ];
            const virtualFieldsMap = new Map([["virtual_source", "virtual_field"]]);
            const result = (0, unpivot_processor_1.createUnpivotedRecords)(sourceRecord, "source_slug", unpivotGroups, virtualFieldsMap);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(result[0].target_field1.value).toBe("value1");
            (0, globals_1.expect)(result[0]).not.toHaveProperty("virtual_field");
        });
    });
});
//# sourceMappingURL=unpivot_processor.spec.js.map