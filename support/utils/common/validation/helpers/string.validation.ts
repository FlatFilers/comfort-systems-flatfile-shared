import { PhoneNumberUtil, PhoneNumberFormat } from "google-libphonenumber";

export enum StringValidationType {
  VALIDATE = "validate",
  IS_EMAIL = "isEmail",
  IS_PHONE = "isPhone",
  IS_SSN = "isSSN",
  MATCHES_PATTERN = "matchesPattern",
  HAS_LENGTH = "hasLength",
  MIN = "min",
  MAX = "max",
  ZIP = "zip",
}

export type PhoneFormat = PhoneNumberFormat.E164 | PhoneNumberFormat.NATIONAL | PhoneNumberFormat.INTERNATIONAL;

export class StringValidator {
  /**
   * Formats a string value
   * @param record The record containing the field
   * @param field The field to format
   * @param formatOptions Options for string formatting
   * @param options Additional options for formatting
   * @returns boolean indicating if formatting was successful
   * @example
   * // Basic formatting
   * await StringValidator.format(record, "name", {
   *   case: 'title',
   *   trim: true
   * });
   *
   * // Advanced formatting
   * await StringValidator.format(record, "id", {
   *   case: 'upper',
   *   trim: true,
   *   truncate: 50,
   *   replace: { search: /\s+/g, replace: '-' },
   *   prefix: 'ID-',
   *   suffix: '-2024',
   *   padStart: 10,
   *   padChar: '0'
   * }, {
   *   setRecord: true,
   *   addInfo: true,
   *   formatOnEmpty: false,
   *   infoMsg: 'ID has been formatted'
   * });
   */
  public static format(
    record: Record<string, any>,
    field: string,
    formatOptions?: {
      case?: "upper" | "lower" | "title";
      trim?: boolean;
      padStart?: number;
      padEnd?: number;
      padChar?: string;
      truncate?: number;
      replace?: { search: string | RegExp; replace: string };
      prefix?: string;
      suffix?: string;
    },
    options?: {
      setRecord?: boolean;
      addInfo?: boolean;
      formatOnEmpty?: boolean;
      infoMsg?: string;
    },
  ) {
    let isRecordWithoutLinks = false;
    let value: string | undefined;
    try {
      value = record.get(field);
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }

    let formatted = String(value || "");

    if (formatOptions?.trim) {
      formatted = formatted.trim();
    }

    if (formatOptions?.case) {
      switch (formatOptions.case) {
        case "upper":
          formatted = formatted.toUpperCase();
          break;
        case "lower":
          formatted = formatted.toLowerCase();
          break;
        case "title":
          formatted = formatted
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          break;
      }
    }

    if (formatOptions?.padStart && formatOptions?.padChar) {
      formatted = formatted.padStart(formatOptions.padStart, formatOptions.padChar);
    }

    if (formatOptions?.padEnd && formatOptions?.padChar) {
      formatted = formatted.padEnd(formatOptions.padEnd, formatOptions.padChar);
    }

    if (formatOptions?.truncate) {
      formatted = formatted.slice(0, formatOptions.truncate);
    }

    if (formatOptions?.replace) {
      formatted = formatted.replace(formatOptions.replace.search, formatOptions.replace.replace);
    }

    if (formatOptions?.prefix) {
      formatted = formatOptions.prefix + formatted;
    }

    if (formatOptions?.suffix) {
      formatted = formatted + formatOptions.suffix;
    }

    if (options?.setRecord && !isRecordWithoutLinks) {
      record.set(field, formatted);

      if (options?.addInfo) {
        const infoMsg = options?.infoMsg || `Value changed from ${value}`;
        record.addInfo(field, infoMsg);
      }
    }

    return formatted;
  }

