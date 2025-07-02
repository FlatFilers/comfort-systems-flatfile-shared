import { FlatfileRecord } from "@flatfile/hooks";
import { bulkRecordHook as originalBulkRecordHook, recordHook as originalRecordHook, BulkRecordHookOptions, RecordHookOptions } from "@flatfile/plugin-record-hook";
import { DurableMessagesManager } from "./durable-messages-manager";
import { FlatfileEvent } from "@flatfile/listener"; 


type BulkRecordHookHandler = (records: FlatfileRecord[], event?: FlatfileEvent) => any | Promise<any>;
type RecordHookHandler = (record: FlatfileRecord, event?: FlatfileEvent) => any | Promise<any>;

/**
* A wrapped version of bulkRecordHook that automatically reapplies
* durable messages after the original handler completes.
*
* @param sheetSlug - The slug of the sheet to attach the hook to.
* @param handler - The bulk record hook handler function.
* @param options - Optional configuration for the bulk record hook.
* @returns The result of the original bulkRecordHook with durable message support.
*/
export function durableMessagesBulkRecordHook(
  sheetSlug: string,
  handler: BulkRecordHookHandler,
  options?: BulkRecordHookOptions
) {
  if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'durableMessagesBulkRecordHook called for sheet:', sheetSlug);
  return originalBulkRecordHook(sheetSlug, wrapBulkRecordHookHandler(handler, options), options);
}

/**
* A wrapped version of recordHook that automatically reapplies
* durable messages after the original handler completes.
*
* @param sheetSlug - The slug of the sheet to attach the hook to.
* @param handler - The record hook handler function.
* @param options - Optional configuration for the record hook.
* @returns The result of the original recordHook with durable message support.
*/
export function durableMessagesRecordHook(
  sheetSlug: string,
  handler: RecordHookHandler,
  options?: RecordHookOptions
) {
  if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'durableMessagesRecordHook called for sheet:', sheetSlug);
  return originalRecordHook(sheetSlug, wrapRecordHookHandler(handler, options), options);
}

/**
 * Internal helper to reapply durable messages idempotently within an event context.
 * Uses event.context.cache to track records already processed in this cycle.
 * @param records - The records to potentially reapply messages to.
 * @param event - The FlatfileEvent containing context and cache.
 */
function _reapplyMessagesOnce(records: FlatfileRecord[], event?: FlatfileEvent, options?: RecordHookOptions | BulkRecordHookOptions): void {
  if (options?.debug) console.debug('[DurableMessages][DEBUG]', '_reapplyMessagesOnce called with', records.length, 'records');
  const cacheKey = 'durableMessagesAppliedRecordIds';

  if (!event || !event.context) {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'Event context not available. Cannot guarantee idempotency for message reapplication.', event);
    DurableMessagesManager.reapplyDurableMessages(records);
    return;
  }

  if (!event.context.cache) {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'Initializing event.context.cache');
    event.context.cache = new Map<string, any>();
  }

  let appliedRecordIds = event.context.cache.get(cacheKey) as Set<string> | undefined;
  if (!appliedRecordIds) {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'No appliedRecordIds found in cache, initializing new Set');
    appliedRecordIds = new Set<string>();
    // No need to set it back immediately, we'll set it if we add anything
  }

  const recordsToProcess = records.filter(r => {
    const recordId = r.rowId as string;
    return !appliedRecordIds!.has(recordId);
  });

  if (options?.debug) console.debug('[DurableMessages][DEBUG] recordsToProcess:', recordsToProcess.length, '/', records.length, 'total records');

  if (recordsToProcess.length > 0) {
    DurableMessagesManager.reapplyDurableMessages(recordsToProcess);
    recordsToProcess.forEach(r => {
      const recordId = r.rowId as string;
      appliedRecordIds!.add(recordId);
    });
    event.context.cache.set(cacheKey, appliedRecordIds);
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'Updated appliedRecordIds in cache:', Array.from(appliedRecordIds));
  } else {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'No records to process for durable messages');
  }
}

/**
* Wraps a bulk record hook handler to reapply durable messages after execution.
* @param handler - The original bulk record hook handler.
* @returns A new handler that reapplies durable messages.
*/
function wrapBulkRecordHookHandler(handler: BulkRecordHookHandler, options?: BulkRecordHookOptions): BulkRecordHookHandler {
  return async (records: FlatfileRecord[], event?: FlatfileEvent) => {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'wrapBulkRecordHookHandler invoked');
    const result = await handler(records, event);
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'Handler complete, reapplying messages');
    _reapplyMessagesOnce(records, event, options);
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'wrapBulkRecordHookHandler complete');
    return result || records;
  };
}

/**
* Wraps a record hook handler to reapply durable messages after execution.
* @param handler - The original record hook handler.
* @returns A new handler that reapplies durable messages.
*/
function wrapRecordHookHandler(handler: RecordHookHandler, options?: RecordHookOptions): RecordHookHandler {
  return async (record: FlatfileRecord, event?: FlatfileEvent) => {
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'wrapRecordHookHandler invoked');
    const result = await handler(record, event);
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'Handler complete, reapplying messages');
    _reapplyMessagesOnce([record], event, options);
    if (options?.debug) console.debug('[DurableMessages][DEBUG]', 'wrapRecordHookHandler complete');
    return result || record;
  };
}