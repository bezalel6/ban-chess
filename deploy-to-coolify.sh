#!/bin/bash

# Configuration - Update these with your server details
SERVER_USER="rndev"  # Your server user
SERVER_IP="rndev.local"  # Your server hostname
COOLIFY_APP_PATH="/home/rndev/chess-app"  # Your deployment directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting deployment to Coolify...${NC}"

# Step 1: Build Next.js in standalone mode
echo -e "${YELLOW}📦 Building Next.js application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Step 2: Build WebSocket server
echo -e "${YELLOW}📦 Building WebSocket server...${NC}"
cd server
npm run build
cd ..
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ WebSocket build failed${NC}"
    exit 1
fi

# Step 3: Prepare deployment directories
echo -e "${YELLOW}📁 Preparing deployment files...${NC}"
rm -rf .deploy-temp
mkdir -p .deploy-temp/app-dist
mkdir -p .deploy-temp/ws-dist

# Copy Next.js standalone build
cp -r .next/standalone/* .deploy-temp/app-dist/
cp -r .next/static .deploy-temp/app-dist/.next/
cp -r public .deploy-temp/app-dist/public 2>/dev/null || true

# Copy WebSocket server build
cp -r server/dist/* .deploy-temp/ws-dist/
cp server/package*.json .deploy-temp/ws-dist/

# Copy docker-compose.production.yml
cp docker-compose.production.yml .deploy-temp/

# Step 4: rsync to server
echo -e "${YELLOW}📤 Transferring files to server...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    .deploy-temp/ \
    ${SERVER_USER}@${SERVER_IP}:${COOLIFY_APP_PATH}/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ File transfer failed${NC}"
    exit 1
fi

# Step 5: Install production dependencies on server (for WebSocket server)
echo -e "${YELLOW}📥 Installing production dependencies...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${COOLIFY_APP_PATH}/ws-dist && npm ci --production"

# Step 6: Restart Coolify services
echo -e "${YELLOW}🔄 Restarting Coolify services...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${COOLIFY_APP_PATH} && docker-compose -f docker-compose.production.yml down && docker-compose -f docker-compose.production.yml up -d"

# Step 7: Clean up local temp files
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf .deploy-temp

# Step 8: Check deployment status
echo -e "${YELLOW}🔍 Checking deployment status...${NC}"
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3000/api/health | grep -q "200"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Application is running at http://${SERVER_IP}:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Application may still be starting up. Check manually.${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"