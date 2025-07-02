import { FlatfileListener } from "@flatfile/listener";
import { FederateConfig } from "../types";
/**
 * Creates a job listener for handling workbook federation operations
 * This listener processes the federation of data from source sheets to a new federated workbook
 *
 * @param config - Configuration object containing federation settings and workbook structure
 * @param operation - The specific operation to handle (e.g., 'federate')
 * @returns A function that sets up the job listener with the provided configuration
 */
export declare function createFederateJobListener(config: FederateConfig, operation: string): (listener: FlatfileListener) => void;
