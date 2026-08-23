export const createRequestId = (prefix = 'request'): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = [
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join('');

  return `${prefix}-${timestamp}-${randomPart}`.slice(0, 64);
};
