import type { FieldsConfig } from '../types/config'; // Use 'type' for type-only import

/**
* Defines critical footnote codes (with # suffix) from SmartyStreets analysis
* that indicate a validation failure, even if a delivery line was returned.
* Maps code to a user-friendly reason.
*/
export const CRITICAL_FAILURE_FOOTNOTES: ReadonlyMap<string, string> = new Map([
    ['C#', "Invalid City/State/ZIP combination"],
    ['D#', "Address not found in USPS data (no ZIP+4 assigned)"],
    ['F#', "Address not found as submitted"],
    ['I#', "Address data insufficient or incorrect for unique match"],
    ['J#', "Input contained multiple addresses (dual address)"],
    ['T#', "Ambiguous address due to potential missing street suffix/type (magnet street)"],
    ['W#', "Address is in a ZIP Code with no USPS street delivery"]
    // R# excluded for now
]);

/**
* Defines informational footnote codes (with # suffix) from SmartyStreets analysis.
* These indicate corrections or standardizations were made, or provide other context.
* Maps code to a message and a hint for which field type is most relevant.
*/
export const INFORMATIONAL_FOOTNOTES: ReadonlyMap<string, { msg: string, fieldHint?: keyof FieldsConfig['fields'] }> = new Map([
    ['A#', { msg: "ZIP Code corrected by SmartyStreets", fieldHint: 'zip' }],
    ['B#', { msg: "City/State spelling standardized by SmartyStreets", fieldHint: 'city' }],
    ['K#', { msg: "Address direction (N/S/E/W) corrected by SmartyStreets", fieldHint: 'street' }],
    ['L#', { msg: "Address component added/changed/deleted by SmartyStreets for match", fieldHint: 'street' }],
    ['M#', { msg: "Street spelling corrected by SmartyStreets", fieldHint: 'street' }],
    ['N#', { msg: "Address standardized by SmartyStreets", fieldHint: undefined }], // General
    ['P#', { msg: "Address standardized to preferred USPS format by SmartyStreets", fieldHint: undefined }], // General
    ['U#', { msg: "City name standardized to official USPS name by SmartyStreets", fieldHint: 'city' }],
    ['V#', { msg: "City/State differs from standard for ZIP Code per SmartyStreets", fieldHint: 'city' }],
    ['Z#', { msg: "Address found in updated ZIP Code via SmartyStreets ZIPMOVE", fieldHint: 'zip' }],
    // Others ignored as less actionable for user messages
]);

/**
* Footnote codes (with # suffix) related to secondary address information.
*/
export const SECONDARY_FOOTNOTES = {
    MISSING: 'H#', // Corresponds to enhanced_match 'missing-secondary'
    UNKNOWN: 'S#'  // Corresponds to enhanced_match 'unknown-secondary'
} as const;

/** Symbolic indicator for secondary address issues used in invalidFields */
export const SECONDARY_FIELD_SYMBOL = 'secondary';