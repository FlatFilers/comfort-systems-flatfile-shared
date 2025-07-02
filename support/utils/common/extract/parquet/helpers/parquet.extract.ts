import api, { Flatfile } from '@flatfile/api'
import { FlatfileListener } from "@flatfile/listener";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

export function ParquetExtract(fileExt: string): (listener: FlatfileListener) => void {
    return (listener: FlatfileListener) => {
        listener.on("file:created", async ({ context: { fileId } }) => {
            const file = await api.files.get(fileId);
            if(file.data?.name.endsWith(fileExt)) {
                
                //Initialize file
                await initFile(file);                
                console.log(file.data?.id);
                // Create a job to extract the parquet file and execute it
                //const job = await api.jobs.create({ type: 'file', operation: 'extractParquet', source: fileId });
                //await api.jobs.execute(job.data?.id);
            }
        });
        
        listener.on("job:ready", { job: "file:extractParquet" }, async ({ context: { fileId, jobId } }) => {

            await api.jobs.ack(jobId, { info: "Extracting Parquet", progress: 5 });

            //Extract zip in S3
            try {

                await checkFileInS3(fileId);      

                await api.jobs.update(jobId, { info: "Extracting zip in S3", progress: 10 });

                await extractZipInS3(fileId, jobId);               
                await updateStatusInWorkbook(fileId, "Extracted to S3", "Convert Parquet to CSV");

                await api.jobs.update(jobId, { info: "File extracted successfully in S3", progress: 35 });
            }catch(error) {
                console.error('Error extracting zip in S3:', error);
                await updateStatusInWorkbook(fileId, "Extracting zip in S3 failed", "-",error.message);
                await api.jobs.update(jobId, { info: "Extracting zip in S3 failed", progress: 100 });
                await api.jobs.fail(jobId, {
                    outcome: {
                        message: "Failed to extract zip in S3: " + error.message
                    }
                });
                return
            }

            //Convert Parquet to CSV
            try {     

                await api.jobs.update(jobId, { info: "Converting Parquet to CSV", progress: 60 });

                await convertParquetToCsv(fileId, jobId);               
                await updateStatusInWorkbook(fileId, "Converted Parquet to CSV", "Import to Flatfile");

                await api.jobs.update(jobId, { info: "File converted successfully to CSV", progress: 80 });
            }catch(error) {
                console.error('Error converting Parquet to CSV:', error);
                await updateStatusInWorkbook(fileId, "Converting Parquet to CSV failed", "-",error.message);
                await api.jobs.update(jobId, { info: "Converting Parquet to CSV failed", progress: 100 });
                await api.jobs.fail(jobId, {
                    outcome: {
                        message: "Failed to convert Parquet to CSV: " + error.message
                    }
                });
                return
            }

            //Import to Flatfile
            try {     

                await api.jobs.update(jobId, { info: "Importing to Flatfile", progress: 90 });

                await importToFlatfile(fileId, jobId);           
                await updateStatusInWorkbook(fileId, "Imported to Flatfile", "-");

                await api.jobs.update(jobId, { info: "File imported successfully to Flatfile", progress: 100 });
            }catch(error) {
                console.error('Error importing to Flatfile:', error);
                await updateStatusInWorkbook(fileId, "Importing to Flatfile failed", "-",error.message);
                await api.jobs.update(jobId, { info: "Importing to Flatfile failed", progress: 100 });
                await api.jobs.fail(jobId, {
                    outcome: {
                        message: "Failed to import to Flatfile: " + error.message
                    }
                });
                return
            }

            await api.jobs.complete(jobId, { info: "File extracted successfully" });
        });

        listener.on("job:ready", { job: "file:reset" }, async ({ context: { fileId, jobId } }) => {
            try {
                await api.jobs.ack(jobId, { info: "Resetting S3", progress: 5 });

                //await resetS3(fileId);

                await api.jobs.update(jobId, { info: "S3 reset successfully", progress: 90 });
                await api.jobs.update(jobId, { info: "Reseting Status Workbook", progress: 95 });

                await resetStatusWorkbook(fileId);

                await api.jobs.complete(jobId, { info: "File reset successfully" });

            } catch(error) {
                console.error('Error resetting file:', error);
                await api.jobs.update(jobId, { info: "Resetting file failed", progress: 100 });
                await api.jobs.fail(jobId, {
                    outcome: {
                        message: "Failed to reset file: " + error.message
                    }
                });
                return
            }
        });
    }
}

