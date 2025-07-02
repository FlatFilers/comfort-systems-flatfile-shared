# Auto Transform Utility

## Overview
The auto Transform utility provides a flexible way to automatically apply transformations to data fields in Flatfile sheets. It supports both synchronous and asynchronous transformation functions, with progress tracking and snapshot creation after each transformation.

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Basic Usage](#basic-usage)
- [Configuration](#configuration)
  - [Parameters](#parameters)
  - [Transform Functions](#transform-functions)
- [Features](#features)
  - [Progress Tracking](#progress-tracking)
  - [Snapshots](#snapshots)
  - [Job Modes](#job-modes)
- [Examples](#examples)

## Getting Started

### Installation
Import the auto transform utility in your project:

```typescript
import { autoTransform } from "../../support/utils/demo/auto-transform";
```

### Basic Usage
Add the transform utility to your Flatfile listener:

```typescript
listener.use(autoTransform({
  sheetSlug: "sheet-1",
  transformFunctions: [
    {
      functionName: "Update Field",
      fieldName: "field_name",
      callbackFunction: (record) => record.values["field_name"].value.toUpperCase()
    }
  ]
}));
```

## Configuration

### Parameters
- `sheetSlug`: The slug of the sheet to transform
- `jobMode`: "foreground" or "background" (default: "foreground")
- `jobAckInfo`: Custom message when job starts
- `jobUpdateInfoPrefix`: Custom prefix for progress messages
- `jobUpdateInfoSuffix`: Custom suffix for progress messages
- `jobCompleteInfo`: Custom completion message
- `snapshotLabelPrefix`: Custom prefix for snapshot labels

### Transform Functions
Each transform function requires:
- `functionName`: Name of the transformation
- `fieldName`: Field to transform
- `callbackFunction`: Function to execute the transformation

## Features

### Progress Tracking
- Automatic progress calculation based on number of transforms
- Progress updates after each transformation
- Custom progress messages

### Snapshots
- Creates snapshots after each transformation
- Snapshots labeled with transformation name
- Useful for tracking changes and debugging

### Job Modes
- Foreground: Interactive transformations
- Background: Non-blocking transformations

## Examples

### Basic Field Transformation
```typescript
listener.use(autoTransform({
  sheetSlug: "sheet-1",
  transformFunctions: [
    {
      functionName: "Capitalize Names",
      fieldName: "first_name",
      callbackFunction: (record) => record.values["first_name"].value.toUpperCase()
    }
  ]
}));
```

### Multiple Transformations
```typescript
listener.use(autoTransform({
  sheetSlug: "sheet-1",
  transformFunctions: [
    {
      functionName: "Format Name",
      fieldName: "first_name",
      callbackFunction: (record) => StringValidator.format(record, "first_name", { case: "title" })
    },
    {
      functionName: "Format Date",
      fieldName: "dob",
      callbackFunction: (record) => DateValidator.format(record, "dob", "MM/DD/YYYY")
    }
  ]
}));
```

### Async Transformation
```typescript
listener.use(autoTransform({
  sheetSlug: "sheet-1",
  transformFunctions: [
    {
      functionName: "Validate Address",
      fieldName: "address",
      callbackFunction: async (record) => {
        const response = await validateAddress(record.get("address"));
        return response.formattedAddress;
      }
    }
  ]
}));
```
