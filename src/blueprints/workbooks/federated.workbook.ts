import { FederatedWorkbookConfig } from "../../../support/plugins/federate/src";
import { submitBlueprint } from "../actions/submit.action";
import {
    defaultFederatedSheet,
    extrasFederatedSheet,
    prevailingWagesFederatedSheet,
    walkerFederatedSheet
} from "../sheets/index";

export const federatedWorkbook: FederatedWorkbookConfig = {
  name: "Data Federation",
  labels: ["pinned"],
  sheets: [
    defaultFederatedSheet,
    extrasFederatedSheet,
    prevailingWagesFederatedSheet,
    walkerFederatedSheet
  ],
  actions: [submitBlueprint],
}; 