"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.federate = federate;
const create_federate_action_1 = require("./listeners/create-federate-action");
const federate_job_1 = require("./listeners/federate-job");
const util_common_1 = require("@flatfile/util-common");
/**
 * Creates a federated workbook from a source workbook
 * @param config - Configuration for the federation process
 * @returns A Flatfile plugin function
 */
function federate(config) {
    const operation = `federate-${config.source_workbook_name.trim().toLowerCase().replace(/ /g, "-")}`;
    return function (listener) {
        try {
            if (config.debug)
                (0, util_common_1.logInfo)("📦 Federate Plugin", "Federate Plugin processing...");
            const federateAction = (0, create_federate_action_1.createFederateAction)(config, operation);
            const federateJobListener = (0, federate_job_1.createFederateJobListener)(config, operation);
            listener.use(federateAction);
            listener.use(federateJobListener);
            if (config.debug)
                (0, util_common_1.logInfo)("📦 Federate Plugin", "Federate Plugin enabled.");
        }
        catch (error) {
            (0, util_common_1.logError)("📦 Federate Plugin", "Error creating federate action: " + String(error.message));
            if (config.debug) {
                console.error(error);
            }
            (0, util_common_1.logError)("📦 Federate Plugin", "Federate Plugin disabled.");
        }
    };
}
//# sourceMappingURL=federate.js.map