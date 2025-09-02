# Lichess OAuth Setup Guide

## Creating a Lichess OAuth Application

1. **Go to Lichess OAuth Apps Page**
   - Visit: https://lichess.org/account/oauth/app
   - You must be logged in to your Lichess account

2. **Create New Application**
   - Click "New OAuth App"
   - Fill in the required fields:
     - **App Name**: BanChess (or your app name)
     - **Homepage URL**: http://localhost:3000 (for development)
     - **Redirect URI**: http://localhost:3000/api/auth/callback/lichess

3. **Required Scopes**
   
   Our application requests the following scopes:
   - `email:read` - Access user's email address (if they have one)
   - `preference:read` - Read user preferences (for future features)

   **Important Notes:**
   - Not all Lichess users have email addresses as it's optional
   - Users must explicitly approve email access during authentication
   - The application handles cases where email is not provided

4. **Environment Variables**
   
   After creating your OAuth app, add to your `.env.local`:
   ```
   LICHESS_CLIENT_ID=your-client-id-here
   ```
   
   Note: Lichess doesn't require a client secret for public clients.

5. **Production Setup**
   
   For production deployment:
   - Update Homepage URL to your production domain
   - Update Redirect URI to: https://yourdomain.com/api/auth/callback/lichess
   - Ensure your production environment variables are set

## Authentication Flow

1. User clicks "Sign in with Lichess"
2. Redirected to Lichess OAuth authorization page
3. User sees requested permissions (email:read, preference:read)
4. User approves/denies access
5. Redirected back to your application
6. Application receives:
   - User ID (always provided)
   - Username (always provided)
   - Email (if user has one AND granted permission)

## Email Requirement

### Important: Email Access is Required
To maintain account security and prevent duplicate accounts, **email access is required** for Lichess OAuth authentication.

### Users Without Email or Who Deny Access
If a Lichess user:
- Doesn't have an email address in their Lichess account
- Denies the email:read permission during OAuth

They will:
- See an error message explaining the requirement
- Be directed to use **Guest mode** instead
- Still be able to play games without creating an account

### Why This Requirement?
1. **Security**: Prevents account takeover via different OAuth providers
2. **Uniqueness**: Ensures one account per email address
3. **Consistency**: All OAuth providers (Google, Lichess) follow same rules
4. **Alternative**: Guest mode is available for anonymous play

## Security Considerations

1. **Email-based Security**
   - If email is provided, it's used for duplicate account prevention
   - One email can only be associated with one provider
   - This prevents account takeover via different OAuth providers

2. **Development Mode**
   - Auto-cleans test accounts older than 24 hours
   - Shows more helpful error messages
   - Still maintains security boundaries

3. **Production Mode**
   - Strict security with no information leakage
   - Generic error messages to prevent enumeration
   - No automatic account cleanup

## Testing

1. **With Email**
   - Create a Lichess account with email
   - Sign in and approve email access
   - Verify email is stored in database

2. **Without Email**
   - Use a Lichess account without email
   - Or deny email permission during OAuth
   - Verify account creation still works

3. **Duplicate Prevention**
   - Try signing in with same email via different provider
   - Should see error toast notification
   - Original account remains unchanged