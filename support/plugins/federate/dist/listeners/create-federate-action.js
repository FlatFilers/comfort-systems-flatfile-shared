"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFederateAction = createFederateAction;
const api_1 = __importDefault(require("@flatfile/api"));
const util_common_1 = require("@flatfile/util-common");
/**
 * Creates a function that sets up a listener for workbook creation events
 * and creates a federate action on the specified source workbook
 *
 * @param config - Configuration object containing settings for the federate action
 * @param operation - The operation identifier for the federate action
 * @returns A function that takes a FlatfileListener and sets up the workbook creation event handler
 */
function createFederateAction(config, operation) {
    return function (listener) {
        // Listen for workbook creation events
        listener.on("workbook:created", async (event) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const { context: { workbookId, spaceId } } = event;
            // Get the details of the created workbook
            const { data: workbook } = await api_1.default.workbooks.get(workbookId);
            // Only create the federate action if this is the source workbook we're looking for
            if (workbook.name === config.source_workbook_name) {
                if (config.debug)
                    (0, util_common_1.logInfo)(`📦 Federate Plugin`, `Creating federate action for workbook "${workbook.name}"`);
                // Create the federate action with the specified configuration
                await api_1.default.actions.create({
                    spaceId: spaceId,
                    body: {
                        targetId: workbookId, // The workbook this action will be attached to
                        operation: operation, // The operation identifier for the action
                        mode: ((_a = config.action) === null || _a === void 0 ? void 0 : _a.mode) || "foreground", // How the action should be executed
                        label: ((_b = config.action) === null || _b === void 0 ? void 0 : _b.label) || "📦  FEDERATE  📦", // Display label for the action
                        primary: (_d = (_c = config.action) === null || _c === void 0 ? void 0 : _c.primary) !== null && _d !== void 0 ? _d : true, // Whether this is a primary action
                        description: ((_e = config.action) === null || _e === void 0 ? void 0 : _e.description) || "Create Federated Workbook with source data", // Action description
                        confirm: (_g = (_f = config.action) === null || _f === void 0 ? void 0 : _f.confirm) !== null && _g !== void 0 ? _g : true, // Whether to show confirmation dialog
                        mount: { type: "workbook" }, // Mount the action at workbook level
                    }
                });
                if (config.debug)
                    (0, util_common_1.logInfo)(`📦 Federate Plugin`, `Federate action created for workbook "${workbook.name}"`);
            }
            else {
                if (config.debug)
                    (0, util_common_1.logInfo)(`📦 Federate Plugin`, `Skipping creation of federate action for workbook "${workbook.name}"`);
            }
        });
    };
}
//# sourceMappingURL=create-federate-action.js.map