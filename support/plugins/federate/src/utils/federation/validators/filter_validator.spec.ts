import { FederateConfig, FederatedSheetConfig } from "../../../types";
import { validateFilters } from "./filter_validator";
import { logInfo, logError } from "@flatfile/util-common";

// Mock logging functions
jest.mock("@flatfile/util-common", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn()
}));

describe("validateFilters", () => {
  const fieldKeys = new Set(["field1", "field2", "field3"]);
  const federateConfig: FederateConfig = {
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
    const sheet: FederatedSheetConfig = {
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
      validateFilters(sheet, fieldKeys, federateConfig);
    }).not.toThrow();
  });
  
  it("should throw error for invalid field in field_values_required", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      field_values_required: {
        "non_existent_field": ["value1"]
      }
    };
    
    expect(() => {
      validateFilters(sheet, fieldKeys, federateConfig);
    }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in field_values_required does not exist in the sheet');
  });
  
  it("should throw error for invalid field in field_values_excluded", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      field_values_excluded: {
        "non_existent_field": ["value1"]
      }
    };
    
    expect(() => {
      validateFilters(sheet, fieldKeys, federateConfig);
    }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in field_values_excluded does not exist in the sheet');
  });
  
  it("should throw error for invalid field in all_fields_required", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      all_fields_required: ["non_existent_field"]
    };
    
    expect(() => {
      validateFilters(sheet, fieldKeys, federateConfig);
    }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in all_fields_required does not exist in the sheet');
  });
  
  it("should throw error for invalid field in any_fields_required", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      any_fields_required: ["non_existent_field"]
    };
    
    expect(() => {
      validateFilters(sheet, fieldKeys, federateConfig);
    }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in any_fields_required does not exist in the sheet');
  });
  
  it("should throw error for invalid field in any_fields_excluded", () => {
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      any_fields_excluded: ["non_existent_field"]
    };
    
    expect(() => {
      validateFilters(sheet, fieldKeys, federateConfig);
    }).toThrow('[FilterValidator] Invalid filter configuration for sheet "test-sheet": field "non_existent_field" in any_fields_excluded does not exist in the sheet');
  });
  
  it("should handle sheet without slug", () => {
    const sheet = {
      name: "Test Sheet",
      fields: [],
      any_fields_excluded: ["non_existent_field"]
    } as unknown as FederatedSheetConfig;
    
    expect(() => validateFilters(sheet, new Set<string>(), federateConfig)).toThrow(
      '[FilterValidator] Invalid filter configuration for sheet "unknown": field "non_existent_field" in any_fields_excluded does not exist in the sheet'
    );
  });
  
  // Tests for debug mode
  it("should log debug information when debug is enabled", () => {
    const debugConfig: FederateConfig = {
      ...federateConfig,
      debug: true
    };
    
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      field_values_required: {
        "field1": ["value1", "value2"]
      }
    };
    
    validateFilters(sheet, fieldKeys, debugConfig);
    
    expect(logInfo).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating filter configuration")
    );
  });
  
  it("should skip validation and log when no filters are defined", () => {
    const debugConfig: FederateConfig = {
      ...federateConfig,
      debug: true
    };
    
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: []
    };
    
    validateFilters(sheet, fieldKeys, debugConfig);
    
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("No filters defined")
    );
  });
  
  it("should log field lists when debug is enabled", () => {
    const debugConfig: FederateConfig = {
      ...federateConfig,
      debug: true
    };
    
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      field_values_required: {
        "field1": ["value1", "value2"]
      }
    };
    
    validateFilters(sheet, fieldKeys, debugConfig);
    
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("available fields")
    );
  });
  
  it("should log detailed validation information for each filter type", () => {
    const debugConfig: FederateConfig = {
      ...federateConfig,
      debug: true
    };
    
    const sheet: FederatedSheetConfig = {
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
    
    validateFilters(sheet, fieldKeys, debugConfig);
    
    // Check logs for field_values_required
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating 1 fields in field_values_required filter")
    );
    
    // Check logs for field_values_excluded
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating 1 fields in field_values_excluded filter")
    );
    
    // Check logs for all_fields_required
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating 1 fields in all_fields_required filter")
    );
    
    // Check logs for any_fields_required
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating 1 fields in any_fields_required filter")
    );
    
    // Check logs for any_fields_excluded
    expect(logInfo).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining("Validating 1 fields in any_fields_excluded filter")
    );
  });
  
  it("should log error when field doesn't exist in debug mode", () => {
    const debugConfig: FederateConfig = {
      ...federateConfig,
      debug: true
    };
    
    const sheet: FederatedSheetConfig = {
      name: "Test Sheet",
      slug: "test-sheet",
      fields: [],
      field_values_required: {
        "non_existent_field": ["value1"]
      }
    };
    
    try {
      validateFilters(sheet, fieldKeys, debugConfig);
    } catch (error) {
      // Expected to throw, but we just want to check the logging
    }
    
    expect(logError).toHaveBeenCalledWith(
      "📦   ↳ Filter Validator", 
      expect.stringContaining('Field "non_existent_field" in field_values_required does not exist')
    );
  });
}); 