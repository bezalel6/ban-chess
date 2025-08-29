# Coolify API Setup for Automated Deployments

This guide explains how to set up automatic redeployments using the Coolify API.

## Quick Setup

### 1. Get Your Coolify API Token

1. Log into your Coolify dashboard
2. Navigate to **Settings > API Tokens** (or `/security/api-tokens`)
3. Click **"Create New Token"**
4. Give it a descriptive name (e.g., "Deployment Script")
5. Select permissions: **"Deploy Application"** (minimum required)
6. Copy the generated token immediately (it won't be shown again)

### 2. Set Environment Variables

Choose one of these methods:

#### Option A: Set on Your Local Machine (Windows PowerShell)
```powershell
# Set permanently for current user
[System.Environment]::SetEnvironmentVariable("COOLIFY_API_TOKEN", "your-token-here", "User")
[System.Environment]::SetEnvironmentVariable("COOLIFY_URL", "https://coolify.yourdomain.com", "User")

# Or set temporarily for current session
$env:COOLIFY_API_TOKEN = "your-token-here"
$env:COOLIFY_URL = "https://coolify.yourdomain.com"
```

#### Option B: Pass as Parameters
```powershell
.\deploy-to-coolify-integrated.ps1 `
    -CoolifyApiToken "your-token-here" `
    -CoolifyUrl "https://coolify.yourdomain.com"
```

#### Option C: Create a .env File (Git-ignored)
Create `.env.deploy.local` in project root:
```env
COOLIFY_API_TOKEN=your-token-here
COOLIFY_URL=https://coolify.yourdomain.com
```

Then load it before running:
```powershell
# Load environment variables
Get-Content .env.deploy.local | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

# Run deployment
.\deploy-to-coolify-integrated.ps1
```

## Verify Your Setup

Run the deployment script with the `-Help` flag to see all options:
```powershell
.\deploy-to-coolify-integrated.ps1 -Help
```

## API Endpoints Used

The script uses the following Coolify API endpoint:
- **POST** `/api/v1/applications/{appId}/restart` - Triggers application redeploy

## Troubleshooting

### API Token Not Working
- Ensure the token has "Deploy Application" permission
- Check that the token hasn't expired
- Verify the Coolify URL is correct (no trailing slash)

### Application Not Found (404)
- Verify the App ID in the script matches your Coolify app
- Find the correct ID in your Coolify dashboard URL when viewing the app

### Connection Failed
- Check if your Coolify instance is accessible from your network
- Verify HTTPS certificate if using self-signed certs
- Check firewall rules

## Security Notes

- **Never commit API tokens to Git**
- Add `.env.deploy.local` to `.gitignore`
- Use environment variables or secure vaults for production
- Rotate tokens periodically
- Use minimal required permissions

## Manual Fallback

If API deployment fails, the script will provide manual instructions:
1. Go to your Coolify dashboard
2. Navigate to your application
3. Click the "Redeploy" button

## Support

For Coolify API documentation, visit:
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify API Reference](https://coolify.io/docs/api)