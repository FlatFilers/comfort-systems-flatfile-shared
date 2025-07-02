import { Flatfile } from "@flatfile/api";
import { FlatfileRecord } from "@flatfile/hooks";

// Use Flatfile's ValidationMessage type for consistency
export type DurableMessage = Flatfile.ValidationMessage;
type DurableMessagesMetadata = Record<string, DurableMessage[]>;

export class DurableMessagesManager {
  private static readonly DELIMITER = ':__:';  // Delimiter used to separate durableMessagesKey from fieldKey in metadata
  private readonly durableMessagesKey: string; // A unique identifier for this message manager, used to namespace messages
  
  private originalRecords: Map<string, Flatfile.Record_> = new Map();
  private messageUpdates: Map<string, Map<string, DurableMessage[]>> = new Map();
  private messageRemovals: Map<string, Set<string>> = new Map();
  private valueUpdates: Map<string, Map<string, any>> = new Map();
  
  private config: { debug?: boolean };
  
  /**
   * Checks if a message already exists in an array of messages
   * 
   * @param messages Array of messages to check against
   * @param message Message to check for
   * @returns True if the message already exists in the array
   */
  private messageExists(messages: DurableMessage[], message: DurableMessage): boolean {
    return messages.some(existingMsg => 
      existingMsg.type === message.type && existingMsg.message === message.message
    );
  }
  
  /**
  * Creates a new DurableMessagesManager
  * 
  * @param durableMessagesKey A unique identifier for this message manager, used to namespace messages
  * @param config Optional config object { debug: boolean }
  */
  constructor(durableMessagesKey: string, config?: { debug?: boolean }) {
    this.durableMessagesKey = durableMessagesKey;
    this.config = config || {};
  }
  
  /**
  * Helper method to generate a message key for the durableMessages metadata
  * 
  * @param fieldKey The field key to generate a message key for
  * @returns The full message key with namespace
  */
  private getMessageKey(fieldKey: string): string {
    return `${this.durableMessagesKey}${DurableMessagesManager.DELIMITER}${fieldKey}`;
  }
  
