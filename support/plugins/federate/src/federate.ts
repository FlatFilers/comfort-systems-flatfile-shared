import FlatfileListener from "@flatfile/listener";
import { FederateConfig } from "./types";
import { createFederateAction } from "./listeners/create-federate-action";
import { createFederateJobListener } from "./listeners/federate-job";
import { logError, logInfo, logWarn } from "@flatfile/util-common";

/**
 * Creates a federated workbook from a source workbook
 * @param config - Configuration for the federation process
 * @returns A Flatfile plugin function
 */
export function federate(config: FederateConfig) {
  const operation =  `federate-${config.source_workbook_name.trim().toLowerCase().replace(/ /g, "-")}`;
  
  return function(listener: FlatfileListener) {
    try {

      if (config.debug) logInfo("📦 Federate Plugin", "Federate Plugin processing...")

      const federateAction = createFederateAction(config, operation);
      const federateJobListener = createFederateJobListener(config, operation);
      listener.use(federateAction);
      listener.use(federateJobListener);

      if (config.debug) logInfo("📦 Federate Plugin", "Federate Plugin enabled.")
    } catch (error) {
      logError("📦 Federate Plugin", "Error creating federate action: " + String((error as Error).message));
      if (config.debug) {
        console.error(error);
      }
      logError("📦 Federate Plugin", "Federate Plugin disabled.");
    }
  };
} 