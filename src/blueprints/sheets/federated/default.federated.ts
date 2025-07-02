import { FederatedSheetConfig } from "../../../../support/plugins/federate/src";

/**
 * Default Payroll Federated Sheet
 * 
 * This sheet federates default payroll data including standard benefit contributions.
 * Maps fields from the all-data sheet for BTK, ERM, LO1, and RTH contribution types.
 */
export const defaultFederatedSheet: FederatedSheetConfig = {
  name: "Default Payroll",
  slug: "default-payroll-federated",

  // Only include records that have at least one of the standard contribution amounts
  any_fields_required: ["btk1", "btk2", "erm3", "erm4", "erm6", "lo1LoanPayment", "rth5", "rth6"],

  // Dedupe on employee SSN and payroll date to handle potential duplicates
  dedupe_config: {
    on: ["employeeSsn", "payrollDate"],
    type: "merge",
    keep: "last"
  },

  fields: [
    // ===== Employee Identification Fields =====
    {
      key: "planNumber",
      type: "string",
      label: "Plan Number",
      description: "Benefit plan identifier",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "planNumber"
      }
    },
    {
      key: "employeeSsn",
      type: "string",
      label: "Employee SSN",
      description: "Employee Social Security Number",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "employeeSsn"
      }
    },
    {
      key: "subset",
      type: "string",
      label: "Subset",
      description: "Employee subset grouping for payroll processing",
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "subset"
      }
    },
    {
      key: "lastName",
      type: "string",
      label: "Last Name",
      description: "Employee last name",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "lastName"
      }
    },
    {
      key: "firstName",
      type: "string",
      label: "First Name",
      description: "Employee first name",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "firstName"
      }
    },
    {
      key: "middleName",
      type: "string",
      label: "Middle Name",
      description: "Employee middle name",
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "middleName"
      }
    },

    // ===== Payroll Data =====
    {
      key: "payrollDate",
      type: "date",
      label: "Payroll Date",
      description: "Date of payroll processing",
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "payrollDate"
      }
    },

    // ===== BTK Contributions =====
    {
      key: "btk1",
      type: "number",
      label: "BTK 1",
      description: "BTK contribution amount 1",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "btk1"
      }
    },
    {
      key: "btk2",
      type: "number",
      label: "BTK 2",
      description: "BTK contribution amount 2",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "btk2"
      }
    },

    // ===== ERM Contributions =====
    {
      key: "erm3",
      type: "number",
      label: "ERM 3",
      description: "ERM contribution amount 3",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "erm3"
      }
    },
    {
      key: "erm4",
      type: "number",
      label: "ERM 4",
      description: "ERM contribution amount 4",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "erm4"
      }
    },
    {
      key: "erm6",
      type: "number",
      label: "ERM 6",
      description: "ERM contribution amount 6",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "erm6"
      }
    },

    // ===== Loan Payment =====
    {
      key: "lo1LoanPayment",
      type: "number",
      label: "LO1 (Loan Payment)",
      description: "LO1 loan payment amount",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "lo1LoanPayment"
      }
    },

    // ===== RTH Contributions =====
    {
      key: "rth5",
      type: "number",
      label: "RTH5",
      description: "RTH contribution amount 5",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "rth5"
      }
    },
    {
      key: "rth6",
      type: "number",
      label: "RTH6",
      description: "RTH contribution amount 6",
      config: {
        decimalPlaces: 2
      },
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "rth6"
      }
    }
  ]
}; 