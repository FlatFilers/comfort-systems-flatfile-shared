import { expect, describe, it } from "@jest/globals";
import { createUnpivotedRecords } from "./unpivot_processor";
import { UnpivotGroupConfig } from "../../../types";

describe("unpivot_processor", () => {
  describe("createUnpivotedRecords", () => {
    const sourceRecord = {
      field1: { value: "value1" },
      field2: { value: "value2" }
    };
    
    it("should create unpivoted records based on field mappings", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field1: "field1",
              target_field2: "field2"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(1);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[0].target_field2.value).toBe("value2");
    });
    
    it("should create unpivoted records based on field mappings with source_sheet property", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field1: "field1",
              target_field2: "field2",
              sheet_name: "<<source_slug>>"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(1);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[0].target_field2.value).toBe("value2");
      expect(result[0].sheet_name.value).toBe("source_slug");
    });
    
    it("should handle multiple unpivot groups", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field1: "field1"
            }
          ]
        } as UnpivotGroupConfig],
        ["group2", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field2: "field2"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(2);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[1].target_field2.value).toBe("value2");
    });
    
    it("should skip mappings with undefined source values", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field: "nonexistent_field"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(0);
    });
    
    it("should skip records with no valid values from mappings", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field1: "nonexistent_field1",
              target_field2: "nonexistent_field2"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(0);
    });
    
    it("should handle static values with << and >>", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field1: "field1",
              sheet_name: "<<source_slug>>"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(1);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[0].sheet_name.value).toBe("source_slug");
    });
    
    it("should handle empty unpivot groups array", () => {
      const result = createUnpivotedRecords(sourceRecord, "source_slug", []);
      
      expect(result.length).toBe(0);
    });
    
    it("should handle groups with empty field_mappings array", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: []
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(0);
    });
    
    it("should handle undefined field_mappings in a group", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: undefined
        } as unknown as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(0);
    });
    
    it("should process multiple mappings in a single group", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
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
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(2);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[1].target_field2.value).toBe("value2");
    });
    
    it("should handle mixed static values and regular field mappings", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field: "field1",
              sheet_name: "<<source_slug>>",
              another_field: "field1"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(1);
      expect(result[0].target_field.value).toBe("value1");
      expect(result[0].sheet_name.value).toBe("source_slug");
      expect(result[0].another_field.value).toBe("value1");
    });
    
    it("should handle null sourceRecord", () => {
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
        ["group1", {
          source_sheet_slug: "source1",
          field_mappings: [
            {
              target_field: "field1"
            }
          ]
        } as UnpivotGroupConfig]
      ];
      
      const result = createUnpivotedRecords(null as any, "source_slug", unpivotGroups);
      
      expect(result.length).toBe(0);
    });
    
    it("should attach virtual fields to each unpivoted record", () => {
      const sourceRecord = {
        field1: { value: "value1" },
        field2: { value: "value2" },
        virtual_source: { value: "virtualValue" }
      };
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
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
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups, virtualFieldsMap);
      expect(result.length).toBe(1);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[0].target_field2.value).toBe("value2");
      expect(result[0].virtual_field.value).toBe("virtualValue");
    });
    
    it("should not include virtual field if missing in source", () => {
      const sourceRecord = {
        field1: { value: "value1" }
      };
      const unpivotGroups: Array<[string, UnpivotGroupConfig]> = [
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
      const result = createUnpivotedRecords(sourceRecord, "source_slug", unpivotGroups, virtualFieldsMap);
      expect(result.length).toBe(1);
      expect(result[0].target_field1.value).toBe("value1");
      expect(result[0]).not.toHaveProperty("virtual_field");
    });
  });
}); 