# Tabulate Plugin

This Flatfile plugin analylzes every sheet in a designated source workbook, allowing you to extract, calculate, and consolidate information into a unified "Tabulations" report, presented in a new Flatfile Workbook and Sheet. You can use its default settings for a quick set of standard metrics (valid/invalid counts per sheet) or leverage its powerful custom mode to define precisely how data is processed and how your final summary sheet is structured.

**Default Metrics**
<img width="1521" alt="image" src="https://github.com/user-attachments/assets/07b9b185-4608-4b63-b5d1-d6e0f5d2f766" />

**Custom Metrics**
<img width="1323" alt="image" src="https://github.com/user-attachments/assets/ce79cb8c-7213-4dfe-935a-8702b0f63b8b" />

Concept and code extracted from [@syshinnn](https://github.com/syshinnn)'s [Reveleer Demo](https://github.com/FlatFilers/Demos/tree/main/src/demos-new/reveleer) and rebuilt as a standalone plugin.

## Overview

This plugin offers two primary modes for data quality monitoring and analysis:

### Custom Mode (Flexible & Extensible)

- Define your own sheet structure for results, allowing for complete control over the output.
- Implement custom processing logic to calculate specialized metrics tailored to your business needs.
- Track business-specific calculations, validations, and transformations.
- Analyze data precisely according to your requirements, offering maximum flexibility for advanced use cases.

### Default Mode (Quick Start & Basic Metrics)

- Tracks basic validation status (valid/invalid) of records across sheets.
- Creates a separate "Scores" workbook with key metrics:
  - Valid row counts and percentages
  - Invalid row counts and percentages
  - Historical data with timestamps for trend analysis
- Provides a straightforward way to get started and understand the plugin's core mechanism with pre-defined metrics.
- Adds a "Tabulate" action button for on-demand reports.

The plugin adds a "Tabulate" action button to the source workbook, allowing users to generate quality reports on demand.

## Usage

Import and add the plugin to your Flatfile listener:

```typescript
import { tabulate } from "../../support/plugins/tabulate";

// [ ... ]

listener.use(
  tabulate({
    sourceWorkbookName: "Customer Data", // This basic setup uses the Default Mode
  }),
);

// ... re-instantiate the plugin to handle multiple workbooks
```

The example above shows the simplest setup, which utilizes the Default Mode. For more tailored metrics and output structures, you can leverage the **Custom Mode** detailed in the configuration and examples below.

## Configuration

### Example Project

A full example implementation using this plugin, showcasing both Custom and Default modes, can be found in:

[src/demos-new/tabulate-example](https://github.com/FlatFilers/Demos/tree/main/src/demos-new/tabulate-example)

This example demonstrates how to configure and use the Tabulate plugin in a real Flatfile listener. It contains sample sheets and files for a full end-to-end test.

### Configuration Options

The plugin accepts the following configuration options:

| Option                       | Type                    | Default        | Description                                                                                                                                          |
| ---------------------------- | ----------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceWorkbookName`         | string                  | _required_     | Name of the workbook to analyze for data quality metrics                                                                                             |
| `watch`                      | boolean                 | `false`        | If `true`, automatically triggers score recalculation when data in the source workbook changes. Uses a locking mechanism to prevent concurrent runs. |
| `debug`                      | boolean                 | `false`        | Enable detailed logging for troubleshooting.                                                                                                         |
| `action`                     | object                  | `{..defaults}` | Customize the action button appearance and behavior                                                                                                  |
| `showCalculationsOnComplete` | boolean                 | `true`         | Show a link to the quality scores sheet after manual action completion                                                                               |
| `targetSheetBlueprint`       | Flatfile.SheetConfig    | _see note_     | For **Custom Mode**: Blueprint for the target sheet structure                                                                                        |
| `sheetsProcessor`            | SheetsProcessorFunction | _see note_     | For **Custom Mode**: Function to process source sheets and generate records                                                                          |

**Note**: To enable **Custom Mode**, `targetSheetBlueprint` and `sheetsProcessor` options must be provided together. When provided, the plugin uses your custom data processing logic. If these options are omitted, the plugin operates in **Default Mode**, using its standard quality score calculation.

### Action Configuration

| Option        | Type                         | Default                                         | Description                                                     |
| ------------- | ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `confirm`     | boolean                      | `true`                                          | Show a confirmation dialog before running                       |
| `mode`        | "foreground" \| "background" | "foreground"                                    | Whether the action runs in foreground (blocks UI) or background |
| `label`       | string                       | "Tabulate"                                      | Display text for the action button                              |
| `description` | string                       | "Create Calculations Workbook with source data" | Tooltip text                                                    |
| `primary`     | boolean                      | `true`                                          | Whether this is a primary action (affects styling)              |

### Custom Processing Configuration

For fine-grained control over metrics and output, you can configure custom processing by implementing both:

1. `targetSheetBlueprint`: A Flatfile sheet configuration object that defines the structure of your result sheet.
2. `sheetsProcessor`: A function with this signature:

```typescript
type SheetsProcessorFunction = (
  sourceSheets: Flatfile.Sheet[],
  config: TabulateConfig,
) => Promise<Flatfile.RecordData[]>;
```

This function receives all source sheets and should return records formatted according to your custom blueprint. This approach provides the most flexibility for specialized data analysis.

## How It Works

1.  **Setup**: When initialized, the plugin registers event listeners for workbook creation, job execution, and optionally, data commits.
2.  **Action Creation**: When a workbook with the specified name is created, the plugin adds a "Tabulate" action button (if `action` is not disabled).
3.  **Target Sheet Creation**: The plugin:
    - Creates or finds a "Tabulations" workbook.
    - Uses either the custom sheet blueprint (if `targetSheetBlueprint` is provided) or the default data quality scores sheet blueprint.
    - Creates the target sheet if it doesn't already exist.
4.  **Data Processing**: When a calculation is triggered (manually or automatically), the plugin:
    - Determines whether to use the custom processor (if `sheetsProcessor` and `targetSheetBlueprint` are configured) or the default processor.
    - Custom processor: Uses the user-provided `sheetsProcessor` function to generate results, ideal for tailored metrics.
    - Default processor: Calculates basic quality metrics based on valid/invalid record counts, useful for standard scenarios or as a starting point.
    - Stores the results in the target sheet with timestamps for historical tracking.
5.  **Automatic Calculation (Watch Mode)**: If `watch: true` is configured:
    - When data is committed (saved) to the `sourceWorkbookName`, the plugin detects the change via the `commit:created` event listener.
    - The listener checks if the target score sheet is already locked by calling `isSheetLocked`. This uses sheet metadata and checks for a valid, non-expired lock entry (`tabulateLock`).
    - If the sheet is found to be locked, the listener logs this and skips creating a calculation job for this commit to prevent overlap.
    - If the sheet is not locked, the listener creates a background job via `api.jobs.create` to handle the calculation. It passes the `targetSheetId` in the job's metadata.
    - When the background job is ready (`job:ready` event), it attempts to definitively acquire the lock using `acquireSheetMetadataLock`. This involves:
      - Fetching the current sheet metadata.
      - Checking if an _active_ (non-expired) lock already exists. If so, the job cancels itself.
      - If no active lock exists, it prepares a new lock entry (with the job's unique ID and a TTL, currently 3 seconds).
      - It attempts to update the sheet's metadata with the new lock entry using `api.sheets.updateSheet`. This update operation acts as the atomic check; if it succeeds, the lock is acquired.
    - If the `updateSheet` call fails (e.g., due to a concurrent update by another process that acquired the lock between the pre-check and this attempt), the job **cancels** itself via `api.jobs.cancel`, assuming lock acquisition failed.
    - If the job successfully acquires the lock, it proceeds to clear existing records from the target sheet and then performs the data processing steps.
    - The lock is automatically released (the specific `tabulateLock` metadata key is removed, preserving other metadata) in the job's `finally` block by calling `releaseSheetMetadataLock`, ensuring cleanup even if the job fails after acquiring the lock.
6.  **Result**: A dedicated workbook containing metrics for all sheets in the source workbook. The content and structure are determined by your configuration:
    - **Custom Mode**: Metrics defined by your `targetSheetBlueprint` and populated by `sheetsProcessor`.
    - **Default Mode**: Standard quality metrics (valid/invalid counts and percentages).
      This provides an at-a-glance assessment, updated either manually or automatically.

## Examples

### Example: Custom Processing

This example demonstrates using the Tabulate plugin with a custom processor and sheet blueprint, allowing for full control over the metrics and output structure. This is ideal when you need specific calculations or a unique output format.

```typescript
import { FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { tabulate } from "../../support/plugins/tabulate";

// Define a custom sheet blueprint
const customSheetBlueprint: Flatfile.SheetConfig = {
  name: "Custom Metrics",
  slug: "custom-metrics",
  fields: [
    {
      key: "sheet_name",
      type: "string",
      label: "Sheet Name",
    },
    {
      key: "record_count",
      type: "number",
      label: "Total Records",
    },
    {
      key: "field_count",
      type: "number",
      label: "Field Count",
    },
    {
      key: "avg_field_length",
      type: "string",
      label: "Avg Field Length",
    },
    {
      key: "updated_at",
      type: "string",
      label: "Last Updated",
    },
  ],
};

// Define a custom processor function
const customSheetsProcessor = async (
  sourceSheets: Flatfile.Sheet[],
  config: TabulateConfig, // config is passed here
): Promise<Flatfile.RecordData[]> => {
  const results: Flatfile.RecordData[] = [];
  const timestamp = new Date().toISOString();

  for (const sheet of sourceSheets) {
    // Example: Get records for analysis using Flatfile API
    const { data: recordsResponse } = await api.records.get(sheet.id);
    const records = recordsResponse.records || [];

    // Skip empty sheets
    if (records.length === 0) continue;

    // Calculate metrics
    let totalFieldLength = 0;
    let fieldCount = 0;

    records.forEach((record) => {
      const values = record.values || {};
      Object.keys(values).forEach((key) => {
        const value = values[key]?.value;
        if (typeof value === "string") {
          totalFieldLength += value.length;
          fieldCount++;
        }
      });
    });

    // Calculate averages
    const avgFieldLength = fieldCount > 0 ? (totalFieldLength / fieldCount).toFixed(2) : "0";

    // Add to results
    results.push({
      sheet_name: { value: sheet.name },
      record_count: { value: records.length },
      field_count: { value: fieldCount },
      avg_field_length: { value: avgFieldLength },
      updated_at: { value: timestamp },
    });
  }

  return results;
};

export default function (listener: FlatfileListener) {
  // Use the custom processor
  listener.use(
    tabulate({
      sourceWorkbookName: "Customer Data",
      debug: true,
      watch: true,
      // Custom processor configuration
      targetSheetBlueprint: customSheetBlueprint,
      sheetsProcessor: customSheetsProcessor,
      // Action configuration
      action: {
        label: "Generate Custom Metrics",
        description: "Analyze sheets with our custom metrics",
      },
    }),
  );
}
```

### Example: Default Behavior

This example shows the plugin using its default behavior (no custom blueprint or processor provided). This is useful for quick setup or when the standard data quality metrics meet your needs.

```typescript
import { tabulate } from "../../support/plugins/tabulate";

// ...
export default function (listener: FlatfileListener) {
  listener.use(
    tabulate({
      sourceWorkbookName: "Supplier Onboarding", // No custom blueprint or processor provided
      debug: false,
      watch: true,
      action: {
        label: "Generate Quality Report Now",
        description: "Calculate data quality metrics for all sheets immediately",
        confirm: true,
        primary: false,
        mode: "foreground",
      },
      showCalculationsOnComplete: true, // Link user to results after a manual run
    }),
  );
}
```

## Output

The plugin creates a "Tabulations" workbook. Inside this workbook, it generates a sheet typically named after the `sourceWorkbookName` (or as defined in a custom blueprint). The structure and content of this sheet depend on the configuration:

- **Custom Mode:** Contains the fields defined in your custom `targetSheetBlueprint` and populated by your custom `sheetsProcessor` function. This allows for fully tailored output.
- **Default Mode:** Contains the following basic metrics for each source sheet:
  - **Sheet Name**: Name of the analyzed sheet
  - **Valid Rows #**: Count of rows that pass validation
  - **Valid Rows %**: Percentage of rows that pass validation
  - **Invalid Rows #**: Count of rows with validation errors
  - **Invalid Rows %**: Percentage of rows with validation errors
  - **Timestamp**: When the analysis was performed (ISO format)

This data can be used to track data quality or custom metrics over time and identify problematic sheets.
