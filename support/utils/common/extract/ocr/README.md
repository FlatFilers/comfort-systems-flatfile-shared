# OCR Extract

## Overview
The OCR Extract utility enables automatic extraction of structured data from various document formats (PDF, images) using Microsoft Azure Document Intelligence service. It supports all available Azure Document Intelligence models and provides flexible data extraction strategies, including direct model output extraction and AI-powered data structuring.

## Table of Contents

- [Getting Started](#getting-started)
   - [Environment Setup](#environment-setup)
   - [Installation](#installation)
   - [Basic Usage](#basic-usage)
   - [Configuration Examples](#configuration-examples)

- [Supported Models](#supported-models)
   - [Layout Models](#layout-models)
   - [Prebuilt Models](#prebuilt-models)
   - [Custom Models](#custom-models)

- [File Format Support](#file-format-support)

- [Configuration Options](#configuration-options)
   - [Basic Configuration](#basic-configuration)
   - [Advanced Configuration](#advanced-configuration)

- [Extraction Strategies](#extraction-strategies)
   - [Direct Azure Model Extraction](#direct-azure-model-extraction)
   - [OpenAI-Assisted Extraction](#openai-assisted-extraction)

## Getting Started

### Environment Setup
Before using the OCR Extract utility, you need to set up the following environment variables:

```bash
# Azure Document Intelligence API credentials (required)
AZURE_ENDPOINT="https://your-azure-endpoint.cognitiveservices.azure.com/"
AZURE_KEY="your-azure-key"

# OpenAI API credentials (optional - only needed for custom extraction)
OPENAI_KEY="your-openai-key"
```

Create a `.env` file in your project root and add these variables. Make sure to replace the placeholder values with your actual API credentials.

> **Important**: Never commit your actual API keys to version control. Always use environment variables for sensitive credentials.

### Installation
Import the OCR Extractor in your project:

```typescript
import { OCRExtractor, AzureDocumentModels } from "../../support/utils/common/extract/ocr";
```

### Basic Usage
The OCR Extractor can handle single or multiple file types:

```typescript
export default function (listener: FlatfileListener) {
  // Single file type
  listener.use(OCRExtractor('pdf', {
    modelId: AzureDocumentModels.INVOICE
  }));

  // Multiple file types
  listener.use(OCRExtractor(['pdf', 'png', 'jpg'], {
    modelId: AzureDocumentModels.LAYOUT,
    outputContentFormat: "markdown"
  }));
}
```

### Configuration Examples

#### Invoice Processing
```typescript
listener.use(OCRExtractor(['pdf', 'png'], {
  modelId: AzureDocumentModels.INVOICE
}));
```

#### Receipt Processing
```typescript
listener.use(OCRExtractor('pdf', {
  modelId: AzureDocumentModels.RECEIPT
}));
```

#### Custom Document Processing with OpenAI
```typescript
listener.use(OCRExtractor(['pdf', 'png', 'jpg'], {
  modelId: AzureDocumentModels.LAYOUT,
  useOpenAI: true,
  doc_types: [
    {
      name: 'contract',
      fields: [
        { name: 'party1', description: 'First contracting party' },
        { name: 'party2', description: 'Second contracting party' },
        { name: 'effective_date', description: 'Contract effective date' },
        { name: 'termination_date', description: 'Contract termination date' }
      ]
    }
  ]
}));
```

## Supported Models

### Layout Models
- **prebuilt-layout**: Extracts text, tables, selection marks, and document structure
- **prebuilt-read**: Extracts text content with reading order information

### Prebuilt Models
- **prebuilt-invoice**: Extracts structured invoice data
- **prebuilt-receipt**: Extracts receipt information
- **prebuilt-businessCard**: Extracts business card details
- **prebuilt-idDocument**: Extracts ID document information
- **prebuilt-contract**: Extracts contract details
- **prebuilt-creditCard**: Extracts credit card information
- **prebuilt-healthInsuranceCard.us**: Extracts US health insurance card data
- **prebuilt-marriageCertificate.us**: Extracts US marriage certificate data
- **prebuilt-payStub.us**: Extracts US pay stub information
- **prebuilt-check.us**: Extracts US check details

### Tax Forms (US)
- **prebuilt-tax.us.w2**: W-2 forms
- **prebuilt-tax.us.1098**: 1098 forms (and variants E, T)
- **prebuilt-tax.us.1099**: All 1099 variants (A, B, C, DIV, G, H, INT, K, MISC, NEC, OID, PATR, Q, R, S, SA)

### Mortgage Documents (US)
- **prebuilt-mortgage.us.1003**: 1003 Uniform Residential Loan Application
- **prebuilt-mortgage.us.1008**: 1008 Uniform Underwriting and Transmittal Summary
- **prebuilt-mortgage.us.closingDisclosure**: Closing Disclosure forms

## File Format Support

The extractor supports all file formats accepted by Azure Document Intelligence:

- **PDF** (.pdf)
- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **BMP** (.bmp)
- **TIFF** (.tiff, .tif)
- **HEIF** (.heif)

## Configuration Options

### Basic Configuration

```typescript
interface ExtractOptions {
  modelId: AzureDocumentModels | string;  // Required: Azure model to use
}
```

### Advanced Configuration

```typescript
interface ExtractOptions {
  // Model Configuration
  modelId: AzureDocumentModels | string;
  apiVersion?: string;                     // Default: "2024-11-30"
  outputContentFormat?: "text" | "markdown"; // For layout/read models
  
  // Document Processing
  pages?: string;                          // e.g., "1-3" for specific pages
  locale?: string;                         // e.g., "en-US"
  stringIndexType?: "textElements" | "unicodeCodePoint" | "utf16CodeUnit";
  
  // OpenAI Integration
  useOpenAI?: boolean;                     // Default: false for prebuilt models
  openAIModel?: string;                    // Default: "gpt-4"
  customPrompt?: string;                   // Custom system prompt
  doc_types?: DocumentType[];              // Document types for custom extraction
}
```

## Extraction Strategies

### Direct Azure Model Extraction
For prebuilt models, the extractor directly processes Azure's structured output:

```typescript
// Automatic structured extraction
listener.use(OCRExtractor('pdf', {
  modelId: AzureDocumentModels.INVOICE
}));
```

**Supported Models:**
- Invoice → Invoice data + Line items sheets
- Receipt → Receipt data sheet
- Business Card → Contact information sheet
- ID Document → Personal information sheet
- Tax Forms → Form-specific data sheet

### OpenAI-Assisted Extraction
For layout/read models or custom document types:

```typescript
listener.use(OCRExtractor(['pdf', 'png'], {
  modelId: AzureDocumentModels.LAYOUT,
  useOpenAI: true,
  openAIModel: "gpt-4",
  doc_types: [
    {
      name: 'medical_form',
      fields: [
        { name: 'patient_name', description: 'Full name of the patient', required: true },
        { name: 'date_of_birth', description: 'Patient date of birth' },
        { name: 'diagnosis', description: 'Medical diagnosis' },
        { name: 'treatment_plan', description: 'Recommended treatment' }
      ]
    }
  ]
}));
```

## Error Handling

The extractor provides detailed error messages for common issues:

- Missing environment variables
- Unsupported file types
- Azure API errors
- OpenAI processing errors
- Document analysis failures

## Performance Considerations

- **Model Selection**: Choose the most specific model for your document type
- **File Size**: Larger files take longer to process
- **OpenAI Usage**: Only use OpenAI when necessary for custom extraction
- **Batch Processing**: Consider processing multiple files separately rather than combining them

## Best Practices

1. **Model Selection**: Use the most specific prebuilt model available for your document type
2. **File Quality**: Ensure good image quality for better OCR results
3. **Environment Variables**: Always validate environment variables are set
4. **Error Handling**: Implement proper error handling for production use
5. **Testing**: Test with sample documents during development