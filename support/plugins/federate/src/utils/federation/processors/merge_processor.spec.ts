import { Flatfile } from "@flatfile/api";
import { DedupeConfig } from "../../../types";
import { mergeRecords } from "./merge_processor";

describe("mergeRecords", () => {
  // Sample records with a common field "id"
  const records: Flatfile.RecordData[] = [
    {
      id: { value: "1" },
      name: { value: "John" },
      email: { value: "john@example.com" }
    },
    {
      id: { value: "1" },
      name: { value: "Johnny" },
      phone: { value: "555-1234" }
    },
    {
      id: { value: "2" },
      name: { value: "Jane" },
      email: { value: "jane@example.com" }
    },
    {
      id: { value: "3" },
      name: { value: undefined },
      email: { value: "unknown@example.com" }
    }
  ];
  
  // Additional sample records for composite key testing
  const compositeRecords: Flatfile.RecordData[] = [
    {
      firstName: { value: "John" },
      lastName: { value: "Doe" },
      email: { value: "john.doe@example.com" },
      age: { value: "30" }
    },
    {
      firstName: { value: "John" },
      lastName: { value: "Doe" },
      phone: { value: "555-1234" },
      department: { value: "Sales" }
    },
    {
      firstName: { value: "Jane" },
      lastName: { value: "Doe" },
      email: { value: "jane.doe@example.com" }
    },
    {
      firstName: { value: "John" },
      lastName: { value: "Smith" },
      email: { value: "john.smith@example.com" }
    },
    {
      firstName: { value: "John" },
      // Missing lastName
      email: { value: "john@example.com" }
    }
  ];
  
  it("should return original records if no dedupeConfig is provided", () => {
    const result = mergeRecords(records);
    expect(result).toEqual(records);
  });
  
  it("should return original records if records array is empty", () => {
    const result = mergeRecords([], { on: "id", type: "merge", keep: "first" });
    expect(result).toEqual([]);
  });
  
  it("should merge records with 'merge' type and 'first' keep strategy", () => {
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(records, dedupeConfig);
    
    // Expect 3 records (id=1 records merged, id=2, id=3)
    expect(result.length).toBe(3);
    
    // Check merged record (should keep John's name and have both email and phone)
    const mergedRecord = result.find(r => r.id.value === "1");
    expect(mergedRecord).toBeDefined();
    expect(mergedRecord?.name.value).toBe("John"); // First record's name
    expect(mergedRecord?.email.value).toBe("john@example.com");
    expect(mergedRecord?.phone.value).toBe("555-1234");
  });
  
  it("should merge records with 'merge' type and 'last' keep strategy", () => {
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "merge",
      keep: "last"
    };
    
    const result = mergeRecords(records, dedupeConfig);
    
    // Check merged record (should keep Johnny's name and have both email and phone)
    const mergedRecord = result.find(r => r.id.value === "1");
    expect(mergedRecord).toBeDefined();
    expect(mergedRecord?.name.value).toBe("Johnny"); // Last record's name
    expect(mergedRecord?.email.value).toBe("john@example.com");
    expect(mergedRecord?.phone.value).toBe("555-1234");
  });
  
  it("should delete duplicate records with 'delete' type and 'first' keep strategy", () => {
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "delete",
      keep: "first"
    };
    
    const result = mergeRecords(records, dedupeConfig);
    
    // Expect 3 records (id=1 keeping just the first, id=2, id=3)
    expect(result.length).toBe(3);
    
    // Check kept record (should be John's record only)
    const keptRecord = result.find(r => r.id.value === "1");
    expect(keptRecord).toBeDefined();
    expect(keptRecord?.name.value).toBe("John");
    expect(keptRecord?.email.value).toBe("john@example.com");
    expect(keptRecord?.phone).toBeUndefined();
  });
  
  it("should delete duplicate records with 'delete' type and 'last' keep strategy", () => {
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "delete",
      keep: "last"
    };
    
    const result = mergeRecords(records, dedupeConfig);
    
    // Check kept record (should be Johnny's record only)
    const keptRecord = result.find(r => r.id.value === "1");
    expect(keptRecord).toBeDefined();
    expect(keptRecord?.name.value).toBe("Johnny");
    expect(keptRecord?.email).toBeUndefined();
    expect(keptRecord?.phone.value).toBe("555-1234");
  });
  
  it("should handle records with null merge field values", () => {
    const recordsWithNull: Flatfile.RecordData[] = [
      { id: { value: undefined }, name: { value: "Unknown" } },
      { id: { value: "1" }, name: { value: "John" } }
    ];
    
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(recordsWithNull, dedupeConfig);
    
    // Should have 1 record with id=1 and 0 records with null id
    expect(result.length).toBe(1);
    expect(result[0].id.value).toBe("1");
  });
  
  it("should skip records with undefined merge field", () => {
    const recordsWithUndefined: Flatfile.RecordData[] = [
      { name: { value: "Unknown" } } as any, // Missing id field
      { id: { value: "1" }, name: { value: "John" } }
    ];
    
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(recordsWithUndefined, dedupeConfig);
    
    // Should have 1 record with id=1 only
    expect(result.length).toBe(1);
    expect(result[0].id.value).toBe("1");
  });
  
  it("should include all records if merge type is invalid", () => {
    // Cast through unknown to suppress type-checking
    const invalidConfig = {
      on: "id",
      type: "invalid_type",
      keep: "first"
    } as unknown as DedupeConfig;
    
    const result = mergeRecords(records, invalidConfig);
    
    // All records should be included including duplicates
    expect(result.length).toBe(4);
  });
  
  it("should prefer values from the base record when merging", () => {
    // Create records with same id but different values
    const conflictRecords: Flatfile.RecordData[] = [
      {
        id: { value: "1" },
        name: { value: "Original" },
        status: { value: "Active" }
      },
      {
        id: { value: "1" },
        name: { value: "Changed" },
        email: { value: "test@example.com" }
      }
    ];
    
    const dedupeConfig: DedupeConfig = {
      on: "id",
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(conflictRecords, dedupeConfig);
    
    // Check merged record keeps original name but adds email
    const mergedRecord = result[0];
    expect(mergedRecord.name.value).toBe("Original"); // Keep base record value
    expect(mergedRecord.email.value).toBe("test@example.com"); // Add new field
    expect(mergedRecord.status.value).toBe("Active"); // Keep base record field
  });
  
  // New tests for array-based 'on' property
  it("should merge records based on composite key with array 'on' property", () => {
    const dedupeConfig: DedupeConfig = {
      on: ["firstName", "lastName"],
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(compositeRecords, dedupeConfig);
    
    // Expect 4 records: 1 merged John Doe, 1 Jane Doe, 1 John Smith, 1 John (missing lastName)
    expect(result.length).toBe(4);
    
    // Check the merged John Doe record
    const johnDoe = result.find(r => 
      r.firstName.value === "John" && r.lastName.value === "Doe"
    );
    
    expect(johnDoe).toBeDefined();
    expect(johnDoe?.email.value).toBe("john.doe@example.com");
    expect(johnDoe?.phone.value).toBe("555-1234");
    expect(johnDoe?.age.value).toBe("30");
    expect(johnDoe?.department.value).toBe("Sales");
    
    // Check the record with missing lastName
    const johnNoLastName = result.find(r => 
      r.firstName.value === "John" && !r.lastName
    );
    
    expect(johnNoLastName).toBeDefined();
    expect(johnNoLastName?.email.value).toBe("john@example.com");
  });
  
  it("should include records where any part of the composite key is missing", () => {
    const dedupeConfig: DedupeConfig = {
      on: ["firstName", "lastName"],
      type: "merge",
      keep: "first"
    };
    
    const result = mergeRecords(compositeRecords, dedupeConfig);
    
    // The record with only firstName but missing lastName should be included
    const recordsWithJohnFirstName = result.filter(r => 
      r.firstName.value === "John"
    );
    
    // Should have 3 records with firstName="John": John Doe, John Smith, and John (missing lastName)
    expect(recordsWithJohnFirstName.length).toBe(3);
    
    // Should have a record with email "john@example.com" (from the record with missing lastName)
    const hasIncompleteRecord = result.some(r => 
      r.email?.value === "john@example.com"
    );
    expect(hasIncompleteRecord).toBe(true);
  });
  
  it("should delete duplicate records based on composite key", () => {
    const dedupeConfig: DedupeConfig = {
      on: ["firstName", "lastName"],
      type: "delete",
      keep: "last"
    };
    
    const result = mergeRecords(compositeRecords, dedupeConfig);
    
    // Find the John Doe record (should be the last one with those values)
    const johnDoe = result.find(r => 
      r.firstName.value === "John" && r.lastName.value === "Doe"
    );
    
    expect(johnDoe).toBeDefined();
    // Should keep the second John Doe record with phone and department
    expect(johnDoe?.phone.value).toBe("555-1234");
    expect(johnDoe?.department.value).toBe("Sales");
    // Should not have fields from the first John Doe record
    expect(johnDoe?.email).toBeUndefined();
    expect(johnDoe?.age).toBeUndefined();
  });
}); 