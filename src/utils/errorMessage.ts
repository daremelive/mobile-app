/**
 * Turns any failure into one sentence a person can act on.
 *
 * Screens should never write their own "something went wrong" text. Pass the
 * error here instead, so wording stays consistent and every case — no signal,
 * a slow connection, a rejected form, a server crash — reads the same way
 * across the app.
 *
 * The backend sends `{ error, code, fields }` on every failure. `error` is the
 * sentence to show, `fields` maps a form field to its own sentence, and `code`
 * is a stable slug for branching in code rather than matching on English.
 */

/** Shape the backend sends on every error response. */
interface ApiErrorBody {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
  /** Older endpoints and DRF defaults. */
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

const NO_CONNECTION =
  "Can't reach DareMe right now. Please check your internet connection and try again.";
const TOO_SLOW =
  'That is taking longer than usual. Please check your connection and try again.';
const OUR_FAULT =
  'Something went wrong on our side. Please try again in a moment.';

/** Used when the server replies with a status but no message we can show. */
const BY_STATUS: Record<number, string> = {
  400: 'Some of the details entered need fixing. Please check and try again.',
  401: 'Please sign in to continue.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  405: "That action isn't available here.",
  409: 'That conflicts with something that already exists.',
  413: 'That file is too large. Please choose a smaller one.',
  415: "That file type isn't supported.",
  429: "You've tried that too many times. Please wait a little and try again.",
  500: OUR_FAULT,
  502: 'We could not reach part of our system. Please try again in a moment.',
  503: 'The service is briefly unavailable. Please try again in a moment.',
};

/** Pull the first readable sentence out of an older-style error body. */
const legacyMessage = (body: ApiErrorBody): string | undefined => {
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail;
  if (Array.isArray(body.non_field_errors) && body.non_field_errors[0]) {
    return body.non_field_errors[0];
  }
  // Fall back to the first field-shaped entry, e.g. { email: ["..."] }.
  for (const value of Object.values(body)) {
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      return value[0];
    }
    if (typeof value === 'string' && value.trim() && value.length < 200) {
      return value;
    }
  }
  return undefined;
};

/**
 * The one function screens should call.
 *
 * @param error   Whatever the failed call threw or returned.
 * @param fallback Optional wording for the "no idea what happened" case, for
 *                 places where a more specific sentence reads better.
 */
export const getErrorMessage = (error: unknown, fallback?: string): string => {
  if (!error) return fallback ?? OUR_FAULT;

  const candidate = error as {
    status?: number | string;
    data?: ApiErrorBody | string;
    error?: string;
    message?: string;
  };

  // Problems that never reached the server.
  if (candidate.status === 'FETCH_ERROR') return NO_CONNECTION;
  if (candidate.status === 'TIMEOUT_ERROR') return TOO_SLOW;
  // The server answered with something that was not JSON, which means it fell
  // over before it could describe the problem.
  if (candidate.status === 'PARSING_ERROR') return OUR_FAULT;

  if (typeof candidate.data === 'object' && candidate.data !== null) {
    const message = legacyMessage(candidate.data);
    if (message) return message;
  }

  if (typeof candidate.status === 'number') {
    const known = BY_STATUS[candidate.status];
    if (known) return known;
    if (candidate.status >= 500) return OUR_FAULT;
  }

  // A thrown JavaScript error rather than a failed request. Its text is written
  // for developers, so it is never shown.
  return fallback ?? OUR_FAULT;
};

/**
 * Per-field sentences for highlighting the inputs at fault, e.g.
 * `{ email: 'Please enter your email address.' }`.
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  const body = (error as { data?: ApiErrorBody })?.data;
  if (typeof body !== 'object' || body === null) return {};

  if (body.fields && typeof body.fields === 'object') return body.fields;

  // Older endpoints send { field: ["message"] } instead.
  const collected: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'error' || key === 'code' || key === 'detail') continue;
    if (Array.isArray(value) && typeof value[0] === 'string') collected[key] = value[0];
  }
  return collected;
};

/** The stable slug, for branching without matching on wording. */
export const getErrorCode = (error: unknown): string | undefined =>
  (error as { data?: ApiErrorBody })?.data?.code;

/** True when the failure was the connection rather than the request. */
export const isOffline = (error: unknown): boolean =>
  (error as { status?: string })?.status === 'FETCH_ERROR';
