import { Flatfile } from "@flatfile/api";
import { FederatedSheetConfig } from "./federated_sheet_config";
export interface FederatedWorkbookConfig extends Omit<Flatfile.CreateWorkbookConfig, 'sheets'> {
    sheets: (FederatedSheetConfig | FederatedSheetConfig)[];
}
