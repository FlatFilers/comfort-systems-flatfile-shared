import { Flatfile } from "@flatfile/api";
import { FederatedSheetConfig } from "./federated_sheet_config";

export type UnpivotGroupConfig = {
  field_mappings: { [key: string]: string }[];
} & (
  | { source_sheet: Flatfile.SheetConfig; source_sheet_slug?: never }
  | { source_sheet?: never; source_sheet_slug: string }
);

export interface FederatedUnpivotSheetConfig extends Omit<FederatedSheetConfig, 'fields'> {
  unpivot_groups: {
    [key: string]: UnpivotGroupConfig
  };
  fields: Flatfile.Property[];
}

