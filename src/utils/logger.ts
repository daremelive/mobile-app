import * as Sentry from '@sentry/react-native';

/**
 * Application logger.
 *
 * Diagnostic levels (`debug`, `log`, `info`, `warn`) are development-only:
 * they compile to no-ops in release builds, so shipping a log costs nothing at
 * runtime. `error` is always reported — to the console in development and to
 * Sentry in production, where there is no console to read.
 *
 * Prefer this over calling `console` directly. Release builds additionally run
 * babel-plugin-transform-remove-console, so any stray `console` call is
 * stripped rather than shipped.
 */

const isDev = __DEV__;

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...args);
    }
  },

  log(...args: unknown[]): void {
    if (isDev) {
      console.log(...args);
    }
  },

  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...args);
    }
  },

  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Reports an error. In production this is the only level that survives, so
   * it should carry enough context to diagnose the failure without a console.
   */
  error(...args: unknown[]): void {
    if (isDev) {
      console.error(...args);
      return;
    }

    const cause = args.find((arg): arg is Error => arg instanceof Error);
    const message = args
      .filter((arg) => typeof arg === 'string')
      .join(' ')
      .trim();

    if (cause) {
      Sentry.captureException(cause, message ? { extra: { message } } : undefined);
    } else if (message) {
      Sentry.captureMessage(message, 'error');
    }
  },
};

export default logger;
