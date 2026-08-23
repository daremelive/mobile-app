# DareMeLive mobile

Expo/React Native client for DareMeLive on iOS and Android. It includes account
onboarding, discovery and profiles, 1:1 and multi-seat live video, realtime
chat, viewer promotion, gifts and Riz, wallet views, messaging, notifications,
blocking, reporting, and account management.

## Development

Requires Node.js 20+ and native toolchains for device builds.

```bash
cp .env.example .env
npm ci
npm run validate
npx expo start --dev-client
```

Use this machine's LAN address in `.env` for a physical device. The iOS
simulator and Android emulator can use `localhost`. Production EAS profiles are
defined in `eas.json`.

Useful gates:

```bash
npm audit --audit-level=critical
npm run typecheck
npm run lint:ci
npx expo export --platform all
npx expo run:ios
npx expo run:android
```

The current Expo/React Native toolchain has high and moderate advisories in
Metro/Xcode transitive tooling. Its automatic fixes require breaking native
framework changes, so those are tracked as a dedicated Expo/React Native
migration instead of being force-installed into a release branch.

## Configuration

- `EXPO_PUBLIC_API_BASE_URL`: Django `/api` root
- `EXPO_PUBLIC_WS_BASE_URL`: `ws://` or `wss://` Django host
- `EXPO_PUBLIC_MEDIA_BASE_URL`: backend/media origin
- `EXPO_PUBLIC_WEB_BASE_URL`: public destination for shared links

Access and refresh tokens are kept in secure storage. Authenticated REST calls
share one refresh-and-retry path; stream and notification WebSockets send JWT at
the handshake. Financial mutations use server-generated truth and stable client
request IDs rather than optimistic balance changes.

Apple IAP is credited only after server receipt validation. Unverified legacy
purchase flows are disabled. Android billing and payout-provider integration
are release blockers tracked in the backend production-readiness document.

The checked-in `ios` and `android` directories are native projects, so config
changes must be deliberately reconciled with them; do not blindly run a clean
prebuild over store-specific native changes.
