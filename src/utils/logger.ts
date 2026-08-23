import * as Sentry from '@sentry/react-native';

/**
 * Application logger.
 *
 * Ad-hoc console output previously made the application noisy and frequently
 * exposed tokens, user objects, and internal state. Actionable failures go to
 * Sentry through this single boundary.
 *
 * Prefer this over calling `console` directly.
 */

export const logger = {
  /**
   * Reports an error without printing potentially sensitive diagnostic data.
   */
  error(...args: unknown[]): void {
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
