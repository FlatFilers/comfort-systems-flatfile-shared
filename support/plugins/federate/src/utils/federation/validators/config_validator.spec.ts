import { FederateConfig, FederatedProperty } from "../../../types";
import { validateConfig } from "./config_validator";

// Mock validator functions
const mockValidators = {
  validateFields: jest.fn(),
  validateField: jest.fn(),
  validateDedupeConfig: jest.fn(),
  validateUnpivotConfig: jest.fn(),
  validateUnpivotFields: jest.fn(),
  validateFilters: jest.fn()
};

jest.mock("./field_validator", () => ({
  validateFields: (...args: any[]) => mockValidators.validateFields(...args),
  validateField: (...args: any[]) => mockValidators.validateField(...args)
}));

jest.mock("./merge_validator", () => ({
  validateDedupeConfig: (...args: any[]) => mockValidators.validateDedupeConfig(...args)
}));

jest.mock("./unpivot_validator", () => ({
  validateUnpivotConfig: (...args: any[]) => mockValidators.validateUnpivotConfig(...args),
  validateUnpivotFields: (...args: any[]) => mockValidators.validateUnpivotFields(...args)
}));

jest.mock("./filter_validator", () => ({
  validateFilters: (...args: any[]) => mockValidators.validateFilters(...args)
}));

describe("config_validator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock validateFields to return field keys and update sourceSheets
    mockValidators.validateFields.mockImplementation(
      (realFields: FederatedProperty[], 
        virtualFields: FederatedProperty[] | undefined, 
        sheetSlug: string, 
        sourceSheets: Set<string>, 
        federateConfig: FederateConfig
      ) => {
        // Add source sheet slugs from real fields to the provided set
        realFields.forEach((field: FederatedProperty) => {
          if (field.federate_config?.source_sheet_slug) {
            sourceSheets.add(field.federate_config.source_sheet_slug);
          }
        });
        // Add source sheet slugs from virtual fields to the provided set
        if (virtualFields) {
          virtualFields.forEach((field: FederatedProperty) => {
            if (field.federate_config?.source_sheet_slug) {
              sourceSheets.add(field.federate_config.source_sheet_slug);
            }
          });
        }
        // Return a set of field keys (combine real and virtual for accuracy)
        const allFields = [...realFields, ...(virtualFields || [])];
        return new Set(allFields.map((f: FederatedProperty) => f.key));
      }
    );
    mockValidators.validateField.mockReturnValue(undefined);
    mockValidators.validateDedupeConfig.mockReturnValue(undefined);
    mockValidators.validateUnpivotConfig.mockReturnValue(undefined);
    mockValidators.validateUnpivotFields.mockReturnValue(undefined);
    mockValidators.validateFilters.mockReturnValue(undefined);
  });
  
  describe("Basic Validation", () => {
    it("should return set of source sheet slugs for valid config", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
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
              ]
            },
            {
              name: "Sheet 2",
              slug: "sheet2",
              fields: [
                {
                  key: "field2",
                  type: "string",
                  label: "Field 2",
                  federate_config: {
                    source_sheet_slug: "source2",
                    source_field_key: "sourceField2"
                  }
                }
              ]
            }
          ]
        }
      };
      
      const result = validateConfig(config);
      expect(result).toEqual(new Set(["source1", "source2"]));
    });
    
    it("should throw error for empty sheets", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: []
        }
      };
      expect(() => validateConfig(config)).toThrow("[ConfigValidator] Invalid federation configuration: federated_workbook must contain at least one sheet");
    });
    
    it("should throw error for duplicate slugs", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "duplicate-slug",
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
              ]
            },
            {
              name: "Sheet 2",
              slug: "duplicate-slug",
              fields: [
                {
                  key: "field2",
                  type: "string",
                  label: "Field 2",
                  federate_config: {
                    source_sheet_slug: "source2",
                    source_field_key: "sourceField2"
                  }
                }
              ]
            }
          ]
        }
      };
      
      expect(() => validateConfig(config)).toThrow('[ConfigValidator] Duplicate sheet slug found: "duplicate-slug". Sheet slugs must be unique.');
    });
  });
  
  describe("Field Validation", () => {
    it("should throw error for sheet without fields", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
              fields: []
            }
          ]
        }
      };
      
      expect(() => validateConfig(config)).toThrow('[ConfigValidator] Sheet "sheet1" must have at least one field');
    });
    
    it("should validate field configurations", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
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
              ]
            }
          ]
        }
      };
      
      validateConfig(config);
      expect(mockValidators.validateFields).toHaveBeenCalled();
    });
    
    it("should handle nested field paths", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
              fields: [
                {
                  key: "parent.child.field",
                  type: "string",
                  label: "Nested Field",
                  federate_config: {
                    source_sheet_slug: "source1",
                    source_field_key: "parent.child.field"
                  }
                }
              ]
            }
          ]
        }
      };
      
      const result = validateConfig(config);
      expect(result).toEqual(new Set(["source1"]));
    });
  });
  
  describe("Validator Function Calls", () => {
    it("should call all validators for each sheet", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
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
              ]
            },
            {
              name: "Sheet 2",
              slug: "sheet2",
              fields: [
                {
                  key: "field2",
                  type: "string",
                  label: "Field 2",
                  federate_config: {
                    source_sheet_slug: "source2",
                    source_field_key: "sourceField2"
                  }
                }
              ]
            }
          ]
        }
      };
      
      validateConfig(config);
      
      expect(mockValidators.validateFields).toHaveBeenCalledTimes(2);
      expect(mockValidators.validateUnpivotConfig).toHaveBeenCalledTimes(2);
      expect(mockValidators.validateUnpivotFields).toHaveBeenCalledTimes(0);
      expect(mockValidators.validateDedupeConfig).toHaveBeenCalledTimes(2);
      expect(mockValidators.validateFilters).toHaveBeenCalledTimes(2);
    });
  });
  
  describe("Error Handling", () => {
    it("should propagate validation errors", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
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
              ]
            }
          ]
        }
      };
      
      mockValidators.validateFields.mockImplementation(() => {
        throw new Error("Field validation failed");
      });
      
      expect(() => validateConfig(config)).toThrow("Field validation failed");
    });
    
    it("should handle unpivot validation errors", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: [
            {
              name: "Sheet 1",
              slug: "sheet1",
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
              ]
            }
          ]
        }
      };
      
      mockValidators.validateUnpivotConfig.mockImplementation(() => {
        throw new Error("Unpivot validation failed");
      });
      
      expect(() => validateConfig(config)).toThrow("Unpivot validation failed");
    });
  });
  
  describe("Performance", () => {
    it("should handle large configurations", () => {
      const config: FederateConfig = {
        source_workbook_name: "Source Workbook",
        federated_workbook: {
          name: "Federated Workbook",
          sheets: Array(100).fill(null).map((_, i) => ({
            name: `Sheet ${i}`,
            slug: `sheet${i}`,
            fields: Array(50).fill(null).map((_, j) => ({
              key: `field${j}`,
              type: "string",
              label: `Field ${j}`,
              federate_config: {
                source_sheet_slug: `source${i}`,
                source_field_key: `sourceField${j}`
              }
            }))
          }))
        }
      };
      
      const startTime = Date.now();
      validateConfig(config);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(mockValidators.validateFields).toHaveBeenCalledTimes(100);
    });
  });
}); 