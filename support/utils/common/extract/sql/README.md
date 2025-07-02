# SQL Extract Utility

## Overview
The SQL Extract utility provides functionality to extract and parse SQL files (`.sql` and `.bak` files) into Flatfile workbooks. It supports two main file types:
- `.sql` dump files containing CREATE TABLE and INSERT statements
- `.bak` backup files that are converted to CSV format

## Table of Contents
- [Getting Started](#getting-started)
  - [Basic Usage](#basic-usage)

- [Features](#features)
  - [SQL Dump (.sql) Processing](#sql-dump-sql-processing)
  - [SQL Backup (.bak) Processing](#sql-backup-bak-processing)

- [Processing Flow](#processing-flow)
  - [SQL Dump Files (.sql)](#sql-dump-files-sql)
  - [Backup Files (.bak)](#backup-files-bak)

- [Output Format](#output-format)
- [Error Handling](#error-handling)
- [Limitations](#limitations)

## Getting Started

### Basic Usage
Add the SQL Extractor to your Flatfile listener:

```typescript
import { SQLExtractor } from "../../support/utils/common/extract/sql";

export default function (listener: FlatfileListener) {
  // Configure the extractor to handle .sql and .bak files
  listener.use(SQLExtractor('.sql'))
  listener.use(SQLExtractor('.bak'))
}
```

## Features

### SQL Dump (.sql) Processing
- Parses CREATE TABLE statements to determine structure
- Extracts column names and data types
- Processes INSERT statements to populate data
- Handles multiple tables in a single dump file
- Filters out non-data SQL statements (keys, constraints, etc.)

### SQL Backup (.bak) Processing
- Converts .bak files to CSV format using RebaseData API
- Extracts table structures and data
- Maintains table relationships
- Handles multiple tables in backup files

## Processing Flow

### SQL Dump Files (.sql)
1. File is read and split into individual SQL statements
2. CREATE TABLE statements are parsed to:
   - Extract table names
   - Determine column structure
   - Filter out constraints and keys
3. INSERT statements are processed to:
   - Match data with correct tables
   - Parse value sets
   - Map values to correct columns

### Backup Files (.bak)
1. File is sent to RebaseData API for conversion
2. Resulting ZIP containing CSVs is processed
3. Each CSV is parsed into a separate table in the workbook
4. Column headers and data are extracted and formatted

## Output Format
The extractor creates a workbook capture with the following structure:
```typescript
{
  [tableName: string]: {
    headers: string[],          // Column names
    data: Record<string, any>[], // Row data
    metadata: {
      rowHeaders: string[]
    }
  }
}
```

## Error Handling
- Robust error handling for malformed SQL statements
- Validation of table and column structures
- Error reporting for conversion failures
- Network error handling for .bak conversion

## Limitations
- SQL dumps must follow standard CREATE TABLE and INSERT INTO syntax
- .bak files require internet connection for conversion
- Large files may require additional processing time
- Some SQL features (stored procedures, views, etc.) are ignored