  /**
  * Adds a durable message to a specific field of a record.
  * The message is staged internally and will be included in the record's
  * messages and metadata when `getModifiedRecords` is called and changes are detected.
  * 
  * @param record The record to add the message to
  * @param fieldKey The field key to associate the message with
  * @param message The validation message to add
  */
  public addDurableMessage(record: Flatfile.Record_, fieldKey: string, message: DurableMessage): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'addDurableMessage', JSON.stringify({ recordId: record.id, fieldKey, message }));
    if (!this.originalRecords.has(record.id)) {
      this.originalRecords.set(record.id, record);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'Stored original record', JSON.stringify({ recordId: record.id }));
    }
    if (!this.messageUpdates.has(record.id)) {
      this.messageUpdates.set(record.id, new Map());
    }
    const recordMessageUpdates = this.messageUpdates.get(record.id)!;
    if (!recordMessageUpdates.has(fieldKey)) {
      recordMessageUpdates.set(fieldKey, []);
    }
    const existingMessages = recordMessageUpdates.get(fieldKey)!;
    // Only add the message if it doesn't already exist
    if (!this.messageExists(existingMessages, message)) {
      existingMessages.push(message);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'Message added to messageUpdates', JSON.stringify({ recordId: record.id, fieldKey, message }));
    } else if (this.config.debug) {
      console.debug('[DurableMessagesManager]', 'Message already exists, skipping', JSON.stringify({ recordId: record.id, fieldKey, message }));
    }
  }
  
  /**
   * Adds the same durable message to multiple fields of a record.
   * The message is staged internally and will be included in the record's
   * messages and metadata when `getModifiedRecords` is called and changes are detected.
   * 
   * @param record The record to add the message to
   * @param fieldKeys Array of field keys to associate the message with
   * @param message The validation message to add to all specified fields
   */
  public addDurableMessageToFields(record: Flatfile.Record_, fieldKeys: string[], message: DurableMessage): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'addDurableMessageToFields', JSON.stringify({ recordId: record.id, fieldKeys, message }));
    
    // Store reference to original record if not already stored
    if (!this.originalRecords.has(record.id)) {
      this.originalRecords.set(record.id, record);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'Stored original record', JSON.stringify({ recordId: record.id }));
    }

    // Add the message to each field
    for (const fieldKey of fieldKeys) {
      this.addDurableMessage(record, fieldKey, message);
    }
  }
  
  /**
   * Adds the same durable message to all fields of a record.
   * The message is staged internally and will be included in the record's
   * messages and metadata when `getModifiedRecords` is called and changes are detected.
   * 
   * @param record The record to add the message to
   * @param message The validation message to add to all fields
   */
  public addDurableMessageToAllFields(record: Flatfile.Record_, message: DurableMessage): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'addDurableMessageToAllFields', JSON.stringify({ recordId: record.id, message }));
    
    // Get all field keys from the record's values
    const allFieldKeys = Object.keys(record.values || {});
    
    // Use the existing method to add the message to all fields
    this.addDurableMessageToFields(record, allFieldKeys, message);
  }
  
  /**
  * Clears all durable messages for multiple records at once.
  * 
  * @param records The records to clear messages for
  */
  public clearDurableMessagesForRecords(records: Flatfile.Record_[]): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'clearDurableMessagesForRecords', JSON.stringify({ recordIds: records.map(r => r.id) }));
    for (const record of records) {
      this.clearDurableMessagesForRecord(record);
    }
  }
  
  /**
  * Clears all durable messages for a specific record that were added by this manager.
  * 
  * @param record The record to clear messages for
  */
  public clearDurableMessagesForRecord(record: Flatfile.Record_): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'clearDurableMessagesForRecord', JSON.stringify({ recordId: record.id }));
    if (!this.originalRecords.has(record.id)) {
      this.originalRecords.set(record.id, record);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'Stored original record', JSON.stringify({ recordId: record.id }));
    }
    if (!this.messageRemovals.has(record.id)) {
      this.messageRemovals.set(record.id, new Set());
    }
    const durableMessages = record.metadata?.durableMessages as DurableMessagesMetadata | undefined;
    if (durableMessages) {
      Object.keys(durableMessages).forEach(key => {
        if (key.startsWith(`${this.durableMessagesKey}${DurableMessagesManager.DELIMITER}`)) {
          const fieldKey = key.split(DurableMessagesManager.DELIMITER).pop();
          if (fieldKey) {
            this.messageRemovals.get(record.id)!.add(fieldKey);
            if (this.config.debug) console.debug('[DurableMessagesManager]', 'Marked for messageRemoval', JSON.stringify({ recordId: record.id, fieldKey }));
          }
        }
      });
    }
  }
  
  /**
  * Stages an update for a specific field's value in a record.
  * The change is tracked internally and will be included in the output of
  * `getModifiedRecords` if the new value differs from the original.
  * 
  * @param record The record to update.
  * @param fieldKey The key of the field to update.
  * @param newValue The new value for the field.
  */
  public updateFieldValue(record: Flatfile.Record_, fieldKey: string, newValue: any): void {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'updateFieldValue', JSON.stringify({ recordId: record.id, fieldKey, newValue }));
    // Store reference to original record if not already stored
    if (!this.originalRecords.has(record.id)) {
      this.originalRecords.set(record.id, record);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'Stored original record', JSON.stringify({ recordId: record.id }));
    }
    
    // Ensure the map for this record exists
    if (!this.valueUpdates.has(record.id)) {
      this.valueUpdates.set(record.id, new Map());
    }
    
    // Stage the value update
    this.valueUpdates.get(record.id)!.set(fieldKey, newValue);
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'Value update staged', JSON.stringify({ recordId: record.id, fieldKey, newValue }));
  }
  
  /**
  * Filters an array of messages, removing items that match messages in the messageRemoval list.
  * Comparison is based on message type and content.
  * 
  * @param existingMessages The original list of messages.
  * @param messagesToRemove The list of messages to remove.
  * @returns A new array containing only the messages that should remain.
  */
  private _filterMessages(existingMessages: DurableMessage[], messagesToRemove: DurableMessage[] | undefined): DurableMessage[] {
    if (this.config.debug) console.debug('[DurableMessagesManager]', '_filterMessages', JSON.stringify({ existingMessages, messagesToRemove }));
    if (!messagesToRemove || messagesToRemove.length === 0) {
      return existingMessages;
    }
    if (!Array.isArray(existingMessages)) {
      return [];
    }
    const filtered = existingMessages.filter(
      (msg: DurableMessage) => !messagesToRemove.some(
        (dm: DurableMessage) => dm.type === msg.type && dm.message === msg.message
      )
    );
    if (this.config.debug) console.debug('[DurableMessagesManager]', '_filterMessages result', JSON.stringify({ filtered }));
    return filtered;
  }
  
  /**
  * Calculates what the messages would look like after applying all messageUpdates and messageRemovals.
  * This avoids cloning the entire record and only processes the message-related fields.
  * 
  * @param originalRecord The original record to process
  * @returns Object containing the processed field messages and metadata messages
  */
  private getProcessedMessages(originalRecord: Flatfile.Record_): { 
    fieldMessages: Record<string, DurableMessage[]>,
    metadataMessages: DurableMessagesMetadata 
  } {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'getProcessedMessages', JSON.stringify({ recordId: originalRecord.id }));
    const fieldMessages: Record<string, DurableMessage[]> = {};
    const metadataMessages: DurableMessagesMetadata = {};
    
    for (const [fieldKey, fieldValue] of Object.entries(originalRecord.values)) {
      if (fieldValue.messages && Array.isArray(fieldValue.messages) && fieldValue.messages.length > 0) {
        fieldMessages[fieldKey] = [...fieldValue.messages];
      }
    }
    
    const originalDurableMessages = originalRecord.metadata?.durableMessages as DurableMessagesMetadata | undefined;
    if (originalDurableMessages) {
      for (const [key, messages] of Object.entries(originalDurableMessages)) {
        metadataMessages[key] = Array.isArray(messages) ? [...messages] : [];
      }
    }
    
    // Apply messageRemovals
    if (this.messageRemovals.has(originalRecord.id)) {
      const fieldRemovals = this.messageRemovals.get(originalRecord.id)!;
      
      for (const fieldKey of fieldRemovals) {
        const durableMessageKey = this.getMessageKey(fieldKey);
        
        // Get the specific durable messages associated with this key from the *original* metadata
        const messagesToRemove = originalDurableMessages?.[durableMessageKey];
        
        if (fieldMessages[fieldKey] && Array.isArray(messagesToRemove)) {
          fieldMessages[fieldKey] = this._filterMessages(fieldMessages[fieldKey], messagesToRemove);
          if (fieldMessages[fieldKey].length === 0) {
            delete fieldMessages[fieldKey];
          }
        }
        
        delete metadataMessages[durableMessageKey];
        if (this.config.debug) console.debug('[DurableMessagesManager]', 'Applied messageRemoval', JSON.stringify({ recordId: originalRecord.id, fieldKey }));
      }
    }
    
    // Apply additions
    if (this.messageUpdates.has(originalRecord.id)) {
      const fieldMessageUpdates = this.messageUpdates.get(originalRecord.id)!;
      
      for (const [fieldKey, messagesToAdd] of fieldMessageUpdates.entries()) {
        // Ensure messagesToAdd is a non-empty array before proceeding
        if (Array.isArray(messagesToAdd) && messagesToAdd.length > 0) {
          if (!fieldMessages[fieldKey]) {
            fieldMessages[fieldKey] = [];
          }
          // Only add messages that don't already exist
          for (const message of messagesToAdd) {
            if (!this.messageExists(fieldMessages[fieldKey], message)) {
              fieldMessages[fieldKey].push(message);
            }
          }
          
          const durableMessageKey = this.getMessageKey(fieldKey);
          if (!metadataMessages[durableMessageKey]) {
            metadataMessages[durableMessageKey] = [];
          }
          // Only add messages that don't already exist in metadata
          for (const message of messagesToAdd) {
            if (!this.messageExists(metadataMessages[durableMessageKey], message)) {
              metadataMessages[durableMessageKey].push(message);
            }
          }
          if (this.config.debug) console.debug('[DurableMessagesManager]', 'Applied messageUpdate', JSON.stringify({ recordId: originalRecord.id, fieldKey, messagesToAdd }));
        }
      }
    }
    
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'getProcessedMessages result', JSON.stringify({ recordId: originalRecord.id, fieldMessages, metadataMessages }));
    return { fieldMessages, metadataMessages };
  }
  
  /**
  * Checks if the messages have actually changed compared to the original record.
  * This helps avoid unnecessary updates when the final state is the same.
  * 
  * @param originalRecord The original record to compare against
  * @param fieldMessages The processed field messages
  * @param metadataMessages The processed metadata messages
  * @returns True if there are actual changes to the messages
  */
  private _hasChanges(
    originalRecord: Flatfile.Record_,
    processedFieldMessages: Record<string, DurableMessage[]>,
    processedMetadataMessages: DurableMessagesMetadata
  ): boolean {
    if (this.config.debug) console.debug('[DurableMessagesManager]', '_hasChanges', JSON.stringify({ recordId: originalRecord.id }));
    const currentValues = originalRecord.values ?? {};
    
    // 1. Check for field message changes
    for (const fieldKey of new Set([
      ...(Object.keys(currentValues) as string[]).filter(key => (currentValues[key]?.messages?.length ?? 0) > 0),
      ...Object.keys(processedFieldMessages)
    ])) {
      const originalFieldMessages = currentValues[fieldKey]?.messages || [];
      const newFieldMessages = processedFieldMessages[fieldKey] || [];
      
      if (!this.areMessagesEqual(originalFieldMessages, newFieldMessages)) {
        if (this.config.debug) console.debug('[DurableMessagesManager]', '_hasChanges: message change detected', JSON.stringify({ recordId: originalRecord.id, fieldKey, originalFieldMessages, newFieldMessages }));
        return true; // Found a message change
      }
    }
    
    // 2. Check for metadata message changes
    const originalMetadataMessages = originalRecord.metadata?.durableMessages as DurableMessagesMetadata | undefined || {};
    if (!this.areMetadataMessagesEqual(originalMetadataMessages, processedMetadataMessages)) {
      if (this.config.debug) console.debug('[DurableMessagesManager]', '_hasChanges: metadata message change detected', JSON.stringify({ recordId: originalRecord.id, originalMetadataMessages, processedMetadataMessages }));
      return true; // Found a metadata message change
    }
    
    // 3. Check for field value changes
    const recordValueUpdates = this.valueUpdates.get(originalRecord.id);
    if (recordValueUpdates) {
      for (const [fieldKey, stagedValue] of recordValueUpdates.entries()) {
        const originalValue = currentValues[fieldKey]?.value;
        // Use strict inequality to check for changes, including type changes or changes to/from undefined
        if (stagedValue !== originalValue) {
          if (this.config.debug) console.debug('[DurableMessagesManager]', '_hasChanges: value change detected', JSON.stringify({ recordId: originalRecord.id, fieldKey, originalValue, stagedValue }));
          return true; // Found a value change
        }
      }
    }
    
    if (this.config.debug) console.debug('[DurableMessagesManager]', '_hasChanges: no changes detected', JSON.stringify({ recordId: originalRecord.id }));
    // If none of the above checks found changes, return false
    return false;
  }
  
  /**
  * Compares two arrays of messages for equality, ignoring order.
  * 
  * @param messages1 First array of messages
  * @param messages2 Second array of messages
  * @returns True if the arrays contain the same messages
  */
  private areMessagesEqual(messages1: DurableMessage[], messages2: DurableMessage[]): boolean {
    const result = (messages1.length === messages2.length) && messages1.every(msg1 => messages2.some(msg2 => msg2.type === msg1.type && msg2.message === msg1.message));
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMessagesEqual', JSON.stringify({ messages1, messages2, result }));
    return result;
  }
  
  /**
  * Compares two metadata durableMessages objects for equality.
  * 
  * @param durableMessages1 First durableMessages object
  * @param durableMessages2 Second durableMessages object
  * @returns True if the objects contain the same messages
  */
  private areMetadataMessagesEqual(
    durableMessages1: DurableMessagesMetadata,
    durableMessages2: DurableMessagesMetadata
  ): boolean {
    const keys1 = Object.keys(durableMessages1);
    const keys2 = Object.keys(durableMessages2);
    
    // If the number of keys is different, they cannot be equal
    if (keys1.length !== keys2.length) {
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMetadataMessagesEqual: key length mismatch', JSON.stringify({ keys1_length: keys1.length, keys2_length: keys2.length }));
      return false;
    }
    
    // If both are empty (checked after length equality), they are equal
    if (keys1.length === 0) {
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMetadataMessagesEqual: both empty');
      return true;
    }
    
    // Check that all keys from the first exist in the second. Since lengths are equal, this ensures the key sets are identical.
    const keys2Set = new Set(keys2);
    if (!keys1.every(key => keys2Set.has(key))) {
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMetadataMessagesEqual: key mismatch', JSON.stringify({ keys1, keys2 }));
      return false; // Should theoretically not be reached if lengths are equal, but good for robustness.
    }
    
    // Check if the messages for each key are equal
    for (const key of keys1) {
      // Fallback to empty array for safety, though keys should exist from check above
      const messages1 = durableMessages1[key] || []; 
      const messages2 = durableMessages2[key] || []; 
      
      // Use areMessagesEqual (which has its own debug logs)
      if (!this.areMessagesEqual(messages1, messages2)) {
        // areMessagesEqual logs the details of the failure
        if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMetadataMessagesEqual: message array mismatch for key', JSON.stringify({ key }));
        return false;
      }
    }
    
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'areMetadataMessagesEqual: equal', JSON.stringify({ keys1, keys2 }));
    return true;
  }
  
  /**
  * Static method for reapplying durable messages from metadata to hook records.
  * This can be used without creating an instance of DurableMessagesManager.
  * 
  * @param records The records to reapply messages to
  * @returns The same records with messages reapplied
  */
  public static reapplyDurableMessages(
    records: FlatfileRecord[]
  ): FlatfileRecord[] {
    for (const record of records) {
      const metadata = record.getMetadata();
      const durableMessagesMeta = metadata?.['durableMessages'] as DurableMessagesMetadata | undefined;
      
      if (!durableMessagesMeta) continue;
      
      Object.entries(durableMessagesMeta).forEach(([key, messages]) => {
        const fieldName = key.split(DurableMessagesManager.DELIMITER).pop();
        
        if (!fieldName || !Array.isArray(messages)) return;
        
        const durableMessages: DurableMessage[] = messages; 
        
        for (const msg of durableMessages) {
          if (msg && typeof msg.type === 'string' && typeof msg.message === 'string') {
            // Use switch for clarity and potential future expansion
            switch (msg.type) {
              case 'error':
              record.addError(fieldName, msg.message);
              break;
              case 'warn':
              record.addWarning(fieldName, msg.message);
              break;
              case 'info':
              record.addInfo(fieldName, msg.message);
              break;
              // Default case: do nothing if type is unrecognized
            }
          }
        }
      });
    }
    return records;
  }
  
  /**
  * Gets all records that have pending messageUpdates (value updates or message changes).
  * Only returns records with actual differences compared to their original state.
  * The returned records contain only the fields that have changed (either value or messages)
  * and/or modified metadata.
  * 
  * @returns An array of modified records with minimal structure for API update.
  */
  public getModifiedRecords(): Flatfile.Record_[] {
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords called');
    const modifiedRecords: Flatfile.Record_[] = [];
    
    // Consider records with message messageUpdates, messageRemovals, OR value updates
    const processedIds = new Set([
      ...Array.from(this.messageUpdates.keys()),
      ...Array.from(this.messageRemovals.keys()),
      ...Array.from(this.valueUpdates.keys()) 
    ]);
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: processedIds', JSON.stringify(Array.from(processedIds)));
    
    for (const recordId of processedIds) {
      const originalRecord = this.originalRecords.get(recordId);
      // Should not happen if state is managed correctly, but safety first
      if (!originalRecord) {
        if (this.config.debug) console.warn('[DurableMessagesManager]', 'getModifiedRecords: originalRecord not found for id', recordId);
        continue; 
      }
      
      // Calculate the final state of messages after applying messageUpdates/messageRemovals
      const { fieldMessages: processedFieldMessages, metadataMessages: processedMetadataMessages } = this.getProcessedMessages(originalRecord);
      
      // Check if there are *any* changes (value or messages) compared to the original
      const hasChanges = this._hasChanges(originalRecord, processedFieldMessages, processedMetadataMessages);
      if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: _hasChanges result', JSON.stringify({ recordId, hasChanges }));
      
      if (hasChanges) {
        // Initialize the minimal record payload
        const modifiedRecord: Flatfile.Record_ = {
          id: originalRecord.id,
          values: {} 
          // metadata will be added later if needed
        };
        let metadataHasChanged = false;
        
        // Determine the set of all fields potentially affected
        const originalValues = originalRecord.values ?? {};
        const recordValueUpdates = this.valueUpdates.get(recordId);
        const allFieldKeys = new Set([
          ...Object.keys(originalValues),
          ...Object.keys(processedFieldMessages),
          ...(recordValueUpdates?.keys() ?? [])
        ]);
        if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: allFieldKeys for record', JSON.stringify({ recordId, allFieldKeys: Array.from(allFieldKeys) }));
        
        
        // Iterate through each potentially affected field to build the 'values' payload
        for (const fieldKey of allFieldKeys) {
          const originalValue = originalValues[fieldKey]?.value;
          const originalMessages = originalValues[fieldKey]?.messages || [];
          
          const stagedValueUpdate = recordValueUpdates?.get(fieldKey);
          // Use the staged value if defined, otherwise fallback to original
          const finalValue = stagedValueUpdate !== undefined ? stagedValueUpdate : originalValue;
          
          const finalMessages = processedFieldMessages[fieldKey] || [];
          
          // Check if this specific field has changed value or messages
          const isValueDifferent = finalValue !== originalValue;
          // Use areMessagesEqual (which has its own debug logs)
          const areMessagesDifferent = !this.areMessagesEqual(originalMessages, finalMessages);
          
          if (isValueDifferent || areMessagesDifferent) {
            // If either value or messages changed, include this field in the update payload
            modifiedRecord.values[fieldKey] = { 
              value: finalValue, 
              messages: finalMessages 
            };
            if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: field changed', JSON.stringify({ recordId: originalRecord.id, fieldKey, isValueDifferent, areMessagesDifferent, finalValue: finalValue, finalMessages: finalMessages }));
          }
        }
        
        // Handle metadata changes (same logic as before the value updates feature)
        const originalMetadataMessages = originalRecord.metadata?.durableMessages || {};
        // Use areMetadataMessagesEqual (which has its own debug logs)
        if (!this.areMetadataMessagesEqual(originalMetadataMessages, processedMetadataMessages)) {
          metadataHasChanged = true;
          if (!modifiedRecord.metadata) {
            modifiedRecord.metadata = {};
          }
          if (Object.keys(processedMetadataMessages).length > 0) {
            modifiedRecord.metadata.durableMessages = processedMetadataMessages;
          } else {
            // Explicitly set to empty object if all durable messages are removed
            modifiedRecord.metadata.durableMessages = {}; 
          }
          if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: metadata changed', JSON.stringify({ recordId: originalRecord.id, processedMetadataMessages }));
        }
        
        // Only add the record if it has actual changed values or changed metadata
        // _hasChanges ensures there *is* a change, this ensures we only send fields/metadata that changed
        if (Object.keys(modifiedRecord.values).length > 0 || metadataHasChanged) {
          modifiedRecords.push(modifiedRecord);
          if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: record added', JSON.stringify({ recordId: originalRecord.id, modifiedRecord }));
        } else {
          if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords: record skipped (no net field/metadata changes)', JSON.stringify({ recordId: originalRecord.id }));
        }
      }
    }
    
    if (this.config.debug) console.debug('[DurableMessagesManager]', 'getModifiedRecords result', JSON.stringify({ modifiedRecords }));
    return modifiedRecords;
  }
}