import { Flatfile } from "@flatfile/api";
import { FederateConfig, FederatedSheetConfig, FederatedUnpivotSheetConfig } from "../../types";
export declare class FederatedSheetManager {
    private recordsBySheetId;
    private sourceMappings;
    private dedupeConfigs;
    private sheetFilters;
    private virtualFieldKeys;
    private config;
    constructor(config: FederateConfig);
    clearMappings(): void;
    clearRecords(): void;
    hasSourceSheet(slug: string): boolean;
    createMappings(blueprint: FederatedSheetConfig | FederatedUnpivotSheetConfig, sheet: Flatfile.Sheet): Promise<void>;
    addRecords(sourceSlug: string, records: Flatfile.RecordWithLinks[]): Promise<void>;
    getRecords(): Map<string, Flatfile.RecordData[]>;
    private findBlueprint;
}
