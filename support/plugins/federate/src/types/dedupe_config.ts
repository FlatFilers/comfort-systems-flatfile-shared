/**
 * Configuration for merging duplicate records
 */
export interface DedupeConfig {
  /** Field key(s) to merge records on */
  on: string | string[];
  /** Merge strategy - delete keeps one record, merge combines values */
  type: 'delete' | 'merge';
  /** Which record to prioritize when merging or deleting */
  keep: 'first' | 'last';
} 