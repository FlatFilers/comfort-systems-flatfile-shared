"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unpivot_validator_1 = require("./unpivot_validator");
describe("validateUnpivotConfig", () => {
    // Create a minimal federateConfig for testing
    const federateConfig = {
        source_workbook_name: "Test Source Workbook",
        federated_workbook: { name: "Test Federated Workbook", sheets: [] },
        debug: false
    };
    const sheet = {
        name: "Test Sheet",
        slug: "test-sheet",
        fields: [
            { key: "field1", label: "Field 1", type: "string" },
            { key: "field2", label: "Field 2", type: "string" }
        ],
        unpivot_groups: {
            group1: {
                source_sheet_slug: "source-sheet",
                field_mappings: [
                    {
                        field1: "source_field1",
                        field2: "source_field2"
                    }
                ]
            }
        }
    };
    it("should not throw for valid unpivot configuration", () => {
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(sheet, federateConfig);
        }).not.toThrow();
    });
    it("should throw error for empty unpivot_groups", () => {
        const emptyGroupsSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {}
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(emptyGroupsSheet, federateConfig);
        }).toThrow("[UnpivotValidator] Unpivot configuration must have at least one unpivot group");
    });
    it("should throw error for empty field mappings", () => {
        const emptyMappingsSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    source_sheet_slug: "source-sheet",
                    field_mappings: []
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(emptyMappingsSheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" must have at least one field mapping');
    });
    it("should throw error for empty mapping", () => {
        const emptyMappingSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    source_sheet_slug: "source-sheet",
                    field_mappings: [{}]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(emptyMappingSheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" has an empty field mapping for key: field1');
    });
    it("should throw error if unpivot_groups is not defined", () => {
        const noGroupsSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                { key: "field1", label: "Field 1", type: "string" }
            ],
            unpivot_groups: undefined
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(noGroupsSheet, federateConfig);
        }).toThrow("[UnpivotValidator] Unpivot configuration must have at least one unpivot group");
    });
    it("should throw error for missing source_sheet_slug", () => {
        const missingSourceSheetSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    field_mappings: [
                        {
                            field1: "source_field1"
                        }
                    ]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(missingSourceSheetSheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" must have either source_sheet or source_sheet_slug');
    });
    it("should not throw for valid UnpivotGroupConfigWithSheet", () => {
        const sheetWithSourceSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                { key: "field1", label: "Field 1", type: "string" },
                { key: "field2", label: "Field 2", type: "string" }
            ],
            unpivot_groups: {
                group1: {
                    source_sheet: {
                        name: "Source Sheet",
                        slug: "source-sheet",
                        fields: [
                            { key: "source_field1", type: "string", label: "Source Field 1" },
                            { key: "source_field2", type: "string", label: "Source Field 2" }
                        ]
                    },
                    field_mappings: [
                        {
                            field1: "source_field1",
                            field2: "source_field2"
                        }
                    ]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(sheetWithSourceSheet, federateConfig);
        }).not.toThrow();
    });
    it("should throw error for missing source_sheet in UnpivotGroupConfigWithSheet", () => {
        const missingSourceSheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    field_mappings: [
                        {
                            field1: "source_field1"
                        }
                    ]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(missingSourceSheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" must have either source_sheet or source_sheet_slug');
    });
    it("should throw error for source_sheet without a slug", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    source_sheet: {
                        name: "Source Sheet",
                        fields: [
                            { key: "source_field1", type: "string", label: "Source Field 1" }
                        ]
                    },
                    field_mappings: [
                        {
                            field1: "source_field1"
                        }
                    ]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(sheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" with source_sheet must have a valid slug');
    });
    it("should throw error for source_sheet with an empty slug", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [],
            unpivot_groups: {
                group1: {
                    source_sheet: {
                        name: "Source Sheet",
                        slug: "",
                        fields: [
                            { key: "source_field1", type: "string", label: "Source Field 1" }
                        ]
                    },
                    field_mappings: [
                        {
                            field1: "source_field1"
                        }
                    ]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotConfig)(sheet, federateConfig);
        }).toThrow('[UnpivotValidator] Unpivot group "group1" with source_sheet must have a valid slug');
    });
});
describe("validateUnpivotFields", () => {
    // Create a minimal federateConfig for testing
    const federateConfig = {
        source_workbook_name: "Test Source Workbook",
        federated_workbook: { name: "Test Federated Workbook", sheets: [] },
        debug: false
    };
    it("should not throw for valid unpivot fields", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                {
                    key: "field1",
                    type: "string",
                    label: "Field 1"
                },
                {
                    key: "field2",
                    type: "string",
                    label: "Field 2"
                }
            ],
            unpivot_groups: {
                group1: {
                    source_sheet_slug: "source-sheet-1",
                    field_mappings: [{ field1: "source_field1" }]
                },
                group2: {
                    source_sheet_slug: "source-sheet-2",
                    field_mappings: [{ field2: "source_field2" }]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotFields)(sheet, federateConfig);
        }).not.toThrow();
    });
    it("should not throw if fields is not defined", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: []
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotFields)(sheet, federateConfig);
        }).not.toThrow();
    });
    it("should not throw if unpivot_groups is not defined", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                {
                    key: "field1",
                    type: "string",
                    label: "Field 1"
                }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotFields)(sheet, federateConfig);
        }).not.toThrow();
    });
    it("should not throw if unpivot_groups is empty", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                {
                    key: "field1",
                    type: "string",
                    label: "Field 1"
                }
            ],
            unpivot_groups: {}
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotFields)(sheet, federateConfig);
        }).not.toThrow();
    });
    it("should throw error for field referenced in unpivot but not defined in sheet", () => {
        const sheet = {
            name: "Test Sheet",
            slug: "test-sheet",
            fields: [
                {
                    key: "field1",
                    type: "string",
                    label: "Field 1"
                }
            ],
            unpivot_groups: {
                group1: {
                    source_sheet_slug: "source-sheet",
                    field_mappings: [{ field2: "source_field2" }]
                }
            }
        };
        expect(() => {
            (0, unpivot_validator_1.validateUnpivotFields)(sheet, federateConfig);
        }).toThrow('[UnpivotValidator] Invalid unpivot configuration for sheet "test-sheet": unpivot group "group1" references field "field2", but this field does not exist in the sheet\'s fields');
    });
});
describe("validateSourceFields", () => {
    // Create a minimal federateConfig for testing
    const federateConfig = {
        source_workbook_name: "Test Source Workbook",
        federated_workbook: { name: "Test Federated Workbook", sheets: [] },
        debug: false
    };
    it("should not throw for valid source fields", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" },
                    { key: "source_field2", type: "string", label: "Source Field 2" }
                ]
            },
            field_mappings: [
                { "target_field1": "source_field1", "target_field2": "source_field2" }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).not.toThrow();
    });
    it("should exit early if no field mappings are provided", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" }
                ]
            },
            field_mappings: []
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).not.toThrow();
    });
    it("should exit early if only source_sheet_slug is provided", () => {
        const group = {
            source_sheet_slug: "source-sheet",
            field_mappings: [
                { "target_field1": "source_field1" }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).not.toThrow();
    });
    it("should throw error for missing source field", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" }
                ]
            },
            field_mappings: [
                { "target_field1": "nonexistent_field" }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).toThrow('[UnpivotValidator] Invalid unpivot configuration for group "testGroup": field mapping at index 0 references source field "nonexistent_field", but this field does not exist in the source sheet');
    });
    it("should validate multiple field mappings", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" },
                    { key: "source_field2", type: "string", label: "Source Field 2" }
                ]
            },
            field_mappings: [
                { "target_field1": "source_field1" },
                { "target_field2": "source_field2" }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).not.toThrow();
    });
    it("should throw error for one invalid mapping among multiple valid ones", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" }
                ]
            },
            field_mappings: [
                { "target_field1": "source_field1" },
                { "target_field2": "nonexistent_field" }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).toThrow('[UnpivotValidator] Invalid unpivot configuration for group "testGroup": field mapping at index 1 references source field "nonexistent_field", but this field does not exist in the source sheet');
    });
    it("should not validate fields with static values using << and >> syntax", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" }
                ]
            },
            field_mappings: [
                {
                    "target_field1": "source_field1",
                    "static_field": "<<Static Value>>",
                    "category": "<<Primary>>"
                }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).not.toThrow();
    });
    it("should validate mixed normal fields and static values correctly", () => {
        const group = {
            source_sheet: {
                name: "Source Sheet",
                slug: "source-sheet",
                fields: [
                    { key: "source_field1", type: "string", label: "Source Field 1" }
                ]
            },
            field_mappings: [
                {
                    "target_field1": "source_field1",
                    "static_field": "<<Static Value>>",
                    "invalid_field": "nonexistent_field" // This should fail validation
                }
            ]
        };
        expect(() => {
            (0, unpivot_validator_1.validateSourceFields)(group, "testGroup", federateConfig);
        }).toThrow('[UnpivotValidator] Invalid unpivot configuration for group "testGroup": field mapping at index 0 references source field "nonexistent_field", but this field does not exist in the source sheet');
    });
});
//# sourceMappingURL=unpivot_validator.spec.js.map