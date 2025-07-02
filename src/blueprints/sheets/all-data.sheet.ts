import { Flatfile } from "@flatfile/api";

/**
 * All Data Sheet - Master sheet containing all columns from payroll CSV files
 * 
 * This sheet serves as the consolidated source for payroll and benefits data,
 * containing all data from imported CSV files including employee information,
 * benefit contributions, loan payments, and prevailing wage amounts.
 * 
 * Field groups:
 * - Employee Data: Personal information and identifiers
 * - Payroll Data: Dates and processing information
 * - Benefit Contributions: BTK and ERM contribution amounts
 * - Loan Payments: LO1 loan payment amounts
 * - Retirement/Health: RTH contribution amounts
 * - Prevailing Wages: PW wage amounts for prevailing wage projects
 */
export const allDataSheet: Flatfile.SheetConfig = {
  name: "All Data",
  slug: "all-data",
  fields: [
    // ===== Employee Identification Fields =====
    {
      key: "planNumber",
      type: "string",
      label: "Plan Number",
      description: "Benefit plan identifier"
    },
    {
      key: "employeeSsn",
      type: "string",
      label: "Employee SSN",
      description: "Employee Social Security Number"
    },
    {
      key: "subset",
      type: "string",
      label: "Subset",
      description: "Employee subset grouping for payroll processing"
    },
    {
      key: "lastName",
      type: "string",
      label: "Last Name",
      description: "Employee last name"
    },
    {
      key: "firstName",
      type: "string",
      label: "First Name",
      description: "Employee first name"
    },
    {
      key: "middleName",
      type: "string",
      label: "Middle Name",
      description: "Employee middle name"
    },

    // ===== Payroll Data Fields =====
    {
      key: "payrollDate",
      type: "date",
      label: "Payroll Date",
      description: "Date of payroll processing"
    },

    // ===== Benefit Contribution Fields =====
    {
      key: "btk1",
      type: "number",
      label: "BTK 1",
      description: "BTK contribution amount 1",
      config: {
        decimalPlaces: 2
      }
    },
    {
      key: "btk2",
      type: "number",
      label: "BTK 2",
      description: "BTK contribution amount 2",
      config: {
        decimalPlaces: 2
      }
    },
    {
      key: "erm3",
      type: "number",
      label: "ERM 3",
      description: "ERM contribution amount 3",
      config: {
        decimalPlaces: 2
      }
    },
    {
      key: "erm4",
      type: "number",
      label: "ERM 4",
      description: "ERM contribution amount 4",
      config: {
        decimalPlaces: 2
      }
    },
    {
      key: "erm6",
      type: "number",
      label: "ERM 6",
      description: "ERM contribution amount 6",
      config: {
        decimalPlaces: 2
      }
    },

    // ===== Loan Payment Fields =====
    {
      key: "lo1LoanPayment",
      type: "number",
      label: "LO1 (Loan Payment)",
      description: "LO1 loan payment amount",
      config: {
        decimalPlaces: 2
      }
    },

    // ===== Retirement/Health Contribution Fields =====
    {
      key: "rth5",
      type: "number",
      label: "RTH5",
      description: "RTH contribution amount 5",
      config: {
        decimalPlaces: 2
      }
    },
    {
      key: "rth6",
      type: "number",
      label: "RTH6",
      description: "RTH contribution amount 6",
      config: {
        decimalPlaces: 2
      }
    },

    // ===== Prevailing Wage Fields =====
    {
      key: "pwAmount1",
      type: "number",
      label: "PW - AMOUNT 1",
      description: "Prevailing wage amount 1 for qualifying projects",
      config: {
        decimalPlaces: 2
      }
    }
  ],
  allowAdditionalFields: true
}; 