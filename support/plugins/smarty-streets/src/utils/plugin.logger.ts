import { logError, logInfo, logWarn } from "@flatfile/util-common";

/**
* Logging utility for the SmartyStreets plugin.
* Provides consistent logging with configurable levels.
*/

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Map log levels to numeric values for comparison
const LEVEL_VALUES: Record<LogLevel, number> = {
  'debug': 0,
  'info': 1,
  'warn': 2,
  'error': 3
};

/**
* Logger utility class that respects the configured log level.
*/
export class Logger {
  private levelValue: number;
  
  /**
  * Creates a new logger instance.
  * @param component - The component name (used as prefix).
  * @param logLevel - The minimum level to log.
  */
  constructor(private component: string, private logLevel: LogLevel = 'warn') {
    this.levelValue = LEVEL_VALUES[this.logLevel] ?? LEVEL_VALUES.warn;
  }
  
  /**
  * Log a debug message if the configured log level permits.
  * @param message - The message to log.
  */
  debug(message: string): void {
    if (this.levelValue <= LEVEL_VALUES.debug) {
      // Use console.debug as util-common does not have debug
      console.debug(`[${this.component}]:[DEBUG] ${message}`);
    }
  }
  
  /**
  * Log an info message if the configured log level permits.
  * @param message - The message to log.
  */
  info(message: string): void {
    if (this.levelValue <= LEVEL_VALUES.info) {
      logInfo(this.component, message);
    }
  }
  
  /**
  * Log a warning message if the configured log level permits.
  * @param message - The message to log.
  */
  warn(message: string): void {
    if (this.levelValue <= LEVEL_VALUES.warn) {
      logWarn(this.component, message);
    }
  }
  
  /**
  * Log an error message. Errors are always logged.
  * @param message - The message to log.
  */
  error(message: string): void {
    // Errors are always logged regardless of level
    logError(this.component, message);
  }
}