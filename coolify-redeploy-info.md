# Coolify Deployment Architecture & Redeploy Options

## Architecture Overview

This project uses a **two-repository deployment strategy**:

1. **Main Application Repository** (`2ban-2chess`)
   - Contains all application source code
   - Built locally for maximum speed
   - Artifacts uploaded to server via rsync

2. **Deployment Repository** (`coolify-deployment/`)
   - Contains only `docker-compose.yml` and configuration
   - Watched by Coolify for changes
   - References pre-built artifacts on server filesystem
   - Enables instant container restarts (no rebuild needed)

## Current Findings

1. **API Endpoint `/api/v1/applications/{id}/restart`**
   - Returns 419 CSRF token error
   - This is a Laravel web route, not a REST API endpoint
   - Requires session authentication, not Bearer tokens

2. **Webhook Endpoint `/webhook/deploy/{id}`**
   - Returns login page when accessed with Bearer token
   - Likely requires session cookie authentication
   - May work with different authentication method

## Deployment Flow

### Current Workflow
1. **Build locally** - `npm run build` (fast, uses your machine's resources)
2. **Upload artifacts** - `deploy-to-coolify-integrated.ps1` syncs to server
3. **Trigger redeploy** - Coolify restarts containers with new files

### File Locations
- **Server build location**: `/home/rndev/chess-app-builds/`
  - `app-dist/` - Next.js standalone build
  - `ws-dist/` - WebSocket server files
- **Docker Compose mounts**: These directories as volumes (read-only)
- **Result**: Zero-downtime deployment with instant container restart

## Working Solutions

### Option 1: Manual Browser Trigger
After deploying files via the script:
1. Log into Coolify dashboard at http://rndev.local:8000/
2. Navigate to your application
3. Click "Redeploy" button

### Option 2: Trigger via Git Push to Deployment Repo
Since Coolify watches the `coolify-deployment` repo:
1. Make a small commit to the deployment repo (e.g., update timestamp in README)
2. Push to trigger Coolify webhook
3. Coolify restarts containers with latest pre-built files

```powershell
# After running deploy-to-coolify-integrated.ps1
cd coolify-deployment
git commit --allow-empty -m "Trigger redeploy $(Get-Date)"
git push
```

### Option 3: GitHub Actions Webhook (if using GitHub)
```yaml
- name: Deploy to Coolify
  run: |
    curl --request GET "${{ secrets.COOLIFY_WEBHOOK }}" \
         --header "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}"
```

### Option 4: Wait for Coolify v4 API Documentation
The current Coolify v4 is still in active development. The REST API for deployments may not be fully implemented yet.

## Script Workaround

For now, the deployment script works perfectly for:
1. Building the application
2. Intelligent file caching (70-90% faster)
3. Uploading to server
4. **Manual redeploy step required**

## Testing Script

Use `test-coolify-redeploy.ps1` to test different endpoints and authentication methods as Coolify evolves.

## Notes

- Coolify v4 uses Laravel framework
- CSRF protection is enabled for web routes
- API tokens may be for different purposes (not deployment)
- The webhook URL format suggests it's meant for CI/CD integrations