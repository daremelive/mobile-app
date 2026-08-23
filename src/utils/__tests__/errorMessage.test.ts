import {
  getErrorMessage,
  getFieldErrors,
  getErrorCode,
  isOffline,
} from '../errorMessage';

/**
 * These messages are shown to people, so the tests assert on the qualities a
 * reader cares about — that a sentence appears at all, that it is not jargon,
 * and that the connection cases are told apart — rather than pinning exact
 * wording, which should stay free to improve.
 */
const readsLikeASentence = (message: string) => {
  expect(message.length).toBeGreaterThan(10);
  expect(message[0]).toBe(message[0].toUpperCase());
  expect(message.trim()).toMatch(/[.!]$/);
  expect(message.toLowerCase()).not.toMatch(
    /this field|non_field|null|undefined|serializer|traceback|\[object/,
  );
};

describe('getErrorMessage', () => {
  it('uses the sentence the server sent', () => {
    const message = getErrorMessage({
      status: 400,
      data: { error: 'Please enter your email address.' },
    });

    expect(message).toBe('Please enter your email address.');
  });

  it('explains a lost connection rather than blaming the request', () => {
    const message = getErrorMessage({ status: 'FETCH_ERROR', error: 'Network request failed' });

    expect(message).toMatch(/internet connection/i);
    readsLikeASentence(message);
  });

  it('distinguishes a timeout from being offline', () => {
    const offline = getErrorMessage({ status: 'FETCH_ERROR' });
    const timeout = getErrorMessage({ status: 'TIMEOUT_ERROR' });

    expect(timeout).not.toBe(offline);
    readsLikeASentence(timeout);
  });

  it('apologises when the server replies with something that is not JSON', () => {
    // This is what a crashed server looks like from the app's side.
    const message = getErrorMessage({ status: 'PARSING_ERROR', data: '<html>500</html>' });

    expect(message).toMatch(/our side/i);
    readsLikeASentence(message);
  });

  it.each([
    [401, /sign in/i],
    [403, /permission/i],
    [404, /couldn't find/i],
    [429, /too many/i],
    [500, /our side/i],
  ])('has a plain message for status %i with no body', (status, expected) => {
    const message = getErrorMessage({ status });

    expect(message).toMatch(expected);
    readsLikeASentence(message);
  });

  it('falls back for an unknown server error', () => {
    readsLikeASentence(getErrorMessage({ status: 507 }));
  });

  it('reads older field-shaped bodies', () => {
    const message = getErrorMessage({
      status: 400,
      data: { email: ['That address is already taken.'] },
    });

    expect(message).toBe('That address is already taken.');
  });

  it('never leaks a raw JavaScript error to the reader', () => {
    const message = getErrorMessage(new TypeError('undefined is not a function'));

    expect(message).not.toMatch(/undefined is not a function/);
    readsLikeASentence(message);
  });

  it('says something sensible when handed nothing at all', () => {
    readsLikeASentence(getErrorMessage(null));
    readsLikeASentence(getErrorMessage(undefined));
  });

  it('honours a caller-supplied fallback only when nothing better exists', () => {
    expect(getErrorMessage(null, 'Could not load your wallet.')).toBe(
      'Could not load your wallet.',
    );
    // A real server message still wins over the fallback.
    expect(
      getErrorMessage({ status: 400, data: { error: 'Please pick a shorter name.' } }, 'Fallback.'),
    ).toBe('Please pick a shorter name.');
  });
});

describe('getFieldErrors', () => {
  it('returns the per-field sentences a form can attach to its inputs', () => {
    const fields = getFieldErrors({
      status: 400,
      data: {
        error: 'Please enter your email address.',
        fields: { email: 'Please enter your email address.' },
      },
    });

    expect(fields).toEqual({ email: 'Please enter your email address.' });
  });

  it('reads older field-shaped bodies too', () => {
    const fields = getFieldErrors({
      status: 400,
      data: { password: ['That password is too common.'] },
    });

    expect(fields.password).toBe('That password is too common.');
  });

  it('is empty rather than undefined when there is nothing to attach', () => {
    expect(getFieldErrors({ status: 500 })).toEqual({});
    expect(getFieldErrors(null)).toEqual({});
  });
});

describe('getErrorCode and isOffline', () => {
  it('exposes the stable code so callers need not match on wording', () => {
    expect(getErrorCode({ status: 429, data: { code: 'rate_limited' } })).toBe('rate_limited');
    expect(getErrorCode({ status: 500 })).toBeUndefined();
  });

  it('identifies a connection failure', () => {
    expect(isOffline({ status: 'FETCH_ERROR' })).toBe(true);
    expect(isOffline({ status: 500 })).toBe(false);
  });
});
