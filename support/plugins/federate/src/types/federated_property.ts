import { Flatfile } from "@flatfile/api";

/**
 * Property type for standard federation sheets.
 * Each field can be configured to map directly to a field in a source sheet.
 */
export type FederatedProperty = Flatfile.Property & {
  key: string;
  type: string;
  federate_config?: {
    source_field_key?: string;
  } & (
    | { source_sheet: Flatfile.SheetConfig; source_sheet_slug?: never }
    | { source_sheet?: never; source_sheet_slug: string }
  );
}