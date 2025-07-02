import api, { Flatfile } from "@flatfile/api";
import { logInfo, logError } from "@flatfile/util-common";

/**
* This module implements a sheet-level locking mechanism using sheet metadata.
* The strategy involves:
* 1. An optimistic pre-check (`isSheetLocked`) called before potentially slow operations
*    (like job creation) to quickly avoid unnecessary work if the sheet seems locked.
* 2. A definitive atomic acquisition attempt (`acquireSheetMetadataLock`) using
*    `api.sheets.updateSheet`, which acts as the source of truth for obtaining the lock.
* 3. A lock release (`releaseSheetMetadataLock`) that cleans up the specific lock metadata key.
* Lock entries include a TTL (`DEFAULT_LOCK_TTL_MS`) to prevent stale locks from sitting around for freakin ever
*/

const LOCK_METADATA_KEY = 'tabulateLock';
const DEFAULT_LOCK_TTL_MS = 3000; // 3 seconds in milliseconds
// This short duration is intended to prevent stale locks if a job fails unexpectedly
// after acquiring the lock, while still being long enough to cover typical
// calculation times and API call latencies during the locked operation.
// 
// When I tested the trivial case of just counting records across 2 sheets, it took around a second or so.
// We may need to up this sucker if we start building bigger processing functions.

/**
* Defines the structure for the lock object stored in sheet metadata.
*/
interface SheetLockMetadata {
  lockId: string;
  expiresAt: string; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
}

/**
* Type predicate to check if an object conforms to the SheetLockMetadata interface.
* @param obj - The object to check.
* @returns True if the object is valid SheetLockMetadata, false otherwise.
*/
function isSheetLockMetadata(obj: unknown): obj is SheetLockMetadata {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const lock = obj as Record<string, unknown>; // Cast to a generic record for property checks
  
  return (
    typeof lock.lockId === 'string' &&
    typeof lock.expiresAt === 'string' &&
    typeof lock.createdAt === 'string'
  );
}

