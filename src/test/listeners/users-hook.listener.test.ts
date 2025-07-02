import { FlatfileRecord } from "@flatfile/hooks";

// Setup mocks before imports
let hookCallback: Function;
jest.mock('@flatfile/plugin-record-hook', () => ({
  bulkRecordHook: (_sheetSlug: string, callback: Function) => {
    hookCallback = callback;
    return callback;
  }
}));

// Import after mocks
import { usersHook } from "../../listeners/users-hook.listener";

// Initialize the hook to capture the callback
usersHook;

describe("usersHook", () => {
  let mockRecord: jest.Mocked<FlatfileRecord>;

  beforeEach(() => {
    mockRecord = {
      get: jest.fn(),
      set: jest.fn(),
      toJSON: jest.fn(),
      getValue: jest.fn(),
      cast: jest.fn(),
      validate: jest.fn(),
      addError: jest.fn(),
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      getLinks: jest.fn(),
      setLinks: jest.fn(),
    } as unknown as jest.Mocked<FlatfileRecord>;
  });

  it("should capitalize the first letter of a name", async () => {
    mockRecord.get.mockReturnValue("jevon");
    
    await hookCallback([mockRecord]);
    
    expect(mockRecord.set).toHaveBeenCalledWith("name", "Jevon");
  });

  it("should not modify an already properly capitalized name", async () => {
    mockRecord.get.mockReturnValue("Jevon");
    
    await hookCallback([mockRecord]);
    
    expect(mockRecord.set).not.toHaveBeenCalled();
  });

  it("should handle empty strings", async () => {
    mockRecord.get.mockReturnValue("");
    
    await hookCallback([mockRecord]);
    
    expect(mockRecord.set).not.toHaveBeenCalled();
  });

  it("should preserve case of remaining letters", async () => {
    mockRecord.get.mockReturnValue("jevoN");
    
    await hookCallback([mockRecord]);
    
    expect(mockRecord.set).toHaveBeenCalledWith("name", "JevoN");
  });

  it("should handle single letter names", async () => {
    mockRecord.get.mockReturnValue("j");
    
    await hookCallback([mockRecord]);
    
    expect(mockRecord.set).toHaveBeenCalledWith("name", "J");
  });
}); 