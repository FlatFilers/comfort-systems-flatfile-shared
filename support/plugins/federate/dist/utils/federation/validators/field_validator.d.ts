import { FederatedProperty } from "../../../types/federated_property";
import { FederateConfig } from "../../../types/federate_config";
/**
* Validates fields (both real and virtual) in a sheet configuration,
* checks for key collisions, collects source sheet slugs, and returns all unique keys.
* @param realFields - Array of real field configurations defined in `fields`.
* @param virtualFields - Array of virtual field configurations defined in `virtualFields`.
* @param sheetSlug - Slug of the sheet being validated.
* @param sourceSheets - Set to collect source sheet slugs referenced by any field.
* @param federateConfig - Federation configuration object.
* @returns Set of ALL unique field keys (real + virtual) in the sheet.
*/
export declare function validateFields(// Renamed back from validateAllFields
realFields: FederatedProperty[], virtualFields: FederatedProperty[] | undefined, sheetSlug: string, sourceSheets: Set<string>, federateConfig: FederateConfig): Set<string>;
export declare function validateField(field: FederatedProperty, federateConfig: FederateConfig): void;
