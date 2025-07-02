import { Flatfile } from "@flatfile/api";

export const dataQualityScoresSheet: Flatfile.SheetConfig = {
  name: "<<Data Quality Scores>>",    // this will be overridden by the source workbook name
  slug: "<<dataQualityScoresSheet>>", // this will be overridden by the source workbook name
  access: [],
  readonly: true,
  fields: [
    {
      key: "sheet_name",
      type: "string",
      label: "Sheet Name",
      description: "Name of the sheet being analyzed",
      readonly: true,
    },
    {
      key: "valid_rows_count",
      type: "number",
      label: "Valid Rows #",
      description: "Number of valid rows in the sheet at this point in time",
      readonly: true,
    },
    {
      key: "invalid_rows_count",
      type: "number",
      label: "Invalid Rows #",
      description: "Number of invalid rows in the sheet at this point in time",
      readonly: true,
    },
    {
      key: "valid_rows_percentage",
      type: "string",
      label: "Valid Rows %",
      description: "Percentage of valid rows in the sheet (rounded to the nearest whole number)",
      readonly: true,
    },
    {
      key: "invalid_rows_percentage",
      type: "string",
      label: "Invalid Rows %",
      description: "Percentage of invalid rows in the sheet (rounded to the nearest whole number)",
      readonly: true,
    },
    {
      key: "timestamp",
      type: "string",
      label: "Timestamp",
      description: "When the analysis was performed - used to track history over time",
      readonly: true,
    },
  ],
};
