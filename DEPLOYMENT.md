# Deployment Guide for Coolify

This guide explains how to deploy the 2 Ban 2 Chess application to Coolify with automatic GitHub deployments.

## Setup Steps

### 1. GitHub Repository Setup
- Go to Settings → Secrets → Actions
- Add secret: COOLIFY_WEBHOOK_URL (get from Coolify)
  - **Note:** This is optional. The deployment will work without it, but won't auto-trigger Coolify

### 2. Coolify Setup
1. Create new Docker Compose resource
2. Point to /docker-compose.coolify.yml
3. Copy webhook URL from Coolify settings (optional for auto-deployment)
4. Set environment variables:
   - NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
   - SESSION_SECRET=(generate secure key)
   - GITHUB_REPOSITORY=bezalel6/2ban-2chess

### 3. Deployment Options

#### Automatic Deployment
Push to main → GitHub Actions builds → Triggers Coolify webhook → Auto-deploys

#### Manual Deployment
1. Go to Actions tab in GitHub
2. Select "Build and Deploy" workflow
3. Click "Run workflow"
4. Choose whether to trigger Coolify deployment after build
5. Click "Run workflow" button

#### Without Coolify Webhook
- The workflow will still build and push Docker images to GitHub Container Registry
- You can manually trigger deployment in Coolify or pull the images elsewhere
- No webhook configuration required

The app will be available at your domain with automatic SSL.
