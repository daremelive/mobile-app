/**
 * Production-optimized logging utility
 * Only logs in development mode to improve production performance
 */

interface LogData {
  [key: string]: any;
}

class Logger {
  private isDev = __DEV__;

  log(message: string, data?: LogData) {
    if (this.isDev) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  error(message: string, error?: any) {
    if (this.isDev) {
      if (error) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    } else {
      // In production, still log critical errors but minimal data
      if (error?.message) {
        console.error(`${message}: ${error.message}`);
      } else {
        console.error(message);
      }
    }
  }

  warn(message: string, data?: LogData) {
    if (this.isDev) {
      if (data) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    }
  }

  // Always log critical errors regardless of environment
  critical(message: string, error?: any) {
    if (error) {
      console.error(`[CRITICAL] ${message}`, error);
    } else {
      console.error(`[CRITICAL] ${message}`);
    }
  }
}

export const logger = new Logger();
export default logger;
