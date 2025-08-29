# PowerShell deployment script for Windows
# 
# Usage:
#   .\deploy-to-coolify.ps1              # Build and deploy everything
#   .\deploy-to-coolify.ps1 -SkipBuild   # Deploy without building (use existing build)
#   .\deploy-to-coolify.ps1 -NextOnly    # Build and deploy only Next.js
#   .\deploy-to-coolify.ps1 -WsOnly      # Build and deploy only WebSocket server

param(
    [switch]$SkipBuild,  # Skip the build step and just deploy existing files
    [switch]$NextOnly,    # Only build/deploy Next.js app
    [switch]$WsOnly,      # Only build/deploy WebSocket server
    [switch]$Help        # Show help message
)

if ($Help) {
    Write-Host "Chess App Deployment Script" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-coolify.ps1              # Build and deploy everything"
    Write-Host "  .\deploy-to-coolify.ps1 -SkipBuild   # Deploy without building (use existing build)"
    Write-Host "  .\deploy-to-coolify.ps1 -NextOnly    # Build and deploy only Next.js"
    Write-Host "  .\deploy-to-coolify.ps1 -WsOnly      # Build and deploy only WebSocket server"
    Write-Host "  .\deploy-to-coolify.ps1 -Help        # Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  Quick redeploy after config change:"
    Write-Host "    .\deploy-to-coolify.ps1 -SkipBuild"
    Write-Host ""
    Write-Host "  Update only frontend after UI changes:"
    Write-Host "    .\deploy-to-coolify.ps1 -NextOnly"
    Write-Host ""
    exit 0
}

# Configuration - Update these with your server details
$SERVER_USER = "rndev"  # or your Coolify server user
$SERVER_HOST = "rndev.local"  # Server hostname
$COOLIFY_APP_PATH = "/home/rndev/chess-app"  # Your deployment directory

# Resolve hostname to IP before using in WSL
Write-Host "🔍 Resolving server hostname..." -ForegroundColor Yellow
try {
    $resolvedIP = (Resolve-DnsName -Name $SERVER_HOST -Type A -ErrorAction Stop | Where-Object {$_.Type -eq "A"} | Select-Object -First 1).IPAddress
    $SERVER_IP = $resolvedIP
    Write-Host "✅ Resolved $SERVER_HOST to $SERVER_IP" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to resolve $SERVER_HOST. Trying alternative methods..." -ForegroundColor Red
    # Try ping to resolve
    $pingResult = ping -n 1 $SERVER_HOST 2>$null | Select-String "Reply from ([\d.]+):"
    if ($pingResult) {
        $SERVER_IP = $pingResult.Matches[0].Groups[1].Value
        Write-Host "✅ Resolved via ping: $SERVER_IP" -ForegroundColor Green
    } else {
        Write-Host "❌ Could not resolve hostname. Please check:" -ForegroundColor Red
        Write-Host "   - Is the server online?" -ForegroundColor Yellow
        Write-Host "   - Is mDNS/Bonjour working?" -ForegroundColor Yellow
        Write-Host "   - Try adding to hosts file: C:\Windows\System32\drivers\etc\hosts" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🚀 Starting deployment to Coolify..." -ForegroundColor Yellow

if ($SkipBuild) {
    Write-Host "⏭️  Skipping build step (using existing build files)" -ForegroundColor Cyan
} else {
    # Step 1: Build Next.js in standalone mode
    if (-not $WsOnly) {
        Write-Host "📦 Building Next.js application..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build failed" -ForegroundColor Red
            exit 1
        }
    }

    # Step 2: WebSocket server (no build needed - TypeScript runs directly)
    if (-not $NextOnly) {
        Write-Host "📦 WebSocket server uses TypeScript directly (no build needed)" -ForegroundColor Cyan
    }
}

# Step 3: Prepare deployment directories
Write-Host "📁 Preparing deployment files..." -ForegroundColor Yellow
if (Test-Path .deploy-temp) {
    Remove-Item -Recurse -Force .deploy-temp
}
New-Item -ItemType Directory -Force -Path .deploy-temp | Out-Null

# Copy Next.js standalone build
if (-not $WsOnly) {
    New-Item -ItemType Directory -Force -Path .deploy-temp\app-dist | Out-Null
    Copy-Item -Recurse .next\standalone\* .deploy-temp\app-dist\
    Copy-Item -Recurse .next\static .deploy-temp\app-dist\.next\
    if (Test-Path public) {
        Copy-Item -Recurse public .deploy-temp\app-dist\
    }
}

# Copy WebSocket server files (TypeScript source - will be compiled on server)
if (-not $NextOnly) {
    New-Item -ItemType Directory -Force -Path .deploy-temp\ws-dist | Out-Null
    # Copy TypeScript source files
    Copy-Item server\*.ts .deploy-temp\ws-dist\
    # Copy package.json from root (WebSocket deps are there)
    Copy-Item package*.json .deploy-temp\ws-dist\
    Write-Host "📦 Copied WebSocket server source files" -ForegroundColor Green
}

# Copy docker-compose.production.yml
Copy-Item docker-compose.production.yml .deploy-temp\

# Step 4: rsync to server (using WSL or Git Bash)
Write-Host "📤 Transferring files to server..." -ForegroundColor Yellow

# Option 1: Using WSL (with mirrored networking, can use hostname directly)
wsl rsync -avz --delete `
    --exclude 'node_modules' `
    --exclude '.git' `
    --exclude '*.log' `
    .deploy-temp/ `
    ${SERVER_USER}@${SERVER_HOST}:${COOLIFY_APP_PATH}/

# Option 2: Using Git Bash (comment above and uncomment below)
# & "C:\Program Files\Git\usr\bin\rsync.exe" -avz --delete `
#     --exclude 'node_modules' `
#     --exclude '.git' `
#     --exclude '*.log' `
#     .deploy-temp/ `
#     ${SERVER_USER}@${SERVER_IP}:${COOLIFY_APP_PATH}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ File transfer failed" -ForegroundColor Red
    exit 1
}

# Step 5: Install production dependencies and restart services
Write-Host "📥 Installing dependencies and restarting services..." -ForegroundColor Yellow
# Use the same resolved IP for consistency
ssh ${SERVER_USER}@${SERVER_IP} @"
    cd ${COOLIFY_APP_PATH}/ws-dist && npm ci --production
    cd ${COOLIFY_APP_PATH}
    docker-compose -f docker-compose.production.yml down
    docker-compose -f docker-compose.production.yml up -d
"@

# Step 6: Clean up local temp files
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .deploy-temp

# Step 7: Check deployment status
Write-Host "🔍 Checking deployment status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$response = Invoke-WebRequest -Uri "http://${SERVER_IP}:3000/api/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Application is running at http://${SERVER_IP}:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Application may still be starting up. Check manually." -ForegroundColor Yellow
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green