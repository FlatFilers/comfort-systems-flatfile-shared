import { Flatfile } from "@flatfile/api";
import { FederatedProperty } from "./federated_property";
import { DedupeConfig } from "./dedupe_config";
export interface FederatedSheetConfig extends Omit<Flatfile.SheetConfig, 'fields' | 'slug'> {
  slug: string;
  fields: FederatedProperty[];
  virtualFields?: FederatedProperty[]; // Fields for filtering/deduping only
  dedupe_config?: DedupeConfig;
  all_fields_required?: string[];
  any_fields_required?: string[];
  any_fields_excluded?: string[]; // Fields that must not be populated in the source sheet in order to be federated
  field_values_required?: {
    [key: string]: string[];
  }
  field_values_excluded?: {
    [key: string]: string[];
  }
}