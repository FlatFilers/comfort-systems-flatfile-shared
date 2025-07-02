import "@flatfile/http-logger/init"

import FlatfileListener, { Listener } from "@flatfile/listener";
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";
import { spaceConfig } from "./listeners/configure-space.listener";
import { submitListener } from "./listeners/submit.listener";
import { usersHook } from "./listeners/users-hook.listener";
import { smartImportListener } from "./listeners/smart-import.listener";
import { exportDelimitedZip } from "@flatfile/plugin-export-delimited-zip";
import { fileActionsListener } from "./listeners/file-actions.listener";
import { federateListener } from "./listeners/federated.listener";

export default function (listener: FlatfileListener) {
  // Globally installed plugins
  listener.use(ExcelExtractor());

  listener.use(spaceConfig);
  listener.use(submitListener);
  listener.use(usersHook);
  listener.use(fileActionsListener);
  listener.use(smartImportListener);
  listener.use(federateListener);
  listener.use(
    exportDelimitedZip({
      job: "submit",
      delimiter: ",",
      fileExtension: "csv",
    }),
  );
  // Disabled for deployed agents
  if (!process.env.LAMBDA_TASK_ROOT) {
    listener.on("**", (event) => {
      console.log(`Received event: ${event.topic}`);
    });
  }
}
