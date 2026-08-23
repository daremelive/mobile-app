import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemedText } from '../ThemedText';

/**
 * A rendering smoke test. Its real job is to prove the Jest setup can mount
 * React Native components at all — the preset, the transform list and the
 * asset mocks — so later component tests start from a known-good baseline.
 *
 * Two things to carry into the next component test:
 *
 * 1. In React Native Testing Library v14, `render` is ASYNC and must be
 *    awaited. Without the await you get a pending promise, and the queries
 *    come back as "not a function".
 * 2. Take queries from the awaited result, not the `screen` singleton, and
 *    keep one render per test. Rendering repeatedly inside a loop overlaps
 *    React's act() scopes and produces console errors.
 */
describe('ThemedText', () => {
  it('renders the text it is given', async () => {
    const { getByText } = await render(<ThemedText>Verify your email</ThemedText>);

    expect(getByText('Verify your email')).toBeTruthy();
  });

  it.each(['default', 'title', 'subtitle', 'defaultSemiBold', 'link'] as const)(
    'renders the %s type without error',
    async (type) => {
      const { getByText } = await render(<ThemedText type={type}>Sample</ThemedText>);

      expect(getByText('Sample')).toBeTruthy();
    },
  );
});
