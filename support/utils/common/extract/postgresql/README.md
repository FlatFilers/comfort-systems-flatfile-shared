# PostgreSQL Extract Utility

## Overview
The PostgreSQL Extract utility provides functionality to extract and parse PostgreSQL dump files (`.sql`) into Flatfile workbooks. It specifically handles PostgreSQL COPY format data blocks, making it efficient for large datasets.

## Table of Contents
- [Getting Started](#getting-started)
  - [Basic Usage](#basic-usage)
- [Features](#features)
- [Processing Flow](#processing-flow)
- [Output Format](#output-format)
- [Error Handling](#error-handling)
- [Limitations](#limitations)

## Getting Started

### Basic Usage
Add the PostgreSQL Extractor to your Flatfile listener:

```typescript
import { PostgreSQLExtractor } from "../../support/utils/common/extract/postgresql";

export default function (listener: FlatfileListener) {
  // Configure the extractor to handle .sql files
  listener.use(PostgreSQLExtractor('.sql'))
}
```

## Features

- Parses PostgreSQL dump files in COPY format
- Automatically handles column names and data types
- Supports multiple tables in a single dump file
- Handles escaped characters and NULL values
- Maintains data integrity during extraction
- Automatically handles duplicate column names
- Processes large datasets efficiently
- Supports table name filtering with wildcard patterns

## Table Name Filtering

The PostgreSQL Extractor supports filtering tables by name using wildcard patterns:

```typescript
// Filter tables using wildcard patterns
listener.use(PostgreSQLExtractor('.sql', ["*Users*", "Products"]))
```

### Wildcard Pattern Matching

The filter supports wildcard patterns with the following behavior:

- `*` matches any sequence of characters (including none)
- `?` matches any single character
- Matching is case-insensitive

#### Examples:

| Pattern | Will Match | Won't Match |
|---------|------------|-------------|
| `*Users*` | "All Users", "Users", "Users Input" | "Customer" |
| `Users` | "Users", "users" | "All Users", "Users Input" |
| `Product?` | "Product1", "ProductA" | "Products", "Product" |
| `*_data` | "user_data", "product_data" | "data", "userdata" |

### Usage Notes

- Provide an array of patterns to filter multiple tables
- If no filter is provided, all tables will be extracted
- To exclude specific tables, use the filter to only include the tables you want

## Processing Flow

1. File is read and parsed as UTF-8 text
2. Data blocks are identified using regex pattern matching
3. For each data block:
   - Table name is extracted
   - Column headers are parsed from COPY statement
   - Data rows are processed line by line
   - Special characters and escapes are handled
   - NULL values are properly managed
4. Data is organized into a structured workbook format

## Output Format
The extractor creates a workbook capture with the following structure:
```typescript
{
  [tableName: string]: {
    headers: string[],           // Column names
    data: Record<string, any>[], // Row data with values
    metadata: {
      rowHeaders: string[]
    }
  }
}
```

## Error Handling
- Robust error handling for malformed dump files
- Validation of table structures
- Proper handling of special PostgreSQL COPY format characters
- Detailed error reporting for debugging

## Limitations
- Only supports PostgreSQL dump files in COPY format
- Requires .sql file extension
- Does not process other PostgreSQL dump file elements (like schema definitions, indexes, etc.)
- Focuses solely on data extraction from COPY blocks
