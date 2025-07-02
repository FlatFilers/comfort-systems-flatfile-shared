import { FlatfileListener } from "@flatfile/listener";
import { jobHandler } from "@flatfile/plugin-job-handler";
import { safe } from "../../support/requests";

/**
 * Listener that handles smart import functionality for CSUSA
 * Creates a canvas experience for intelligent data mapping and import
 */
export function smartImportListener(listener: FlatfileListener) {
  console.log("🔌 CSUSA smart import listener initialized");

  // Listen for file:smart-import job
  listener.use(
    jobHandler("file:smart-import", async (event) => {
      console.log(`🚀 Smart import job started: ${event.context.jobId}`);

      try {
        const file = await safe.files.get(event.context.fileId);
        console.log(`📄 Processing file: ${file?.name} (${file?.id})`);

        const job = await safe.jobs.get(event.context.jobId);
        console.log(`⚙️ Job details retrieved: ${job?.id}`);

        const sourceWorkbook = await safe.workbooks.get(file.workbookId || '');
        console.log(`📊 Source workbook loaded: ${sourceWorkbook?.name} (${sourceWorkbook?.id})`);

        const workbooks = await safe.workbooks.list({
          spaceId: event.context.spaceId,
        });

        const dataLoadWorkbook = workbooks.find(wb => wb.name === "Data Load Workbook");

        if(!dataLoadWorkbook){
          throw new Error("Data Load Workbook not found");
        }

        const allDataSheet = dataLoadWorkbook.sheets?.find(s => s.name === "All Data");
        if(!allDataSheet){
          throw new Error("All Data sheet not found");
        }
        console.log(`📗 All Data sheet found: ${allDataSheet?.name} (${allDataSheet?.id})`);

        const sourceSheet = sourceWorkbook.sheets?.[0];
        if (!sourceSheet) {
          throw new Error("No sheet found in primary workbook");
        }
        console.log(`📗 Source sheet found: ${sourceSheet?.name} (${sourceSheet?.id})`);

        console.log(`🎨 Creating canvas for CSUSA smart import experience`);
        const canvas = await safe.canvas.create({
          namespace: "CSUSA-smart-import",
          spaceId: event.context.spaceId,
        });

        // Create mapping job for field mapping
        const mappingJob = await safe.jobs.create({
          type: "workbook",
          operation: "map",
          source: sourceWorkbook.id,
          destination: dataLoadWorkbook.id,
          config: {
            sourceSheetId: sourceSheet.id,
            destinationSheetId: allDataSheet.id,
            allowAdditionalFields: true,
            mode: "flexible", // Allow flexible mapping
          },
          trigger: "manual",
          mode: "background",
        });

        // Create header area with CSUSA branding
        await safe.canvasArea.create({
            canvasId: canvas.id,
            layout: "split",
            position: "top",
            type: "header",
            config: {
                title: "CSUSA Smart Import",
                subtitle: `Processing: ${file.name}`,
                actions: [
                {
                    label: "Cancel Import",
                    variant: "outline",
                    type: "goto-path",
                    config: {
                    path: `/files`,
                    },
                },
                {
                    label: "Complete Import",
                    type: "emit-canvas-event",
                    config: {
                    event: "mapping.continue",
                    },
                    variant: "primary",
                },
                ],
            },
        });
    
        console.log(`🖼️ Canvas created: ${canvas.id}`);
        console.log(`🔄 Creating mapping job between workbooks`);
          
        // Create main sheet area (middle position for full view)
        await safe.canvasArea.create({
            canvasId: canvas.id,
            layout: "split",
            position: "middle",
            type: "sheet",
            config: {
                size: "lg",
                sheetId: sourceSheet.id,
                workbookId: sourceWorkbook.id,
                sourceSheetId: sourceSheet.id,
                destinationSheetId: allDataSheet.id,
            },
        });

        // Create mapping area (right side for field mapping)
        await safe.canvasArea.create({
          canvasId: canvas.id,
          layout: "split",
          position: "right",
          type: "mapping",
          config: {
            size: "md",
            jobId: mappingJob.id,
            sourceSheetId: sourceSheet.id,
            destinationSheetId: allDataSheet.id,
            allowAdditionalFields: true,
            enableFieldCreation: true, // Explicitly enable field creation
          },
        });

        // Create AI agent area (left side for intelligent assistance)
        await safe.canvasArea.create({
          canvasId: canvas.id,
          layout: "split",
          position: "left",
          type: "agent",
          config: {
            sheetId: sourceSheet.id,
            destinationSheetId: allDataSheet.id,
            size: "md",
            jobId: mappingJob.id,
            allowClose: true,
            allowExpand: true,
            expanded: false,
          },
          metadata: {
            destinationSheetId: allDataSheet.id,
          },
        });

        console.log(`✅ CSUSA smart import setup completed for file: ${file.name}`);
        
        return {
          outcome: {
            message: "CSUSA Smart Import Starting...",
            trigger: {
              audience: "all",
              type: "automatic_silent",
            },
            next: {
              type: "id",
              id: canvas.id,
            },
          },
        };
      } catch (error) {
        console.error(`❌ Error during CSUSA smart import:`, error);
        throw error;
      }
    }),
  );
} 