//AWS HELPER FUNCTIONS

async function getS3Client() {
    try {
        // Return S3 client with temporary credentials
        return new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });
        
    } catch (error) {
        console.error('Error initializing AWS client:', error);
        throw new Error("Error initializing AWS client");
    }
}

async function resetS3(fileId: string) {
    try {
        const file = await api.files.get(fileId);
        const s3Client = await getS3Client();

        //Check and delete folder called uploads in S3
        const listObjectsV2Command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME || '',
            Prefix: `${fileId}/`
        });

        const response = await s3Client.send(listObjectsV2Command);

        if(response.Contents) {
            await s3Client.send(new DeleteObjectsCommand({
                Bucket: process.env.AWS_BUCKET_NAME || '',
                Delete: { Objects: response.Contents.map(content => ({ Key: content.Key })) }
            }));
        }
    } catch(error) {
        console.error('Error resetting S3:', error);
        throw new Error("Error resetting S3");
    }
}

async function _deprecated_uploadFileToS3(fileId: string, jobId: string) {
    try {
        const file = await api.files.get(fileId);
        
        // Initialize S3 client
        const s3Client = await getS3Client();

        // Configure upload parameters
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME || '',
            Key: `${fileId}/uploads/${file.data?.name}.zip`,
            ContentType: 'application/octet-stream'
        };

        // Create a pass-through stream for uploading
        const { PassThrough } = require('stream');
        const pass = new PassThrough();

        // Create the upload
        const upload = new Upload({
            client: s3Client,
            params: { ...uploadParams, Body: pass }
        });

        // Track upload progress
        upload.on('httpUploadProgress', (progress) => {
            if (progress.total) {  // Only calculate percentage if we have a total
                const percentage = Math.min(
                    Math.round((progress.loaded || 0) / progress.total * 100),
                    100  // Cap at 100%
                );
                api.jobs.update(jobId, {
                    info: `Uploading to S3: ${percentage}%`,
                    progress: Math.min(5 + Math.round(percentage * 0.2), 25)  // Scale progress from 5-25%, capped
                });
            }
        });

        // Start streaming from Flatfile API
        const response = await fetch(`https://api.x.flatfile.com/v1/files/${fileId}/download`, {
            headers: {
                'X-Disable-Hooks': 'true',
                'Authorization': `Bearer ${process.env.FLATFILE_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body from Flatfile API');
        }

        // Pipe the response body to our pass-through stream
        const reader = response.body;
        const streamPipeline = require('stream/promises').pipeline;
        
        // Start both the download and upload streams
        await Promise.all([
            streamPipeline(reader, pass),
            upload.done()
        ]);

    } catch(error) {
        console.error('Error uploading file to S3:', error);
        throw new Error("Error uploading file to S3: " + error.message);
    }
}

async function checkFileInS3(fileId: string) {
    try {

        const file = await api.files.get(fileId);
        const filename = getFileName(file);
        const s3Client = await getS3Client();
        const listObjectsV2Command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME || '',
            Prefix: `__uploads/${filename}`
        });
        const response = await s3Client.send(listObjectsV2Command);
        if(response.KeyCount == 0) {
            throw new Error("File not found in S3");
        }

    } catch(error) {
        if(error.message == "File not found in S3") 
        {
            throw new Error("File not found in S3");
        }else{
            console.error('Error checking file in S3:', error);
            throw new Error("Error checking file in S3");
        }
    }
}

async function checkFolderInS3(fileId: string, folder: string) {
    try {
        const s3Client = await getS3Client();
        const listObjectsV2Command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME || '',
            Prefix: `${fileId}/${folder}`
        });
        const response = await s3Client.send(listObjectsV2Command);
        if(response.KeyCount == 0) {
            return false;
        }
        return true;
    } catch(error) {
        console.error('Error checking folder in S3:', error);
        throw new Error("Error checking folder in S3");
    }
}

async function extractZipInS3(fileId: string, jobId: string) {
    try {

        if(await checkFolderInS3(fileId, "extracted")) {
            return;
        }

        const file = await api.files.get(fileId);
        const filename = getFileName(file);
        
        // Initialize Lambda client
        const lambdaClient = new LambdaClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });

        // Invoke Lambda function
        const command = new InvokeCommand({
            FunctionName: 'parquet-plugin--extract-zip',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                bucket: process.env.AWS_BUCKET_NAME || '',
                source_path: `__uploads/${filename}`,
                destination_folder: `${fileId}/extracted/`
            })
        });
        const response = await lambdaClient.send(command);

        // Check Lambda response
        if (response.FunctionError) {
            const error = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
            throw new Error(`Lambda function error: ${error.errorMessage}`);
        }

        // Parse Lambda response
        const payload = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
        
        if (payload.statusCode != 200) {
            throw new Error(payload.message || 'Lambda function failed');
        }

    } catch(error) {
        console.error('Error extracting zip in S3:', error);
        throw new Error("Error extracting zip in S3");
    }
}

async function convertParquetToCsv(fileId: string, jobId: string) {
    try {

        if(await checkFolderInS3(fileId, "converted")) {
            return;
        }

        const file = await api.files.get(fileId);
        const filename = getFileName(file);
        
        // Initialize Lambda client
        const lambdaClient = new LambdaClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });

        // Invoke Lambda function
        const command = new InvokeCommand({
            FunctionName: 'parquet-plugin--convert-parquet-to-csv',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                bucket: process.env.AWS_BUCKET_NAME || '',
                folder_path: `${fileId}/extracted/`,
                destination_folder: `${fileId}/converted/`,
                batch_size: 200
            })
        });
        const response = await lambdaClient.send(command);

        // Check Lambda response
        if (response.FunctionError) {
            const error = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
            throw new Error(`Lambda function error: ${error.errorMessage}`);
        }

        // Parse Lambda response
        const payload = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
        
        if (payload.statusCode != 200) {
            throw new Error(payload.message || 'Lambda function failed');
        }

    } catch(error) {
        console.error('Error converting Parquet to CSV:', error);
        throw new Error("Error converting Parquet to CSV");
    }
}

async function importToFlatfile(fileId: string, jobId: string) {
    try {

        const file = await api.files.get(fileId);
        const filename = getFileName(file);
        
        // Initialize Lambda client
        const lambdaClient = new LambdaClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });

        // Invoke Lambda function
        const command = new InvokeCommand({
            FunctionName: 'parquet-plugin--import-to-flatfile',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                bucket: process.env.AWS_BUCKET_NAME || '',
                folder_path: `${fileId}/converted/`,
                space_id: file.data?.spaceId,
                environment_id: process.env.FLATFILE_ENVIRONMENT_ID || '',
                api_key: process.env.FLATFILE_API_KEY || '',
                batch_size: 200
            })
        });
        const response = await lambdaClient.send(command);

        // Check Lambda response
        if (response.FunctionError) {
            const error = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
            throw new Error(`Lambda function error: ${error.errorMessage}`);
        }

        // Parse Lambda response
        const payload = JSON.parse(Buffer.from(response.Payload as Uint8Array).toString());
        
        if (payload.statusCode != 200) {
            throw new Error(payload.message || 'Lambda function failed');
        }

    } catch(error) {
        console.error('Error importing to Flatfile:', error);
        throw new Error("Error importing to Flatfile");
    }
}

//STATUS HELPER FUNCTIONS

async function initFile(file: Flatfile.FileResponse) {
    try {
        const workbook = await api.workbooks.create({
            spaceId: file.data?.spaceId,
            labels: ["file"],
            name: `[file] ${file.data?.name}`,
            treatments: ["EXTRACTED_FROM_SOURCE"],
            sheets: [{name: "Status", fields: [
                {key: "status", type: "string", label: "Status"}, 
                {key: "nextStep", type: "string", label: "Next Step"}, 
                {key: "message", type: "string", label: "Message"}
            ]}]
        });
        const sheet = workbook.data?.sheets[0];
        await api.records.insert(sheet.id, [
            {
                "status": {value: "Uploaded to Flatfile"},
                "nextStep": {value: "Extract zip in S3"},
                "message": {value: ""}
            }
        ]);

        const actions = file.data?.actions || [];
        const newActions = [
            ...actions,
            {
                operation: "reset",
                label: "Reset",
                description: "This will reset the file.",
            },
            {
                operation: "extractParquet",
                label: "Extract Parquet",
                description: "This will extract the parquet file.",
            },
        ];

        await api.files.update(file.data?.id, {
            actions: newActions,
            workbookId: workbook.data?.id,
            status: "complete"
        });
    } catch(error) {
        console.error('Error creating status workbook:', error);
        throw new Error("Error creating status workbook");
    }
}

async function createStatusWorkbook(fileId: string) {
    try {
        const file = await api.files.get(fileId);
        const workbook = await api.workbooks.create({
            spaceId: file.data?.spaceId,
            labels: ["file"],
            name: `[file] ${file.data?.name}`,
            treatments: ["EXTRACTED_FROM_SOURCE"],
            sheets: [{name: "Status", fields: [
                {key: "status", type: "string", label: "Status"}, 
                {key: "nextStep", type: "string", label: "Next Step"}, 
                {key: "message", type: "string", label: "Message"}
            ]}]
        });
        const sheet = workbook.data?.sheets[0];
        await api.records.insert(sheet.id, [
            {
                "status": {value: "Uploaded to Flatfile"},
                "nextStep": {value: "Extract zip in S3"},
                "message": {value: ""}
            }
        ]);
        await api.files.update(fileId, {
            workbookId: workbook.data?.id,
            status: "complete"
        });
    } catch(error) {
        console.error('Error creating status workbook:', error);
        throw new Error("Error creating status workbook");
    }
}

async function updateStatusInWorkbook(fileId: string, status: string, nextStep: string, message?: string) {
    try {
        const prevStatus = await getStatusfromWorkbook(fileId);
        if(prevStatus.value === status) return;

        const file = await api.files.get(fileId);
        const workbook = await api.workbooks.get(file.data?.workbookId);
        const sheet = workbook.data?.sheets[0];
        const records = await api.records.get(sheet.id);
        await api.records.update(sheet.id, 
            [{id: records.data.records[0].id, values: {
                status: {value: status},
                nextStep: {value: nextStep},
                message: {value: message || ""}
            }}]
        );
    } catch(error) {
        console.error('Error updating status in workbook:', error);
        throw new Error("Error updating status in workbook");
    }
}

async function getStatusfromWorkbook(fileId: string) {
    try {
        const file = await api.files.get(fileId);
        const workbook = await api.workbooks.get(file.data?.workbookId);
        const sheet = workbook.data?.sheets[0];
        const records = await api.records.get(sheet.id);
        return records.data.records[0].values.status;
    } catch(error) {
        console.error('Error getting status from workbook:', error);
        throw new Error("Error getting status from workbook");
    }
}

async function resetStatusWorkbook(fileId: string) {
    try {
        const file = await api.files.get(fileId);
        await api.workbooks.delete(file.data?.workbookId);
        await createStatusWorkbook(fileId);
    } catch(error) {
        console.error('Error resetting status workbook:', error);
        throw new Error("Error resetting status workbook");
    }
}

//MISC HELPER FUNCTIONS

function getFileName(file: Flatfile.FileResponse) {
    var filename = file.data?.name;
    filename = filename.replace("[file]", "");
    filename = filename.replace(".s3file", "");
    return filename;
}


