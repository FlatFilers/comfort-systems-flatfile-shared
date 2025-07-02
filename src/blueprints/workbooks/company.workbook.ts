import { Flatfile } from "@flatfile/api";
import { allDataSheet } from "../sheets/all-data.sheet";
import { submitBlueprint } from "../actions/submit.action";

export const companyWorkbook: Flatfile.CreateWorkbookConfig = {
  name: "Data Load Workbook",
  labels: [ "pinned" ],
  sheets: [ allDataSheet ],
  actions: [ submitBlueprint ],
};
