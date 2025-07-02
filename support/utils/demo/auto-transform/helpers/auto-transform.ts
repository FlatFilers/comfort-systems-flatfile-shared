import { FlatfileEvent, FlatfileListener } from "@flatfile/listener";
import api from "@flatfile/api";
import { jobHandler } from "@flatfile/plugin-job-handler";

export function autoTransform(
  params: {
    sheetSlug: string,
    jobMode?: "foreground" | "background",
    jobAckInfo?: string,
    jobUpdateInfoPrefix?: string,
    jobUpdateInfoSuffix?: string,
    jobCompleteInfo?: string,
    snapshotLabelPrefix?: string,
    transformFunctions: Array<{functionName: string, fieldName: string, callbackFunction: any}>
  }
): (listener: FlatfileListener) => void {
  return (listener: FlatfileListener) => {

    const jobMode = params.jobMode || "foreground";
    const jobAckInfo = params.jobAckInfo || "Starting to transform records...";
    const jobUpdateInfoPrefix = params.jobUpdateInfoPrefix || "Transforming records - ";
    const jobUpdateInfoSuffix = params.jobUpdateInfoSuffix || "...";
    const jobCompleteInfo = params.jobCompleteInfo || "Transforming records complete";
    const snapshotLabelPrefix = params.snapshotLabelPrefix || "Initial Transform: ";

    listener.on("job:created", {job: "sheet:auto-transform"},
      async (event: FlatfileEvent) => {
        const { jobId, sheetId } = event.context;
        try{
          await api.jobs.ack(jobId, {info: jobAckInfo});
          const progressIncrement = 100 / params.transformFunctions.length;
          let progress = 0 + progressIncrement;

          for (const transformFunction of params.transformFunctions) {
              await api.jobs.update(jobId, {progress: progress, info: jobUpdateInfoPrefix + transformFunction.functionName + jobUpdateInfoSuffix});
              const updates = await executeTransform(transformFunction, sheetId);
              await api.snapshots.createSnapshot({sheetId: sheetId, label: snapshotLabelPrefix + transformFunction.functionName});
              if (updates.length > 0) {
                  await api.records.update(sheetId, updates);
              }
              progress += progressIncrement;
          }

          await api.jobs.complete(jobId, {outcome: {message: jobCompleteInfo}});
        } catch (error) {
          await api.jobs.fail(jobId, {outcome: {message: "Error transforming records"}});
        }
    });

    listener.on("job:completed", {job: "workbook:map"},
      async (event: FlatfileEvent) => {
        const { jobId, workbookId } = event.context;
        const workbook = await api.workbooks.get(workbookId);
        const sheet = workbook.data.sheets.find((sheet) => sheet.slug === params.sheetSlug);
        const sheetId = sheet.id;

        const job = await api.jobs.create({
            type: "sheet",
            operation: "auto-transform",
            source: sheetId,
            mode: jobMode
        });

        await api.jobs.execute(job.data.id);
    });
  }
}

async function executeTransform(transformFunction: any, sheetId: any): Promise<any> {
  try{
    const updates = [];
    const records = await api.records.get(sheetId);
    const recordsArray = records.data.records;
    const fieldName = transformFunction.fieldName;

    recordsArray.forEach(async (record) => {
        let updateRecord = false;
        const oldValue = record.values[fieldName].value;

        if (record !== undefined) {
            const newValue = transformFunction.callbackFunction.constructor.name === 'AsyncFunction' ? await transformFunction.callbackFunction(record) : transformFunction.callbackFunction(record);
            
            if (newValue !== oldValue) {
                record.values[fieldName].value = newValue;
                updateRecord = true;
            }
        }

        if (updateRecord) {
            updates.push(record);
        }
    });

    return updates;
  } catch (error) {
    throw new Error("Error transforming records");
  }
}