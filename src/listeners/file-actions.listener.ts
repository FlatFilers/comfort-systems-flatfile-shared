import { FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";

/**
 * Listener that adds custom smart import actions to files in CSUSA
 */
export function fileActionsListener(listener: FlatfileListener) {
  console.log("🔌 CSUSA file actions listener initialized");

  // Listen for file:created events
  listener.on("file:created", async (event: FlatfileEvent) => {
    console.log(`📁 File created event: ${event.context.fileId}`);
    try {
      // Get the file data
      const { data: file } = await api.files.get(event.context.fileId);
      console.log(`📄 File detected: ${file?.name} (${file?.id})`);

      // TODO: Update the import form to be able to include a dropdown
      await api.files.update(file.id, {
        actions: [
          {
            operation: "choose-type",
            mode: "background",
            label: "CSUSA Smart Import",
            description:
              "Use AI-powered mapping to import your data intelligently",
            primary: true,
            // inputForm: {
            //   fields: [
            //     {
            //       key: "type",
            //       label: "Type",
            //       type: "enum",
            //       options: ["default", "extras", "walker", "prevailing-wage"],
            //     },
            //   ],
            // },
          },
        ],
      });

      console.log(
        `✅ Added "CSUSA Smart Import" action to file: ${file?.name}`
      );
    } catch (error) {
      console.error("❌ Error processing file:created event:", error);
    }
  });
}
