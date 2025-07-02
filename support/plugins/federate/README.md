# Flatfile Federate Plugin

The Federate Plugin for Flatfile allows you to create specialized views of data from a source workbook. It supports multiple federation patterns to transform and organize data according to your specific needs.

![AllDataFederateExampleSpace-9April2025-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/998e7bb5-8b96-48e5-86cf-9dea11bd1498)

## Table of Contents

- [Flatfile Federate Plugin](#flatfile-federate-plugin)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Blueprint Types](#blueprint-types)
    - [`FederatedWorkbookConfig`](#federatedworkbookconfig)
    - [Sheet Types](#sheet-types)
      - [`FederatedSheetConfig`](#federatedsheetconfig)
      - [`FederatedUnpivotSheetConfig`](#federatedunpivotsheetconfig)
    - [`FederatedProperty`](#federatedproperty)
  - [Federation Patterns](#federation-patterns)
    - [1. Standard Federation](#1-standard-federation)
    - [2. Unpivot Federation](#2-unpivot-federation)
  - [Configuration](#configuration)
    - [Plugin Configuration](#plugin-configuration)
      - [Required Parameters](#required-parameters)
      - [Optional Parameters](#optional-parameters)
    - [Federated Workbook Configuration](#federated-workbook-configuration)
    - [Federated Sheet Configuration](#federated-sheet-configuration)
      - [Standard Federation Configuration](#standard-federation-configuration)
        - [Using `federate_config`](#using-federate_config)
          - [Required Parameters](#required-parameters-1)
          - [Sheet Reference Options](#sheet-reference-options)
          - [Examples](#examples)
          - [Best Practices](#best-practices)
      - [Unpivot Sheet Configuration](#unpivot-sheet-configuration)
        - [Using `unpivot_groups`](#using-unpivot_groups)
          - [Required Parameters](#required-parameters-2)
          - [Field Mappings Structure](#field-mappings-structure)
          - [Examples](#examples-1)
          - [Best Practices](#best-practices-1)
      - [Source Sheet Reference Options](#source-sheet-reference-options)
        - [Field Validation Behavior](#field-validation-behavior)
      - [Dedupe Configuration](#dedupe-configuration)
        - [Basic Structure](#basic-structure)
        - [Parameters](#parameters)
        - [Examples](#examples-2)
          - [Simple dedupe Configuration](#simple-dedupe-configuration)
          - [Complex Dedupe Configuration](#complex-dedupe-configuration)
        - [Best Practices](#best-practices-2)
      - [Filter Configuration](#filter-configuration)
        - [Field Existence Filters](#field-existence-filters)
        - [Field Value Filters](#field-value-filters)
        - [Combining Filters](#combining-filters)
        - [Best Practices](#best-practices-3)
  - [Contributing](#contributing)
    - [Requirements](#requirements)
    - [Unit Tests](#unit-tests)
    - [Test Coverage](#test-coverage)
    - [Pull Request Process](#pull-request-process)

## Overview

The Federate Plugin enables you to:

- Create domain-specific views of data
- Apply specialized validation rules to different aspects of the data
- Organize related data into logical groupings
- Provide a more focused user experience for different data domains
- Create a populated workbook with a structure that matches customer egress expectations

To see a complete implementation of the Federate Plugin, check out the `federate-example` demo under `demos-new`. This demo showcases how to properly configure both standard and unpivot federation patterns, and demonstrates real-world use cases for transforming complex data structures. It includes sample data that helps illustrate the plugin's capabilities with realistic data scenarios.

## Blueprint Types

The Federate Plugin introduces a new structure of specialized blueprint types designed to facilitate various data transformation and organization patterns. Each level of federated blueprint maintains all capabilities of its upstream Flatfile versions, while adding/modifying some fields for Federate configuration.

Descriptions of these types are listed here but explained in more detail under [Federation Patterns](#federation-patterns)

### `FederatedWorkbookConfig`

_based on `Flatfile.CreateWorkbookConfig`_

- Modifies `sheets` to accept only the Federated Sheet types listed below

This blueprint type defines the structure of a federated workbook, which serves as a container for federated sheets. It enables you to create complete, domain-specific views of your data that match your egress requirements.

### Sheet Types

There are two new Federated Sheet types:

#### `FederatedSheetConfig`

_based on `Flatfile.SheetConfig`_

- Makes `slug` required
- Modifies `fields` to accept only the `FederatedProperty` type below
- Adds:
  - `dedupe_config`
  - `all_fields_required`
  - `any_fields_required`
  - `any_fields_excluded`
  - `field_values_required`
  - `field_values_excluded`

This blueprint type is used for standard federation patterns. It allows you to map fields directly from a source sheet to a target sheet and optionally filter records based on field values.

#### `FederatedUnpivotSheetConfig`

_based on `Flatfile.SheetConfig`_

- Adds `unpivot_groups`
- Note: `fields` in `FederatedUnpivotSheetConfig` expect the standard `Flatfile.Property` objects, as the configuration for unpivoting is all held in `unpivot_groups`

This specialized blueprint type supports the transformation of "wide" data formats into "long" formats, useful for normalizing data structures where related information is spread across multiple columns.

### `FederatedProperty`

_based on `Flatfile.Property`_

- adds `federate_config`

This blueprint type represents a field-level federation configuration that maps a field in a federated sheet to a field in a source sheet. It's used within field definitions to establish the connection between federated and source data.

## Federation Patterns

The plugin supports two main federation patterns:

### 1. Standard Federation

Standard federation provides direct field mapping from a source sheet to a target sheet. This is useful for creating specialized views of data or applying specific validation rules to a subset of fields. You can optionally filter records based on field values or existence.

```typescript
// Example of standard federation configuration
export const usersFederatedSheet: FederatedSheetConfig = {
  name: "Users",
  slug: "users-federated",

  dedupe_config: {
    on: "account_id",
    type: "merge",
    keep: "last",
  },

  // Optional: Only include records where these fields are populated
  all_fields_required: ["account_id", "email", "user_id"],

  // Optional: Only include records with specific status values
  field_values_required: {
    status: ["active", "pending"],
  },

  fields: [
    {
      key: "account_id",
      type: "string",
      label: "Account ID",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "account_id",
      },
    },
    // Additional fields...
  ],
};
```

### 2. Unpivot Federation

Unpivot federation transforms "wide" data format (where related data is spread across columns) into a "long" format (where related data is organized in rows). This is useful for normalizing data structures.

In this example, we're transforming address data from a wide format (where each user has multiple address fields like address1_street, address1_city, address2_street, address2_city) into a long format where each address is a separate row with its own set of fields.

```typescript
// Example of unpivot federation configuration
export const addressesFederatedSheet: FederatedUnpivotSheetConfig = {
  name: "Addresses",
  slug: "addresses-federated",

  // Optional: Only include records where street is populated
  all_fields_required: ["street"],

  // Optional: Only include records with specific address types
  field_values_required: {
    address_type: ["shipping", "billing"],
  },

  dedupe_config: {
    on: ["user_id", "address_name", "street", "city", "state", "postal_code", "country"],
    type: "merge",
    keep: "last",
  },

  unpivot_groups: {
    addresses: {
      source_sheet: allDataSheet,
      field_mappings: [
        {
          user_id: "user_id",
          address_name: "address1_name",
          street: "address1_street",
          city: "address1_city",
          state: "address1_state",
          postal_code: "address1_postal_code",
          country: "address1_country",
        },
        {
          user_id: "user_id",
          address_name: "address2_name",
          street: "address2_street",
          city: "address2_city",
          state: "address2_state",
          postal_code: "address2_postal_code",
          country: "address2_country",
        },
      ],
    },
  },

  fields: [
    // Field definitions...
  ],
};
```

## Configuration

### Plugin Configuration

To use the Federate Plugin, you need to configure it with the following options:

```typescript
listener.use(
  federate({
    source_workbook_name: "Source Workbook",
    federated_workbook: federatedWorkbook,
    debug: true, // Enable detailed logging
    action: {
      confirm: false,
      mode: "foreground",
      label: "Create Views",
      description: "Create specialized views of the data",
      primary: true,
    },
  }),
);
```

#### Required Parameters

- `source_workbook_name`: The name of the workbook containing the source data
- `federated_workbook`: The workbook configuration for the federated views

#### Optional Parameters

- `action`: Configuration for the federation action
  - `confirm`: Whether to show a confirmation dialog before federation (default: true)
  - `mode`: The execution mode of the action (default: "foreground")
    - "foreground": The action runs in the foreground with visible progress
    - "background": The action runs in the background without blocking the UI
  - `label`: The text displayed on the action button (default: "Federate")
  - `description`: A description of the action displayed in tooltips/modals
  - `primary`: Whether this is a primary action (default: true)
- `allow_undeclared_source_fields`: When set to `true`, allows fields to reference source fields that don't exist in the source sheet. This is useful when working with dynamic data structures (like when `allowAdditionalFields` is enabled on the source sheet). This validation only happens when you've defined a `source_sheet` rather than a `source_sheet_slug`. Default is `false`.
- `debug`: When set to `true`, enables detailed logging of the federation process. This includes initialization, mapping creation, record processing, and validation steps. Logs are tagged with "📦" for easy identification. This is particularly useful when troubleshooting configuration issues or unexpected data transformation results. Default is `false`. _note: This is extremely verbose. Recommend piping into a logfile for review_

### Federated Workbook Configuration

The Federated Workbook config is generally the same as a standard Workbook configuration, with the exception that `sheets` must contain Federated Sheets.

```typescript
export const federatedWorkbook: FederatedWorkbookConfig = {
  name: "Federated Workbook",
  sheets: [
    usersFederatedSheet,
    accountsFederatedSheet,
    carsFederatedSheet,
    boatsFederatedSheet,
    addressesFederatedSheet,
  ],
  actions: [submitBlueprint],
};
```

### Federated Sheet Configuration

Each federated sheet can be configured with either Standard or Unpivot Federation Patterns. From a configuration perspective, both patterns can have [Dedupe Configuration](#dedupe-configuration) blocks and [Filter Configuration](#filter-configuration) blocks, but Unpivot Federation expects an `unpivot_groups` block at the Sheet level, and Standard Federation expects a `federate_config` block under each field.

#### Standard Federation Configuration

Standard federation uses the `FederatedSheetConfig` type to create field-level mappings from a source sheet to a federated sheet. You can define which fields to include, how they're validated, and which records should be included through filtering options.

```typescript
export const standardFederatedSheet: FederatedSheetConfig = {
  name: "Sheet Name",
  slug: "sheet-slug",

  // Optional: Filter records based on field values
  field_values_required: {
    field_name: ["value1", "value2"],
  },

  // Optional: Specify fields that must be populated
  all_fields_required: ["field1", "field2"],

  // Optional: Configure how duplicate records are handled
  dedupe_config: {
    on: "field_name", // or ["field1", "field2"] for multiple fields
    type: "merge",
    keep: "last",
  },

  // Field definitions with federation configuration
  fields: [
    {
      key: "field_name",
      type: "string",
      label: "Field Label",
      federate_config: {
        source_sheet_slug: "source-sheet-slug",
        source_field_key: "source_field_key",
      },
    },
  ],
};
```

##### Using `federate_config`

The `federate_config` property is the core of standard federation, mapping fields from the source sheet to the federated sheet. It must be added to each field that you want to federate:

```typescript
{
  key: "email",
  type: "string",
  label: "Email Address",
  description: "User's primary email",
  constraints: [
    { type: "required" },
    { type: "email" }
  ],
  federate_config: {
    // Reference a field from a source sheet
    source_field_key: "email_address",

    // Either use source_sheet_slug...
    source_sheet_slug: "users",

    // ...or use source_sheet (but not both) - this enables validation on the sheet/fields
    source_sheet: UsersSheet,
  }
}
```

###### Required Parameters

- **`source_field_key`**: The key of the field in the source sheet to map from. This is required and must exist in the source sheet if you've configured the `source_sheet` field rather than `source_sheet_slug` (unless `allow_undeclared_source_fields` is set to `true` in the plugin configuration).

###### Sheet Reference Options

You also must specify exactly one of these options:

- **`source_sheet_slug`**: The slug of the source sheet to map from. The plugin will look up this sheet at runtime.

  ```typescript
  federate_config: {
    source_sheet_slug: "users",
    source_field_key: "email_address"
  }
  ```

- **`source_sheet`**: The full configuration of the source sheet. This enables validation at configuration time.

  ```typescript
  federate_config: {
    source_sheet: UsersSheet, // Reference to a sheet configuration object
    source_field_key: "email_address"
  }
  ```

###### Examples

**Example 1: Basic field mapping**

```typescript
{
  key: "first_name",
  type: "string",
  label: "First Name",
  federate_config: {
    source_sheet_slug: "contacts",
    source_field_key: "first_name"
  }
}
```

**Example 2: Using field with different names**

```typescript
{
  key: "phone",
  type: "string",
  label: "Phone Number",
  description: "Primary contact number",
  constraints: [{ type: "phone" }],
  federate_config: {
    source_sheet_slug: "contacts",
    source_field_key: "primary_contact_number" // Different name in source sheet
  }
}
```

**Example 3: Using full source sheet reference**

```typescript
import { contactsSheet } from "./source-sheets";

{
  key: "address",
  type: "string",
  label: "Mailing Address",
  federate_config: {
    source_sheet: contactsSheet, // Using imported sheet configuration
    source_field_key: "mailing_address"
  }
}
```

###### Best Practices

1. **Field validation**: Federation preserves field validations from the federated schema (not the source schema), so define all constraints in the federated field definition.

2. **Sheet reference method**:

   - Use `source_sheet_slug` for flexibility when schemas might change
   - Use `source_sheet` for fail-fast validation when schemas are stable

3. **Field naming**: You don't need to use the same field key in both sheets. Use names that make sense in each context.

4. **Field types**: Ensure that field types are compatible between source and federated fields to avoid data conversion issues.

5. **Complete configuration**: Apply `federate_config` to every field in your federated sheet, or it won't be populated with data from the source. However, you the same degree of flexibility here as with any Flatfile record - you can still use Recordhooks or External Constraints to perform computations or transformations.

#### Unpivot Sheet Configuration

The unpivot federation pattern uses the `FederatedUnpivotSheetConfig` to transform "wide" data formats into "long" formats. This is particularly useful when you need to normalize data structures where related information is spread across multiple columns.

```typescript
export const addressesFederatedSheet: FederatedUnpivotSheetConfig = {
  name: "Addresses",
  slug: "addresses-federated",

  // Optional: Only include records where street is populated
  all_fields_required: ["street"],

  // Optional: Only include records with specific address types
  field_values_required: {
    address_type: ["shipping", "billing"],
  },

  dedupe_config: {
    on: ["user_id", "address_name", "street", "city", "state", "postal_code", "country"],
    type: "merge",
    keep: "last",
  },

  unpivot_groups: {
    addresses: {
      source_sheet: allDataSheet,
      field_mappings: [
        {
          user_id: "user_id",
          address_name: "address1_name",
          street: "address1_street",
          city: "address1_city",
          state: "address1_state",
          postal_code: "address1_postal_code",
          country: "address1_country",
        },
        {
          user_id: "user_id",
          address_name: "address2_name",
          street: "address2_street",
          city: "address2_city",
          state: "address2_state",
          postal_code: "address2_postal_code",
          country: "address2_country",
        },
      ],
    },
  },

  fields: [
    // Standard Flatfile field configuration
    {
      key: "user_id",
      type: "string",
      label: "User ID",
      constraints: [{ type: "required" }],
    },
    // More field definitions...
  ],
};
```

##### Using `unpivot_groups`

The `unpivot_groups` property is the core of unpivot federation, defining how to transform data from a "wide" to a "long" format. It allows you to:

1. Specify one or more transformation groups
2. Define mappings from source fields to target fields
3. Create multiple rows from a single source record

```typescript
unpivot_groups: { // NOTE: this is a dictionary, were the key is the name of the group
  // You can have multiple named groups
  user_addresses: {
    // Reference the source sheet (choose one)
    source_sheet: Users,  // Full sheet reference
    // OR
    source_sheet_slug: "users", // Sheet slug

    // Define field mappings (one object = one output row per source record)
    field_mappings: [
      // First mapping (e.g., home address)
      {
        // Keys are target field names in the federated sheet
        // Values are source field names in the source sheet
        id: "user_id",            // Common field to maintain relationship. You can have as many of these as you need.
        type: "<<Home>>",         // Static values are configured with << and >> characters
        street: "home_street",
        city: "home_city",
        zip: "home_zip"
      },
      // Second mapping (e.g., work address)
      {
        id: "user_id",            // Same relationship field
        type: "<<Work>>"          // Static value for differentiation
        street: "work_street",
        city: "work_city",
        zip: "work_zip"
      }
      // Additional mappings as needed...
    ]
  },
  // Additional groups if needed -- this is useful if you need to create groups from different source sheets
  business_addresses: {
    source_sheet_slug: "business_addresses",
    field_mappings: [
      {
        id: "user_id",
        type: "<<Business>>"
        street: "street",
        city: "city",
        zip: "zip"
      }
    ]
  }
}
```

###### Required Parameters

Each unpivot group requires:

1. **Group name**: A descriptive name for the transformation group. This is the _key_ of the `unpivot_groups` dictionary (e.g., `user_addresses` or `business_addresses` from the example above)
2. **Source sheet reference**: Either `source_sheet` or `source_sheet_slug` (exactly one)
3. **`field_mappings`**: An array of mapping objects, each creating a new row in the federated sheet

###### Field Mappings Structure

Each field mapping object follows this pattern:

```typescript
{
  target_field1: "source_field1",
  target_field2: "source_field2",
  static_field: "<<Static Value>>"  // Static value syntax
}
```

- **Keys**: Field names in the federated (target) sheet
- **Values**:
  - Field names in the source sheet, or
  - Static values enclosed in `<<` and `>>` delimiters

Static values allow you to include constant data in your unpivot mappings without requiring a corresponding field in the source sheet. This is especially useful for adding type indicators, labels, or other metadata to the unpivoted records.

###### Examples

**Example 1: Basic unpivot to normalize addresses**

```typescript
unpivot_groups: {
  addresses: {
    source_sheet_slug: "contacts",
    field_mappings: [
      // Home address
      {
        contact_id: "id",
        address_type: "<<home>>",   // Static value
        street: "home_street",
        city: "home_city",
        state: "home_state",
        zip: "home_zip"
      },
      // Work address
      {
        contact_id: "id",
        address_type: "<<work>>",   // Static value
        street: "office_street",
        city: "office_city",
        state: "office_state",
        zip: "office_zip"
      }
    ]
  }
}
```

This converts a source record with home and work address fields into two separate records, each with a type field containing a static value.

**Example 2: Multiple groups with different source sheets**

```typescript
unpivot_groups: {
  // Addresses group
  users_email_addresses: {
    source_sheet: Users,
    field_mappings: [
      {
        user_id: "id",
        method_type: "<<email>>",   // Static value
        value: "email_address",
        priority: "<<primary>>"     // Static value
      },
    ]
  },
  // Contact methods group
  contact_methods: {
    source_sheet: ContactMethods,
    field_mappings: [
      {
        user_id: "id",
        method_type: "<<email>>",   // Static value
        value: "email_address",
        priority: "<<secondary>>"   // Static value
      },
      {
        user_id: "id",
        method_type: "<<phone>>",   // Static value
        value: "phone_number",
        priority: "<<primary>>"     // Static value
      }
    ]
  }
}
```

This example shows how static values can be combined with source field mappings to create rich, structured data from flat source records. In this example, we're pulling contact information from both the Users sheet and the ContactMethods sheet to populate the federated sheet

###### Best Practices

1. **Maintain relationships**: Always include identifier fields (like ID columns) in each mapping to maintain relationships between the source and unpivoted data.

2. **Use descriptive group names**: Choose names that reflect the purpose of the transformation for better maintainability.

3. **Consider validation logic**: Define appropriate field constraints for the unpivoted target fields to ensure data integrity.

4. **Handle nullable fields**: Consider what happens when source fields might be empty - you may want to use filtering options like `all_fields_required` to exclude incomplete rows.

5. **Design for uniqueness**: When configuring `dedupe_config` for unpivoted data, include all fields that would make a record unique in the `on` parameter to avoid unintended merges.

6. **Multiple groups**: For complex transformations, consider using multiple unpivot groups rather than creating overly complex field mappings.

7. **Static values**: Use the `<<value>>` syntax for static values to:
   - Add type indicators or categories to unpivoted records
   - Include metadata that doesn't exist in the source
   - Create consistent labels across different mappings

#### Source Sheet Reference Options

When referencing source sheets, you have two options for specifying the source data in both federation patterns. This holds true wither in `federate_config` in a Standard Federation Pattern or in `unpivot_groups` in an Unpivot Federation Pattern:

1. **Using `source_sheet_slug`**: Reference the source sheet by its slug.

   ```typescript
   // For standard federation in federate_config
   federate_config: {
     source_sheet_slug: "source-sheet-slug",
     source_field_key: "source_field_key",
   }

   // For unpivot federation in unpivot_groups
   unpivot_groups: {
     group_name: {
       source_sheet_slug: "source-sheet-slug",
       field_mappings: [
         // mappings...
       ]
     }
   }
   ```

2. **Using `source_sheet`**: Provide the full source sheet configuration.

   ```typescript
   // For standard federation in federate_config
   federate_config: {
     source_sheet: SourceSheet,
     source_field_key: "source_field_key",
   }

   // For unpivot federation in unpivot_groups
   unpivot_groups: {
     group_name: {
       source_sheet: SourceSheet,
       field_mappings: [
         // mappings...
       ]
     }
   }
   ```

##### Field Validation Behavior

The validation behavior for source fields differs depending on which option you use:

- When using `source_sheet_slug`, the plugin will look up the source sheet at runtime. If the referenced field or sheet doesn't exist, no validation error will be thrown, but the data will be missing in the federated sheet.

- When using `source_sheet`, the plugin will validate the field references against the fields defined in the provided sheet configuration. This validation is affected by the `allow_undeclared_source_fields` option:
  - When `allow_undeclared_source_fields` is `false` (default), the plugin will throw an error if referenced fields don't exist in the provided sheet configuration.
  - When `allow_undeclared_source_fields` is `true`, the plugin will allow fields to reference source fields that don't exist in the provided sheet configuration.

This approach is essential when you need to ensure that the source sheet structure matches your configuration. By providing the full sheet configuration, the validator can catch configuration errors early rather than waiting until runtime.

#### Dedupe Configuration

The `dedupe_config` option is a powerful feature that controls how duplicate records are handled during federation. It allows you to specify which fields should be used to identify unique records and how to resolve conflicts when duplicates are found.

##### Basic Structure

```typescript
dedupe_config: {
  on: "field_name", // or ["field1", "field2"] for multiple fields
  type: "merge",
  keep: "last",
}
```

##### Parameters

- **on**: Specifies the field(s) used to identify unique records. Can be a single field name or an array of field names.

  - Single field: `on: "account_id"`
  - Multiple fields: `on: ["user_id", "account_id"]`

- **type**: Determines how duplicate records are handled.

  - `"merge"`: Combines duplicate records, merging values from all versions.
  - `"delete"`: Keeps only one version of duplicate records.

- **keep**: When `type` is set to `"merge"` or `"delete"`, this parameter determines which version of a duplicate record to keep.
  - `"first"`: Keeps the first occurrence of a duplicate record.
  - `"last"`: Keeps the last occurrence of a duplicate record.
  - When `type` is set to `"delete"`, all other occurrences are discarded.
  - When `type` is set to `"merge"`, values from other occurrences are merged into the kept record _only_ when values in the kept record are empty.

##### Examples

###### Simple dedupe Configuration

```typescript
dedupe_config: {
  on: "account_id",
  type: "delete",
  keep: "first",
}
```

This configuration uses the `account_id` field to identify unique records. When duplicates are found, it keeps the first occurrence and other occurrences are deleted.

###### Complex Dedupe Configuration

```typescript
dedupe_config: {
  on: ["user_id", "account_id", "timestamp"],
  type: "merge",
  keep: "last",
}
```

This configuration uses multiple fields to identify unique records. Records with the same `user_id`, `account_id`, and `timestamp` are considered duplicates, the last occurrence is kept, and other occurrences are merged-in where values in the kept record are empty.

##### Best Practices

1. **Choose appropriate fields for the `on` parameter**:

   - Use fields that uniquely identify a record
   - Consider using multiple fields for more precise identification
   - Ensure the fields are present in both source and target sheets

2. **Select the right dedupe type**:

   - Use `"merge"` when you want to combine values from duplicate records
   - Use `"delete"` when you want to keep only one version of duplicate records

3. **Consider the `keep` strategy**:

   - Use `"last"` when the most recent data is most important
   - Use `"first"` when the original data should take precedence

4. **Test with sample data**:
   - Verify that your merge configuration correctly handles various scenarios
   - Check that the expected records are kept or merged as intended

#### Filter Configuration

The federate plugin provides several powerful filtering options that let you control which records are included in federated sheets. These filters can be used with both `FederatedSheetConfig` and `FederatedUnpivotSheetConfig`.

##### Field Existence Filters

These options filter records based on whether specific fields have values or not:

```typescript
// Only include records where ALL of these fields have values
all_fields_required: ["account_id", "email", "first_name"],

// Only include records where AT LEAST ONE of these fields has a value
any_fields_required: ["phone", "email", "address"],

// Only include records where ALL of these fields do NOT have values
any_fields_excluded: ["deleted_at", "archived_at"],
```

##### Field Value Filters

These options filter records based on specific field values:

```typescript
// Only include records where each field has one of its specified values
field_values_required: {
  status: ["active", "pending"],    // status must be "active" OR "pending"
  account_type: ["premium", "pro"], // AND account_type must be "premium" OR "pro"
},

// Exclude records where any field has one of its specified values
field_values_excluded: {
  status: ["deleted", "archived"],  // status must NOT be "deleted" OR "archived"
  region: ["test"],                 // AND region must NOT be "test"
},
```

##### Combining Filters

Multiple filters can be combined to create complex filtering logic:

```typescript
export const activePremiumUsers: FederatedSheetConfig = {
  name: "Active Premium Users",
  slug: "active-premium-users",

  // Must have these fields populated
  all_fields_required: ["email", "account_id"],

  // Must have specific values
  field_values_required: {
    status: ["active"],
    account_type: ["premium", "enterprise"],
  },

  // Must not have these values
  field_values_excluded: {
    test_account: ["true"],
  },

  fields: [
    // Field definitions with federate_config...
  ],
};
```

##### Best Practices

1. **Start with inclusive filters first**:

   - Begin with `all_fields_required` and `field_values_required` to select your target data
   - Then use exclusion filters to remove unwanted records

2. **Keep filter logic simple**:

   - Use the minimum number of filters needed
   - Document complex filtering logic with comments

3. **Test filters with sample data**:

   - Verify that your filters select the expected records
   - Check edge cases (null values, unexpected values)

4. **Consider filter order**:
   - Filters are applied in this exact sequence:
     1. `all_fields_required` (inclusion - field existence)
     2. `any_fields_required` (inclusion - field existence)
     3. `any_fields_excluded` (exclusion - field existence)
     4. `field_values_required` (inclusion - field values)
     5. `field_values_excluded` (exclusion - field values)
   - Records must pass all filter checks to be included

## Contributing

The Federate Plugin is actively maintained and welcomes contributions from the community. Before submitting your changes, please follow these guidelines to ensure a smooth review process.

### Requirements

- If you're changing configs, make sure to build or modify the validators to make sure configuration meets expectations
- Use the `federate-example` demo to make sure your updates work as intended and to provide other users with an example
- Update the README with your changes

### Unit Tests

All code changes should be accompanied by appropriate unit tests:

- Run existing tests with `npm test` from the Federate direcory to ensure your changes don't break current functionality
- Our test suite includes unit tests on all features and validators
  - Add new tests for any new features or bug fixes
  - We aim to maintain high test coverage (>80%) to ensure plugin reliability. This is important given the heavy configuration and complexity of the plugin.

### Test Coverage

We use Jest for testing and tracking coverage:

- `npm test` by default displays current test coverage
- Focus on ensuring full coverage of critical components like validators and processors
- Pay special attention to edge cases, especially with complex features like static values in unpivot mappings

### Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with appropriate tests
3. Update documentation to reflect any changes in functionality
4. Submit a pull request with a clear description of the changes
5. Request Jevon as a reviewer for your pull request
6. Address any feedback or requested changes

Thank you for contributing to the Flatfile Federate Plugin!
