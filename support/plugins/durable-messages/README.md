# Durable Messages Plugin

This plugin provides tools to manage messages within Flatfile listeners when _also_ using `@flatfile/plugin-record-hook`. The `plugin-record-hook` clears all existing info/warning/error messages on records before executing your provided handler function. This works perfectly well when all of your updates are performed inside of record hooks, as the expectations is that the entire record will be re-validated by your handler. But if you need to perform record validation in any other way - whether in an Action listener, an event listener (for instance, on `commit:created`), or even externally via API – then your record-hooks will clobber your messages with no way to re-apply them.

This plugin offers a workaround by storing a copy of specified messages ("durable messages") in the record's metadata, allowing them to be reliably reapplied _after_ your recordHook handler completes.

It also includes the functionality to stage field value updates alongside message changes, generating a minimal update payload for efficiency.

## Overview

This plugin provides the `DurableMessagesManager` class and helper hook wrappers (`durableMessagesRecordHook`, `durableMessagesBulkRecordHook`) to address this:

1.  **Persists Messages:** Stores designated messages within the `metadata.durableMessages` property of a `Flatfile.Record_`.
2.  **Stages Changes:** Tracks staged message additions, message removals, and field value updates locally within the manager instance without modifying records directly.
3.  **Generates Minimal Updates:** Provides a `getModifiedRecords()` method that calculates the net changes compared to the original record state and returns an array of records containing _only_ the modified fields (value or messages) and/or changed metadata, suitable for Flatfile API updates (`api.records.update(...)`).
4.  **Reapplies Durable Messages:** The hook wrappers automatically reapply messages from metadata back onto the record fields _after_ your RecordHook handlers run, restoring Durable Messages to records that were removed by the RecordHooks plugin. A static method `DurableMessagesManager.reapplyDurableMessages(records: FlatfileRecord)` (where `FlatfileRecord` is the record type provided by `@flatfile/hooks`) is also available for manual reapplication if not using the wrappers, but heed the warnings below.

## Usage

This plugin is used by importing modules directly from its source directory using a relative path from your listener file.

The typical pattern involves using the hook wrappers (`durableMessagesRecordHook` or `durableMessagesBulkRecordHook`) to automatically handle message reapplication, and instantiating and using the `DurableMessagesManager` in your non-hook listener logic to stage any new durable messages, clear existing ones, or update field values. Then you can generate and retrieve minimized records from the `DurableMessagesManager` and apply them via the Flatfile API in your listener code.

### Quick Start

1. Replace your regular `recordHooks` / `bulkRecordHooks` with `durableMessagesRecordHook` / `durableMessagesBulkRecordHook`, using them in the exact same way.
2. For any listener outside of record hooks performing validation, use the `DurableMessagesManager` class to manage message or value changes
   - Instantiate `DurableMessagesManager` with a key unique to each validator (consider naming it after your listener)
     ```typescript
     const messageManager = new DurableMessagesManager(durableMessagesKey);
     ```
   - Clear existing messages from your records, to be re-applied in the validation process
     ```typescript
     messageManager.clearDurableMessagesForRecords(records);
     ```
   - Perform validation, adding messages to record fields via the manager
     ```typescript
     messageManager.addDurableMessage(record, "fieldName", {
       type: "info" | "warn" | "error",
       message: "message",
     });
     ```
   - Update field values as needed via the manager
     ```typescript
     messageManager.updateFieldValue(record, "fieldName", "New Value");
     ```
   - Process and retrieve all staged changes from the manager
     ```typescript
     const updates = messageManager.getModifiedRecords();
     ```
   - Update your records via the Flatfile SDK
     ```typescript
     if (updates.length > 0) {
       await api.records.update(sheetId, updates);
     }
     ```

### Example Integration

#### Durable Messages Example Demo

A full example implementation using this plugin can be found in:

