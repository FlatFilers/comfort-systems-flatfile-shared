# Flatfile SmartyStreets Plugin

Validate US addresses within your Flatfile data onboarding flow using the SmartyStreets API. This plugin provides robust address validation, optional data transformation based on validation results, and metadata caching to minimize API calls.

It also provides a standalone validator for implementating validation/transformation yourself.

## Features

- **Address Validation:** Verifies addresses against the SmartyStreets US Street Address API.
- **Two-Stage Validation:** Includes an optional local pre-validation step using `libaddress-validator` to catch basic errors before calling the SmartyStreets API, potentially saving costs.
- **Flexible Configuration:** Supports mapping individual address fields (street, city, state, zip, street_secondary) or using a single field containing the full address.
- **Enhanced Validation Logic:** Leverages SmartyStreets' enhanced match and footnotes to provide more accurate validation, especially for secondary address (apartment, suite) validation.
- **Data Transformation:** Optionally updates record fields with the validated and standardized address components returned by SmartyStreets.
- **Secondary Address Support:** Properly handles apartment/suite information with dedicated field support and enhanced validation.
- **Intelligent Caching:** Avoids redundant API calls by storing validated address components in record metadata. Re-validation only occurs if relevant address fields change.
- **Configurable Error Handling:** Choose whether validation failures add errors, warnings, or info messages to records.
- **Informational Footnotes:** Can display informational messages about standardizations made by SmartyStreets (e.g., "City name standardized").
- **Standalone Utility:** Includes an exported `validateAddress` function for use outside the standard Flatfile listener flow.

## Dependencies

This plugin relies on the following external libraries:

- `axios`: For making HTTP requests to the SmartyStreets API.
- `libaddress-validator`: For local pre-validation of US addresses (optional via `preprocess` option).
- `parse-address`: For parsing addresses provided in a single string field.

Ensure these are available in your project environment.

## Configuration

The plugin is configured by passing a configuration object to the `smartyStreets` function when registering it with your `FlatfileListener`.

### Example Project

A full example implementation using this plugin can be found in:

