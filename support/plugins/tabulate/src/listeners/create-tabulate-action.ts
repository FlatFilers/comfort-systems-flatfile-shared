import { FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { logInfo } from "@flatfile/util-common";
import { TabulateConfig, WorkbookEventContext } from "../lib/types";

/**
* Creates an action handler for the tabulate action.
* 
* This function sets up an event listener that responds to workbook creation events
* and conditionally adds a Tabulate action button to workbooks that match
* the configured source workbook name.
* 
* @param config - Configuration options for the tabulate plugin
* @param operation - The operation identifier string for this action
* @returns A function that registers the action handler with the Flatfile listener
*/
export function createTabulateAction(
  config: TabulateConfig, 
  operation: string
): (listener: FlatfileListener) => void {
  return function(listener: FlatfileListener): void {
    // Listen for workbook creation events to attach our action
    listener.on("workbook:created", async (event: { context: WorkbookEventContext }) => {
      const { context: {workbookId, spaceId } } = event;
      
      // Fetch the details of the newly created workbook
      const { data: workbook } = await api.workbooks.get(workbookId);
      
      // Selective action creation - only add the action to workbooks with matching names
      if (workbook.name === config.sourceWorkbookName) {
        if (config.debug) logInfo(`[Tabulate Action]`, `Creating Tabulate action for workbook "${workbook.name}" with operation "${operation}"`);
        
        // Create the action button in the UI with the specified configuration
        await api.actions.create({
          spaceId: spaceId,
          body: {
            targetId: workbookId,                                   // The workbook this action will be attached to
            operation: operation,                                   // The operation identifier for the action
            mode: config.action?.mode || "foreground",              // How the action should be executed (foreground = blocking UI)
            label: config.action?.label || "Tabulate",      // Display text for the action button
            primary: config.action?.primary ?? true,                // Whether this is a primary action (affects UI styling)
            description: config.action?.description || "Create Calculations Workbook with source data",  // Tooltip/description
            confirm: config.action?.confirm ?? true,                // Whether to show a confirmation dialog before running
            mount: { type: "workbook" },                            // Mount point in the UI (workbook level)
          }
        });
        
        if (config.debug) logInfo(`[Tabulate Action]`, `Tabulate action created for workbook "${workbook.name}"`);
      } else {
        // Log that we're skipping this workbook since it doesn't match our target name
        if (config.debug) logInfo(`[Tabulate Action]`, `Skipping creation of Tabulate action for workbook "${workbook.name}"`);
      }
    });
  };
}