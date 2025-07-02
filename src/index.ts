import "@flatfile/http-logger/init";

import FlatfileListener, { Listener } from "@flatfile/listener";
import { ExcelExtractor } from "@flatfile/plugin-xlsx-extractor";
import { spaceConfig } from "./listeners/configure-space.listener";
import { submitListener } from "./listeners/submit.listener";
import { allDataHook } from "./listeners/users-hook.listener";
import { smartImportListener } from "./listeners/smart-import.listener";
import { exportDelimitedZip } from "@flatfile/plugin-export-delimited-zip";
import { fileActionsListener } from "./listeners/file-actions.listener";
import { federateListener } from "./listeners/federated.listener";
import { automap } from "@flatfile/plugin-automap";

export default function (listener: FlatfileListener) {
  // Globally installed plugins
  listener.use(ExcelExtractor({ rawNumbers: true }));

  listener.use(spaceConfig);
  listener.use(submitListener);
  listener.use(allDataHook);
  //listener.use(fileActionsListener);
  //listener.use(smartImportListener);
  listener.on("**", (event) => {
    console.log(`Received event: ${(JSON.stringify(event), null, 2)}`);
  });
  listener.use(
    automap({
      accuracy: "exact",
      defaultTargetSheet: "all-data",
      matchFilename: /.*/,
    })
  );
  listener.use(federateListener);
  listener.use(
    exportDelimitedZip({
      job: "submit",
      delimiter: ",",
      fileExtension: "csv",
    })
  );
}
