import reducer, {
  setPendingEmail,
  setPendingResetToken,
  setCredentials,
  clearPendingEmail,
  clearPendingResetToken,
  logout,
} from '../authSlice';

const session = {
  access: 'access-token',
  refresh: 'refresh-token',
  user: { id: 1, email: 'someone@example.com' },
} as any;

describe('authSlice', () => {
  describe('logout', () => {
    // Regression: logout used to clear these, so a stray 401 from any
    // background request threw people out of signup and password reset
    // part-way through. See PR #14.
    it('keeps the pending email so signup verification survives a stray 401', () => {
      let state = reducer(undefined, setPendingEmail('signup@example.com'));
      state = reducer(state, logout());

      expect(state.pendingEmail).toBe('signup@example.com');
    });

    it('keeps the reset token so password reset survives a stray 401', () => {
      let state = reducer(undefined, setPendingResetToken('reset-token-123'));
      state = reducer(state, logout());

      expect(state.pendingResetToken).toBe('reset-token-123');
    });

    it('still ends the session it is meant to end', () => {
      let state = reducer(undefined, setCredentials(session));
      expect(state.isAuthenticated).toBe(true);

      state = reducer(state, logout());

      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('pending verification state', () => {
    it('is cleared explicitly by the flow that owns it', () => {
      let state = reducer(undefined, setPendingEmail('someone@example.com'));
      state = reducer(state, setPendingResetToken('token'));

      state = reducer(state, clearPendingEmail());
      expect(state.pendingEmail).toBeNull();
      expect(state.pendingResetToken).toBe('token');

      state = reducer(state, clearPendingResetToken());
      expect(state.pendingResetToken).toBeNull();
    });
  });

  describe('setCredentials', () => {
    it('stores the session and marks the user signed in', () => {
      const state = reducer(undefined, setCredentials(session));

      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.user).toEqual(session.user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });
  });
});