/**
* Attempts to acquire a lock on a target sheet using sheet metadata.
* Overwrites any existing expired lock metadata if acquisition is successful.
*
* @param targetSheetId - The ID of the sheet to lock.
* @param lockId - A unique identifier for this lock attempt.
* @param debug - Optional flag for verbose logging.
* @returns True if the lock was acquired, false otherwise (e.g., already locked, API error).
*/
export async function acquireSheetMetadataLock(
  targetSheetId: string,
  lockId: string,
  debug?: boolean
): Promise<boolean> {
  const logPrefix = `[MetadataLock sheet=${targetSheetId}]`;
  if (debug) logInfo(logPrefix, `Attempting to acquire lock ${lockId}...`);
  
  try {
    // 1. Get current sheet state, including metadata
    const { data: sheet } = await api.sheets.get(targetSheetId);
    const currentMetadata = sheet.metadata;
    if (debug) logInfo(logPrefix, `Fetched current metadata: ${JSON.stringify(currentMetadata)}`);
    const now = new Date();
    
    // 2. Check for existing valid lock
    if (currentMetadata && typeof currentMetadata === 'object' && LOCK_METADATA_KEY in currentMetadata) {
      const lockData = currentMetadata[LOCK_METADATA_KEY];
      if (isSheetLockMetadata(lockData)) {
        try {
          const expiresAt = new Date(lockData.expiresAt);
          if (now < expiresAt) {
            // Lock is active and held by someone else
            if (debug) logInfo(logPrefix, `Sheet already has an active lock: ${lockData.lockId} (expires: ${lockData.expiresAt}). Acquisition failed.`);
            return false;
          } else {
            // Found expired lock, proceed to acquire
            if (debug) logInfo(logPrefix, `Found expired lock: ${lockData.lockId} (expired: ${lockData.expiresAt}). Proceeding to acquire.`);
          }
        } catch (parseError) {
          if (debug) logError(logPrefix, `Error parsing existing lock's expiration date. Treating as invalid/expired. Error: ${parseError}`);
          // Proceed to acquire lock
        }
      } else {
        // Found invalid lock metadata structure
        if (debug) logInfo(logPrefix, `Found invalid or incomplete lock metadata. Proceeding to acquire.`);
      }
    } else {
      // No existing lock found
      if (debug) logInfo(logPrefix, `No existing lock found in metadata. Proceeding to acquire.`);
    }
    
    // 3. Prepare and attempt to set the new lock metadata
    const newExpiresAt = new Date(now.getTime() + DEFAULT_LOCK_TTL_MS);
    const newLockMetadata: SheetLockMetadata = {
      lockId: lockId,
      expiresAt: newExpiresAt.toISOString(),
      createdAt: now.toISOString(),
    };
    
    // Combine existing metadata (if any) with the new lock, potentially overwriting expired/invalid lock
    const updatedMetadata = {
      ...(currentMetadata || {}), 
      [LOCK_METADATA_KEY]: newLockMetadata 
    };
    
    if (debug) logInfo(logPrefix, `Attempting to set new lock metadata: ${JSON.stringify({ [LOCK_METADATA_KEY]: newLockMetadata })}`);
    try {
      // The update operation itself acts as the atomic check
      await api.sheets.updateSheet(targetSheetId, {
        metadata: updatedMetadata,
      });
      // If the update succeeds, we assume the lock was acquired
      if (debug) logInfo(logPrefix, `Successfully set/updated sheet metadata with lock ${lockId}.`);
      return true;
    } catch (updateError: unknown) {
      // If the update fails, assume lock acquisition failed (e.g., concurrent update, API error)
      logError(logPrefix, `Failed to update sheet metadata for lock ${lockId}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      if (debug) console.error(updateError);
      return false;
    }
    
  } catch (error: unknown) {
    // Catch errors during initial get or other unexpected issues
    logError(logPrefix, `Unexpected error acquiring metadata lock ${lockId}: ${error instanceof Error ? error.message : String(error)}`);
    if (debug) console.error(error);
    return false;
  }
}

/**
* Checks if a target sheet is currently locked with a valid, non-expired lock.
* Does not attempt to acquire or modify the lock.
*
* @param targetSheetId - The ID of the sheet to check.
* @param debug - Optional flag for verbose logging.
* @returns True if the sheet is considered locked, false otherwise.
*/
export async function isSheetLocked(
  targetSheetId: string,
  debug?: boolean
): Promise<boolean> {
  const logPrefix = `[MetadataLock sheet=${targetSheetId}]`;
  if (debug) logInfo(logPrefix, `Checking if sheet is locked...`);
  
  try {
    // Get current sheet state, including metadata
    const { data: sheet } = await api.sheets.get(targetSheetId);
    const currentMetadata = sheet.metadata;
    if (debug) logInfo(logPrefix, `Fetched current metadata: ${JSON.stringify(currentMetadata)}`);
    const now = new Date();
    
    // Check for existing valid lock
    if (currentMetadata && typeof currentMetadata === 'object' && LOCK_METADATA_KEY in currentMetadata) {
      const lockData = currentMetadata[LOCK_METADATA_KEY];
      if (isSheetLockMetadata(lockData)) {
        try {
          const expiresAt = new Date(lockData.expiresAt);
          if (now < expiresAt) {
            if (debug) logInfo(logPrefix, `Check: Sheet is locked by ${lockData.lockId} (expires: ${lockData.expiresAt}).`);
            return true; // Lock is active and valid
          } else {
            if (debug) logInfo(logPrefix, `Check: Found expired lock: ${lockData.lockId} (expired at: ${lockData.expiresAt}). Sheet is considered unlocked.`);
            return false; // Lock has expired
          }
        } catch (parseError: unknown) {
          logError(logPrefix, `Check: Error parsing lock expiration date. Treating as unlocked. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          return false; // Treat parse error as unlocked
        }
      } else {
        if (debug) logInfo(logPrefix, `Check: Found invalid or incomplete lock metadata in ${LOCK_METADATA_KEY}. Sheet is considered unlocked.`);
        return false; // Invalid lock structure
      }
    } else {
      if (debug) logInfo(logPrefix, `Check: No lock metadata key "${LOCK_METADATA_KEY}" found. Sheet is unlocked.`);
      return false; // No lock metadata found
    }
  } catch (error: unknown) {
    logError(logPrefix, `Check: Unexpected error checking lock status: ${error instanceof Error ? error.message : String(error)}`);
    if (debug) console.error(error);
    return false; // Treat errors during check as "not locked" to be safe
  }
}

