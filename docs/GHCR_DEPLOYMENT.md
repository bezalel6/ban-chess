# GitHub Container Registry (GHCR) Deployment Guide

## Overview

This guide explains how to build and deploy the 2ban-2chess application using GitHub Actions and GitHub Container Registry (GHCR).

## Architecture

The application consists of two containers:
- **App Container** (`ghcr.io/bezalel6/2ban-2chess-app`): Next.js frontend and API
- **WebSocket Container** (`ghcr.io/bezalel6/2ban-2chess-websocket`): Real-time game server

## Setup Instructions

### 1. GitHub Repository Settings

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

### 2. Required Secrets

Add these secrets in Settings → Secrets and variables → Actions:

#### Required for Deployment:
- `NEXTAUTH_SECRET`: Random 32-character string for NextAuth
- `DATABASE_URL`: PostgreSQL connection string (if using database features)
- `REDIS_URL`: Redis connection string (if using external Redis)

#### Optional for Coolify Webhook:
- `COOLIFY_WEBHOOK_URL`: Your Coolify webhook endpoint
- `COOLIFY_DEPLOY_TOKEN`: Authentication token for Coolify

#### Optional for Google OAuth:
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### 3. Workflow Files

The repository includes two workflow files:

1. **`.github/workflows/deploy-ghcr.yml`** (Recommended)
   - Builds both containers separately
   - Pushes to GitHub Container Registry
   - Supports multi-architecture builds
   - Includes proper caching

2. **`.github/workflows/deploy.yml`** (Legacy)
   - Single container build
   - Needs updating for production use

### 4. Triggering Builds

Builds are triggered automatically on:
- Push to `main` or `master` branch
- Manual workflow dispatch from Actions tab

### 5. Deployment Options

#### Option A: Using Docker Compose with GHCR Images

1. Copy `docker-compose.production.ghcr.yml` to your server
2. Create `.env` file with required variables:
```env
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://chess.rndev.site
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws-chess.rndev.site
NEXT_PUBLIC_WS_HEALTH_URL=https://ws-chess.rndev.site/health
DATABASE_URL=postgresql://user:password@localhost:5432/chess
ALLOWED_ORIGINS=https://chess.rndev.site
ADMIN_EMAILS=admin@example.com
```

3. Pull and run containers:
```bash
# Pull latest images
docker-compose -f docker-compose.production.ghcr.yml pull

# Start services
docker-compose -f docker-compose.production.ghcr.yml up -d

# Check status
docker-compose -f docker-compose.production.ghcr.yml ps

# View logs
docker-compose -f docker-compose.production.ghcr.yml logs -f
```

#### Option B: Using Coolify

1. Create two apps in Coolify:
   - App 1: Next.js App
     - Image: `ghcr.io/bezalel6/2ban-2chess-app:latest`
     - Port: 3000
     - Domain: chess.rndev.site
   
   - App 2: WebSocket Server
     - Image: `ghcr.io/bezalel6/2ban-2chess-websocket:latest`
     - Ports: 3001, 3002
     - Domain: ws-chess.rndev.site

2. Set environment variables in Coolify for each app

3. Configure webhook in GitHub Actions secrets

#### Option C: Manual Docker Run

```bash
# Run Redis
docker run -d --name chess-redis \
  -p 6379:6379 \
  redis:7-alpine

# Run WebSocket Server
docker run -d --name chess-websocket \
  -p 3001:3001 -p 3002:3002 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://chess-redis:6379 \
  -e NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  ghcr.io/bezalel6/2ban-2chess-websocket:latest

# Run App
docker run -d --name chess-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_WEBSOCKET_URL=wss://ws-chess.rndev.site \
  -e NEXTAUTH_URL=https://chess.rndev.site \
  -e NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
  ghcr.io/bezalel6/2ban-2chess-app:latest
```

## Image Access

### Public Images (Default)
By default, GHCR images are private. To make them public:

1. Go to your GitHub profile → Packages
2. Click on the package (e.g., `2ban-2chess-app`)
3. Package settings → Change visibility → Public

### Private Images
For private images, authenticate before pulling:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull images
docker pull ghcr.io/bezalel6/2ban-2chess-app:latest
docker pull ghcr.io/bezalel6/2ban-2chess-websocket:latest
```

## Monitoring

### Health Checks
- App health: `https://chess.rndev.site/api/health`
- WebSocket health: `https://ws-chess.rndev.site/health`

### Container Logs
```bash
# View app logs
docker logs chess-app -f

# View websocket logs
docker logs chess-websocket -f

# View Redis logs
docker logs chess-redis -f
```

## Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Ensure all required secrets are set
3. Verify Dockerfile syntax

### Container Won't Start
1. Check logs: `docker logs <container-name>`
2. Verify environment variables
3. Check port conflicts

### WebSocket Connection Issues
1. Ensure port 3001 is accessible
2. Check CORS settings (ALLOWED_ORIGINS)
3. Verify WebSocket URL in frontend

### Static Assets Not Loading
1. Verify public folder is copied in Dockerfile
2. Check Next.js standalone configuration
3. Ensure proper routing in reverse proxy

## Rollback Procedure

To rollback to a previous version:

```bash
# List available tags
docker images ghcr.io/bezalel6/2ban-2chess-app

# Pull specific version
docker pull ghcr.io/bezalel6/2ban-2chess-app:master-abc1234

# Update docker-compose to use specific tag
# Edit docker-compose.production.ghcr.yml and change:
# image: ghcr.io/bezalel6/2ban-2chess-app:master-abc1234

# Restart services
docker-compose -f docker-compose.production.ghcr.yml up -d
```

## Security Notes

1. **Never commit secrets** to the repository
2. **Use strong NEXTAUTH_SECRET** (32+ characters)
3. **Restrict ALLOWED_ORIGINS** to your domains only
4. **Enable HTTPS** for all production deployments
5. **Regularly update** dependencies and base images

## Support

For issues or questions:
1. Check GitHub Issues
2. Review deployment logs
3. Verify all environment variables are set correctly