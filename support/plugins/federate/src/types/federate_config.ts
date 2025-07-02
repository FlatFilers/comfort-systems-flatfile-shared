import { FederatedWorkbookConfig } from "./federated_workbook";

/**
 * Federation Configuration
 * 
 * This type defines the configuration options for the federation plugin.
 * The federation plugin allows creating specialized views of data from a source workbook.
 */
export type FederateConfig = {
  /**
   * The name of the workbook containing the source data.
   * This is the workbook that will be used as the source for federation.
   */
  source_workbook_name: string;
  
  /**
   * The workbook configuration for the federated views.
   * This defines the structure and behavior of the federated workbook.
   */
  federated_workbook: FederatedWorkbookConfig;
  
  /**
   * Whether to allow fields that don't exist in the source sheet.
   * 
   * When set to true, the federation process will not validate that fields
   * referenced in the federated workbook exist in the source workbook.
   * This allows for importing custom fields that may be added to the source
   * data outside of the standard schema.
   * 
   * Default: false
   */
  allow_undeclared_source_fields?: boolean; 

  /**
   * Whether to enable debug mode.
   * 
   * When set to true, the federation process will log detailed information
   * about the federation process to the console.
   * 
   * Default: false
   */
  debug?: boolean;
  
  /**
   * Action Configuration
   * 
   * This property configures the action that triggers the federation process.
   * The action appears as a button in the Flatfile UI that users can click to
   * initiate the federation process.
   * 
   * Configuration options:
   * - confirm: Whether to show a confirmation dialog before federation (default: true)
   * - mode: The execution mode of the action (default: "foreground")
   *   - "foreground": The action runs in the foreground with visible progress
   *   - "background": The action runs in the background without blocking the UI
   * - label: The text displayed on the action button (default: "Federate")
   * - description: A description of the action displayed in tooltips/modals
   * - primary: Whether this is a primary action (default: true)
   *   - Primary actions are more prominent in the UI
   * 
   * Example:
   * ```typescript
   * action: {
   *   confirm: false,  // No confirmation dialog
   *   mode: "background",  // Run in background
   *   label: "Create Views",  // Custom button text
   *   description: "Create specialized views of the data",  // Custom description
   *   primary: true  // Make this a primary action
   * }
   * ```
   */
  action?: {
    confirm?: boolean;
    mode?: "foreground" | "background";
    label?: string;
    description?: string;
    primary?: boolean;
  }
} 