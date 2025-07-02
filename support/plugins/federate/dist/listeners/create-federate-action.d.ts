import { FlatfileListener } from "@flatfile/listener";
import { FederateConfig } from "../types";
/**
 * Creates a function that sets up a listener for workbook creation events
 * and creates a federate action on the specified source workbook
 *
 * @param config - Configuration object containing settings for the federate action
 * @param operation - The operation identifier for the federate action
 * @returns A function that takes a FlatfileListener and sets up the workbook creation event handler
 */
export declare function createFederateAction(config: FederateConfig, operation: string): (listener: FlatfileListener) => void;
