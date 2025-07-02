import { federate } from "../../support/plugins/federate/src";
import { federatedWorkbook } from "../blueprints/workbooks/federated.workbook";


export const federateListener = federate({
  source_workbook_name: "Data Load Workbook", // Name of the source workbook containing raw data
  federated_workbook: federatedWorkbook,
  debug: true, // Set to true for detailed logging during development
  action: {
    confirm: false,
    mode: "foreground",
    label: "Create Views",
    description: "Create federated views of data",
    primary: true,
  },
}); 