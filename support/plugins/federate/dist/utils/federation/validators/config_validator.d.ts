import { FederateConfig } from "../../../types";
/**
* Validates the federation configuration and returns a set of all source sheet slugs.
* This function performs a comprehensive validation of the federation configuration:
*
* 1. Verifies that the workbook contains at least one sheet
* 2. Ensures all sheet slugs are unique within the configuration
* 3. Validates that each sheet has at least one field
* 4. Validates field configurations using the field validator
* 5. Validates merge configurations using the merge validator
* 6. Validates unpivot groups using the unpivot validator (only for unpivot sheets)
* 7. Validates filter configurations using the filter validator
*
* @param config - The federation configuration to validate
* @returns Set of all source sheet slugs used in the federation
* @throws Error if any validation rules are violated, with detailed error messages
*/
export declare function validateConfig(config: FederateConfig): Set<string>;
