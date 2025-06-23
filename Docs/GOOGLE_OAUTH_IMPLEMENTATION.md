# Google OAuth Implementation Guide

This document outlines the Google OAuth implementation in the Sprout app, including the current architecture, components, recent improvements, and future plans.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Details](#implementation-details)
4. [Current Status](#current-status)
5. [Future Improvements](#future-improvements)
6. [Troubleshooting](#troubleshooting)

## Overview

The Sprout app uses Google OAuth for user authentication, integrated with Supabase Auth. This provides a secure and familiar sign-in experience for users.

## Architecture

### Key Components

1. **Frontend**
   - React Native with Expo
   - Expo Router for navigation
   - Supabase JS client for authentication

2. **Backend**
   - Supabase Auth for authentication
   - Google OAuth 2.0 for identity verification
   - Custom database tables for user profiles

3. **Authentication Flow**
   ```
   1. User taps "Sign in with Google"
   2. App opens Google OAuth consent screen
   3. User grants permissions
   4. Google redirects to callback URL
   5. App processes authentication tokens
   6. User is authenticated and redirected to app
   ```

## Implementation Details

### 1. Google Cloud Console Setup
- Created OAuth 2.0 credentials
- Configured authorized redirect URIs
- Set up OAuth consent screen

### 2. Supabase Configuration
- Enabled Google Auth provider
- Added Google OAuth credentials
- Configured redirect URLs

### 3. Frontend Implementation

#### Auth Context (`contexts/AuthContext.js`)
- Manages authentication state
- Handles OAuth flow
- Manages user sessions
- Provides authentication methods to components

Key Methods:
- `handleGoogleSignIn()`: Initiates Google OAuth flow
- `handleAuthCallback()`: Processes OAuth response
- `signOut()`: Handles user sign out

#### Auth Screens (`app/(auth)/*`)
- `index.js`: Main auth screen with sign-in/sign-up forms
- `email-confirmation.js`: Email verification screen
- `_layout.js`: Navigation layout for auth screens

#### Callback Handler (`app/callback.js`)
- Processes OAuth redirects
- Handles authentication tokens
- Manages session creation

## Current Status

### ✅ Implemented Features
- Google OAuth sign-in flow using expo-web-browser
- Session management with Supabase Auth
- Enhanced error handling with user-friendly messages
- Deep linking for mobile with Expo Router
- Email verification flow
- Error boundary for auth-related components

### 🔍 Known Issues
- Network connectivity checks need improvement for mobile
- Some edge cases in error recovery
- Basic UI states during auth flow

## Recent Improvements (June 2024)

1. **WebBrowser Integration**
   - Added `expo-web-browser` for secure OAuth flow
   - Implemented proper browser-based authentication
   - Added error handling for browser-related issues

2. **Error Handling**
   - Added user-friendly error messages
   - Implemented error boundaries for auth components
   - Improved error logging for debugging

3. **Code Quality**
   - Removed web-specific code (navigator.onLine)
   - Added proper TypeScript types
   - Improved code organization

## Future Improvements

### 1. Enhanced Error Handling
- Implement proper network connectivity checks using `@react-native-community/netinfo`
- Add retry mechanism for failed auth attempts
- Improve error recovery flows

### 2. UI/UX Improvements
- Better loading states
- Success/error toasts
- Improved sign-in/sign-up forms

### 3. Security
- Session validation and management
- Rate limiting for auth endpoints
- Token refresh and expiration handling
- Secure storage for auth tokens

### 4. Testing
- Unit tests for auth flows
- Integration tests
- E2E tests

## Troubleshooting

### Common Issues

1. **OAuth Redirect Errors**
   - Verify redirect URIs in Google Cloud Console
   - Check Supabase auth configuration
   - Ensure deep linking is properly configured

2. **Session Not Persisting**
   - Verify token storage
   - Check for session conflicts
   - Ensure proper error handling

3. **Network Issues**
   - Handle offline scenarios
   - Implement retry logic
   - Provide user feedback

### Debugging Tips

1. **Common Issues**
   - OAuth redirect errors: Verify redirect URIs in Google Cloud Console and Supabase
   - Browser issues: Ensure `expo-web-browser` is properly installed
   - Network errors: Check connectivity and CORS settings

2. **Logging**
   - Check Metro bundler logs for runtime errors
   - Monitor network requests in browser dev tools
   - Review Supabase auth logs

3. **Testing**
   - Test on both iOS and Android
   - Verify in both development and production environments
   - Test with different network conditions

## Related Files

- `contexts/AuthContext.js`
- `app/(auth)/*.js`
- `app/callback.js`
- `app.json` (deep linking config)
- `.env` (environment variables)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
