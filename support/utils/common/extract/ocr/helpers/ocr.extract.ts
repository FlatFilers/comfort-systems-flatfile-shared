// import * as dotenv from "dotenv";
import api, { Flatfile } from "@flatfile/api";
import { WorkbookCapture } from "@flatfile/util-extractor";
import { ExtractOptions, AzureDocumentModels } from "../index";
import { FlatfileEvent } from "@flatfile/listener";
// import path from "path";

// dotenv.config({ path: path.resolve(process.cwd(), 'src/demos-new/glossgenius/.env') });

interface AzureAnalyzeResult {
  status: string;
  analyzeResult?: {
    content?: string;
    pages?: any[];
    tables?: any[];
    keyValuePairs?: any[];
    documents?: any[];
    paragraphs?: any[];
    styles?: any[];
  };
}

function sanitizeWorkbookCapture(result: WorkbookCapture): WorkbookCapture {
  for (const [sheetName, sheet] of Object.entries(result)) {
    // Ensure headers are present and non-empty
    if (!sheet.headers || !Array.isArray(sheet.headers) || sheet.headers.length === 0) {
      sheet.headers = ["Message"];
      sheet.data = [{ Message: { value: "No data extracted." } }];
    }
    // Ensure every record has all headers as keys, and only those keys
    sheet.data = (sheet.data || []).map((row: any) => {
      const fixed: any = {};
      for (const header of sheet.headers) {
        fixed[header] =
          row[header] && typeof row[header] === "object" && "value" in row[header]
            ? row[header]
            : { value: row[header] ?? "" };
      }
      return fixed;
    });
  }
  return result;
}

