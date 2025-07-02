# Parquet Extract

## Overview
The Parquet Extract utility handles large-scale data processing of Parquet files, typically delivered in zip archives. It provides efficient streaming capabilities and AWS S3 integration for processing big data files.

## Table of Contents
- [Getting Started](#getting-started)
  - [Environment Setup](#environment-setup)
  - [Basic Usage](#basic-usage)
  - [File Requirements](#file-requirements)

- [Supported Formats](#supported-formats)
- [Lambda Functions](#lambda-functions)
- [Features](#features)
- [AWS Setup Requirements](#aws-setup-requirements)
- [Processing Flow](#processing-flow)
- [Status Tracking](#status-tracking)
- [Error Handling](#error-handling)

## Getting Started

### Environment Setup
Required environment variables:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-2"
AWS_BUCKET_NAME="your-bucket-name"

# Flatfile API Credentials
FLATFILE_API_KEY="your-flatfile-api-key"
FLATFILE_ENVIRONMENT_ID="your-environment-id"
```

### Basic Usage
Import and use the Parquet Extractor in your Flatfile listener:

```typescript
import { ParquetExtract } from "../../support/utils/common/extract/parquet";

export default function (listener: FlatfileListener) {
  listener.use(ParquetExtract('.zip'))
}
```

### File Requirements
1. The file must be uploaded to S3 first (e.g., `example.zip`)
2. Then uploaded to Flatfile with `.s3file` extension (e.g., `example.zip.s3file`)
3. The base filename must match exactly between S3 and Flatfile
   ```
   S3: example.zip
   Flatfile: example.zip.s3file
   ```

## Supported Formats
The utility supports Parquet files with the following compression methods:
- SNAPPY
- GZIP
- BROTLI
- ZSTD
- LZ4
- UNCOMPRESSED

All Parquet files in the zip archive must use one of these compression methods to be processed successfully.

## Lambda Functions
The required AWS Lambda functions can be found in the [parquet-lambda-functions](https://github.com/FlatFilers/parquet-lambda-functions) repository. This repository contains three Lambda functions:

1. `parquet-plugin--extract-zip`: Extracts Parquet files from uploaded zip archives
2. `parquet-plugin--convert-parquet-to-csv`: Converts extracted Parquet files to CSV format
3. `parquet-plugin--import-to-flatfile`: Handles importing the converted CSV data into Flatfile

Please refer to the repository for deployment instructions and function-specific configurations.

## Features
- Streaming file processing
- AWS S3 integration
- Automatic zip extraction
- Parquet to CSV conversion
- Progress tracking
- Status workbook integration

## AWS Setup Requirements
The following AWS permissions are required:

1. S3 bucket access:
   - s3:PutObject
   - s3:GetObject
   - s3:ListBucket
   - s3:DeleteObject

2. Lambda function permissions:
   - lambda:InvokeFunction for:
     - parquet-plugin--extract-zip
     - parquet-plugin--convert-parquet-to-csv
     - parquet-plugin--import-to-flatfile

## Processing Flow
1. File Upload Process:
   - Upload zip file to S3 (e.g., `example.zip`)
   - Upload reference file to Flatfile with `.s3file` extension (e.g., `example.zip.s3file`)
   - Plugin validates file exists in S3 with matching name

2. Extraction Process:
   - Lambda function uses unzip-stream to extract contents from S3
   - Extracts files from source S3 folder to destination S3 folder
   - Maintains folder structure from zip file

3. Parquet Processing:
   - Identifies all Parquet files in extracted contents
   - Validates compression method is supported
   - Converts each Parquet file to CSV format
   - Handles large files through streaming process

4. Flatfile Import:
   - Converted CSV files are streamed to Flatfile
   - Creates appropriate workbooks and sheets
   - Maps data according to schema definitions

Each step is tracked in the status workbook, allowing you to monitor the progress and identify any issues that arise during processing.

## Status Tracking
The utility creates a status workbook that tracks:
- Current processing status
- Next processing step
- Error messages (if any)

## Error Handling
The utility includes comprehensive error handling for:
- File upload failures
- AWS service errors
- Processing timeouts
- Data conversion issues

