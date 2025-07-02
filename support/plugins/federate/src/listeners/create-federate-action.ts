import { FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { FederateConfig } from "../types";
import { logInfo } from "@flatfile/util-common";
/**
 * Creates a function that sets up a listener for workbook creation events
 * and creates a federate action on the specified source workbook
 * 
 * @param config - Configuration object containing settings for the federate action
 * @param operation - The operation identifier for the federate action
 * @returns A function that takes a FlatfileListener and sets up the workbook creation event handler
 */
export function createFederateAction(config: FederateConfig, operation: string) {
  return function(listener: FlatfileListener) {
    // Listen for workbook creation events
    listener.on("workbook:created", async (event) => {
      const { context: {workbookId, spaceId } } = event;
      
      // Get the details of the created workbook
      const { data: workbook } = await api.workbooks.get(workbookId);
      
      // Only create the federate action if this is the source workbook we're looking for
      if (workbook.name === config.source_workbook_name) {
        if (config.debug) logInfo(`📦 Federate Plugin`, `Creating federate action for workbook "${workbook.name}"`);
        // Create the federate action with the specified configuration
        await api.actions.create({
          spaceId: spaceId,
          body: {
            targetId: workbookId,                                   // The workbook this action will be attached to
            operation: operation,                                   // The operation identifier for the action
            mode: config.action?.mode || "foreground",              // How the action should be executed
            label: config.action?.label || "📦  FEDERATE  📦",     // Display label for the action
            primary: config.action?.primary ?? true,                // Whether this is a primary action
            description: config.action?.description || "Create Federated Workbook with source data",  // Action description
            confirm: config.action?.confirm ?? true,                // Whether to show confirmation dialog
            mount: { type: "workbook" },                            // Mount the action at workbook level
          }
        })
        if (config.debug) logInfo(`📦 Federate Plugin`, `Federate action created for workbook "${workbook.name}"`);
      } else {
        if (config.debug) logInfo(`📦 Federate Plugin`, `Skipping creation of federate action for workbook "${workbook.name}"`);
      }
    });
  }
} 