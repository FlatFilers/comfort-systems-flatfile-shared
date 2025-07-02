import { OCRExtract } from "./helpers/ocr.extract";
import { Extractor } from "@flatfile/util-extractor";

export enum NativeFileTypes {
  CSV = "csv",
  TSV = "tsv",
  PSV = "psv",
}

export enum SupportedFileTypes {
  PDF = "pdf",
  JPEG = "jpeg",
  JPG = "jpg",
  PNG = "png",
  BMP = "bmp",
  TIFF = "tiff",
  TIF = "tif",
  HEIF = "heif",
}

export enum AzureDocumentModels {
  // Layout models
  LAYOUT = "prebuilt-layout",
  READ = "prebuilt-read",

  // Prebuilt models
  INVOICE = "prebuilt-invoice",
  RECEIPT = "prebuilt-receipt",
  ID_DOCUMENT = "prebuilt-idDocument",
  BUSINESS_CARD = "prebuilt-businessCard",
  TAX_US_W2 = "prebuilt-tax.us.w2",
  TAX_US_1098 = "prebuilt-tax.us.1098",
  TAX_US_1098E = "prebuilt-tax.us.1098E",
  TAX_US_1098T = "prebuilt-tax.us.1098T",
  TAX_US_1099A = "prebuilt-tax.us.1099A",
  TAX_US_1099B = "prebuilt-tax.us.1099B",
  TAX_US_1099C = "prebuilt-tax.us.1099C",
  TAX_US_1099DIV = "prebuilt-tax.us.1099DIV",
  TAX_US_1099G = "prebuilt-tax.us.1099G",
  TAX_US_1099H = "prebuilt-tax.us.1099H",
  TAX_US_1099INT = "prebuilt-tax.us.1099INT",
  TAX_US_1099K = "prebuilt-tax.us.1099K",
  TAX_US_1099MISC = "prebuilt-tax.us.1099MISC",
  TAX_US_1099NEC = "prebuilt-tax.us.1099NEC",
  TAX_US_1099OID = "prebuilt-tax.us.1099OID",
  TAX_US_1099PATR = "prebuilt-tax.us.1099PATR",
  TAX_US_1099Q = "prebuilt-tax.us.1099Q",
  TAX_US_1099R = "prebuilt-tax.us.1099R",
  TAX_US_1099S = "prebuilt-tax.us.1099S",
  TAX_US_1099SA = "prebuilt-tax.us.1099SA",
  HEALTH_INSURANCE_CARD = "prebuilt-healthInsuranceCard.us",
  CONTRACT = "prebuilt-contract",
  CREDIT_CARD = "prebuilt-creditCard",
  MARRIAGE_CERTIFICATE = "prebuilt-marriageCertificate.us",
  MORTGAGE_1003 = "prebuilt-mortgage.us.1003",
  MORTGAGE_1008 = "prebuilt-mortgage.us.1008",
  MORTGAGE_CLOSING_DISCLOSURE = "prebuilt-mortgage.us.closingDisclosure",
  PAY_STUB = "prebuilt-payStub.us",
  CHECK = "prebuilt-check.us",
}

export interface DocumentTypeField {
  name: string;
  description: string;
  required?: boolean;
}

export interface DocumentType {
  name: string;
  fields: DocumentTypeField[];
}

export interface ExtractOptions {
  // Azure Document Intelligence model to use
  modelId: AzureDocumentModels | string;

  // Document types for custom extraction (used with OpenAI processing)
  doc_types?: DocumentType[];

  // Whether to use OpenAI for data structuring (default: false for prebuilt models)
  useOpenAI?: boolean;

  // OpenAI model to use for structuring (default: gpt-4)
  openAIModel?: string;

  // Custom system prompt for OpenAI processing
  customPrompt?: string;

  // Azure API version (default: 2024-11-30)
  apiVersion?: string;

  // Output content format for layout/read models
  outputContentFormat?: "text" | "markdown";

  // Additional Azure model-specific parameters
  pages?: string; // e.g., "1-3" for specific pages
  locale?: string; // e.g., "en-US"
  stringIndexType?: "textElements" | "unicodeCodePoint" | "utf16CodeUnit";

  // Secrets to use for the extraction
  secrets?: any[];
}

export const OCRExtractor = (fileExt: string | string[], options: ExtractOptions) => {
  // Support multiple file extensions
  const extensions = Array.isArray(fileExt) ? fileExt : [fileExt];

  // Validate file extensions
  for (const ext of extensions) {
    const normalizedExt = ext.toLowerCase().replace(".", "");

    if (Object.values(NativeFileTypes).includes(normalizedExt as NativeFileTypes)) {
      throw new Error(`${ext} is a native file type and not supported by the OCR extractor.`);
    }

    if (!Object.values(SupportedFileTypes).includes(normalizedExt as SupportedFileTypes)) {
      throw new Error(
        `${ext} is not a supported file type. Supported types: ${Object.values(SupportedFileTypes).join(", ")}`,
      );
    }
  }

  // Return a single extractor function that can handle all specified extensions
  return (listener: any) => {
    extensions.forEach((ext) => {
      listener.use(
        Extractor(
          ext,
          "ocr",
          () =>
            Promise.resolve({
              Sheet1: {
                headers: ["test"],
                data: [{ test: { value: "test" } }],
                metadata: { rowHeaders: [] },
              },
            }),
          options,
        ),
      );
      // listener.use(Extractor(ext, "ocr", OCRExtract, options));
    });
  };
};
