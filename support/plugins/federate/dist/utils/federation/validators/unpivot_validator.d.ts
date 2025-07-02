import { FederatedUnpivotSheetConfig, UnpivotGroupConfig } from "../../../types/federated_unpivot_sheet_config";
import { FederateConfig } from "../../../types/federate_config";
export declare function hasSourceSheetSlug(group: UnpivotGroupConfig): boolean;
export declare function hasSourceSheet(group: UnpivotGroupConfig): boolean;
/**
* Validates that source fields exist in the source sheet
* @param group - The unpivot group configuration
* @param groupKey - The key of the unpivot group
* @param federateConfig - Federation configuration with debug settings
* @throws Error if any source field doesn't exist in the source sheet
*/
export declare function validateSourceFields(group: UnpivotGroupConfig, groupKey: string, federateConfig: FederateConfig): void;
/**
* Validates an unpivot configuration
* @param sheet - The sheet configuration to validate
* @param federateConfig - Federation configuration with debug settings
* @throws Error if the configuration is invalid
*/
export declare function validateUnpivotConfig(sheet: any, federateConfig: FederateConfig): void;
/**
* Validates that all fields in a FederatedUnpivotSheetConfig are properly configured
* @param sheet - The sheet configuration to validate
* @param federateConfig - Federation configuration with debug settings
*/
export declare function validateUnpivotFields(sheet: FederatedUnpivotSheetConfig, federateConfig: FederateConfig): void;