/**
* Releases a lock on a target sheet by removing the lock metadata key,
* only if the provided expectedLockId matches the one currently in the metadata.
* Preserves other metadata fields.
*
* @param targetSheetId - The ID of the sheet whose lock should be released.
* @param expectedLockId - The unique identifier of the lock we expect to be holding.
* @param debug - Optional flag for verbose logging.
* @returns True if the lock was successfully released, if no lock was found, or if a mismatched lock was found. Returns false only on error during the release attempt.
*/
export async function releaseSheetMetadataLock(
  targetSheetId: string,
  expectedLockId: string,
  debug?: boolean
): Promise<boolean> {
  const logPrefix = `[MetadataLock sheet=${targetSheetId}]`;
  if (debug) logInfo(logPrefix, `Attempting to release lock ${expectedLockId}...`);
  
  try {
    // 1. Get current sheet metadata
    const { data: sheet } = await api.sheets.get(targetSheetId);
    const currentMetadata = sheet.metadata;
    if (debug) logInfo(logPrefix, `Fetched current metadata before release: ${JSON.stringify(currentMetadata)}`);
    
    // 2. Check if the lock key exists and is valid
    if (currentMetadata && typeof currentMetadata === 'object' && LOCK_METADATA_KEY in currentMetadata) {
      const lockData = currentMetadata[LOCK_METADATA_KEY];
      
      if (isSheetLockMetadata(lockData)) {
        // 3. Check if the lock ID matches the expected one
        if (lockData.lockId === expectedLockId) {
          if (debug) logInfo(logPrefix, `Found matching lock ${expectedLockId}. Attempting to remove lock key from metadata.`);
          
          // 4. Create new metadata object excluding the lock key
          const updatedMetadata = { ...currentMetadata };
          delete updatedMetadata[LOCK_METADATA_KEY];
          
          try {
            // 5. Update the sheet with the modified metadata
            if (debug) logInfo(logPrefix, `Attempting to update metadata to remove lock key: ${JSON.stringify(updatedMetadata)}`);
            await api.sheets.updateSheet(targetSheetId, { metadata: updatedMetadata });
            if (debug) logInfo(logPrefix, `Successfully removed lock key ${LOCK_METADATA_KEY} to release lock ${expectedLockId}.`);
            return true;
          } catch (updateError: unknown) {
            logError(logPrefix, `Failed to update metadata to release lock ${expectedLockId}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
            if (debug) console.error(updateError);
            return false; // Failed to release due to API error
          }
        } else {
          // Lock ID mismatch - another process holds the lock or acquired it after we checked
          if (debug) logInfo(logPrefix, `Lock ID mismatch. Found: ${lockData.lockId}, Expected: ${expectedLockId}. Not releasing.`);
          // Consider it released from *our* perspective, as we didn't hold it anymore.
          return true;
        }
      } else {
        // Invalid lock structure found
        if (debug) logInfo(logPrefix, `Found invalid or incomplete lock metadata during release attempt. Assuming lock is not held or needs clearing.`);
        // Potentially try to clear the corrupted key anyway? For now, treat as released/ignorable.
        return true;
      }
    } else {
      // No lock metadata key found
      if (debug) logInfo(logPrefix, `No lock metadata key "${LOCK_METADATA_KEY}" found on sheet. Nothing to release.`);
      return true; // No lock to release
    }
  } catch (error: unknown) {
    // oof somethin blew up
    logError(logPrefix, `Unexpected error releasing metadata lock ${expectedLockId}: ${error instanceof Error ? error.message : String(error)}`);
    if (debug) console.error(error);
    return false; 
  }
}
