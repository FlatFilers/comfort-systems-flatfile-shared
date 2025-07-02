# Comfort Systems USA - Flatfile Implementation

This repository contains the Flatfile implementation for Comfort Systems USA, designed to streamline data import, validation, and processing for payroll and benefits information.

## Overview

This implementation provides a customized Flatfile environment for importing various CSV files related to employee data. It includes data validation, transformation, and federation to create clean, structured datasets for downstream use.

Key features include:
- **Custom Theming:** The Flatfile space is themed to match the Comfort Systems USA branding.
- **Data Validation:** SSN validation and normalization are performed on the incoming data.
- **Smart Import:** An AI-powered canvas experience guides users through the data mapping process.
- **Data Federation:** Raw data is transformed and split into multiple "federated" views for different payroll types (Default, Extras, Prevailing Wages, Walker).
- **Webhook Submission:** Processed data can be submitted to a webhook for further integration.

## How to Develop

### Prerequisites

- Node.js
- npm
- Flatfile CLI

### Installation

1.  Clone this repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Before running the application, ensure you have the following environment variables set in your `.env` file:

- `FLATFILE_API_KEY`: Your Flatfile API key
- `FLATFILE_ENVIRONMENT_ID`: Your Flatfile environment ID
- `WEBHOOK_SITE_URL`: The webhook URL for data submission

Example `.env` file:
```
FLATFILE_API_KEY=your_api_key_here
FLATFILE_ENVIRONMENT_ID=your_environment_id_here
WEBHOOK_SITE_URL=https://webhook.site/your-unique-url
```

### Running Locally

To run the Flatfile listener locally for development and testing, use the following command:

```bash
npx flatfile@latest develop
```

This will start a local development server that connects to your Flatfile environment and listens for events. The development server will automatically reload when you make changes to your code.

### Running Demos

To run a specific demo configuration, use:

```bash
npm run dev <demo-name>
```

For example:
```bash
npm run dev comfort-systems
```

## How to Deploy

### Deploy to Flatfile Agent

The recommended deployment method is to use Flatfile's Agent service, which provides a secure, managed environment for your listeners.

#### Deploy with Default Slug

```bash
npx flatfile@latest deploy
```

#### Deploy with Custom Slug

```bash
npx flatfile@latest deploy -s comfort-systems-usa
```

### Alternative Deployment

Deployment can also be handled through various platforms like Heroku, AWS, or any service that can run a Node.js application. The general steps are:

1.  Push the code to your chosen hosting provider.
2.  Ensure that all environment variables (e.g., `WEBHOOK_SITE_URL`, `FLATFILE_API_KEY`, `FLATFILE_ENVIRONMENT_ID`) are configured in the deployment environment.
3.  Start the application.

## Project Structure

### `src/`

This directory contains the core source code for the Flatfile implementation.

#### `src/index.ts`

The main entry point for the Flatfile listener. It registers all the necessary plugins and listeners.

#### `src/listeners/`

This directory contains the various listeners that react to events in the Flatfile ecosystem.

-   `configure-space.listener.ts`: Configures the Flatfile space with custom themes and metadata. It sets up the `companyWorkbook`.
-   `users-hook.listener.ts`: Contains the `allDataHook`, which validates and normalizes SSNs and sets default location values.
-   `file-actions.listener.ts`: Adds a "CSUSA Smart Import" action to newly created files.
-   `smart-import.listener.ts`: Handles the "CSUSA Smart Import" action, creating a canvas experience for users to map their data to the `All Data` sheet.
-   `federated.listener.ts`: Implements the data federation logic, transforming data from the `Data Load Workbook` into the `Data Federation` workbook with multiple sheets.
-   `submit.listener.ts`: Handles the submission of data from a workbook to a pre-configured webhook URL.

#### `src/blueprints/`

This directory defines the structure of the data within Flatfile, including sheets, workbooks, and actions.

-   **`src/blueprints/actions/`**:
    -   `submit.action.ts`: Defines the "Submit" action that can be applied to workbooks.

-   **`src/blueprints/sheets/`**:
    -   `all-data.sheet.ts`: A comprehensive "master" sheet that contains all possible fields from the various payroll and benefits CSV files.
    -   `users.sheet.ts`: A simple sheet for user information.
    -   `federated/`: This directory contains the definitions for the federated sheets, which are views created from the `all-data` sheet.
        -   `default.federated.ts`: Sheet for default payroll data.
        -   `extras.federated.ts`: Sheet for "extras" payroll data.
        -   `prevailing-wages.federated.ts`: Sheet for prevailing wage data.
        -   `walker.federated.ts`: Sheet for "Walker" specific payroll data.

-   **`src/blueprints/workbooks/`**:
    -   `company.workbook.ts`: Defines the main "Data Load Workbook" which uses the `allDataSheet`. This is the primary workbook for data import.
    -   `federated.workbook.ts`: Defines the "Data Federation" workbook, which contains all the federated sheets.

### `support/`

This directory contains example functions and helper utilities that support the main application logic but are not part of the core implementation. 