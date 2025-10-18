# Microsoft Entra External ID Setup for ScheduleCoaches.com

This guide explains how to configure Microsoft Entra External ID authentication for the ScheduleCoaches website.

## Overview

The ScheduleCoaches website uses Microsoft Entra External ID (formerly Azure AD B2C) for user authentication. When a user signs up:

1. **Entra ID creates the authentication account** (handles login/password/OAuth)
2. **Our API creates the user record** in the database via the `/auth-me` endpoint
3. **User is redirected to Stripe** for subscription payment
4. **User can then login** with their Entra credentials to manage their subscription

## Prerequisites

- Azure subscription with Global Administrator or Application Administrator role
- Access to the existing `pbcoach` Entra External ID tenant (or create a new one for schedulecoaches)

## Configuration Steps

### Option 1: Use Existing PBCoach Tenant (Recommended for Development)

If you already have the PBCoach Entra External ID tenant set up, you can reuse it for ScheduleCoaches:

1. **Navigate to the PBCoach tenant** in Azure Portal
2. **Register a new application** for ScheduleCoaches:
   - Name: `ScheduleCoaches Web App`
   - Supported account types: Accounts in this organizational directory only
   - Redirect URI:
     - Platform: Single-page application
     - URI: `http://localhost:5173/auth/callback`
     - Add: `https://schedulecoaches.com/auth/callback` (for production)
3. **Copy the Application (client) ID**
4. **Configure authentication**:
   - Enable Access tokens and ID tokens
   - Add redirect URIs for all environments
5. **Update `.env` file**:
   ```
   VITE_ENTRA_TENANT_SUBDOMAIN=pbcoach
   VITE_ENTRA_CLIENT_ID=your_new_client_id_here
   ```

### Option 2: Create New Tenant (For Production)

Follow the steps in `/documentation/ENTRA_SETUP.md` from the pbcoach.vnext repository to create a new External ID tenant specifically for ScheduleCoaches.

## Environment Variables

Add these to your `.env` file:

```env
# Microsoft Entra External ID Configuration
VITE_ENTRA_TENANT_SUBDOMAIN=pbcoach
VITE_ENTRA_CLIENT_ID=your_client_id_here
```

### Local Development
```env
VITE_ENTRA_TENANT_SUBDOMAIN=pbcoach
VITE_ENTRA_CLIENT_ID=abc123...  # Your development app client ID
VITE_API_BASE_URL=http://localhost:7071/api
```

### Production (Azure Static Web Apps)
Set in Azure Portal → Static Web Apps → Configuration:
```env
VITE_ENTRA_TENANT_SUBDOMAIN=pbcoach
VITE_ENTRA_CLIENT_ID=xyz789...  # Your production app client ID
VITE_API_BASE_URL=https://your-api.azurewebsites.net/api
```

## How It Works

### Sign-Up Flow

1. **User visits `/sign-up`**
2. **User enters email or clicks OAuth button**
3. **`useEntraAuth.signUpWithEmail()`** is called:
   - Opens Entra ID popup with `prompt: 'create'` to force account creation
   - User creates password or uses social login (Google/Apple)
   - Returns access token
4. **API calls `/auth-me`** with access token:
   - Backend validates token with Entra ID
   - Creates user record in database
   - Returns user profile
5. **API calls `/create-checkout-session`**:
   - Creates Stripe checkout session
   - Pre-fills email from Entra account
6. **User is redirected to Stripe** to complete payment
7. **After payment, user can login** with their Entra credentials

### Login Flow (Existing Customers)

1. **User visits `/login`**
2. **User enters credentials** (email/password or OAuth)
3. **`useEntraAuth.login()`** is called:
   - Opens Entra ID popup with `prompt: 'login'`
   - Returns access token
4. **API calls `/auth-me`** with access token:
   - Loads existing user from database
   - Returns user profile
5. **User is redirected to `/account`** to manage subscription

## Testing

1. **Start local dev server**: `npm run dev`
2. **Navigate to** `http://localhost:5173/sign-up`
3. **Enter test email**: `test@example.com`
4. **Complete Entra sign-up flow** (create password)
5. **Verify user is created** in database (check authMe logs)
6. **Should redirect to Stripe** checkout page

## Troubleshooting

### "Entra ID configuration missing" error
- Ensure `VITE_ENTRA_TENANT_SUBDOMAIN` and `VITE_ENTRA_CLIENT_ID` are set in `.env`
- Restart dev server after adding variables

### "Sign up cancelled" error
- User closed the popup window
- This is expected behavior

### "Failed to create user account" error
- Check API logs for authMe endpoint
- Verify database connection
- Ensure API URL is correct in `.env`

### CORS errors
- Ensure redirect URI exactly matches (including protocol and trailing slashes)
- Verify redirect URI is registered in Entra app registration

### "Invalid token" error
- Check that client ID matches the registered app
- Verify tenant subdomain is correct
- Ensure user is signing in with correct tenant

## Security Notes

- Never commit `.env` file (it's in `.gitignore`)
- Use test mode for Stripe during development
- Rotate client secrets regularly in production
- Monitor failed authentication attempts

## Additional Resources

- [Microsoft Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [MSAL.js Documentation](https://learn.microsoft.com/en-us/entra/identity-platform/msal-overview)
- [PBCoach Entra Setup Guide](../pbcoach.vnext/documentation/ENTRA_SETUP.md)
