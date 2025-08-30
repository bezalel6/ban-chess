# GitHub + Coolify Automated Deployment Guide

This guide shows how to set up automatic builds on GitHub and deployment to Coolify.

## Architecture Overview

```
GitHub Push → GitHub Actions Build → Push to Registry → Webhook to Coolify → Deploy
```

## Step 1: GitHub Repository Setup

### 1.1 Enable GitHub Container Registry

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll to "Workflow permissions"
4. Select **"Read and write permissions"**
5. Check **"Allow GitHub Actions to create and approve pull requests"**

### 1.2 Create GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `COOLIFY_WEBHOOK_URL` | Coolify webhook endpoint | `https://coolify.example.com/api/v1/deploy/webhook` |
| `COOLIFY_DEPLOY_TOKEN` | Coolify API token for deployment | `clfy_xxxxxxxxxxxxx` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | `your-nextauth-secret` |
| `DATABASE_URL` | Production database URL | `postgresql://user:pass@host/db` |

## Step 2: Coolify Configuration

### 2.1 Create a New Application in Coolify

1. Log into your Coolify instance
2. Click **"+ New Resource"** → **"Application"**
3. Choose **"Docker Image"** as the source

### 2.2 Configure Docker Registry

In Coolify application settings:

```yaml
Image Source: ghcr.io
Repository: ghcr.io/[your-github-username]/2ban-2chess
Tag: latest
```

### 2.3 Generate Coolify Webhook

1. In your Coolify application, go to **"Webhooks"**
2. Click **"Generate Webhook"**
3. Copy the webhook URL (this is your `COOLIFY_WEBHOOK_URL`)

### 2.4 Create Coolify API Token

1. Go to Coolify **Settings** → **API Tokens**
2. Create a new token with deployment permissions
3. Copy the token (this is your `COOLIFY_DEPLOY_TOKEN`)

### 2.5 Configure Environment Variables in Coolify

Add these environment variables in Coolify:

```bash
NODE_ENV=production
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
DATABASE_URL=${DATABASE_URL}
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
REDIS_URL=redis://redis:6379
```

## Step 3: Docker Configuration

Create a production-ready Dockerfile:

```dockerfile
# Multi-stage build
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server

USER nextjs

EXPOSE 3000 3001

# Start both services
CMD ["sh", "-c", "node server/ws-server.js & npm start"]
```

## Step 4: Coolify Docker Compose (Alternative)

If you prefer Docker Compose in Coolify:

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY}:${GITHUB_SHA:-latest}
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_WEBSOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_URL}
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

## Step 5: Deployment Workflow

### Automatic Deployment

1. **Push to main/master branch** → GitHub Actions triggers
2. **GitHub Actions**:
   - Runs tests
   - Builds the application
   - Creates Docker image
   - Pushes to GitHub Container Registry
   - Triggers Coolify webhook
3. **Coolify**:
   - Receives webhook
   - Pulls new Docker image
   - Deploys with zero downtime

### Manual Deployment

1. Go to GitHub **Actions** tab
2. Select **"Build and Deploy to Coolify"**
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

## Step 6: Monitoring & Rollback

### View Deployment Status

- **GitHub**: Actions tab shows build status
- **Coolify**: Application dashboard shows deployment status

### Rollback Process

In Coolify:
1. Go to your application
2. Click **"Deployments"**
3. Find previous successful deployment
4. Click **"Rollback"**

Or via GitHub:
1. Revert the commit
2. Push to trigger new deployment

## Step 7: Security Best Practices

1. **Use GitHub Environments** for production secrets
2. **Enable branch protection** on main/master
3. **Require PR reviews** before merging
4. **Use Coolify's built-in SSL** with Let's Encrypt
5. **Rotate secrets regularly**

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure package-lock.json is committed

### Deployment Fails
- Check Coolify logs: `docker logs <container-id>`
- Verify webhook URL and token
- Check Docker registry permissions

### Application Won't Start
- Verify environment variables in Coolify
- Check port configurations
- Review application logs in Coolify

## Additional Optimizations

### Caching Strategy
The workflow uses GitHub Actions cache for:
- Node modules
- Next.js build cache
- Docker layers

### Health Checks
Add to your Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Scaling
Coolify supports:
- Horizontal scaling (multiple instances)
- Load balancing
- Zero-downtime deployments

## Support

- **Coolify Documentation**: https://coolify.io/docs
- **GitHub Actions**: https://docs.github.com/actions
- **Docker Registry**: https://docs.github.com/packages