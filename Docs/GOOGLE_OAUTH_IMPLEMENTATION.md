# Google OAuth Implementation Guide

This document outlines the Google OAuth implementation in the Sprout app, including the current architecture, components, and future improvements.

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

## Current Issue: OAuth Redirect Failure in Expo Go

### Symptoms
- User is redirected to Google OAuth consent screen
- After granting permissions, the flow fails with error: "Something went wrong trying to finish signing in"
- User is not redirected back to the app

### Root Cause Analysis
1. **Redirect URL Mismatch**: 
   - The app is using a custom scheme (`sprout://`) for production builds
   - For Expo Go, we need to use Expo's auth proxy URL

2. **WebBrowser Session Handling**:
   - The WebBrowser session might not be properly closed after authentication
   - The callback handler might not be receiving the auth response

3. **Configuration**:
   - Supabase and Google Cloud Console URLs are verified and correctly configured
   - The issue appears to be in the client-side handling of the OAuth response

### Next Steps
1. [ ] Update the Google Sign-In flow to properly handle Expo Go
2. [ ] Add better error handling and logging
3. [ ] Test the flow in both development and production environments
4. [ ] Document the final working configuration

## Current Status

### ✅ Implemented Features
- Google OAuth sign-in flow
- Session management
- Error handling
- Deep linking for mobile
- Email verification

### 🔍 Known Issues
- Limited error messages for users
- Basic UI for auth flows
- Some edge cases not fully handled

## Future Improvements

### 1. Enhanced Error Handling
- More specific error messages
- Better handling of network issues
- Improved error recovery

### 2. UI/UX Improvements
- Better loading states
- Success/error toasts
- Improved sign-in/sign-up forms

### 3. Security
- Session validation
- Rate limiting
- Token refresh handling

### 4. Testing
- Unit tests for auth flows
- Integration tests
- E2E tests

## Troubleshooting

### Common Issues

1. **OAuth Redirect Errors**
   - Verify redirect URIs in Google Cloud Console match exactly
   - Check Supabase auth configuration for correct client IDs and secrets
   - Ensure deep linking is properly configured in app.json
   - For Expo Go, check for proxy-related issues

2. **Development Build Issues**
   - Ensure development build is properly configured
   - Verify bundle identifier/package name matches everywhere
   - Check that the correct signing certificates are used

3. **Session Management**
   - Verify token storage is working
   - Check for session conflicts
   - Ensure proper error handling for expired sessions

### Debugging Tips

1. **Logs & Monitoring**
   - Check browser console logs
   - Monitor network requests in browser dev tools
   - Review Supabase authentication logs
   - Enable debug logging in your app

2. **Testing**
   - Test on multiple devices and platforms
   - Try different network conditions
   - Test with various browser privacy settings

3. **Development Builds**
   - Clear app data between tests
   - Verify deep linking configuration
   - Check for any console warnings about misconfigurations

### Getting Help

If you encounter issues:
1. Check the [Supabase Auth documentation](https://supabase.com/docs/guides/auth)
2. Review the [Expo Auth Session guide](https://docs.expo.dev/guides/authentication/)
3. Check for any open issues in the relevant GitHub repositories
4. If the issue persists, document the exact error message and steps to reproduce

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
