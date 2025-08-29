# Deployment Guide for Coolify

This guide explains how to deploy the 2 Ban 2 Chess application to Coolify with automatic GitHub deployments.

## Setup Steps

### 1. GitHub Repository Setup
- Go to Settings → Secrets → Actions
- Add secret: COOLIFY_WEBHOOK_URL (get from Coolify)

### 2. Coolify Setup
1. Create new Docker Compose resource
2. Point to /docker-compose.coolify.yml
3. Copy webhook URL from Coolify settings
4. Set environment variables:
   - NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
   - SESSION_SECRET=(generate secure key)
   - GITHUB_REPOSITORY=bezalel6/2ban-2chess

### 3. Deployment Flow
Push to main → GitHub Actions builds → Triggers Coolify webhook → Auto-deploys

The app will be available at your domain with automatic SSL.