  /**
   * Validates if a string matches a regex pattern
   * @param record The record to validate
   * @param field The field to validate
   * @param pattern The regex pattern to match
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.matchesPattern(record, "id", /^[A-Z0-9]+$/, {
   *   addError: true,
   *   errorMsg: "ID must contain only uppercase letters and numbers"
   * });
   */
  public static matchesPattern(
    record: Record<string, any>,
    field: string,
    pattern: RegExp,
    options?: {
      addError?: boolean;
      validateOnEmpty?: boolean;
      errorMsg?: string;
      preprocessedValue?: string;
    },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    var valid = false;

    if (value) {
      valid = pattern.test(value);
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        var errorMsg = options?.errorMsg || "Value does not match the required pattern";
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a string is a valid email address
   * @param record The record to validate
   * @param field The field to validate
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.isEmail(record, "email", {
   *   addError: true,
   *   errorMsg: "Please enter a valid email address"
   * });
   */
  public static isEmail(
    record: Record<string, any>,
    field: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    // RFC 5322 compliant email regex
    const emailPattern =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;

    return this.matchesPattern(record, field, emailPattern, {
      addError: options?.addError,
      validateOnEmpty: options?.validateOnEmpty,
      errorMsg: options?.errorMsg || "Please enter a valid email address",
    });
  }

  /**
   * Validates if a string is a valid phone number
   * @param record The record to validate
   * @param field The field to validate
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.isPhone(record, "phone", {
   *   addError: true,
   *   errorMsg: "Please enter a valid phone number"
   * });
   */
  public static isPhone(
    record: Record<string, any>,
    field: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let valid = false;

    if (value) {
      try {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const phoneNumber = phoneUtil.parse(value);
        valid = phoneUtil.isValidNumber(phoneNumber);
      } catch (error) {
        valid = false;
      }
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const errorMsg = options?.errorMsg || "Please enter a valid phone number";
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a string is a valid SSN
   * @param record The record to validate
   * @param field The field to validate
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.isSSN(record, "ssn", {
   *   addError: true,
   *   errorMsg: "Please enter a valid SSN"
   * });
   */
  public static isSSN(
    record: Record<string, any>,
    field: string,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    const digitsOnly = value.replace(/\D/g, "");

    // SSN validation rules:
    // 1. Must be 9 digits
    // 2. Cannot start with 000, 666, or 900-999
    // 3. Cannot have 00 in positions 4-5
    // 4. Cannot have 0000 in positions 6-9
    const valid =
      digitsOnly.length === 9 &&
      !/^(000|666|9)/.test(digitsOnly) &&
      !/^.{3}00/.test(digitsOnly) &&
      !/^.{5}0000$/.test(digitsOnly);

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        const errorMsg = options?.errorMsg || "Please enter a valid SSN";
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a string has a specific length
   * @param record The record to validate
   * @param field The field to validate
   * @param min The minimum length (null for no minimum)
   * @param max The maximum length (null for no maximum)
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.hasLength(record, "password", 8, 20, {
   *   addError: true,
   *   errorMsg: "Password must be between 8 and 20 characters"
   * });
   */
  public static hasLength(
    record: Record<string, any>,
    field: string,
    min: number | null,
    max: number | null,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    var valid = false;

    if (value) {
      valid = value.length >= (min || 0) && value.length <= (max || Infinity);
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        var errorMsg = options?.errorMsg || `Value must be between ${min || 0} and ${max || Infinity} characters`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a string is at least a minimum length
   * @param record The record to validate
   * @param field The field to validate
   * @param min The minimum length
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.min(record, "password", 8, {
   *   addError: true,
   *   errorMsg: "Password must be at least 8 characters"
   * });
   */
  public static min(
    record: Record<string, any>,
    field: string,
    min: number,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    var valid = false;

    if (value) {
      valid = value.length >= min;
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        var errorMsg = options?.errorMsg || `Value must be at least ${min} characters`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Validates if a string is at most a maximum length
   * @param record The record to validate
   * @param field The field to validate
   * @param max The maximum length
   * @param options Additional validation options
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.max(record, "name", 50, {
   *   addError: true,
   *   errorMsg: "Name must not exceed 50 characters"
   * });
   */
  public static max(
    record: Record<string, any>,
    field: string,
    max: number,
    options?: { addError?: boolean; validateOnEmpty?: boolean; errorMsg?: string },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    var valid = false;

    if (value) {
      valid = value.length <= max;
    }

    if (value || options?.validateOnEmpty) {
      if (!valid && options?.addError && !isRecordWithoutLinks) {
        var errorMsg = options?.errorMsg || `Value must not exceed ${max} characters`;
        record.addError(field, errorMsg);
      }
    }

    return valid;
  }

  /**
   * Formats an SSN
   * @param record The record containing the SSN
   * @param field The field containing the SSN
   * @param options Additional formatting options
   * @returns The formatted SSN
   * @example
   * await StringValidator.formatSSN(record, "ssn", {
   *   setRecord: true,
   *   addInfo: true
   * });
   */
  public static formatSSN(
    record: Record<string, any>,
    field: string,
    options?: {
      setRecord?: boolean;
      addInfo?: boolean;
      formatOnEmpty?: boolean;
      infoMsg?: string;
      digitsOnly?: boolean;
    },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    var formatted = value;

    if (value || options?.formatOnEmpty) {
      // First validate without setting errors
      if (this.isSSN(record, field)) {
        const digitsOnly = value.replace(/\D/g, "");
        if (options?.digitsOnly) {
          formatted = digitsOnly;
        } else {
          formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 5)}-${digitsOnly.slice(5)}`;
        }
        if (options?.addInfo && options?.setRecord && !isRecordWithoutLinks) {
          let infoMsg;
          if (options?.infoMsg || options?.infoMsg === "") {
            infoMsg = options.infoMsg;
          } else if (options?.digitsOnly) {
            infoMsg = `Value normalized to 9-digit SSN (hyphens removed)`;
          } else {
            infoMsg = `Value formatted to standard SSN format (XXX-XX-XXXX)`;
          }
          record.addInfo(field, infoMsg);
        }
      } else if (options?.setRecord) {
        formatted = "Invalid SSN";
      }

      if (options?.setRecord && !isRecordWithoutLinks) {
        record.set(field, formatted);
      }
    }

    return formatted;
  }

  /**
   * Formats a phone number
   * @param record The record containing the phone number
   * @param field The field containing the phone number
   * @param format The desired format (NATIONAL, INTERNATIONAL, or E164)
   * @param options Additional formatting options
   * @returns The formatted phone number
   * @example
   * await StringValidator.formatPhone(record, "phone", "INTERNATIONAL", {
   *   setRecord: true,
   *   addInfo: true
   * });
   */
  public static formatPhone(
    record: Record<string, any>,
    field: string,
    format: "NATIONAL" | "INTERNATIONAL" | "E164" = "INTERNATIONAL",
    options?: {
      setRecord?: boolean;
      addInfo?: boolean;
      formatOnEmpty?: boolean;
      infoMsg?: string;
    },
  ) {
    let isRecordWithoutLinks = false;
    let value = "";
    try {
      value = record.get(field)?.toString() || "";
    } catch (error) {
      value = record.values[field].value;
      isRecordWithoutLinks = true;
    }
    let formatted = value;

    let phoneFormat = PhoneNumberFormat.INTERNATIONAL;
    switch (format) {
      case "NATIONAL":
        phoneFormat = PhoneNumberFormat.NATIONAL;
        break;
      case "E164":
        phoneFormat = PhoneNumberFormat.E164;
        break;
    }

    if (value || options?.formatOnEmpty) {
      try {
        const phoneUtil = PhoneNumberUtil.getInstance();

        if (this.isPhone(record, field)) {
          const phoneNumber = phoneUtil.parse(value);
          formatted = phoneUtil.format(phoneNumber, phoneFormat);

          if (options?.addInfo && options?.setRecord && !isRecordWithoutLinks) {
            const infoMsg = options?.infoMsg || `Value changed from ${value}`;
            record.addInfo(field, infoMsg);
          }
        } else if (options?.setRecord) {
          formatted = "Invalid Phone Number";
        }
      } catch (error) {
        if (options?.setRecord) {
          formatted = "Invalid Phone Number";
        }
      }

      if (options?.setRecord && !isRecordWithoutLinks) {
        record.set(field, formatted);
      }
    }

    return formatted;
  }

  /**
   * Evaluates and formats a string value
   * @param record The record to validate and format
   * @param field The field to validate and format
   * @param validationType The type of validation to perform
   * @param formatOptions Options for string formatting
   * @param validationArgs Additional arguments for validation
   * @param options Additional options for validation and formatting
   * @returns boolean indicating if validation passed
   * @example
   * await StringValidator.evaluateAndFormat(record, "email", StringValidationType.IS_EMAIL, {
   *   case: "lower",
   *   trim: true
   * });
   */
  public static evaluateAndFormat(
    record: Record<string, any>,
    field: string,
    validationType: StringValidationType,
    formatOptions?: {
      case?: "upper" | "lower" | "title";
      trim?: boolean;
      padStart?: number;
      padEnd?: number;
      padChar?: string;
      truncate?: number;
      replace?: { search: string | RegExp; replace: string };
      prefix?: string;
      suffix?: string;
    },
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
    let isRecordWithoutLinks = false;

    switch (validationType) {
      case StringValidationType.IS_EMAIL:
        isValid = this.isEmail(record, field, options);
        break;
      case StringValidationType.IS_PHONE:
        isValid = this.isPhone(record, field, validationArgs?.format);
        break;
      case StringValidationType.IS_SSN:
        isValid = this.isSSN(record, field, options);
        break;
      case StringValidationType.MATCHES_PATTERN:
        isValid = this.matchesPattern(record, field, validationArgs, options);
        break;
      case StringValidationType.HAS_LENGTH:
        var arg1 = null;
        var arg2 = null;
        if (Array.isArray(validationArgs) && validationArgs.length === 2) {
          arg1 = validationArgs[0] as any;
          arg2 = validationArgs[1] as any;
        }
        isValid = this.hasLength(record, field, arg1, arg2, options);
        break;
      case StringValidationType.MIN:
        isValid = this.min(record, field, validationArgs, options);
        break;
      case StringValidationType.MAX:
        isValid = this.max(record, field, validationArgs, options);
        break;
      case StringValidationType.ZIP:
        isValid = this.validateZIP(validationArgs, options).valid;
        break;
      case StringValidationType.VALIDATE:
      default:
        let value: string | undefined;
        try {
          value = record.get(field);
        } catch (error) {
          value = record.values[field].value;
          isRecordWithoutLinks = true;
        }
        isValid = value !== null && value !== undefined;
    }

    if (isValid || options?.formatOnError || isRecordWithoutLinks) {
      this.format(record, field, formatOptions, options);
    }

    return isValid;
  }

  /**
   * Evaluates and formats a phone number
   * @param record The record to validate and format
   * @param field The field to validate and format
   * @param format The desired format (NATIONAL, INTERNATIONAL, or E164)
   * @param options Additional options for validation and formatting
   * @returns Promise<boolean> indicating if validation passed
   * @example
   * await StringValidator.evaluateAndFormatPhone(record, "phone", "INTERNATIONAL", {
   *   addError: true,
   *   setRecord: true
   * });
   */
  public static async evaluateAndFormatPhone(
    record: Record<string, any>,
    field: string,
    format?: "INTERNATIONAL" | "NATIONAL" | "E164",
    options?: {
      addError?: boolean;
      validateOnEmpty?: boolean;
      setRecord?: boolean;
      addInfo?: boolean;
      infoMsg?: string;
      formatOnError?: boolean;
      formatOnEmpty?: boolean;
    },
  ): Promise<boolean> {
    const isValid = await this.isPhone(record, field, options);

    if (isValid || options?.formatOnError) {
      await this.formatPhone(record, field, format, options);
    }

    return isValid;
  }

  /**
   * Evaluates and formats an SSN
   * @param record The record to validate and format
   * @param field The field to validate and format
   * @param options Additional options for validation and formatting
   * @returns Promise<boolean> indicating if validation passed
   * @example
   * await StringValidator.evaluateAndFormatSSN(record, "ssn", {
   *   addError: true,
   *   setRecord: true
   * });
   */
  public static async evaluateAndFormatSSN(
    record: Record<string, any>,
    field: string,
    options?: {
      addError?: boolean;
      validateOnEmpty?: boolean;
      setRecord?: boolean;
      addInfo?: boolean;
      infoMsg?: string;
      formatOnError?: boolean;
      formatOnEmpty?: boolean;
    },
  ): Promise<boolean> {
    const isValid = await this.isSSN(record, field, options);

    if (isValid || options?.formatOnError) {
      await this.formatSSN(record, field, options);
    }

    return isValid;
  }

  /**
   * Validates and formats a ZIP code
   * @param value The ZIP code to validate
   * @param options Additional options for validation and formatting
   * @returns Object containing validation result and formatted value
   * - Validates format for US ZIP codes
   */
  public static validateZIP(
    value: string,
    options: { validateOnEmpty?: boolean; format?: boolean } = {},
  ): { valid: boolean; value: string; error?: string } {
    if (!value && !options.validateOnEmpty) {
      return { valid: true, value };
    }

    const cleanValue = value
      .toString()
      .trim()
      .replace(/[^0-9]/g, "");

    const valid = /^[0-9]{5}(?:[0-9]{4})?$/.test(cleanValue);

    if (!valid) {
      return {
        valid: false,
        value: cleanValue,
        error: "Invalid ZIP code format",
      };
    }

    if (options.format) {
      if (cleanValue.length > 5) {
        return {
          valid: true,
          value: `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`,
        };
      }
    }

    return {
      valid: true,
      value: cleanValue,
    };
  }
}
