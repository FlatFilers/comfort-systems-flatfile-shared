import * as chrono from "chrono-node";

export enum DateValidationType {
  VALIDATE = "validate",
  BEFORE = "before",
  AFTER = "after",
  BETWEEN = "between"
}

export class DateValidator {
  /**
   * Internal helper to check if a string can be parsed as a valid date
   * @param value The string value to check
   * @returns boolean indicating if the string is a valid date
   */
  private static isDate(value: string): boolean {
    try {
      const match = value.toLowerCase().match(/^now([+-])(\d+)(days?|months?|years?)$/);
      if (match) return false;
      const parsedDate = chrono.parseDate(value);
      return parsedDate !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Internal helper to parse a string into a Date object
   * @param value The string value to parse
   * @returns Date object or null if parsing fails
   */
  private static parseDate(value: string): Date | null {
    try {
      const parsedDate = chrono.parseDate(value);
      return parsedDate;
    } catch (error) {
      return null;
    }
  }

  /**
   * Internal helper to format a Date object according to the specified format
   * Supports various date formats including:
   * - Full month names (MMMM) - e.g., "January"
   * - Short month names (MMM) - e.g., "Jan"
   * - Two-digit months (MM) - e.g., "01"
   * - Single-digit months (M) - e.g., "1"
   * - Four-digit years (YYYY) - e.g., "2024"
   * - Two-digit years (YY) - e.g., "24"
   * - Two-digit days (DD) - e.g., "01"
   * - Single-digit days (D) - e.g., "1"
   *
   * @param date The Date object to format
   * @param dateFormat The desired format string (e.g., "MMMM DD, YYYY", "MM/DD/YY", etc.)
   * @returns formatted date string
   */
  private static formatDate(date: Date, dateFormat: string): string {
    try {
      // Default format if none provided
      if (!dateFormat) {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }

      // Parse the format string to determine order and delimiter
      const format = dateFormat.toLowerCase();
      let delimiter = " ";

      // Detect delimiter from format string (only for numeric formats)
      if (!format.includes("mmmm") && !format.includes("mmm")) {
        if (format.includes("/")) delimiter = "/";
        else if (format.includes("-")) delimiter = "-";
        else if (format.includes(".")) delimiter = ".";
      }

      // Get month format
      let month: string;
      if (format.includes("mmmm")) {
        // Full month name (e.g., "January")
        month = date.toLocaleString("en-US", { month: "long" });
      } else if (format.includes("mmm")) {
        // Short month name (e.g., "Jan")
        month = date.toLocaleString("en-US", { month: "short" });
      } else if (format.includes("mm")) {
        // Two-digit month (e.g., "01")
        month = (date.getMonth() + 1).toString().padStart(2, "0");
      } else {
        // Single-digit month (e.g., "1")
        month = (date.getMonth() + 1).toString();
      }

      // Get year format
      const year = format.includes("yyyy")
        ? date.getFullYear().toString()
        : format.includes("yy")
          ? date.getFullYear().toString().slice(-2)
          : date.getFullYear().toString();

      // Get day format
      const day = format.includes("dd") ? date.getDate().toString().padStart(2, "0") : date.getDate().toString();

      // Determine the order of components based on format string
      const components: string[] = [];
      let formatParts = format.split(/[-\/.\s]/);

      for (let part of formatParts) {
        if (part.includes("y")) components.push(year);
        else if (part.includes("m")) components.push(month);
        else if (part.includes("d")) components.push(day);
      }

      // If format is invalid or incomplete, default to ISO format
      if (components.length !== 3) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      }

      // Join with the correct delimiter
      return components.join(delimiter);
    } catch (error) {
      // On any error, return ISO format
      return date.toISOString().split("T")[0];
    }
  }

  /**
   * Validates if a field contains a valid date according to the specified format
   * @param record The record containing the field to validate
   * @param field The field name to validate
   * @param dateFormat Optional date format (e.g. "MM/DD/YYYY"). If not provided, tries to parse as any valid date
   * @param options Configuration options:
   *   - addError: If true, adds an error message when validation fails
   *   - validateOnEmpty: If true, validates even if field is empty
   *   - errorMsg: Custom error message to display on validation failure
   * @returns boolean indicating if date is valid
   * @example
   * // Validates that "birthDate" field contains a valid date in MM/DD/YYYY format
   * DateValidator.validate(record, "birthDate", "MM/DD/YYYY", {
   *   addError: true,
   *   validateOnEmpty: true,
   *   errorMsg: "Please enter a valid birth date"
   * });
   */
  public static validate(
    record: Record<string, any>,
    field: string,
    dateFormat?: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let value: string | undefined;
    let isRecordWithoutLinks = false;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let valid = false;
    let formatted = "";

    if (value) {
      const isParseArgument = this.parseDateArgument(value);
      if (isParseArgument) {
        valid = true;
        formatted = this.formatDate(isParseArgument, dateFormat || "yyyy-MM-dd");
      } else {
        valid = this.isDate(value.toString());
        if (valid) {
          const parsedDate = this.parseDate(value.toString());
          if (parsedDate) {
            formatted = this.formatDate(parsedDate, dateFormat || "yyyy-MM-dd");
          }
        }
      }
    }

    if (formatted !== "") {
      record.set(field, formatted);
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const errorMsg =
          options?.errorMsg ||
          (dateFormat ? `Please enter a valid date in the format ${dateFormat}` : "Please enter a valid date");
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Formats a date field to the specified format
   * @param record The record containing the field to format
   * @param field The field name to format
   * @param dateFormat Optional date format (e.g. "MM/DD/YYYY"). If not provided, uses the original format
   * @param options Configuration options:
   *   - setRecord: If true, sets the formatted date back to the record
   *   - addInfo: If true, adds an info message when formatting
   *   - formatOnEmpty: If true, formats even if field is empty
   *   - infoMsg: Custom info message to display on formatting
   * @returns formatted date string
   * @example
   * // Formats "birthDate" field to MM/DD/YYYY format and updates the record
   * DateValidator.format(record, "birthDate", "MM/DD/YYYY", {
   *   setRecord: true,
   *   addInfo: true,
   *   infoMsg: "Birth date has been reformatted"
   * });
   */
  public static format(
    record: Record<string, any>,
    field: string,
    dateFormat?: string,
    options?: { setRecord?: boolean; addInfo?: boolean; formatOnEmpty?: boolean; infoMsg?: string },
  ) {
    let value: string | undefined;
    let isRecordWithoutLinks = false;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let formatted = "";

    if (value) {
      const isParseArgument = this.parseDateArgument(value);
      if (isParseArgument) {
        formatted = this.formatDate(isParseArgument, dateFormat || "yyyy-MM-dd");
      } else {
        const parsedDate = this.parseDate(value.toString());
        if (parsedDate) {
          formatted = this.formatDate(parsedDate, dateFormat || "yyyy-MM-dd");
        }
      }
    }

    if ((value || options?.formatOnEmpty) && formatted) {
      if (options?.addInfo && options?.setRecord && !isRecordWithoutLinks) {
        const infoMsg = options?.infoMsg || `Value has been formatted from ${value}`;
        record.addInfo(field, infoMsg);
      }
    }

    if (options?.setRecord && formatted && !isRecordWithoutLinks) {
      record.set(field, formatted);
    }

    return formatted;
  }

  /**
   * Validates if a date field is before a specified date
   * @param record The record containing the field to validate
   * @param field The field name to validate
   * @param dateBefore The date to compare against
   * @param dateFormat Optional date format (e.g. "MM/DD/YYYY"). If not provided, uses the original format
   * @param options Configuration options:
   *   - addError: If true, adds an error message when validation fails
   *   - validateOnEmpty: If true, validates even if field is empty
   *   - errorMsg: Custom error message to display on validation failure
   * @returns boolean indicating if date is before the specified date
   * @example
   * // Validates that "birthDate" field is before 01/01/2024 in MM/DD/YYYY format
   * DateValidator.before(record, "birthDate", "01/01/2024", "MM/DD/YYYY", {
   *   addError: true,
   *   validateOnEmpty: true,
   *   errorMsg: "Birth date must be before 2024"
   * });
   */
  public static before(
    record: Record<string, any>,
    field: string,
    dateBefore: string,
    dateFormat?: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let value: string | undefined;
    let isRecordWithoutLinks = false;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let valid = false;
    let dateBeforeFormatted: Date | null = null;

    if (value) {
      // Parse the comparison date
      if (this.isDate(dateBefore)) {
        dateBeforeFormatted = this.parseDate(dateBefore);
      } else {
        const dateBeforeParsed = this.parseDateArgument(dateBefore);
        if (dateBeforeParsed) {
          dateBeforeFormatted = dateBeforeParsed;
        }
      }

      // Parse the input date
      let inputDate: Date | null = null;
      if (this.isDate(value.toString())) {
        inputDate = this.parseDate(value.toString());
      } else {
        const parsedDate = this.parseDateArgument(value);
        if (parsedDate) {
          inputDate = parsedDate;
          if (dateFormat && !isRecordWithoutLinks) {
            record.set(field, this.formatDate(parsedDate, dateFormat));
          }
        }
      }

      if (inputDate && dateBeforeFormatted) {
        valid = inputDate.getTime() < dateBeforeFormatted.getTime();
      }
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const formattedDate = dateBeforeFormatted
          ? dateFormat
            ? this.formatDate(dateBeforeFormatted, dateFormat)
            : dateBeforeFormatted.toISOString()
          : dateBefore;
        const errorMsg = options?.errorMsg || `Please enter a valid date before ${formattedDate}`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a date field is after a specified date
   * @param record The record containing the field to validate
   * @param field The field name to validate
   * @param dateAfter The date to compare against
   * @param dateFormat Optional date format (e.g. "MM/DD/YYYY"). If not provided, uses the original format
   * @param options Configuration options:
   *   - addError: If true, adds an error message when validation fails
   *   - validateOnEmpty: If true, validates even if field is empty
   *   - errorMsg: Custom error message to display on validation failure
   * @returns boolean indicating if date is after the specified date
   * @example
   * // Validates that "startDate" field is after 01/01/2024 in MM/DD/YYYY format
   * DateValidator.after(record, "startDate", "01/01/2024", "MM/DD/YYYY", {
   *   addError: true,
   *   validateOnEmpty: true,
   *   errorMsg: "Start date must be after January 1st, 2024"
   * });
   *
   * // Using dynamic date with 'now' syntax
   * DateValidator.after(record, "futureDate", "now+30days", "MM/DD/YYYY", {
   *   addError: true,
   *   errorMsg: "Date must be at least 30 days in the future"
   * });
   */
  public static after(
    record: Record<string, any>,
    field: string,
    dateAfter: string,
    dateFormat?: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let value: string | undefined;
    let isRecordWithoutLinks = false;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let valid = false;
    let dateAfterFormatted: Date | null = null;

    if (value) {
      // Parse the comparison date
      if (this.isDate(dateAfter)) {
        dateAfterFormatted = this.parseDate(dateAfter);
      } else {
        const dateAfterParsed = this.parseDateArgument(dateAfter);
        if (dateAfterParsed) {
          dateAfterFormatted = dateAfterParsed;
        }
      }

      // Parse the input date
      let inputDate: Date | null = null;
      if (this.isDate(value.toString())) {
        inputDate = this.parseDate(value.toString());
      } else {
        const parsedDate = this.parseDateArgument(value);
        if (parsedDate) {
          inputDate = parsedDate;
          if (dateFormat) {
            record.set(field, this.formatDate(parsedDate, dateFormat));
          }
        }
      }

      if (inputDate && dateAfterFormatted) {
        valid = inputDate.getTime() > dateAfterFormatted.getTime();
      }
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const formattedDate = dateAfterFormatted
          ? dateFormat
            ? this.formatDate(dateAfterFormatted, dateFormat)
            : dateAfterFormatted.toISOString()
          : dateAfter;
        const errorMsg = options?.errorMsg || `Please enter a valid date after ${formattedDate}`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a date field is between two specified dates
   * @param record The record containing the field to validate
   * @param field The field name to validate
   * @param dateStart The start date to compare against
   * @param dateEnd The end date to compare against
   * @param dateFormat Optional date format (e.g. "MM/DD/YYYY"). If not provided, uses the original format
   * @param options Configuration options:
   *   - addError: If true, adds an error message when validation fails
   *   - validateOnEmpty: If true, validates even if field is empty
   *   - errorMsg: Custom error message to display on validation failure
   * @returns boolean indicating if date is between the specified dates
   * @example
   * // Validates that "birthDate" field is between 01/01/2024 and 01/01/2025 in MM/DD/YYYY format
   * DateValidator.between(record, "birthDate", "01/01/2024", "01/01/2025", "MM/DD/YYYY", {
   *   addError: true,
   *   validateOnEmpty: true,
   *   errorMsg: "Birth date must be between 2024 and 2025"
   * });
   */
  public static between(
    record: Record<string, any>,
    field: string,
    dateStart: string,
    dateEnd: string,
    dateFormat?: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let value: string | undefined;
    let isRecordWithoutLinks = false;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let valid = false;
    let dateStartFormatted: Date | null = null;
    let dateEndFormatted: Date | null = null;

    if (value) {
      // Parse the start date
      if (this.isDate(dateStart)) {
        dateStartFormatted = this.parseDate(dateStart);
      } else {
        const dateStartParsed = this.parseDateArgument(dateStart);
        if (dateStartParsed) {
          dateStartFormatted = dateStartParsed;
        }
      }

      // Parse the end date
      if (this.isDate(dateEnd)) {
        dateEndFormatted = this.parseDate(dateEnd);
      } else {
        const dateEndParsed = this.parseDateArgument(dateEnd);
        if (dateEndParsed) {
          dateEndFormatted = dateEndParsed;
        }
      }

      // Parse the input date
      let inputDate: Date | null = null;
      if (this.isDate(value.toString())) {
        inputDate = this.parseDate(value.toString());
      } else {
        const parsedDate = this.parseDateArgument(value);
        if (parsedDate) {
          inputDate = parsedDate;
          if (dateFormat && !isRecordWithoutLinks) {
            record.set(field, this.formatDate(parsedDate, dateFormat));
          }
        }
      }

      if (inputDate && dateStartFormatted && dateEndFormatted) {
        valid = inputDate.getTime() > dateStartFormatted.getTime() && inputDate.getTime() < dateEndFormatted.getTime();
      }
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const startFormatted = dateStartFormatted
          ? dateFormat
            ? this.formatDate(dateStartFormatted, dateFormat)
            : dateStartFormatted.toISOString()
          : dateStart;
        const endFormatted = dateEndFormatted
          ? dateFormat
            ? this.formatDate(dateEndFormatted, dateFormat)
            : dateEndFormatted.toISOString()
          : dateEnd;
        const errorMsg = options?.errorMsg || `Please enter a valid date between ${startFormatted} and ${endFormatted}`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Internal helper to parse special date arguments like 'now', 'now+5days', etc.
   * Supports:
   * - 'now' - current date/time
   * - 'now+{n}days' - n days in the future
   * - 'now-{n}days' - n days in the past
   * - 'now+{n}months' - n months in the future
   * - 'now-{n}months' - n months in the past
   * - 'now+{n}years' - n years in the future
   * - 'now-{n}years' - n years in the past
   *
   * @param arg The argument string to parse
   * @returns Date object or false if parsing fails
   */
  private static parseDateArgument(arg: string): Date | false {
    if (!arg) return false;

    const now = new Date();
    switch (arg.toLowerCase()) {
      case "now":
        return now;
      default:
        // Check for patterns like "now+5days", "now-3months", etc.
        const match = arg.toLowerCase().match(/^now([+-])(\d+)(days?|months?|years?)$/);

        if (match) {
          const [_, operation, amount, unit] = match;
          const value = parseInt(amount);
          const newDate = new Date(now);

          switch (unit.replace(/s$/, "")) {
            case "day":
              newDate.setDate(now.getDate() + (operation === "+" ? value : -value));
              return newDate;
            case "month":
              newDate.setMonth(now.getMonth() + (operation === "+" ? value : -value));
              return newDate;
            case "year":
              newDate.setFullYear(now.getFullYear() + (operation === "+" ? value : -value));
              return newDate;
            default:
              return false;
          }
        }
        return false;
    }
  }

  /**
   * Evaluates and formats a date value
   * @param record The record to validate and format
   * @param field The field to validate and format
   * @param validationType The type of validation to perform ('validate', 'before', 'after', 'between')
   * @param dateFormat The expected date format
   * @param validationArgs Additional arguments for validation (e.g., comparison date for before/after)
   * @param options Options for validation and formatting including formatOnError
   * @returns boolean indicating if validation passed
   * @example
   * // Validate and format a birth date to ensure it's before current date
   * DateValidator.evaluateAndFormat(record, "birthDate", "before", "MM/DD/YYYY", "now", {
   *   setRecord: true,
   *   addError: true,
   *   validateOnEmpty: true,
   *   formatOnError: false,
   *   errorMsg: "Birth date must be in the past"
   * });
   *
   * // Validate and format a date range
   * DateValidator.evaluateAndFormat(record, "eventDate", "between", "MM/DD/YYYY", ["now", "now+30days"], {
   *   setRecord: true,
   *   addError: true,
   *   formatOnError: true,
   *   errorMsg: "Event must be scheduled within the next 30 days"
   * });
   */
  public static evaluateAndFormat(
    record: Record<string, any>,
    field: string,
    validationType: DateValidationType,
    dateFormat?: string,
    validationArgs?: any,
    options?: {
      addError?: boolean;
      validateOnEmpty?: boolean;
      setRecord?: boolean;
      addInfo?: boolean;
      infoMsg?: string;
      errorMsg?: string;
      formatOnError?: boolean;
      formatOnEmpty?: boolean;
    },
  ) {
    let isValid: boolean;

    switch (validationType) {
      case DateValidationType.BEFORE:
        isValid = this.before(record, field, validationArgs[0], dateFormat, options);
        break;
      case DateValidationType.AFTER:
        isValid = this.after(record, field, validationArgs[0], dateFormat, options);
        break;
      case DateValidationType.BETWEEN:
        let arg1 = "";
        let arg2 = "";
        if (Array.isArray(validationArgs) && validationArgs.length === 2) {
          arg1 = validationArgs[0] || "";
          arg2 = validationArgs[1] || "";
        }
        isValid = this.between(record, field, arg1, arg2, dateFormat, options);
        break;
      case DateValidationType.VALIDATE:
      default:
        isValid = this.validate(record, field, dateFormat, options);
        break;
    }

    if (isValid || options?.formatOnError) {
      this.format(record, field, dateFormat, options);
    }

    return isValid;
  }
}

