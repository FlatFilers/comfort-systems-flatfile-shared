import { FederatedSheetConfig } from "../../../../support/plugins/federate/src";

/**
 * Prevailing Wages Federated Sheet
 * 
 * This sheet federates prevailing wage data for qualifying projects.
 * Maps fields from the all-data sheet for employee information and 
 * prevailing wage amounts used in government contract work.
 */
export const prevailingWagesFederatedSheet: FederatedSheetConfig = {
  name: "Prevailing Wages",
  slug: "prevailing-wages-federated",

  // Only include records that have prevailing wage amounts
  all_fields_required: ["pwAmount1"],

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

    // ===== Prevailing Wage Amount =====
    {
      key: "pwAmount1",
      type: "number",
      label: "PW - AMOUNT 1",
      description: "Prevailing wage amount 1 for qualifying government contract projects",
      config: {
        decimalPlaces: 2
      },
      constraints: [{ type: "required" }],
      federate_config: {
        source_sheet_slug: "all-data",
        source_field_key: "pwAmount1"
      }
    }
  ]
}; 