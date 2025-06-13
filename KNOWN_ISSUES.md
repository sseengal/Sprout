# Known Issues

## 1. Missing Email Confirmation Screen After Signup

### Description
- After signing up with email, users are not seeing the email confirmation screen
- Users are directly redirected to the login page instead
- This creates confusion as users expect to see a confirmation message
- The email confirmation email is still being sent, but the UI flow is not properly handling the post-signup state

### Root Cause
- The signup flow is not properly handling the post-signup state transition
- The UI is not checking for or displaying the email confirmation message
- The redirection to the login page is happening before the confirmation UI can be shown

### Troubleshooting Steps

#### 1. Verify Email Confirmation Settings
- [ ] Check Supabase authentication settings for email confirmation requirements
- [ ] Verify the email template for confirmation is properly configured
- [ ] Ensure the confirmation URL is correctly pointing to your app's deep link

#### 2. Check Signup Flow
- [ ] Review the signup handler in the authentication flow
- [ ] Add logging to track the user flow after signup
- [ ] Verify if the confirmation email is being triggered successfully

#### 3. UI/UX Improvements Needed
- [ ] Add a confirmation screen after successful signup
- [ ] Show a message about the confirmation email being sent
- [ ] Add a resend confirmation email option
- [ ] Consider auto-login after email confirmation

---

## 2. Google OAuth Authentication Failure

### Description
- Google Sign-In flow starts correctly but fails after authentication
- Redirect URL is set to: `https://auth.expo.io/@sseengal/sprout-plant-care`
- The app never receives the OAuth callback (no `handleAuthCallback` logs appear)
- Error shown: `auth.expo.io` error page saying "something went wrong trying to finish signing in"
- Test deep link works (but this doesn't test real OAuth flow)

### Root Cause
- The Expo AuthSession proxy is not properly delivering the OAuth callback back to the app
- This is a common issue with Expo Go + Supabase + Google OAuth

### Troubleshooting Steps

#### 1. Verify Configuration
- [ ] **Google Cloud Console**
  - Go to Credentials > OAuth 2.0 Client IDs > Edit
  - Verify `https://auth.expo.io/@sseengal/sprout-plant-care` is in Authorized redirect URIs
  - No trailing slashes or typos

- [ ] **Supabase Dashboard**
  - Authentication > Providers > Google
  - Verify `https://auth.expo.io/@sseengal/sprout-plant-care` is in Redirect URLs
  - No trailing slashes or typos

#### 2. Test with a Development Build
Expo Go has limitations with OAuth. Try a development build:

```bash
# For iOS
eas build --profile development --platform ios
# Or for Android
eas build --profile development --platform android
```

#### 3. Additional Testing
- [ ] Test on a physical device if using an emulator, or vice versa
- [ ] Try on a different network (sometimes firewalls block callbacks)
- [ ] Check device logs for any additional error messages
- [ ] Consider trying a different OAuth provider (like Apple or GitHub) to isolate the issue

### References
- [Expo AuthSession Troubleshooting](https://docs.expo.dev/guides/authentication/#troubleshooting)
- [Expo Forum: OAuth redirect issues](https://forums.expo.dev/search?q=auth.expo.io%20redirect)

### Notes
- The test deep link works because it bypasses OAuth entirely
- The issue is specifically with the OAuth callback not being delivered to the app
- Building a standalone app often resolves this as it uses a more reliable callback mechanism

---

## 3. Gemini API Loading State Not Handled Properly

### Description
- When the Gemini API fails to respond or returns an error, the plant details and care section shows a loading spinner indefinitely
- Users have no indication that something went wrong
- There's no retry mechanism or fallback content
- This creates a poor user experience as the app appears to be stuck

### Root Cause
- The loading state is not properly managed when API calls to Gemini fail
- No error boundaries or fallback UI is implemented for failed API calls
- The loading spinner continues to show without any timeout mechanism
- Error states from the API are not being caught and handled appropriately

### Troubleshooting Steps

#### 1. Implement Error Boundaries
- [ ] Add error boundaries around the plant details component
- [ ] Display a user-friendly error message when the API fails
- [ ] Include a retry button to attempt the API call again

#### 2. Add Timeout for API Calls
- [ ] Implement a timeout for Gemini API requests
- [ ] Show an appropriate message if the request takes too long
- [ ] Allow users to retry the request

#### 3. Improve Error Handling
- [ ] Add proper error handling for the Gemini API response
- [ ] Log errors for debugging purposes
- [ ] Consider implementing a fallback to cached or offline content if available

#### 4. UI/UX Improvements
- [ ] Add a clear error state UI
- [ ] Include guidance for users on what to do next
- [ ] Consider implementing an exponential backoff for retries
- [ ] Add a contact support option for persistent issues

### References
- [React Error Boundaries Documentation](https://reactjs.org/docs/error-boundaries.html)
- [Handling API Errors in React](https://www.robinwieruch.de/react-hooks-fetch-data/)

---

## 4. Handle Duplicate Plant Saves

### Description
- Currently, users can save the same plant multiple times
- This creates duplicate entries in the "My Plants" list
- No mechanism exists to check if a plant has already been saved

### Impact
- Cluttered user experience with duplicate entries
- Inefficient storage usage
- Potential confusion when viewing saved plants

### Proposed Solution
- Implement duplicate detection before saving a plant
- Options when a duplicate is detected:
  - Skip saving and show a toast "Plant already saved"
  - Update the existing entry with new data
  - Prompt the user to confirm if they want to update the existing entry

### Technical Considerations
- Need a reliable way to identify duplicate plants (e.g., using plant ID, scientific name, or image hash)
- Consider edge cases like plants with the same name but different images
- Ensure the solution works well with future Supabase integration

### Related Components
- Plant save functionality
- "My Plants" list view
- Plant details screen

---
*Add new issues below this line using the same format*
