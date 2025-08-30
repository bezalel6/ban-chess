# OAuth Setup Guide for 2 Ban 2 Chess

This guide explains how to configure OAuth providers for authentication.

## Lichess OAuth

Lichess uses a simplified OAuth flow for public clients and **doesn't require app registration**.

### Configuration

1. Use any unique client ID (e.g., `2ban-2chess-local-dev`)
2. No client secret needed
3. The app will use PKCE for security

### Environment Variables

```env
LICHESS_CLIENT_ID=2ban-2chess-local-dev
# No LICHESS_CLIENT_SECRET needed
```

## Google OAuth

Google requires explicit app registration and redirect URI configuration.

### Setup Steps

1. **Create OAuth Application**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application" as application type

2. **Configure OAuth Client**
   - Name: `2 Ban 2 Chess (Local)` or similar
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for local development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)

3. **Get Credentials**
   - After creation, copy the Client ID and Client Secret
   - Add them to your `.env.local` file

### Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## NextAuth Configuration

### Required Environment Variables

```env
# Required for all OAuth providers
NEXTAUTH_URL=http://localhost:3000  # Change for production
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Troubleshooting

### Lichess OAuth Issues

- **"code_challenge_method required"**: The app now uses PKCE automatically
- **"invalid_request"**: Check that LICHESS_CLIENT_ID is set

### Google OAuth Issues

- **"redirect_uri_mismatch"**: Add the exact redirect URI to Google Cloud Console
- **"Access blocked"**: Ensure the OAuth consent screen is configured
- **"Invalid client"**: Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct

### General Issues

- **"NO_SECRET"**: Ensure NEXTAUTH_SECRET is set in environment variables
- **"Configuration"**: Check all required environment variables are set
- Clear browser cookies and try again
- Restart the dev server after changing environment variables

## Security Notes

1. **Never commit `.env.local`** to version control
2. Use different OAuth apps for development and production
3. Rotate NEXTAUTH_SECRET regularly in production
4. Use HTTPS in production (required by most OAuth providers)
