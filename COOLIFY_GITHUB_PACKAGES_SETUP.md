# Coolify Setup with GitHub Packages

This guide explains how to configure Coolify to use pre-built Docker images from GitHub Container Registry instead of building from source.

## Benefits of This Approach

- ✅ **No build failures in Coolify** - Building happens in GitHub Actions' reliable environment
- ✅ **Faster deployments** - Coolify just pulls and runs the image (no compilation)
- ✅ **Consistent builds** - Same image tested in CI/CD is deployed
- ✅ **Less resource usage** - Your Coolify server doesn't need build resources
- ✅ **Environment variables stay separate** - Injected at runtime, not build time

## Prerequisites

1. GitHub Actions workflow already pushes to `ghcr.io` (✅ Already configured)
2. Images are publicly accessible OR you have authentication set up
3. Coolify instance is running

## Step 1: Make Your GitHub Package Public (Recommended)

1. Go to your GitHub repository
2. Click on "Packages" in the right sidebar
3. Click on your package (`2ban-2chess`)
4. Click "Package settings" (gear icon)
5. Scroll to "Danger Zone"
6. Click "Change visibility" → Select "Public"

This allows Coolify to pull without authentication.

## Step 2: Configure Coolify

### Option A: Using Docker Compose (Recommended)

1. In Coolify, create a new "Docker Compose" resource
2. Point it to your repository
3. Set the compose file to `docker-compose.coolify-ghcr.yml`
4. Configure environment variables:

```env
# Required
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_nextauth_secret

# Optional (have defaults)
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws-chess.rndev.site
NEXT_PUBLIC_API_URL=https://chess.rndev.site
NEXTAUTH_URL=https://chess.rndev.site
ALLOWED_ORIGINS=https://chess.rndev.site
```

5. Deploy - Coolify will pull the image from GitHub

### Option B: Using Single Application

1. In Coolify, create a new "Application"
2. Choose "Docker Image" as source
3. Set image: `ghcr.io/bezalel6/2ban-2chess:latest`
4. Configure the same environment variables as above
5. Set port to 3000
6. Deploy

## Step 3: Set Up Automatic Deployments

### GitHub Actions Webhook

Your GitHub Actions workflow can trigger Coolify redeploys:

1. In Coolify, go to your application
2. Find the webhook URL (usually in Settings)
3. Add to GitHub Actions:

```yaml
- name: Trigger Coolify Deployment
  if: success()
  run: |
    curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}"
  continue-on-error: true
```

## Step 4: Authentication (If Private Package)

If you keep the package private, configure authentication:

### In Coolify:

1. Go to your application settings
2. Add Docker Registry credentials:
   - Registry: `ghcr.io`
   - Username: Your GitHub username
   - Password: GitHub Personal Access Token with `read:packages` scope

### Create GitHub Token:

1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `read:packages`
4. Copy token and use as password in Coolify

## Deployment Workflow

1. **Push to main branch** → GitHub Actions triggered
2. **GitHub Actions** → Builds and tests → Pushes to ghcr.io
3. **Coolify** → Pulls latest image → Deploys

## Switching Between Build Methods

You have two compose files now:
- `docker-compose.coolify.yml` - Builds from source (current)
- `docker-compose.coolify-ghcr.yml` - Uses GitHub Packages (new)

To switch in Coolify:
1. Go to your application
2. Change compose file path
3. Redeploy

## Troubleshooting

### Image Pull Errors

If Coolify can't pull the image:

1. **Check image visibility** - Make package public or configure auth
2. **Verify image name** - Should be `ghcr.io/bezalel6/2ban-2chess:latest`
3. **Check GitHub Actions** - Ensure build completed successfully
4. **Test locally**:
   ```bash
   docker pull ghcr.io/bezalel6/2ban-2chess:latest
   ```

### Environment Variables Not Working

- Ensure all required variables are set in Coolify
- Check that variables aren't hardcoded in the image
- Verify Next.js public variables start with `NEXT_PUBLIC_`

### WebSocket Connection Issues

The WebSocket server is still built from source in this setup. To also use GitHub Packages for WebSocket:

1. Create `Dockerfile.websocket`
2. Update GitHub Actions to build both images
3. Update compose file to use both images

## Rollback Strategy

If issues occur, switch back to source builds:
1. Change compose file back to `docker-compose.coolify.yml`
2. Redeploy
3. Coolify will build from source again

## Current Status

- ✅ GitHub Actions builds and pushes to ghcr.io
- ✅ Standalone Dockerfile optimized for production
- ✅ Docker Compose file ready for GitHub Packages
- ⏳ WebSocket server still builds from source (can be migrated later)

## Next Steps

1. Make package public OR set up authentication
2. Update Coolify to use `docker-compose.coolify-ghcr.yml`
3. Test deployment
4. Optionally: Set up webhook for automatic deployments