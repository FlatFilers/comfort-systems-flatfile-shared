import { AddressInput } from './address';

/**
 * Plugin-specific types for SmartyStreets plugin
 */

/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Return type for the standalone validateAddress utility.
 */
export type ValidateAddressResult =
  | { valid: true; original: AddressInput }
  | { valid: true; transformation: string | Partial<AddressInput>; original: AddressInput }
  | { valid: false; invalidFields?: string[]; message: string; suggestedFixes?: Record<string, string> };