export async function OCRExtract(
  buffer: Buffer,
  options: ExtractOptions,
  event?: FlatfileEvent,
): Promise<WorkbookCapture> {
  console.log("OCRExtract");
  try {
    const {
      modelId,
      apiVersion = "2024-11-30",
      outputContentFormat = "markdown",
      useOpenAI,
      openAIModel = "gpt-4",
      customPrompt,
      pages,
      locale,
      stringIndexType,
      doc_types = [],
      secrets,
    } = options;

    console.log(JSON.stringify(options?.secrets, null, 2));
    // Prefer secrets from event context, fallback to process.env

    const azureEndpoint =
      options?.secrets?.find((secret) => secret.name === "AZURE_ENDPOINT")?.value || process.env.AZURE_ENDPOINT;
    const azureKey = options?.secrets?.find((secret) => secret.name === "AZURE_KEY")?.value || process.env.AZURE_KEY;

    console.log(`Secrets: ${azureEndpoint} ${azureKey}`);

    if (!azureEndpoint || !azureKey) {
      console.log("AZURE_ENDPOINT and AZURE_KEY environment variables are required");
      // Fallback: always return a workbook with a message sheet
      return sanitizeWorkbookCapture({
        "OCR Output": {
          headers: ["Message"],
          data: [{ Message: { value: "AZURE_ENDPOINT and AZURE_KEY environment variables are required" } }],
          metadata: { rowHeaders: [] },
        },
      });
    }

    // Construct Azure endpoint URL
    let azureUrl = `${azureEndpoint.replace(/\/$/, "")}/documentintelligence/documentModels/${modelId}:analyze?api-version=${apiVersion}`;

    // Add query parameters for layout/read models
    if (modelId === AzureDocumentModels.LAYOUT || modelId === AzureDocumentModels.READ) {
      azureUrl += `&outputContentFormat=${outputContentFormat}`;
    }

    if (pages) {
      azureUrl += `&pages=${pages}`;
    }

    if (locale) {
      azureUrl += `&locale=${locale}`;
    }

    if (stringIndexType) {
      azureUrl += `&stringIndexType=${stringIndexType}`;
    }

    // Convert buffer to base64
    const base64 = Buffer.from(buffer).toString("base64");

    // Send request to Azure Document Intelligence
    const response = await fetch(azureUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Source: base64,
      }),
    });

    console.log("ocr response", response);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("errorText", errorText);
      return sanitizeWorkbookCapture({
        "OCR Output": {
          headers: ["Message"],
          data: [{ Message: { value: `Azure Document Intelligence API error: ${response.status} - ${errorText}` } }],
          metadata: { rowHeaders: [] },
        },
      });
    }

    const operationLocation = response.headers.get("operation-location");
    if (!operationLocation) {
      console.log("No operation-location header received from Azure API");
      return sanitizeWorkbookCapture({
        "OCR Output": {
          headers: ["Message"],
          data: [{ Message: { value: "No operation-location header received from Azure API" } }],
          metadata: { rowHeaders: [] },
        },
      });
    }

    // Poll for results
    let analyzeResult: AzureAnalyzeResult | undefined;
    let status = "running";
    let retries = 0;
    const maxRetries = 60; // 60 seconds max

    while ((status === "running" || status === "notStarted") && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const resultResponse = await fetch(operationLocation, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
        },
      });

      console.log("resultResponse", resultResponse);

      if (!resultResponse.ok) {
        console.log("Failed to get Azure analysis results");
        return sanitizeWorkbookCapture({
          "OCR Output": {
            headers: ["Message"],
            data: [{ Message: { value: `Failed to get Azure analysis results: ${resultResponse.status}` } }],
            metadata: { rowHeaders: [] },
          },
        });
      }

      analyzeResult = await resultResponse.json();
      status = analyzeResult?.status || "failed";
      retries++;
    }

    if (status !== "succeeded" || !analyzeResult?.analyzeResult) {
      console.log("Azure Document Intelligence analysis failed with status: ", status);
      return sanitizeWorkbookCapture({
        "OCR Output": {
          headers: ["Message"],
          data: [{ Message: { value: `Azure Document Intelligence analysis failed with status: ${status}` } }],
          metadata: { rowHeaders: [] },
        },
      });
    }

    console.log("Azure Document Intelligence analysis succeeded with status: ", status);

    // Determine extraction strategy based on model and options
    const shouldUseOpenAI =
      useOpenAI ||
      (doc_types.length > 0 && (modelId === AzureDocumentModels.LAYOUT || modelId === AzureDocumentModels.READ));

    let result: WorkbookCapture;
    if (shouldUseOpenAI && (doc_types.length > 0 || (customPrompt && customPrompt.length > 0))) {
      console.log("Extracting with OpenAI");
      // Prefer secrets from secrets array, fallback to process.env
      const openAIKey =
        options?.secrets?.find((secret) => secret.name === "OPENAI_KEY")?.value || process.env.OPENAI_KEY;
      result = await extractWithOpenAI(analyzeResult!.analyzeResult, {
        doc_types,
        openAIModel,
        customPrompt,
        openAIKey,
      });
      result = sanitizeWorkbookCapture(result);
    } else {
      console.log("Extracting with Azure");
      result = extractFromAzureResult(analyzeResult!.analyzeResult, modelId);
      result = sanitizeWorkbookCapture(result);
    }

    // Fallback: If result is empty or has no sheets, return a default sheet
    if (!result || Object.keys(result).length === 0) {
      console.log("No data extracted from document.");
      return sanitizeWorkbookCapture({
        "OCR Output": {
          headers: ["Message"],
          data: [{ Message: { value: "No data extracted from document." } }],
          metadata: { rowHeaders: [] },
        },
      });
    }

    return result;
  } catch (error) {
    // Always return a workbook with a message sheet on error
    return sanitizeWorkbookCapture({
      "OCR Output": {
        headers: ["Message"],
        data: [
          { Message: { value: `OCR extraction error: ${error instanceof Error ? error.message : String(error)}` } },
        ],
        metadata: { rowHeaders: [] },
      },
    });
  }
}

