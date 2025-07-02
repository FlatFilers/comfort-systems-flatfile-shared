import { FlatfileListener } from "@flatfile/listener";
import { logInfo, logError } from "@flatfile/util-common";

import { TabulateConfig } from "./lib/types";
import { validateWorkbookName, formatResourceName } from "./lib/utils";
import { createTabulateJobListener } from "./listeners/create-tabulate-job";
import { createTabulateAction } from "./listeners/create-tabulate-action";

/**
* Main plugin function that sets up the tabulate functionality.
* 
* This plugin tracks data quality metrics across sheets in a workbook, including:
* - Valid row counts and percentages
* - Invalid row counts and percentages
* - Timestamps for historical tracking
* 
* The calculated metrics are stored in a separate workbook for easy access and analysis.
* 
* @param config - Configuration options for the plugin including the source workbook name
* @returns A function that registers the plugin with a Flatfile listener
* @throws Error if the source workbook name is invalid
*/

// Default config values for TabulateConfig
const DEFAULT_CONFIG = {
  debug: false,
  showCalculationsOnComplete: true,
  watch: false,
  action: {
    confirm: true,
    mode: "foreground" as "foreground",
    label: "Tabulate",
    description: "Calculate data quality scores for this workbook.",
    primary: true,
  },
};

export function tabulate(_config: TabulateConfig): (listener: FlatfileListener) => void {
  const config: TabulateConfig = {
    ...DEFAULT_CONFIG,
    ..._config,
    action: {
      ...DEFAULT_CONFIG.action,
      ...(_config.action || {}),
    },
  };

  // Validate source workbook name at initialization time to catch configuration errors early
  try {
    validateWorkbookName(config.sourceWorkbookName);
  } catch (error) {
    logError("[Tabulate Plugin]", `Error validating source workbook name (${config.sourceWorkbookName}): ${error.message}`);
    throw error;
  }
  
  // Create a unique operation identifier for this specific workbook configuration
  // This prevents conflicts if multiple instances of the plugin are used for different workbooks
  const operation = `tabulate-${formatResourceName(config.sourceWorkbookName)}`;
  
  // Return the plugin function that will be called when registered with a listener
  return function(listener: FlatfileListener): void {
    try {
      // Log initialization progress if debugging is enabled
      if (config.debug) logInfo("[Tabulate Plugin]", "Tabulate Plugin processing...");
      
      // Create the component listeners that make up this plugin
      // 1. The action - creates a button in the UI for users to trigger the calculation
      const tabulateAction = createTabulateAction(config, operation);
      // 2. The job listener - handles the actual calculation when the action is triggered
      const tabulateJobListener = createTabulateJobListener(config, operation);
      
      // Register both components with the main listener
      listener.use(tabulateAction);
      listener.use(tabulateJobListener);
      
      // Log successful initialization if debugging is enabled
      if (config.debug) logInfo("[Tabulate Plugin]", "Tabulate Plugin enabled.");
    } catch (error: unknown) {
      // Handle any errors during initialization, ensuring they are properly logged
      logError("[Tabulate Plugin]", "Error creating Tabulate action: " + (error instanceof Error ? error.message : String(error)));
      // Provide more detailed error information in debug mode
      if (config.debug) {
        console.error(error);
      }
      logError("[Tabulate Plugin]", "Tabulate Plugin disabled.");
    }
  };
}

