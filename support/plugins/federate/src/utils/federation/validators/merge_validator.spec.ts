import { FederatedSheetConfig, FederateConfig } from "../../../types";
import { validateDedupeConfig } from "./merge_validator";

describe("validateDedupeConfig", () => {
  // Create a minimal federateConfig for testing
  const federateConfig: FederateConfig = {
    source_workbook_name: "Test Source Workbook",
    federated_workbook: { name: "Test Federated Workbook", sheets: [] },
    debug: false
  };
  
  it("should not throw for valid merge configuration", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).not.toThrow();
    
    expect(mergeFields.has("test-sheet")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
  });
  
  it("should not throw for valid merge configuration with 'delete' type", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).not.toThrow();
    
    expect(mergeFields.has("test-sheet")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
  });
  
  it("should not throw for valid merge configuration with 'last' keep value", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).not.toThrow();
    
    expect(mergeFields.has("test-sheet")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
  });
  
  it("should not throw for valid merge configuration with array 'on' property", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).not.toThrow();
    
    expect(mergeFields.has("test-sheet")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field2")).toBe(true);
  });
  
  it("should throw error for non-existent merge field", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field "non_existent_field" does not exist in the sheet');
  });
  
  it("should throw error for non-existent merge field in array", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field "non_existent_field" does not exist in the sheet');
  });
  
  it("should throw error for empty array of merge fields", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      dedupe_config: {
        on: [] as string[],
        type: "merge",
        keep: "first"
      }
    };
    const fieldKeys = new Set(["field1", "field2"]);
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": merge field array cannot be empty');
  });
  
  it("should throw error for invalid merge type", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      dedupe_config: {
        on: "field1",
        type: "invalid_type" as any,
        keep: "first"
      }
    };
    const fieldKeys = new Set(["field1", "field2"]);
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).toThrow('[MergeValidator] Invalid merge configuration for sheet "test-sheet": type must be "delete" or "merge"');
  });
  
  it("should throw error for invalid keep value", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      dedupe_config: {
        on: "field1",
        type: "merge",
        keep: "invalid_keep" as any
      }
    };
    const fieldKeys = new Set(["field1", "field2"]);
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
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
    } as Partial<FederatedSheetConfig>;
    const fieldKeys = new Set(["field1", "field2"]);
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet as FederatedSheetConfig, fieldKeys, mergeFields, federateConfig);
    }).toThrow('[MergeValidator] Sheet slug is required for merge configuration');
  });
  
  it("should not throw if no dedupe_config is provided", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: []
    };
    const fieldKeys = new Set(["field1", "field2"]);
    const mergeFields = new Map<string, Set<string>>();
    
    expect(() => {
      validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    }).not.toThrow();
    
    expect(mergeFields.has("test-sheet")).toBe(false);
  });
  
  it("should add to existing merge fields if sheet already exists", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    // Add existing field for the sheet
    mergeFields.set("test-sheet", new Set(["existing_field"]));
    
    validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    
    expect(mergeFields.get("test-sheet")?.size).toBe(2);
    expect(mergeFields.get("test-sheet")?.has("existing_field")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
  });
  
  it("should add multiple merge fields from array to tracking set", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    
    expect(mergeFields.get("test-sheet")?.size).toBe(3);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field2")).toBe(true);
    expect(mergeFields.get("test-sheet")?.has("field3")).toBe(true);
  });
  
  it("should not modify other sheets in the mergeFields map", () => {
    const sheet: FederatedSheetConfig = {
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
    const mergeFields = new Map<string, Set<string>>();
    
    // Add another sheet to the map
    mergeFields.set("other-sheet", new Set(["other_field"]));
    
    validateDedupeConfig(sheet, fieldKeys, mergeFields, federateConfig);
    
    // Verify the other sheet wasn't modified
    expect(mergeFields.get("other-sheet")?.size).toBe(1);
    expect(mergeFields.get("other-sheet")?.has("other_field")).toBe(true);
    
    // Verify the test sheet was properly updated
    expect(mergeFields.get("test-sheet")?.size).toBe(1);
    expect(mergeFields.get("test-sheet")?.has("field1")).toBe(true);
  });
}); 