[src/demos-new/smarty-streets-example](https://github.com/FlatFilers/Demos/tree/main/src/demos-new/smarty-streets-example)


This example demonstrates how to configure and use the plugin in a real Flatfile listener. It contains sample sheets and files for a full end-to-end test.

### Authentication

SmartyStreets requires authentication credentials (Auth ID and Auth Token).
1. Sign up for a trial account at [smarty.com](https://www.smarty.com/), which comes with 1,000 free lookups
2. Make sure that you have "US Address Verification" added under "Subscriptions"
3. Grab these values from "API Keys" → "Secret Keys".

You **must** provide these either:

1.  **Via Environment Variables:**
    - `SMARTY_AUTH_ID`
    - `SMARTY_AUTH_TOKEN`
2.  **Via Plugin Options:**
    - Pass `authId` and `authToken` within the `options` object in the configuration.

Credentials passed via the `options` object take precedence over environment variables.

### Configuration Types

There are two main configuration types, depending on how your address data is structured:

1.  **`FieldsConfig`**: Use this when address components are in separate fields.

    ```typescript
    import { smartyStreets, FieldsConfig } from "@flatfile/plugin-smarty-streets"; // Adjust import path if needed

    const config: FieldsConfig = {
      sheetSlug: "contacts", // Slug of the sheet to apply validation to
      fields: {
        street: "address_street", // Key of the street field in your sheet
        street_secondary: "address_apt", // Key of the apartment/suite field
        city: "address_city",
        state: "address_state",
        zip: "address_zip",
      },
      options: {
        // Auth ID/Token can go here if not using environment variables
        // authId: "YOUR_SMARTY_AUTH_ID",
        // authToken: "YOUR_SMARTY_AUTH_TOKEN",
        transform: true, // Default: true
        includeZipPlus4: true, // Default: false
        addFootnoteMessages: true, // Default: true
        // ... other options
      },
    };

    listener.use(smartyStreets(config));
    ```

2.  **`FullAddressConfig`**: Use this when the entire address is in a single field.

    ```typescript
    import { smartyStreets, FullAddressConfig } from "@flatfile/plugin-smarty-streets"; // Adjust import path if needed

    const config: FullAddressConfig = {
      sheetSlug: "locations",
      fullAddressField: "full_address", // Key of the field containing the full address
      options: {
        // ... auth options ...
        transform: true,
        // ... other options
      },
    };

    listener.use(smartyStreets(config));
    ```

### Configuration Options (`options`)

The optional `options` object allows fine-tuning the plugin's behavior:

| Option                  | Type                          | Default     | Description                                                                                                                                |
| :---------------------- | :---------------------------- | :---------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `authId`                | `string`                      | `undefined` | Your SmartyStreets Auth ID. Overrides `SMARTY_AUTH_ID` env var. **Required** if env var not set.                                           |
| `authToken`             | `string`                      | `undefined` | Your SmartyStreets Auth Token. Overrides `SMARTY_AUTH_TOKEN` env var. **Required** if env var not set.                                     |
| `validateDeliveryPoint` | `boolean`                     | `false`     | If true, requests higher precision validation from SmartyStreets (sets `candidates=1`).                                                    |
| `transform`             | `boolean`                     | `true`      | If true, updates the record's address fields with the validated data from SmartyStreets upon successful validation.                        |
| `includeZipPlus4`       | `boolean`                     | `false`     | If true and `transform` is true, formats the zip code field as `ZIP-PLUS4` if available from SmartyStreets.                                |
| `includeRDI`            | `boolean`                     | `false`     | If true and `transform` is true, adds the Residential Delivery Indicator (RDI) as an info message to the _state_ field.                    |
| `messageLevel`          | `'error' \| 'warn' \| 'info'` | `'error'`   | The message level used for validation _failures_ (local or SmartyStreets).                                                                 |
| `preprocess`            | `boolean`                     | `true`      | If true, performs local validation using `libaddress-validator` before calling SmartyStreets. Set to `false` to always call SmartyStreets. |
| `batchSize`             | `number`                      | `100`       | Maximum number of records to send to SmartyStreets in a single API request (max 100). |
| `addFootnoteMessages`   | `boolean`                     | `true`      | If true, adds informational messages about standardizations made by SmartyStreets (e.g., "Street spelling corrected").                     |

### Local Pre-validation (`preprocess` Option)

The `preprocess` option (default `true`) enables a local validation step using state standardization and `libaddress-validator` checks before calling the SmartyStreets API.

If `preprocess: true`:
- Addresses are first validated locally to check for basic formatting and completeness
- Addresses that fail local validation are **not** sent to the SmartyStreets API
- This saves API calls for addresses that would clearly fail validation
- Detailed validation messages from the local validator help identify specific issues

If `preprocess: false`:
- The local validation step is **skipped**
- All addresses with sufficient data are sent directly to the SmartyStreets API
- This may be useful if you *only* trust SmartyStreets' validation 
- However, this will result in higher API usage and costs

This applies to both the main plugin hook and the standalone `validateAddress` function.

> **Note:** The local preprocessing primarily validates state abbreviations/names and uses `libaddress-validator` for field validation. It does **not** perform any address transformation or correction – only validation.

### Secondary Address Handling

The plugin supports secondary address information (e.g., apartment numbers, suite numbers) in two ways:

1. **Separate field:** Use the `street_secondary` field in your configuration to map a dedicated field for apartment/suite information.
2. **Combined with street:** If using a single street field or the full address field approach, secondary address information can be included as part of that field.

The plugin uses SmartyStreets' analysis data to properly validate secondary address information (e.g., `enhanced_match` values like `missing-secondary`, `unknown-secondary`, and relevant `footnotes`). If SmartyStreets identifies an issue *only* with the secondary address (required but missing, or invalid format), the plugin will now:

* Still consider the primary address components (street, city, state, zip) successfully validated if SmartyStreets confirmed them.
* Apply transformations (if `transform: true`) or validation messages to these primary components based on the SmartyStreets response.
* Add a specific error or warning message (based on your `messageLevel` setting) to the configured secondary address field (or the primary street field as a fallback) indicating the nature of the secondary address issue.

This means a secondary address problem alone will no longer prevent the validation or transformation of the main address parts.

### Transformation Details

When `transform: true` is enabled (the default), the plugin will automatically update address fields with validated and standardized components from SmartyStreets API:

1. **For FieldsConfig (separate address fields):**
   - Primary street information derived exclusively from API component fields (not delivery_line_1) is mapped to the `street` field
   - Secondary address information derived from API components is mapped to the `street_secondary` field
   - City, state, and ZIP information is standardized to USPS format
   - There is clear separation between primary and secondary address components with no duplication

2. **For FullAddressConfig (single full address field):**
   - The field is updated with a properly formatted full address reconstructed from API components
   - All components are properly formatted and standardized according to USPS conventions

### Enhanced Validation with Footnotes

The plugin uses SmartyStreets' `analysis` data, including the `enhanced_match` field, `footnotes`, and overall `status`, to provide more accurate validation:

1. **Critical Footnotes:** Identifies critical issues that indicate validation failure, even when a delivery line is returned (e.g., address not found, multiple addresses detected). Checks for critical footnotes (e.g., 'C#', 'D#', 'F#', 'I#', 'J#', 'T#', 'W#') which indicate definitive validation failures even if some address components were matched.
2. **Secondary Footnotes:** Detects missing or invalid secondary address information
3. **Informational Footnotes:** When address components are standardized or corrected

When SmartyStreets standardizes or corrects parts of an address, it returns "footnotes" indicating what changes were made. With `addFootnoteMessages: true` (the default), the plugin will add these as informational messages to the relevant fields, helping users understand how their address was standardized.

Examples of informational footnotes include:
- "City name standardized to official USPS name"
- "Street spelling corrected by SmartyStreets"
- "ZIP Code corrected by SmartyStreets"

You can disable these messages by setting `addFootnoteMessages: false` in your options.

## Usage Example

```typescript
import { FlatfileListener } from "@flatfile/listener";
import { smartyStreets } from "@flatfile/plugin-smarty-streets"; // Adjust import path if needed

const listener = FlatfileListener.create((client) => {
  // Register the plugin
  listener.use(
    smartyStreets({
      sheetSlug: "contacts",
      fields: {
        street: "street",
        street_secondary: "apartment", // Optional dedicated field for secondary address
        city: "city",
        state: "state",
        zip: "zip",
      },
      options: {
        // Ensure credentials are set via env vars or add them here
        transform: true,
        includeZipPlus4: true,
        messageLevel: "warn",
        preprocess: true,
        addFootnoteMessages: true, // Add informational messages about standardizations
      },
    }),
  );

  // ... other listener configurations
});
```

## Caching Behavior

To optimize performance and reduce API calls, the plugin implements a caching mechanism using Flatfile record metadata.

1.  When an address is successfully validated by SmartyStreets (`smarty-success`), the _original input values_ of the address fields used for that validation are stored in the record's metadata under the key `__smartyStreetsValidatedFields`. A subkey based on the specific fields involved is used to support multiple addresses per sheet/record if configured differently.
2.  Before attempting validation on a record, the plugin compares the current values in the address fields to the values stored in the metadata from the last successful validation for those specific fields.
3.  If the current values **match** the last successfully validated values, the validation process (local and remote) is skipped for that record in the current hook execution.
4.  If the values **do not match**, or if there's no previous successful validation stored, the validation proceeds as normal.

This ensures that addresses are only re-validated if their input data has actually changed.

## Standalone Validation Function (`validateAddress`)

The plugin also exports a standalone async function `validateAddress` for validating US addresses outside the listener context.

```typescript
import { validateAddress, AddressInput, SmartyStreetsOptions } from "@flatfile/plugin-smarty-streets"; // Adjust import path if needed

async function checkAddress(address: string | AddressInput) {
  const options: SmartyStreetsOptions = {
    // Provide authId and authToken via options or ensure env vars are set
    authId: "YOUR_ID",
    authToken: "YOUR_TOKEN",
    preprocess: true, // Optional: enable local pre-validation
  };

  const result = await validateAddress(address, options);

  if (result.valid) {
    console.log("Address is valid.");
    if (result.transformation && Object.keys(result.transformation).length > 0) {
      console.log("Suggested transformation:", result.transformation);
    }
  } else {
    console.error(`Address is invalid: ${result.message}`);
    if (result.invalidFields) {
      console.error("Invalid fields:", result.invalidFields);
    }
    if (result.suggestedFixes) {
      console.error("Suggested fixes:", result.suggestedFixes);
    }
  }
}

checkAddress("123 Main St, Anytown, CA 90210");
checkAddress({ street: "456 Oak Ave", city: "Centerville", state: "OH", zip: "45459" });
```

**Return Types for `validateAddress`:**

- `{ valid: true; original: AddressInput }`: The address is valid and matches the SmartyStreets result. The `original` property contains the original input address.
- `{ valid: true; transformation: string | Partial<AddressInput>; original: AddressInput }`: The address is valid, but SmartyStreets returned standardized components that differ from the input. The `transformation` object contains the suggested changes (either a formatted string if the input was a string, or a partial AddressInput object otherwise).
- `{ valid: false; invalidFields?: string[]; message: string; suggestedFixes?: Record<string, string> }`: The address is invalid (either by local validation or SmartyStreets). `message` contains the reason, `invalidFields` (if applicable) lists fields causing local failure, and `suggestedFixes` provides detailed field-specific suggestions for fixing validation issues. The `suggestedFixes` object keys match field names, with special keys like 'general' and 'details' for more context.

### Performance Note: Bulk Validation vs. Standalone Lookup

When you use the plugin via `listener.use(smartyStreets(...))`, it leverages Flatfile's `bulkRecordHook` and the SmartyStreets bulk validation API endpoint. This is significantly more performant for validating many addresses at once compared to calling the standalone `validateAddress` function in a loop, which performs individual lookups.

> **Note:** Even when using bulk validation, each address validated still counts against your SmartyStreets usage/license limits.

### API Costs Note

SmartyStreets API lookups count against your subscription plan limits and may incur costs based on your plan type and usage volume:

- Using `preprocess: true` (default) helps minimize API usage by filtering out obviously invalid addresses using local validation before submitting to SmartyStreets
- Using `preprocess: false` increases the number of API calls by sending all addresses with data directly to SmartyStreets
- The plugin's caching mechanism avoids redundant API calls for previously validated addresses

Consider these factors when configuring the plugin, especially for high-volume implementations.
