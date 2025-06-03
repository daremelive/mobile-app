# DareMe Mobile App

A modern live streaming platform built with Expo React Native and Django REST Framework.

## Features

- Email/Password and Google OAuth authentication
- OTP-based email verification
- Real-time chat using WebSockets
- Live streaming with multi-guest support
- In-app diamonds and gifting system
- VIP/VVIP user levels
- Profile management and customization
- Search and follow functionality

## Tech Stack

- **Frontend:** Expo React Native
  - Modern, cross-platform mobile development
  - NativeWind for styling
  - Expo Router for navigation

- **Backend:** Django REST Framework
  - RESTful APIs
  - WebSocket support
  - Secure authentication

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

## Project Structure

```
mobile/
├── app/                    # App router directory
│   ├── (auth)/            # Authentication routes
│   ├── (tabs)/            # Main tab navigation
│   └── index.tsx          # Entry point/Onboarding
├── assets/                 # Static assets
├── components/            # Reusable components
├── constants/             # App constants
└── hooks/                 # Custom hooks
```

## Features Implementation Status

- [x] Project Setup
- [x] Onboarding Screen
- [ ] Authentication Flow
- [ ] Profile Management
- [ ] Live Streaming
- [ ] Chat System
- [ ] Diamond System
- [ ] Search & Discovery

## Security Features

- End-to-end encryption
- GDPR compliance
- Secure authentication flows
- KYC verification for withdrawals

## Performance Goals

- < 2s screen load time
- Low-latency streaming
- Smooth UI transitions
- 99.9% uptime guarantee

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.
