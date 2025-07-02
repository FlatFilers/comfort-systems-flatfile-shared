# Tabular Extract

## Overview
The Tabular Extract utility uses Large Language Models (LLMs) to intelligently process and extract information from text files containing multiple tables. It's specifically designed to handle CSV data stored in `.txt` files where traditional parsers might struggle with multiple table layouts or complex structures.

## Table of Contents
- [Getting Started](#getting-started)
  - [Environment Setup](#environment-setup)
  - [Basic Usage](#basic-usage)

- [Features](#features)

## Getting Started

### Environment Setup
Configure the following environment variables:

```bash
# Anthropic API Key for LLM processing
ANTHROPIC_API_KEY="your-anthropic-key"
```

Create a `.env` file in your project root and add these variables. Make sure to replace the placeholder values with your actual API credentials.

> **Important**: Never commit your actual API keys to version control. Always use environment variables for sensitive credentials.

### Basic Usage
Import and use the Tabular Extractor in your Flatfile listener:

```typescript
import { TabularExtractor } from "../../support/utils/common/extract/tabular";

export default function (listener: FlatfileListener) {
  listener.use(TabularExtractor('.txt'))
}
```

## Features
- Intelligent table detection in text files
- Multiple table extraction from a single file
- Context-aware data parsing
- Automatic table structure inference
- Smart header detection
- Handles complex multi-table layouts