[src/demos-new/durable-messages-example](https://github.com/FlatFilers/Demos/tree/main/src/demos-new/durable-messages-example)

This includes using `DurableMessagesBulkRecordHook` and full usage of `DurableMessagesManager`. The pertinent files are:

- `listeners/users-hook.listener.ts`
- `listeners/email-duplicates.listener.ts`
- `index.ts` (just registering the listeners)

#### RecordHook

```typescript
export const usersHook = durableMessagesBulkRecordHook( // 👈🏽 Use this just like you would use a normal bulkRecordHook
  "users",
  (records, context) => {
    records.forEach((record) => {
      // Cross-field validation: require fname if lname exists, and vice versa
      const fname = record.get("fname");
      const lname = record.get("lname");
      if (fname && !lname) {
        record.addError("lname", "Last Name is required if First Name is present.");
      }
      if (lname && !fname) {
        record.addError("fname", "First Name is required if Last Name is present.");
      }
    });

    return records;
  }
);
```

#### Listener / Validator

```typescript
export function emailDuplicatesListener(listener: FlatfileListener) {
  listener.on("commit:created", { sheet: "users" }, async (event) => {
    const { sheetId } = event.context;

    const { data } = await api.records.get(sheetId);
    const records = data.records;

    const durableMessagesKey = "emailDuplicatesListener";
    const messageManager = new DurableMessagesManager(durableMessagesKey); // 👈🏽 Instantiate the Manager

    messageManager.clearDurableMessagesForRecords(records); // 👈🏽 Clear existing messages
    // Note: This only clears messages for this namespace, as deterined by the `durableMessagesKey` argument above

    // Count email occurrences (case-insensitive, trimmed)
    const emailCounts: Record<string, number> = {};
    for (const record of records) {
      const email = record.values.email?.value?.toString().trim().toLowerCase() || "";
      if (email) {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    }

    // Add messages based on counts, plus updating a field value
    for (const record of records) {
      if (record.values.fname?.value === "Jevon") {
        messageManager.updateFieldValue(record, "lname", "Wild"); // 👈🏽 Stage field value change
      }

      const email = record.values.email?.value?.toString().trim().toLowerCase() || "";
      if (!email) continue;

      const count = emailCounts[email];
      if (count > 1) {
        if (count >= 3) {
          // 👇🏽 Stage an 'error' message for this record
          messageManager.addDurableMessage(record, "email", {
            type: "error",
            message: "This email appears 3 or more times.",
          });
        } else {
          // 👇🏽 Stage a 'warning' message for this record
          messageManager.addDurableMessage(record, "email", {
            type: "warn",
            message: "This email is duplicated in the sheet.",
          });
        }
      }
    }

    const updates = messageManager.getModifiedRecords(); // 👈🏽 Process and retrieve a minimized copy of all modified records

    if (updates.length > 0) {
      await api.records.update(sheetId, updates);
    }
  });
}
```

## API Reference

### `DurableMessagesManager`

The core class for managing durable messages and value updates.

#### `new DurableMessagesManager(durableMessagesKey, config?)`

- **`durableMessagesKey`**: `string` - A unique string used to namespace the messages stored in metadata by this manager instance. This prevents different validation logics from accidentally clearing each other's messages. Example: `'email-validation'`, `'zip-code-rules'`.
- **`config?`**: `{ debug?: boolean }` - Optional configuration object.
  - `debug`: If `true`, enables detailed logging to the console (`console.debug`) tracking the manager's internal operations. Defaults to `false`.

#### `addDurableMessage(record, fieldKey, message)`

Stages a durable message to be added to a specific field. The message will be reflected in the record's field messages _and_ stored in the record's metadata under the manager's namespace when `getModifiedRecords` is called and changes are detected.

- **`record`**: `Flatfile.Record_` - The _original_ record object (often `record.originalValue` from `FlatfileRecord`) containing the `id` and initial state.
- **`fieldKey`**: `string` - The key of the field to associate the message with.
- **`message`**: `Flatfile.ValidationMessage` - The message object (e.g., `{ type: 'error', message: '...' }`).

#### `updateFieldValue(record, fieldKey, newValue)`

Stages a value update for a specific field. The change will be included in the payload generated by `getModifiedRecords` if the `newValue` is different from the original value.

- **`record`**: `Flatfile.Record_` - The _original_ record object.
- **`fieldKey`**: `string` - The key of the field whose value is being updated.
- **`newValue`**: `any` - The new value for the field.

#### `clearDurableMessagesForRecord(record)`

Stages the removal of _all_ durable messages associated with _this manager's namespace_ (`durableMessagesKey`) for a specific record.

- **`record`**: `Flatfile.Record_` - The _original_ record object.

#### `clearDurableMessagesForRecords(records)`

Calls `clearDurableMessagesForRecord` for each record in the provided array.

- **`records`**: `Flatfile.Record_[]` - An array of original record objects.

#### `getModifiedRecords()`

Calculates the net changes (value updates and message additions/removals) compared to the original record states stored within the manager instance.

- **Returns**: `Flatfile.Record_[]` - An array of record objects formatted for the Flatfile API's `records.update` method. Each record in the array contains:
  - `id`: The record ID.
  - `values`: An object containing _only_ the fields where the `value` OR `messages` have changed compared to the original state. Each field value is an object `{ value: finalValue, messages: finalMessages }`.
  - `metadata?`: An object containing `durableMessages` _only if_ the durable messages in metadata have changed compared to the original state. The `durableMessages` object reflects the final calculated state for this manager's namespace. If all messages for this namespace were removed, it will be `{}`.

### Static Method: `reapplyDurableMessages`

#### `DurableMessagesManager.reapplyDurableMessages(records)`

Manually reapplies all durable messages from the `metadata.durableMessages` property back onto the record's field messages.

- **Parameters:**
  - `records`: An array of records (as returned from the Flatfile API).
- **Returns:** The same record(s), with durable messages reapplied to their field messages.

**⚠️ Warning:**
This method is **not idempotent**—calling it multiple times on the same record(s) within a single event will result in duplicate messages.

**Best Practice:**

- Prefer using the provided hook wrappers (`durableMessagesRecordHook`, `durableMessagesBulkRecordHook`), which handle reapplication automatically and safely.
- Only use this method if you are not using the wrappers and need to manually restore durable messages after record hooks have run, and if you are sure that it won't be run multiple times per record(s) per event.

**Example:**

```typescript
import { bulkRecordHook } from "@flatfile/plugin-record-hook";

export const usersRecordHook = bulkRecordHook("users", (records, context) => {
  records.forEach((record) => {
    // Email validation
    StringValidator.isEmail(record, "email", { addError: true, validateOnEmpty: true });
  });

  DurableMessagesManager.reapplyDurableMessages(records);

  return records;
});
```

### Hook Wrappers

#### `durableMessagesRecordHook(sheetSlug, handler, options?)`

Wraps a standard `recordHook` handler. It automatically calls `DurableMessagesManager.reapplyDurableMessages` on the single record _after_ executing your provided `handler`. Use this function exactly how you would use `recordHook`.

Note: This is built to be idempotent, so multiple recordHooks responding to the same event will not result in multiple messages

- **`sheetSlug`**: `string` - The slug of the sheet to attach the hook to.
- **`handler`**: `(record: FlatfileRecord, event?: FlatfileEvent) => any | Promise<any>` - Your record hook logic where you will likely use the `DurableMessagesManager`.
- **`options?`**: `RecordHookOptions` - Options passed to the underlying `recordHook`.
- **Returns**: The registration function returned by the underlying `recordHook`.

#### `durableMessagesBulkRecordHook(sheetSlug, handler, options?)`

Wraps a standard `bulkRecordHook` handler. It automatically calls `DurableMessagesManager.reapplyDurableMessages` on _all_ records in the array _after_ executing your provided `handler`. Use this function exactly as you would use `bulkRecordHook`.

Note: This is built to be idempotent, so multiple recordHooks responding to the same event will not result in multiple messages

- **`sheetSlug`**: `string` - The slug of the sheet to attach the hook to.
- **`handler`**: `(records: FlatfileRecord[], event?: FlatfileEvent) => any | Promise<any>` - Your bulk record hook logic where you will likely use the `DurableMessagesManager`.
- **`options?`**: `BulkRecordHookOptions` - Options passed to the underlying `bulkRecordHook`.
- **Returns**: The registration function returned by the underlying `bulkRecordHook`.

## Key Concepts

- **Durability:** Standard field messages are ephemeral. Durable messages are stored in `record.metadata.durableMessages` for persistence.
- **Namespace (`durableMessagesKey`):** Each `DurableMessagesManager` instance operates within a specific namespace defined by its `durableMessagesKey`. This allows different validation logics (e.g., email format, zip code rules) to manage their own durable messages independently without interfering with each other when using `addDurableMessage` or `clearDurableMessagesForRecord`. The static `reapplyDurableMessages` method used by the record hook wrappers, however, reapplies _all_ messages from metadata regardless of namespace.
- **Staging:** Changes (`addDurableMessage`, `clearDurableMessages...`, `updateFieldValue`) are staged within the manager instance. Records are not modified directly by these calls.
- **Minimal Updates:** `getModifiedRecords()` calculates the difference between the initial state (when the record was first seen by the manager) and the final state after applying all staged changes. It generates a payload containing only the necessary changes, optimizing API calls and memory usage.
- **State Management:** The manager tracks the original state of records it interacts with as references. Ensure you pass the correct original record object to methods like `addDurableMessage`, `clearDurableMessagesForRecord`, and `updateFieldValue`, and don't modify those records directly or there may be unintended consequences.
