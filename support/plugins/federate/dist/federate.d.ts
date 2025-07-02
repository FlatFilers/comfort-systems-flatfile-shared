import FlatfileListener from "@flatfile/listener";
import { FederateConfig } from "./types";
/**
 * Creates a federated workbook from a source workbook
 * @param config - Configuration for the federation process
 * @returns A Flatfile plugin function
 */
export declare function federate(config: FederateConfig): (listener: FlatfileListener) => void;
