"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const field_validator_1 = require("./field_validator");
describe("validateField", () => {
    // Default federateConfig for tests
    const defaultFederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
            name: "Federated Workbook",
            sheets: []
        },
        debug: false
    };
    it("should validate a field with source_sheet_slug and source_field_key", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet_slug: "source",
                source_field_key: "source_key"
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).not.toThrow();
    });
    it("should validate a field with source_sheet and source_field_key", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "source_key",
                            type: "string",
                            label: "Source Key"
                        }
                    ]
                },
                source_field_key: "source_key"
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).not.toThrow();
    });
    it("should throw error when field has source_sheet_slug but no source_field_key", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet_slug: "source",
                source_field_key: undefined
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).toThrow("[FieldValidator] Field with source_sheet_slug must have a source_field_key");
    });
    it("should throw error when field has source_field_key but no source sheet info", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_field_key: "source_key",
                source_sheet_slug: undefined
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).toThrow("[FieldValidator] Field with source_field_key must have a source_sheet_slug");
    });
    it("should allow field with federate_config but no source field key", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: []
                }
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).not.toThrow();
    });
    it("should throw error when source_field_key doesn't exist in source_sheet", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "existing_field",
                            type: "string",
                            label: "Existing Field"
                        }
                    ]
                },
                source_field_key: "non_existing_field"
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, defaultFederateConfig)).toThrow("[FieldValidator] Field \"non_existing_field\" not found in source sheet \"source\"");
    });
    it("should not throw error when source_field_key doesn't exist in source_sheet but allow_undeclared_source_fields is true", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "existing_field",
                            type: "string",
                            label: "Existing Field"
                        }
                    ]
                },
                source_field_key: "non_existing_field"
            }
        };
        const config = {
            source_workbook_name: "Source Workbook",
            federated_workbook: {
                name: "Federated Workbook",
                sheets: []
            },
            allow_undeclared_source_fields: true
        };
        expect(() => (0, field_validator_1.validateField)(field, config)).not.toThrow();
    });
    it("should throw error when source_field_key doesn't exist in source_sheet and allow_undeclared_source_fields is false", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "existing_field",
                            type: "string",
                            label: "Existing Field"
                        }
                    ]
                },
                source_field_key: "non_existing_field"
            }
        };
        const config = {
            source_workbook_name: "Source Workbook",
            federated_workbook: {
                name: "Federated Workbook",
                sheets: []
            },
            allow_undeclared_source_fields: false
        };
        expect(() => (0, field_validator_1.validateField)(field, config)).toThrow("[FieldValidator] Field \"non_existing_field\" not found in source sheet \"source\"");
    });
    it("should throw error when source_field_key doesn't exist in source_sheet and allow_undeclared_source_fields is undefined", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "existing_field",
                            type: "string",
                            label: "Existing Field"
                        }
                    ]
                },
                source_field_key: "non_existing_field"
            }
        };
        const config = {
            source_workbook_name: "Source Workbook",
            federated_workbook: {
                name: "Federated Workbook",
                sheets: []
            }
        };
        expect(() => (0, field_validator_1.validateField)(field, config)).toThrow("[FieldValidator] Field \"non_existing_field\" not found in source sheet \"source\"");
    });
    it("should validate source_field_key exists in source_sheet when allow_undeclared_source_fields is true", () => {
        const field = {
            key: "test",
            type: "string",
            label: "Test",
            federate_config: {
                source_sheet: {
                    name: "Source Sheet",
                    slug: "source",
                    fields: [
                        {
                            key: "existing_field",
                            type: "string",
                            label: "Existing Field"
                        }
                    ]
                },
                source_field_key: "existing_field"
            }
        };
        const config = {
            source_workbook_name: "Source Workbook",
            federated_workbook: {
                name: "Federated Workbook",
                sheets: []
            },
            allow_undeclared_source_fields: true
        };
        expect(() => (0, field_validator_1.validateField)(field, config)).not.toThrow();
    });
});
describe("validateFields", () => {
    // Default federateConfig for tests
    const defaultFederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
            name: "Federated Workbook",
            sheets: []
        },
        debug: false
    };
    it("should validate multiple fields and collect source sheet slugs", () => {
        const fields = [
            {
                key: "field1",
                type: "string",
                label: "Field 1",
                federate_config: {
                    source_sheet_slug: "source1",
                    source_field_key: "source_key1"
                }
            },
            {
                key: "field2",
                type: "string",
                label: "Field 2",
                federate_config: {
                    source_sheet_slug: "source2",
                    source_field_key: "source_key2"
                }
            }
        ];
        const sourceSheets = new Set();
        const fieldKeys = (0, field_validator_1.validateFields)(fields, undefined, "test_sheet", sourceSheets, defaultFederateConfig);
        expect(fieldKeys.size).toBe(2);
        expect(fieldKeys.has("field1")).toBe(true);
        expect(fieldKeys.has("field2")).toBe(true);
        expect(sourceSheets.size).toBe(2);
        expect(sourceSheets.has("source1")).toBe(true);
        expect(sourceSheets.has("source2")).toBe(true);
    });
    it("should throw error for duplicate field keys", () => {
        const fields = [
            {
                key: "unique",
                type: "string",
                label: "Unique Field"
            },
            {
                key: "duplicate",
                type: "string",
                label: "Duplicate Field 1"
            },
            {
                key: "duplicate",
                type: "string",
                label: "Duplicate Field 2"
            }
        ];
        const sourceSheets = new Set();
        expect(() => (0, field_validator_1.validateFields)(fields, undefined, "test_sheet", sourceSheets, defaultFederateConfig))
            .toThrow('[FieldValidator] Duplicate field key "duplicate" (duplicate real field) found in sheet "test_sheet". Keys must be unique across real and virtual fields.');
    });
    it("should handle fields without federate_config", () => {
        const fields = [
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
        ];
        const sourceSheets = new Set();
        const sheetSlug = "test_sheet";
        const fieldKeys = (0, field_validator_1.validateFields)(fields, undefined, sheetSlug, sourceSheets, defaultFederateConfig);
        expect(fieldKeys.size).toBe(2);
        expect(sourceSheets.size).toBe(0);
    });
    it("should handle fields with federate_config but no source_sheet_slug", () => {
        const fields = [
            {
                key: "field1",
                type: "string",
                label: "Field 1",
                federate_config: {
                    source_sheet: {
                        name: "Source Sheet",
                        slug: "source1",
                        fields: []
                    }
                }
            }
        ];
        const sourceSheets = new Set();
        const sheetSlug = "test_sheet";
        const fieldKeys = (0, field_validator_1.validateFields)(fields, undefined, sheetSlug, sourceSheets, defaultFederateConfig);
        expect(fieldKeys.size).toBe(1);
        expect(sourceSheets.size).toBe(1);
        expect(sourceSheets.has("source1")).toBe(true);
    });
});
//# sourceMappingURL=field_validator.spec.js.map