async function extractWithOpenAI(
  analyzeResult: any,
  options: { doc_types: any[]; openAIModel: string; customPrompt?: string; openAIKey?: string },
): Promise<WorkbookCapture> {
  console.log("extractWithOpenAI");
  const openAIKey = options.openAIKey;
  if (!openAIKey) {
    console.log("OPENAI_KEY environment variable is required for OpenAI processing");
    throw new Error("OPENAI_KEY environment variable is required for OpenAI processing");
  }

  const content = analyzeResult.content || "";
  if (!content) {
    console.log("No content extracted from document for OpenAI processing");
    throw new Error("No content extracted from document for OpenAI processing");
  }

  const systemPrompt =
    options.customPrompt ||
    `You know the following document types and associated fields: ${JSON.stringify(options.doc_types)}. ` +
      `You will receive a document content. Classify the document into one of the document types and extract the associated fields. ` +
      `Only return a JSON array of objects with the extracted fields: [{"field1": "value1", "field2": "value2", ...}]. ` +
      `ALWAYS stick to this structure including the quotes. ` +
      `If there are multiple records (like table rows), return multiple objects in the array. ` +
      `If you can't classify or don't find any values, return [{"Message": "Couldn't find a document type"}] or [{"Message": "Couldn't find any values"}]`;

  console.log("systemPrompt", systemPrompt);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.openAIModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content },
      ],
    }),
  });

  console.log("openai response", response);

  if (!response.ok) {
    console.log("OpenAI API error: ", response);
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json();
  console.log("responseData", responseData);
  let answer = responseData.choices[0].message.content.trim();
  console.log("answer", answer);

  // Clean up the response
  answer = answer.replace(/```json\n|```/g, "");
  console.log("answer", answer);
  const parsedAnswer = JSON.parse(answer);

  if (!Array.isArray(parsedAnswer)) {
    console.log("OpenAI did not return a valid array structure");
    throw new Error("OpenAI did not return a valid array structure");
  }

  // Sanitize cell values to always be strings
  function sanitizeCellValue(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }

  // Extract headers and create data
  const headers = [...new Set(parsedAnswer.flatMap((obj) => Object.keys(obj)))].filter((h) => typeof h === "string");
  const data: Flatfile.RecordData[] = parsedAnswer.map((row) => {
    const record: Flatfile.RecordData = {};
    for (const header of headers) {
      record[header] = { value: sanitizeCellValue(row[header]) };
    }
    return record;
  });
  console.log("headers", headers);
  console.log("data", data);
  let finalResult = sanitizeWorkbookCapture({
    Sheet1: {
      headers,
      data,
      metadata: { rowHeaders: [] },
    },
  });
  console.log("finalResult", finalResult);
  return finalResult;
}

function extractFromAzureResult(analyzeResult: any, modelId: string): WorkbookCapture {
  const sheets: WorkbookCapture = {};

  // Handle different model outputs
  switch (true) {
    case modelId.includes("invoice"):
      return extractInvoiceData(analyzeResult);

    case modelId.includes("receipt"):
      return extractReceiptData(analyzeResult);

    case modelId.includes("businessCard"):
      return extractBusinessCardData(analyzeResult);

    case modelId.includes("idDocument"):
      return extractIdDocumentData(analyzeResult);

    case modelId.includes("tax"):
      return extractTaxFormData(analyzeResult);

    case modelId === AzureDocumentModels.LAYOUT:
    case modelId === AzureDocumentModels.READ:
      return extractLayoutData(analyzeResult);

    default:
      // Generic extraction for other prebuilt models
      return extractGenericDocumentData(analyzeResult);
  }
}

function extractInvoiceData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];
  if (documents.length === 0) {
    return {
      Invoice: {
        headers: ["Message"],
        data: [{ Message: { value: "No invoice data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  const invoice = documents[0].fields || {};
  const headers = [
    "VendorName",
    "VendorAddress",
    "CustomerName",
    "CustomerAddress",
    "InvoiceId",
    "InvoiceDate",
    "DueDate",
    "SubTotal",
    "TotalTax",
    "InvoiceTotal",
  ];

  const data = [
    {
      VendorName: { value: invoice.VendorName?.content || "" },
      VendorAddress: { value: invoice.VendorAddress?.content || "" },
      CustomerName: { value: invoice.CustomerName?.content || "" },
      CustomerAddress: { value: invoice.CustomerAddress?.content || "" },
      InvoiceId: { value: invoice.InvoiceId?.content || "" },
      InvoiceDate: { value: invoice.InvoiceDate?.content || "" },
      DueDate: { value: invoice.DueDate?.content || "" },
      SubTotal: { value: invoice.SubTotal?.content || "" },
      TotalTax: { value: invoice.TotalTax?.content || "" },
      InvoiceTotal: { value: invoice.InvoiceTotal?.content || "" },
    },
  ];

  // Extract line items if available
  const lineItems = invoice.Items?.valueArray || [];
  const lineItemHeaders = ["Description", "Quantity", "Unit", "UnitPrice", "Amount"];
  const lineItemData = lineItems.map((item: any) => ({
    Description: { value: item.valueObject?.Description?.content || "" },
    Quantity: { value: item.valueObject?.Quantity?.content || "" },
    Unit: { value: item.valueObject?.Unit?.content || "" },
    UnitPrice: { value: item.valueObject?.UnitPrice?.content || "" },
    Amount: { value: item.valueObject?.Amount?.content || "" },
  }));

  const result: WorkbookCapture = {
    Invoice: { headers, data, metadata: { rowHeaders: [] } },
  };

  if (lineItemData.length > 0) {
    result["Line Items"] = { headers: lineItemHeaders, data: lineItemData, metadata: { rowHeaders: [] } };
  }

  return result;
}

function extractReceiptData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];
  if (documents.length === 0) {
    return {
      Receipt: {
        headers: ["Message"],
        data: [{ Message: { value: "No receipt data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  const receipt = documents[0].fields || {};
  const headers = [
    "MerchantName",
    "MerchantAddress",
    "MerchantPhoneNumber",
    "TransactionDate",
    "TransactionTime",
    "Subtotal",
    "Tax",
    "Total",
  ];

  const data = [
    {
      MerchantName: { value: receipt.MerchantName?.content || "" },
      MerchantAddress: { value: receipt.MerchantAddress?.content || "" },
      MerchantPhoneNumber: { value: receipt.MerchantPhoneNumber?.content || "" },
      TransactionDate: { value: receipt.TransactionDate?.content || "" },
      TransactionTime: { value: receipt.TransactionTime?.content || "" },
      Subtotal: { value: receipt.Subtotal?.content || "" },
      Tax: { value: receipt.Tax?.content || "" },
      Total: { value: receipt.Total?.content || "" },
    },
  ];

  return { Receipt: { headers, data, metadata: { rowHeaders: [] } } };
}

function extractBusinessCardData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];
  if (documents.length === 0) {
    return {
      "Business Card": {
        headers: ["Message"],
        data: [{ Message: { value: "No business card data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  const card = documents[0].fields || {};
  const headers = [
    "ContactNames",
    "CompanyNames",
    "JobTitles",
    "Emails",
    "Websites",
    "MobilePhones",
    "WorkPhones",
    "Faxes",
    "Addresses",
  ];

  const data = [
    {
      ContactNames: { value: card.ContactNames?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      CompanyNames: { value: card.CompanyNames?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      JobTitles: { value: card.JobTitles?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      Emails: { value: card.Emails?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      Websites: { value: card.Websites?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      MobilePhones: { value: card.MobilePhones?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      WorkPhones: { value: card.WorkPhones?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      Faxes: { value: card.Faxes?.valueArray?.map((n: any) => n.content).join(", ") || "" },
      Addresses: { value: card.Addresses?.valueArray?.map((n: any) => n.content).join(", ") || "" },
    },
  ];

  return { "Business Card": { headers, data, metadata: { rowHeaders: [] } } };
}

function extractIdDocumentData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];
  if (documents.length === 0) {
    return {
      "ID Document": {
        headers: ["Message"],
        data: [{ Message: { value: "No ID document data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  const idDoc = documents[0].fields || {};
  const headers = [
    "FirstName",
    "LastName",
    "DocumentNumber",
    "DateOfBirth",
    "DateOfExpiration",
    "Sex",
    "Address",
    "Country",
    "Region",
  ];

  const data = [
    {
      FirstName: { value: idDoc.FirstName?.content || "" },
      LastName: { value: idDoc.LastName?.content || "" },
      DocumentNumber: { value: idDoc.DocumentNumber?.content || "" },
      DateOfBirth: { value: idDoc.DateOfBirth?.content || "" },
      DateOfExpiration: { value: idDoc.DateOfExpiration?.content || "" },
      Sex: { value: idDoc.Sex?.content || "" },
      Address: { value: idDoc.Address?.content || "" },
      Country: { value: idDoc.Country?.content || "" },
      Region: { value: idDoc.Region?.content || "" },
    },
  ];

  return { "ID Document": { headers, data, metadata: { rowHeaders: [] } } };
}

function extractTaxFormData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];
  if (documents.length === 0) {
    return {
      "Tax Form": {
        headers: ["Message"],
        data: [{ Message: { value: "No tax form data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  // Generic tax form extraction - fields vary by form type
  const taxForm = documents[0].fields || {};
  const headers = Object.keys(taxForm);

  const data = [
    headers.reduce(
      (acc, key) => ({
        ...acc,
        [key]: { value: taxForm[key]?.content || "" },
      }),
      {},
    ),
  ];

  return { "Tax Form": { headers, data, metadata: { rowHeaders: [] } } };
}

function extractLayoutData(analyzeResult: any): WorkbookCapture {
  // For layout model, extract tables if available, otherwise extract as text
  const tables = analyzeResult.tables || [];
  const content = analyzeResult.content || "";

  if (tables.length > 0) {
    const result: WorkbookCapture = {};

    tables.forEach((table: any, index: number) => {
      const sheetName = `Table ${index + 1}`;
      const maxCols = Math.max(...table.cells.map((cell: any) => cell.columnIndex + 1));
      const maxRows = Math.max(...table.cells.map((cell: any) => cell.rowIndex + 1));

      // Create headers from first row or generic column names
      const headers: string[] = [];
      for (let col = 0; col < maxCols; col++) {
        const headerCell = table.cells.find((cell: any) => cell.rowIndex === 0 && cell.columnIndex === col);
        headers.push(headerCell?.content || `Column ${col + 1}`);
      }

      // Extract data rows
      const data: Flatfile.RecordData[] = [];
      for (let row = 1; row < maxRows; row++) {
        const rowData: Flatfile.RecordData = {};
        headers.forEach((header, col) => {
          const cell = table.cells.find((cell: any) => cell.rowIndex === row && cell.columnIndex === col);
          rowData[header] = { value: cell?.content || "" };
        });
        data.push(rowData);
      }

      result[sheetName] = { headers, data, metadata: { rowHeaders: [] } };
    });

    return result;
  } else {
    // Extract as plain text
    return {
      "Document Content": {
        headers: ["Content"],
        data: [{ Content: { value: content } }],
        metadata: { rowHeaders: [] },
      },
    };
  }
}

function extractGenericDocumentData(analyzeResult: any): WorkbookCapture {
  const documents = analyzeResult.documents || [];

  if (documents.length === 0) {
    return {
      Document: {
        headers: ["Message"],
        data: [{ Message: { value: "No structured data found" } }],
        metadata: { rowHeaders: [] },
      },
    };
  }

  // Extract fields from the first document
  const doc = documents[0];
  const fields = doc.fields || {};
  const headers = Object.keys(fields);

  const data = [
    headers.reduce(
      (acc, key) => ({
        ...acc,
        [key]: { value: fields[key]?.content || fields[key]?.valueString || "" },
      }),
      {},
    ),
  ];

  return {
    Document: {
      headers,
      data,
      metadata: { rowHeaders: [] },
    },
  };
}
